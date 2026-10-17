'use client'

/**
 * Indicador de la seleccion ACTIVA de deportista para ORION Play (Fase 2
 * del contexto compartido de Visual Lab). Vive en
 * visual-lab/play/layout.tsx (persiste entre navegaciones dentro de
 * /visual-lab/play/*, no se remonta al cambiar de ejercicio) - por eso el
 * useEffect de verificacion depende solo de `athleteId`, nunca de
 * `pathname`: cambiar de ejercicio sin cambiar de atleta NO dispara una
 * nueva llamada a getSelectedAthleteIfAccessible.
 *
 * Puramente de presentacion y de un atajo de navegacion ya existente
 * ("Cambiar" -> el picker del ejercicio actual) - nunca decide
 * autorizacion por si mismo. El id de localStorage (useSelectedAthlete)
 * se re-verifica siempre contra el servidor (getSelectedAthleteIfAccessible,
 * RLS real) antes de mostrar nombre alguno.
 */

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSelectedAthlete } from '@/lib/useSelectedAthlete'
import { getSelectedAthleteIfAccessible, type SelectedAthleteResult } from '@/app/(portal)/visual-lab/play/selectedAthlete.actions'

/** Patron de rutas real: /visual-lab/play/<exerciseId>/... (picker, demo
 * o ejecucion real) - el exerciseId es siempre el primer segmento tras
 * "play", en los 3 casos. Devuelve null en el catalogo raiz
 * (/visual-lab/play, sin segmento siguiente). */
function extractExerciseIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/visual-lab\/play\/([^/]+)(?:\/|$)/)
  return match ? match[1] : null
}

/** /visual-lab/play/<exerciseId>/demo - unica forma real de "ruta demo"
 * en este arbol (ver [exerciseId]/demo/page.tsx). */
function isDemoPathname(pathname: string): boolean {
  return /^\/visual-lab\/play\/[^/]+\/demo(?:\/|$)/.test(pathname)
}

interface Verification {
  /** athleteId al que corresponde `result` - se compara contra el
   * athleteId actual del hook para no mostrar el resultado de una
   * verificacion ya obsoleta (p.ej. si el usuario cambia de seleccion
   * mientras la llamada anterior seguia en vuelo). */
  athleteId: string
  result: SelectedAthleteResult | null
}

const barClass = 'mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orion-navy-100 bg-white px-4 py-2'
const actionBtnClass = 'rounded-lg border border-orion-navy-200 px-3 py-1 text-xs font-medium text-orion-navy-700 hover:bg-orion-navy-100'

export default function SelectedAthleteIndicator() {
  const pathname = usePathname()
  const router = useRouter()
  const { athleteId, isHydrated, clearAthlete } = useSelectedAthlete()
  const demo = isDemoPathname(pathname)

  const [verification, setVerification] = useState<Verification | null>(null)

  useEffect(() => {
    // Punto 10 del encargo: en rutas demo no se dispara NINGUNA
    // comprobacion de acceso provocada por este indicador - ni siquiera
    // si hay un athleteId guardado.
    if (demo || !athleteId) return
    let cancelled = false
    getSelectedAthleteIfAccessible(athleteId).then((result) => {
      if (cancelled) return
      setVerification({ athleteId, result })
      // Acceso revocado, atleta inexistente, o id con formato invalido -
      // los 3 casos llegan aqui igual (ver getSelectedAthleteIfAccessible):
      // se limpia la seleccion de forma segura, sin mostrar ningun dato.
      if (!result) clearAthlete()
    })
    return () => {
      cancelled = true
    }
  }, [athleteId, demo, clearAthlete])

  const handleChange = useCallback(() => {
    const exerciseId = extractExerciseIdFromPathname(pathname)
    if (exerciseId) router.push(`/visual-lab/play/${exerciseId}`)
  }, [pathname, router])

  // Punto 10: nada se renderiza en demo, ni siquiera el estado "sin
  // seleccion" - la demo no debe reflejar la seleccion activa en absoluto.
  if (demo) return null

  // Punto 7: mientras no se ha completado la primera lectura de
  // localStorage, no se afirma nada (ni "sin seleccion" ni el nombre) -
  // nada visible todavia, para no mostrar un estado que podria ser
  // incorrecto en el siguiente instante.
  if (!isHydrated) return null

  if (!athleteId) {
    return (
      <div className={barClass}>
        <p className="text-sm text-orion-navy-400">
          Sin deportista seleccionado · elige uno desde un ejercicio de ORION Play
        </p>
      </div>
    )
  }

  const matchesCurrentSelection = verification?.athleteId === athleteId

  // Hay athleteId pero todavia no se ha resuelto (o esta vencido) el
  // resultado de la verificacion server-side para ESE id concreto - breve,
  // nunca se afirma "sin seleccion" ni se muestra un nombre sin confirmar.
  if (!matchesCurrentSelection || verification.result === null) {
    return (
      <div className={barClass}>
        <p className="text-sm text-orion-navy-400">Comprobando selección…</p>
      </div>
    )
  }

  const { fullName, shortId } = verification.result
  const exerciseId = extractExerciseIdFromPathname(pathname)

  return (
    <div className={barClass}>
      <p className="text-sm text-orion-navy-700">
        Deportista: <span className="font-semibold text-orion-navy-900">{fullName}</span>
        <span className="text-orion-navy-400"> · ORION ID #{shortId}</span>
      </p>
      <div className="flex items-center gap-2">
        {/* "Cambiar" solo se muestra cuando hay un ejercicio concreto en
            la URL actual (picker/demo/ejecucion) - en el catalogo raiz
            (/visual-lab/play) no existe ningun selector generico sin
            ejercicio al que dirigir esta accion; en vez de inventar una
            ruta nueva (fuera de alcance de esta fase) o un boton inerte,
            se omite aqui y queda disponible en cuanto el usuario entra en
            un ejercicio concreto. */}
        {exerciseId && (
          <button type="button" onClick={handleChange} className={actionBtnClass}>
            Cambiar
          </button>
        )}
        <button type="button" onClick={clearAthlete} className={actionBtnClass}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
