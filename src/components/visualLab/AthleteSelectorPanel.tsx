'use client'

/**
 * Panel de seleccion de usuario, autocontenido y reutilizable - extraido
 * del antiguo SelectedAthleteIndicator.tsx para que tanto
 * VisualLabAthleteCard.tsx (entrada de Visual Lab) como AthleteTag.tsx
 * (orionPlayV2/ui/, pantallas de ejecucion) lo usen sin duplicar la logica
 * de carga de deportistas.
 *
 * Carga perezosa (ambas variantes): getMyAthletesForSelection() (Server
 * Action) se cachea en estado local para no repetir la consulta mientras
 * el componente siga montado.
 *
 * Reutiliza AthletePicker.tsx (components/agenda/) SIN modificar su
 * logica de busqueda - solo le pasa la prop aditiva `placeholder` (ver
 * ese archivo). La lista de resultados de AthletePicker SIEMPRE flota
 * (`position: absolute`, ver ese archivo) - ni esta ni ninguna otra parte
 * de este componente cambia eso.
 *
 * `variant`:
 * - 'floating' (default): un boton disparador (triggerLabel/
 *   triggerClassName) que abre un panel `position: absolute` al
 *   pulsarlo, con boton "Cancelar". Usado por AthleteTag.tsx ("Cambiar",
 *   en las pantallas de ejecucion) - no se toca ese consumidor ni su
 *   resultado visual.
 * - 'inline': sin boton disparador ni estado abierto/cerrado propio - el
 *   campo de busqueda de AthletePicker se renderiza siempre visible,
 *   cargando la lista en el MONTAJE (no en un clic). Usado por
 *   VisualLabAthleteCard.tsx para la busqueda inmediata: la tarjeta en si
 *   (icono+input) esta en el flujo normal de la pagina, pero sus
 *   RESULTADOS (dentro de AthletePicker) flotan igual que en 'floating' -
 *   asi la tarjeta no crece ni desplaza nada de debajo mientras se
 *   escribe (ver AthletePicker.tsx para el detalle).
 *
 * `excludeIds`/2o parametro de `onSelect` (ORION Tools, "Añadir
 * participantes"): dos extensiones ADITIVAS, con default que reproduce
 * el comportamiento anterior exacto para el unico consumidor existente
 * (VisualLabAthleteCard, que no pasa ninguna de las dos). `excludeIds`
 * filtra la lista ANTES de pasarsela a AthletePicker (nunca se toca ese
 * componente) - asi una persona ya seleccionada (la principal, u otro
 * participante ya añadido) ni siquiera aparece como opcion, en vez de
 * permitir elegirla y rechazarla despues. El 2o argumento de `onSelect`
 * (la opcion completa, no solo el id) evita que quien lo necesite tenga
 * que volver a pedir la lista de deportistas por su cuenta.
 */

import { useCallback, useEffect, useState } from 'react'
import { getMyAthletesForSelection, type AthleteSelectionOption } from '@/app/(portal)/visual-lab/play/selectedAthlete.actions'
import AthletePicker from '@/components/agenda/AthletePicker'

type AthleteSelectorPanelProps = {
  onSelect: (athleteId: string, option: AthleteSelectionOption) => void
  variant?: 'floating' | 'inline'
  /** Requeridos solo para 'floating' (ignorados en 'inline', que no tiene
   * boton disparador propio). */
  triggerLabel?: string
  triggerClassName?: string
  /** Solo relevante en 'inline' - reenviado tal cual a AthletePicker. */
  placeholder?: string
  /** IDs a excluir de la lista de resultados (p.ej. la persona principal
   * y los participantes ya añadidos) - por defecto ninguno. */
  excludeIds?: string[]
}

export default function AthleteSelectorPanel({
  triggerLabel,
  triggerClassName,
  onSelect,
  variant = 'floating',
  placeholder,
  excludeIds,
}: AthleteSelectorPanelProps) {
  const [open, setOpen] = useState(false)
  const [athletes, setAthletes] = useState<AthleteSelectionOption[] | null>(null)
  const [loading, setLoading] = useState(false)

  const loadAthletes = useCallback(() => {
    if (athletes !== null || loading) return // ya cargados o en curso - no repetir la consulta
    setLoading(true)
    getMyAthletesForSelection()
      .then(setAthletes)
      .finally(() => setLoading(false))
  }, [athletes, loading])

  useEffect(() => {
    // 'inline' no tiene boton disparador - se carga en el montaje. En
    // 'floating' esto no hace nada (openPanel es quien carga, al pulsar).
    // setLoading/setAthletes (dentro de loadAthletes) sincronizan estado
    // con un sistema externo (Server Action) tras el montaje - mismo caso
    // ya aceptado en useSelectedAthlete.ts/AthleteSelectionGate.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (variant === 'inline') loadAthletes()
  }, [variant, loadAthletes])

  const openPanel = useCallback(() => {
    setOpen(true)
    loadAthletes()
  }, [loadAthletes])

  const visibleAthletes = excludeIds?.length ? athletes?.filter((a) => !excludeIds.includes(a.id)) ?? null : athletes

  const handleSelect = useCallback(
    (id: string) => {
      if (!id) return // AthletePicker reenvia "" si se pulsa "Ninguno" - no se ofrece ese boton (allowNone=false), se ignora por si acaso
      const option = athletes?.find((a) => a.id === id)
      if (!option) return // defensivo: no deberia poder pasar (vendria de la propia lista ya cargada)
      onSelect(id, option)
      setOpen(false) // no-op en 'inline' (nada lee `open` ahi) - cierra el panel 'floating'
    },
    [onSelect, athletes]
  )

  const resultsContent = (
    <>
      {loading && <p className="text-xs text-orion-navy-400">Cargando usuarios…</p>}
      {!loading && visibleAthletes && visibleAthletes.length === 0 && (
        <p className="text-xs text-orion-navy-400">No tienes usuarios disponibles todavía.</p>
      )}
      {!loading && visibleAthletes && visibleAthletes.length > 0 && (
        <AthletePicker
          name="visual_lab_selected_athlete"
          athletes={visibleAthletes}
          allowNone={false}
          onSelect={handleSelect}
          placeholder={placeholder}
        />
      )}
    </>
  )

  if (variant === 'inline') {
    return resultsContent
  }

  return (
    <div className="relative">
      <button type="button" onClick={openPanel} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-orion-navy-100 bg-white p-3 shadow-lg">
          {resultsContent}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 text-xs font-medium text-orion-navy-500 hover:text-orion-navy-700"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
