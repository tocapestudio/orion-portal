'use client'

/**
 * Indicador + selector de la seleccion ACTIVA de deportista para TODO
 * Visual Lab (corrección arquitectónica posterior a la Fase 2: vive en
 * visual-lab/layout.tsx, no en visual-lab/play/layout.tsx - ya no es un
 * componente de ORION Play, de ahi su nueva ubicacion fuera de
 * components/orionPlayV2/). Sustituye en funcion al indicador anterior
 * (components/orionPlayV2/ui/SelectedAthleteIndicator.tsx, que ya NO se
 * monta en ningun sitio desde este cambio - ver visual-lab/play/layout.tsx -
 * pero se conserva sin borrar hasta confirmar que este funciona, siguiendo
 * la migracion en pasos pequeños y reversibles acordada).
 *
 * Diferencia real respecto al anterior: aqui "Cambiar"/"Elegir" NO navega
 * a ningun sitio (el anterior navegaba al picker de un ejercicio
 * concreto, algo que ya no tiene sentido fuera de Play) - abre un panel
 * en el propio sitio con el selector de deportista, reutilizando
 * AthletePicker.tsx (sin modificarlo) con onSelect guardando en la
 * seleccion activa en vez de navegar. El acceso rapido desde los
 * selectores de cada ejercicio de ORION Play es la siguiente fase,
 * explicitamente fuera de alcance aqui.
 *
 * Carga de deportistas: NO se piden en el montaje del indicador (que
 * vive en el layout, montado en CADA pagina de /visual-lab/*) sino solo
 * la primera vez que se abre el panel (getMyAthletesForSelection,
 * Server Action) - se cachean despues en estado local del propio
 * componente para no repetir la consulta en aperturas posteriores del
 * mismo panel mientras el indicador siga montado (persiste entre
 * navegaciones dentro de /visual-lab/*, al vivir en el layout).
 */

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useSelectedAthlete } from '@/lib/useSelectedAthlete'
import {
  getSelectedAthleteIfAccessible,
  getMyAthletesForSelection,
  type SelectedAthleteResult,
  type AthleteSelectionOption,
} from '@/app/(portal)/visual-lab/play/selectedAthlete.actions'
import AthletePicker from '@/components/agenda/AthletePicker'

/** /visual-lab/play/<exerciseId>/demo - unica ruta demo real del
 * proyecto hoy (ver [exerciseId]/demo/page.tsx). Como ningun otro modulo
 * de Visual Lab tiene todavia modo demo, esta comprobacion ya devuelve
 * false correctamente en /visual-lab, /visual-lab/react, etc. sin
 * necesitar ningun caso adicional. */
function isDemoPathname(pathname: string): boolean {
  return /^\/visual-lab\/play\/[^/]+\/demo(?:\/|$)/.test(pathname)
}

interface Verification {
  athleteId: string
  result: SelectedAthleteResult | null
}

const barClass = 'mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orion-navy-100 bg-white px-4 py-2'
const actionBtnClass = 'rounded-lg border border-orion-navy-200 px-3 py-1 text-xs font-medium text-orion-navy-700 hover:bg-orion-navy-100'

export default function SelectedAthleteIndicator() {
  const pathname = usePathname()
  const { athleteId, isHydrated, selectAthlete, clearAthlete } = useSelectedAthlete()
  const demo = isDemoPathname(pathname)

  const [verification, setVerification] = useState<Verification | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [athletes, setAthletes] = useState<AthleteSelectionOption[] | null>(null)
  const [athletesLoading, setAthletesLoading] = useState(false)

  useEffect(() => {
    // En rutas demo no se dispara NINGUNA comprobacion de acceso
    // provocada por este indicador - ni siquiera si hay un athleteId
    // guardado.
    if (demo || !athleteId) return
    let cancelled = false
    getSelectedAthleteIfAccessible(athleteId).then((result) => {
      if (cancelled) return
      setVerification({ athleteId, result })
      // Acceso revocado / id invalido / atleta inexistente - los 3 casos
      // llegan aqui igual: se limpia la seleccion de forma segura.
      if (!result) clearAthlete()
    })
    return () => {
      cancelled = true
    }
  }, [athleteId, demo, clearAthlete])

  const openPanel = useCallback(() => {
    setPanelOpen(true)
    if (athletes !== null || athletesLoading) return // ya cargados o en curso - no repetir la consulta
    setAthletesLoading(true)
    getMyAthletesForSelection()
      .then(setAthletes)
      .finally(() => setAthletesLoading(false))
  }, [athletes, athletesLoading])

  const handleSelect = useCallback(
    (id: string) => {
      if (!id) return // AthletePicker reenvia "" si se pulsa "Ninguno" - aqui no se ofrece ese boton (allowNone=false), pero se ignora por si acaso
      selectAthlete(id)
      setPanelOpen(false)
    },
    [selectAthlete]
  )

  // Nada se renderiza en demo, ni siquiera el estado "sin seleccion" - la
  // demo no debe reflejar la seleccion activa en absoluto.
  if (demo) return null

  // Mientras no se ha completado la primera lectura de localStorage, no
  // se afirma nada todavia (ni "sin seleccion" ni un nombre).
  if (!isHydrated) return null

  const matchesCurrentSelection = verification?.athleteId === athleteId
  const ready = athleteId && matchesCurrentSelection && verification?.result != null

  return (
    <div className={barClass}>
      {!athleteId && (
        <p className="text-sm text-orion-navy-400">
          Sin deportista seleccionado · elige uno para empezar a trabajar en Visual Lab
        </p>
      )}

      {athleteId && !ready && (
        <p className="text-sm text-orion-navy-400">Comprobando selección…</p>
      )}

      {athleteId && ready && verification?.result && (
        <p className="text-sm text-orion-navy-700">
          Deportista: <span className="font-semibold text-orion-navy-900">{verification.result.fullName}</span>
          <span className="text-orion-navy-400"> · ORION ID #{verification.result.shortId}</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="button" onClick={openPanel} className={actionBtnClass}>
          {athleteId ? 'Cambiar' : 'Elegir deportista'}
        </button>
        {athleteId && (
          <button type="button" onClick={clearAthlete} className={actionBtnClass}>
            Cerrar
          </button>
        )}
      </div>

      {panelOpen && (
        <div className="mt-2 w-full rounded-lg border border-orion-navy-100 bg-orion-navy-50/40 p-3">
          {athletesLoading && <p className="text-xs text-orion-navy-400">Cargando deportistas…</p>}
          {!athletesLoading && athletes && athletes.length === 0 && (
            <p className="text-xs text-orion-navy-400">No tienes deportistas disponibles todavía.</p>
          )}
          {!athletesLoading && athletes && athletes.length > 0 && (
            <AthletePicker name="visual_lab_selected_athlete" athletes={athletes} allowNone={false} onSelect={handleSelect} />
          )}
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="mt-2 text-xs font-medium text-orion-navy-500 hover:text-orion-navy-700"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
