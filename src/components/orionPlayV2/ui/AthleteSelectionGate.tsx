'use client'

/**
 * Punto UNICO de integracion de la seleccion activa de Visual Lab en el
 * flujo de cada ejercicio de ORION Play - se monta desde
 * [exerciseId]/page.tsx envolviendo el picker de cada ejercicio
 * (ReactionTimeV2AthletePicker/ClickTargetsV2AthletePicker/
 * VisualMemoryV2AthletePicker, pasados tal cual como `children`) SIN
 * modificarlos ni duplicar logica entre ellos.
 *
 * Fase 2 (corrección del selector de usuario y acceso a ORION Play):
 * ahora SIEMPRE decide y redirige, nunca deja ver el picker en el flujo
 * normal - ORION Play ya no obliga a elegir un usuario para poder probar
 * los ejercicios. Las tres salidas posibles, una vez `isHydrated`:
 *   - Hay `athleteId` guardado y `getSelectedAthleteIfAccessible` lo
 *     verifica con exito -> redirige a la ejecucion real
 *     ([exerciseId]/[athleteId], mismo athleteId explicito de siempre en
 *     la URL). Comportamiento YA EXISTENTE, sin cambios.
 *   - No hay `athleteId` guardado -> redirige directamente a
 *     [exerciseId]/demo, sin pasar por el picker. NUEVO en esta fase.
 *   - Hay `athleteId` guardado pero la verificacion devuelve `null`
 *     (revocado, id corrupto, atleta inexistente) -> se limpia la
 *     seleccion (`clearAthlete`, para no repetir la misma comprobacion
 *     fallida en la siguiente visita) y se redirige igualmente a
 *     [exerciseId]/demo. NUEVO en esta fase: antes caia al picker sin
 *     limpiar nada (ver nota de seguridad mas abajo). Nunca se usa una
 *     seleccion no verificada para entrar a una ejecucion real.
 *
 * Seguridad: el UUID de localStorage (useSelectedAthlete) NUNCA se trata
 * como autorizacion - se re-verifica con getSelectedAthleteIfAccessible
 * (RLS real) antes de redirigir a una ejecucion real. La redireccion en
 * si no otorga nada: la pagina de destino ([exerciseId]/[athleteId]/page.tsx)
 * vuelve a verificar con getAthleteById()/RLS sin ningun cambio. La demo
 * ([exerciseId]/demo/page.tsx) no recibe athleteId en ningun caso, asi
 * que no hay persistencia posible por construccion, independientemente
 * de por que rama se haya llegado a ella.
 *
 * `redirectedRef` evita una segunda llamada a router.replace: tras
 * `clearAthlete()`, `athleteId` cambia (de un UUID a null), lo que vuelve
 * a ejecutar este efecto (esta en sus dependencias) - sin este guard,
 * esa segunda ejecucion volveria a evaluar la rama "sin athleteId" y
 * llamaria a router.replace otra vez hacia la MISMA demo a la que ya se
 * esta navegando. No es un bucle (misma URL, idempotente) pero es una
 * llamada evitable; el guard la elimina sin mas.
 *
 * `children` se conserva en la firma y se sigue renderizando como ultimo
 * recurso (nunca se elimina el picker, solo deja de ser la via normal) -
 * en la practica no deberia llegar a mostrarse, porque toda combinacion
 * de isHydrated+athleteId+verificacion ya termina en una redireccion.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedAthlete } from '@/lib/useSelectedAthlete'
import { getSelectedAthleteIfAccessible } from '@/app/(portal)/visual-lab/play/selectedAthlete.actions'

type GateStatus = 'checking' | 'redirecting'

export default function AthleteSelectionGate({ exerciseId, children }: { exerciseId: string; children: ReactNode }) {
  const router = useRouter()
  const { athleteId, isHydrated, clearAthlete } = useSelectedAthlete()
  const [status, setStatus] = useState<GateStatus>('checking')
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!isHydrated || redirectedRef.current) return // no decidir nada hasta leer localStorage; no repetir si ya se redirigio

    if (!athleteId) {
      redirectedRef.current = true
      // Sincronizacion con localStorage (sistema externo) tras la
      // hidratacion - mismo caso ya aceptado en useSelectedAthlete.ts.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('redirecting')
      router.replace(`/visual-lab/play/${exerciseId}/demo`)
      return
    }

    let cancelled = false
    getSelectedAthleteIfAccessible(athleteId).then((result) => {
      if (cancelled || redirectedRef.current) return
      redirectedRef.current = true
      setStatus('redirecting')
      if (result) {
        router.replace(`/visual-lab/play/${exerciseId}/${athleteId}`)
      } else {
        // Seleccion invalida/revocada: se limpia (nunca se conserva una
        // identidad no verificada) y se redirige a demo - misma salida
        // que "sin seleccion", nunca a una ejecucion real.
        clearAthlete()
        router.replace(`/visual-lab/play/${exerciseId}/demo`)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isHydrated, athleteId, exerciseId, router, clearAthlete])

  // Mientras no se sabe todavia si hay que redirigir (localStorage sin
  // leer, verificacion en curso) o mientras ya se ha disparado una
  // redireccion, se muestra un estado neutro - nunca el picker.
  if (!isHydrated || status === 'checking' || status === 'redirecting') {
    return (
      <div className="rounded-xl border border-orion-navy-100 bg-white p-6 text-center">
        <p className="text-sm text-orion-navy-400">Comprobando selección activa…</p>
      </div>
    )
  }

  return <>{children}</>
}
