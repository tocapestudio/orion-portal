'use client'

/**
 * Tarjeta de seleccion de usuario para la entrada de Visual Lab
 * (/visual-lab) - sustituye a la antigua franja horizontal de
 * SelectedAthleteIndicator (ya retirada del layout de Visual Lab, ver
 * ese archivo). Usa useVerifiedSelectedAthlete.ts (hook compartido con
 * AthleteTag.tsx) para la maquina de estados, y AthleteSelectorPanel.tsx
 * (compartido, variante 'inline' - ver ese archivo) para la busqueda.
 *
 * Fondo amarillo muy suave/calido (bg-amber-50, border-amber-200) -
 * deliberadamente distinto del resto de tarjetas de este catalogo (blancas
 * o con acento azul), para diferenciarla visualmente como "contexto de
 * trabajo" en vez de "modulo navegable", sin resultar llamativa.
 *
 * Fase 3 (rediseño del selector): dos anchos distintos segun el modo -
 * 'selected' (nombre+ORION ID+iconos) mantiene el ancho contenido
 * original (w-fit, tope max-w-md, mas estrecha que ORION Play); el modo
 * de busqueda (sin seleccion, o "Cambiar usuario" pulsado) necesita mas
 * sitio para la barra de busqueda y usa w-full max-w-2xl (sigue siendo
 * mas estrecha que la tarjeta de ORION Play, max-w-3xl).
 *
 * `searchMode` es estado de UI local, independiente de si hay seleccion
 * guardada: permite que "Cambiar usuario" muestre la MISMA busqueda
 * inline que el estado vacio, en vez de un panel flotante aparte (pedido
 * explicito de la Fase 3) - se resetea a false en cuanto se elige un
 * nuevo usuario (handleSelect) para volver al estado compacto normal.
 */

import { useState } from 'react'
import { useVerifiedSelectedAthlete } from '@/lib/useVerifiedSelectedAthlete'
import AthleteSelectorPanel from './AthleteSelectorPanel'

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/** Dos flechas opuestas ("intercambiar") - "Cambiar usuario". */
function SwapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M7 3 3 7l4 4" />
      <path d="M3 7h13a4 4 0 0 1 4 4v1" />
      <path d="M17 21l4-4-4-4" />
      <path d="M21 17H8a4 4 0 0 1-4-4v-1" />
    </svg>
  )
}

/** X de cierre - "Quitar usuario" (deliberadamente NO una papelera: solo
 * borra la seleccion activa, nunca la ficha/historial/resultados - un
 * icono de papelera sugeriria visualmente lo contrario). */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

const iconBtnClass =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-orion-navy-500 transition-colors hover:bg-amber-100 hover:text-orion-navy-800'

export default function VisualLabAthleteCard() {
  const { isHydrated, athleteId, isChecking, verified, selectAthlete, clearAthlete } = useVerifiedSelectedAthlete()
  const [searchMode, setSearchMode] = useState(false)

  // Evita parpadeo: nada hasta confirmar si hay o no seleccion guardada.
  if (!isHydrated) return null

  const handleSelect = (id: string) => {
    selectAthlete(id)
    setSearchMode(false)
  }

  const isPendingCheck = Boolean(athleteId) && isChecking && !searchMode
  const isVerifiedSelection = Boolean(athleteId) && !isChecking && verified !== null && !searchMode

  if (isPendingCheck) {
    return (
      <div className="mx-auto flex w-fit max-w-md items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <UserIcon className="h-5 w-5" />
        </div>
        <p className="text-sm text-orion-navy-500">Comprobando selección…</p>
      </div>
    )
  }

  if (isVerifiedSelection && verified) {
    return (
      <div className="mx-auto flex w-fit max-w-md flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <UserIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-orion-navy-900">{verified.fullName}</p>
          <p className="text-xs text-orion-navy-500">ORION ID #{verified.shortId}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchMode(true)}
            className={iconBtnClass}
            aria-label="Cambiar usuario"
            title="Cambiar usuario"
          >
            <SwapIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => clearAthlete()}
            className={iconBtnClass}
            aria-label="Quitar usuario"
            title="Quitar usuario"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Sin seleccion guardada, o "Cambiar usuario" pulsado: busqueda
  // inmediata (sin boton "Elegir" intermedio). El campo en si esta en el
  // flujo normal de la tarjeta (no crece ni cambia de altura); sus
  // RESULTADOS flotan por encima del contenido de debajo (AthletePicker,
  // ver ese archivo) - ver AthleteSelectorPanel.tsx variant='inline'.
  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <UserIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <AthleteSelectorPanel variant="inline" placeholder="Buscar deportista por nombre o ID…" onSelect={handleSelect} />
        </div>
        {searchMode && (
          <button
            type="button"
            onClick={() => setSearchMode(false)}
            className="shrink-0 text-xs font-medium text-orion-navy-500 hover:text-orion-navy-700"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
