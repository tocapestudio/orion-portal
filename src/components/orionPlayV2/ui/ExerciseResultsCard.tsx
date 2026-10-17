'use client'

/**
 * Tarjeta de resultados COMUN a los 3 ejercicios de ORION Play V2 - usada
 * tanto para la pantalla de resultados normal (al completar) como para la
 * de resultados parciales (al interrumpir con la X): misma estructura,
 * mismas acciones, mismo boton de salida en ambos casos, en los 3
 * ejercicios. Antes cada ejercicio duplicaba esta composicion con
 * pequeñas diferencias entre si (padding, orden/presencia del boton de
 * salida dentro o fuera de la tarjeta, texto/destino de ese boton) pese a
 * ser conceptualmente la misma pantalla.
 *
 * Lo que aporta cada ejercicio (no este componente):
 * - `title`/`subtitle`: texto especifico ("Resultados" vs "Ejercicio
 *   detenido", resumen de intentos/rondas/objetivos si aplica).
 * - `children`: sus propias metricas (MetricCard, nombres, calculos) o su
 *   mensaje de "sin resultados" - este componente no sabe nada de eso.
 * - `breakdown`: su propio desglose colapsable (TrialBreakdown /
 *   TargetBreakdown / RoundBreakdown) si lo hay.
 * - `onRepeat`/`onReconfigure`: su propia logica de reinicio/reconfigurar.
 *
 * El boton de salida ("Salir a ORION Play") esta SIEMPRE presente, SIEMPRE
 * DENTRO de la propia <Card> (debajo de Repetir/Cambiar configuración, por
 * encima del desglose colapsable), y siempre el mismo componente
 * (ExerciseExitButton) - asi nunca puede faltar ni divergir en texto,
 * destino o posicion entre ejercicios o entre resultados normales y
 * parciales. Al estar dentro de la Card, hereda automaticamente el mismo
 * contexto de stacking que el resto de la tarjeta tanto en ResultsScreen
 * (inline en la pagina) como en StoppedScreen (dentro de su propio overlay
 * a pantalla completa) - sin portales propios ni condicionales fragiles.
 */

import type { ReactNode } from 'react'
import Card from './Card'
import Button from './Button'
import ExerciseExitButton from './ExerciseExitButton'
import ExerciseSaveButton, { type ExerciseSaveState } from './ExerciseSaveButton'

function ArrowPathIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function Cog6ToothIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431 1.001a6.606 6.606 0 0 1 0 .255c-.007.388.138.761.43 1.001l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-1.001a6.606 6.606 0 0 1 0-.255c.007-.388-.138-.761-.43-1.001l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <circle cx="12" cy="12" r="2.625" />
    </svg>
  )
}

export default function ExerciseResultsCard({
  title,
  subtitle,
  children,
  breakdown,
  onRepeat,
  onReconfigure,
  onBeforeExit,
  onSave,
  saveState,
  saveError,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  breakdown?: ReactNode
  onRepeat: () => void
  onReconfigure: () => void
  /** Opcional: notificar onComplete (el gancho de persistencia real via
   * onPersist, ver ExerciseRunner.tsx/ExerciseExitButton.tsx) justo antes
   * de navegar a /visual-lab/play. Puede devolver una Promise -
   * ExerciseExitButton la espera antes de navegar y muestra un error si
   * rechaza. */
  onBeforeExit?: () => void | Promise<void>
  /** Opcional (los 3 juntos, o ninguno): habilita el boton "Guardar
   * resultados", que guarda la ejecucion actual SIN salir de esta
   * pantalla. Solo lo usa hoy Reaction Time (Go/No Go) - si no se pasa
   * (Click Targets/Visual Memory, o el propio Go/No Go en modo demo), el
   * boton simplemente no se renderiza. Ver ExerciseSaveButton.tsx. */
  onSave?: () => void
  saveState?: ExerciseSaveState
  saveError?: string | null
}) {
  return (
    <Card className="p-7 max-w-lg w-full max-h-full overflow-y-auto text-center shadow-2xl">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="mb-8">{children}</div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onRepeat} variant="primary" className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5">
          <ArrowPathIcon className="h-4 w-4" /> Repetir
        </Button>
        <Button onClick={onReconfigure} variant="secondary" className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-center">
          <Cog6ToothIcon className="h-4 w-4 shrink-0" /> Cambiar configuración
        </Button>
      </div>

      {onSave && (
        <div className="mt-3">
          <ExerciseSaveButton state={saveState ?? 'idle'} error={saveError} onClick={onSave} />
        </div>
      )}

      <div className="mt-3 flex justify-center">
        <ExerciseExitButton onBeforeExit={onBeforeExit} />
      </div>

      {breakdown}
    </Card>
  )
}
