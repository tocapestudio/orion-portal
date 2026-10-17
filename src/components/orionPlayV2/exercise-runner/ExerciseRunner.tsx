'use client'

/**
 * Adaptacion minima de components/exercise-runner/ExerciseRunner.tsx de
 * ORION Play V.2. Cambio real, literal y reversible — es la UNICA
 * diferencia funcional respecto al original:
 *
 * ORIGINAL (V.2):
 *   import { useApiClient } from '@/lib/useApiClient'
 *   ...
 *   const apiClient = useApiClient()
 *   ...
 *   const onComplete = useCallback(
 *     (metrics) => {
 *       ...
 *       apiClient
 *         .submitExerciseAttempt(exerciseId, payload, { exerciseName })
 *         .catch((err) => { ...; setPersistError(message) })
 *     },
 *     [apiClient, exerciseId, exerciseName]
 *   )
 *
 * AQUI: se elimina el import/uso de useApiClient (Clerk+API+Mongo) y se
 * sustituye la llamada fija por un prop opcional `onPersist`, inyectado
 * por quien use el componente. Si no se pasa `onPersist` (caso de modo
 * demo, sin deportista seleccionado), el runner no intenta persistir
 * nada.
 *
 * `onComplete` ahora es `async` y PROPAGA el resultado de `onPersist`
 * (en vez de solo capturarlo en `persistError`). El `await` de quien
 * llama a `onComplete` (ver handleExit en cada ejercicio) es lo que
 * permite a ExerciseExitButton.tsx/ExerciseSaveButton.tsx esperar el
 * guardado real y mostrar un error si falla - este componente sigue sin
 * saber nada de metricas concretas ni de Core, solo reenvia la promesa
 * de `onPersist` (firma generica: metrics/outcome/idempotencyKey, los 3
 * opacos para este archivo).
 *
 * BUG REAL encontrado y corregido aqui: `onComplete` YA NO llama a
 * `setStatus('completed')`. Antes lo hacia siempre que se invocaba
 * (en cualquier guardado, no solo al salir), lo que desmontaba POR
 * COMPLETO a `children(...)` (todo ReactionTimeExercise.tsx: titulo,
 * ResultsScreen/StoppedScreen, Repetir, Cambiar configuracion, el propio
 * boton de salida) y lo sustituia por el `ResultSummary` generico de
 * aqui abajo. Con "Salir a ORION Play" esto era invisible, porque
 * ExerciseExitButton.tsx navega fuera de la pagina justo despues. Con
 * "Guardar resultados" (que deliberadamente NO navega, para poder seguir
 * en la pantalla de resultados) el desmontaje se quedaba visible: tras
 * guardar, desaparecian Repetir/Cambiar configuracion/Guardar, y solo
 * quedaba utilizable el icono "Volver a ORION Play" de PlayExerciseShell
 * (que vive fuera de este arbol, a nivel de pagina). `status`/
 * `lastMetrics`/`persistError`/`ResultSummary` quedan ahora
 * efectivamente sin alcanzar NUNCA 'completed' - se dejan tal cual
 * (no se borra el codigo) porque siguen siendo el mismo patron para
 * Click Targets/Visual Memory si algun dia necesitaran este runner de
 * otra forma, pero hoy cada ejercicio ya posee su propia pantalla de
 * resultados (ResultsScreen/StoppedScreen vía ExerciseResultsCard) -
 * este fallback generico nunca fue necesario para ninguno de los 3.
 *
 * Todo lo demas es identico al original, letra por letra, incluyendo una
 * particularidad que YA estaba asi en V.2 y se conserva tal cual (no es
 * un error introducido aqui): el runner arranca directamente en
 * 'running' (sin pantalla idle).
 *
 * NUEVO: inicio con barra espaciadora, en este punto comun para que
 * funcione igual en los 3 ejercicios V2 sin triplicar la logica. Este
 * componente no sabe nada de `flow.stage` ni de cuando "empezar" tiene
 * sentido (eso es decision de cada ejercicio) - solo posee el listener
 * de teclado en si. Canal inverso al habitual: en vez de que el padre
 * pase algo al hijo, aqui el HIJO (cada Exercise.tsx) le dice a este
 * componente que funcion ejecutar si se pulsa Espacio ahora mismo, via
 * `registerSpacebarStart` (parte del render-prop, igual que `onComplete`).
 * Cada ejercicio llama a `registerSpacebarStart(handleOpenFullscreen)`
 * SOLO mientras `flow.stage === 'config'`, y `registerSpacebarStart(null)`
 * en cualquier otro stage (y al desmontarse) - ver ReactionTimeExercise.tsx/
 * ClickTargetsExercise.tsx/VisualMemoryExercise.tsx. Mientras no haya
 * nada registrado, el listener ni siquiera se añade al documento.
 */

import { useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { ExerciseMetrics } from '../lib/types'
import ResultSummary from './ResultSummary'

const RUNNER_CONTAINER_MIN_HEIGHT = 520

/** Controles nativos que ya gestionan Espacio por si mismos (el boton
 * "Iniciar Ejercicio" incluido - activarlo con Espacio ya dispara su
 * propio onClick): si el foco esta en uno de estos, se deja pasar el
 * evento tal cual, sin preventDefault ni disparar registerSpacebarStart,
 * para no interceptar ni duplicar ese comportamiento nativo. */
function isSpaceHandledNatively(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return true
  if (target.isContentEditable) return true
  const role = target.getAttribute('role')
  if (role && ['slider', 'button', 'textbox', 'switch', 'checkbox', 'radio', 'tab', 'menuitem', 'combobox'].includes(role)) return true
  return false
}

export type ExerciseRunnerStatus = 'running' | 'completed'

/** 'completed': finalizacion normal. 'interrupted': el usuario detuvo el
 * ejercicio antes de tiempo (ver StoppedScreen de cada ejercicio) - la
 * Server Action que reciba esto decide como representarlo en Core
 * (sessions.status/session_activities.status), este runner no lo sabe. */
export type ExerciseOutcome = 'completed' | 'interrupted'

interface ExerciseRunnerProps {
  exerciseId: string
  exerciseName?: string
  /** Sustituye a apiClient.submitExerciseAttempt del original. Opcional:
   * si no se pasa, el runner no persiste nada. `idempotencyKey`: opaca
   * para este componente, generada por cada ejercicio por ejecucion -
   * solo se reenvia tal cual. `effectiveConfig` (Fase B, fiabilidad de
   * datos): igual de opaca, la configuracion real capturada por cada
   * ejercicio (effectiveConfigRef, Fase A) - este componente no sabe nada
   * de su forma, solo la reenvia. */
  onPersist?: (
    metrics: ExerciseMetrics | Record<string, unknown>,
    outcome: ExerciseOutcome,
    idempotencyKey: string,
    effectiveConfig?: Record<string, unknown>
  ) => Promise<void>
  children: (props: {
    onComplete: (
      metrics: ExerciseMetrics | Record<string, unknown>,
      outcome?: ExerciseOutcome,
      idempotencyKey?: string,
      effectiveConfig?: Record<string, unknown>
    ) => Promise<void>
    /** El ejercicio llama a esto para decir "si se pulsa Espacio ahora,
     * haz esto" (normalmente su propio handleOpenFullscreen, solo
     * mientras esta en la pantalla de configuracion) o `null` para decir
     * "Espacio no debe hacer nada ahora mismo" (cualquier otro stage).
     * Ver cabecera del archivo. */
    registerSpacebarStart: (handler: (() => void) | null) => void
  }) => ReactNode
}

export default function ExerciseRunner({
  exerciseId,
  onPersist,
  children,
}: ExerciseRunnerProps) {
  // Start directly in 'running' state - no idle screen
  const [status, setStatus] = useState<ExerciseRunnerStatus>('running')
  const [lastMetrics, setLastMetrics] = useState<Record<string, unknown> | null>(
    null
  )
  const [persistError, setPersistError] = useState<string | null>(null)

  const onComplete = useCallback(
    async (
      metrics: ExerciseMetrics | Record<string, unknown>,
      outcome: ExerciseOutcome = 'completed',
      idempotencyKey = '',
      effectiveConfig?: Record<string, unknown>
    ) => {
      setLastMetrics(metrics as Record<string, unknown>)
      setPersistError(null)
      if (!onPersist) return
      const payload = metrics as Record<string, unknown>
      try {
        await onPersist(payload, outcome, idempotencyKey, effectiveConfig)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save results'
        setPersistError(message)
        throw err
      }
    },
    [onPersist]
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- conservado tal cual del original V.2 (ya era codigo muerto alli: no hay boton que lo llame)
  const handleRestart = useCallback(() => {
    setLastMetrics(null)
    setPersistError(null)
    setStatus('running')
  }, [])

  // `useState` (no un ref) para que el efecto de abajo se reevalue cuando
  // el ejercicio registre/desregistre su handler - envuelto en `() => handler`
  // porque setState interpretaria una funcion pasada directamente como
  // "funcion actualizadora" en vez de como el valor a guardar.
  const [spacebarStart, setSpacebarStart] = useState<(() => void) | null>(null)
  const registerSpacebarStart = useCallback((handler: (() => void) | null) => {
    setSpacebarStart(() => handler)
  }, [])

  useEffect(() => {
    if (!spacebarStart) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      // event.repeat: true en los keydown automaticos que el navegador
      // genera mientras la tecla sigue pulsada - ignorarlos es lo que
      // evita arrancar varias veces por mantener Espacio pulsado.
      if (event.repeat) return
      if (isSpaceHandledNatively(event.target)) return
      event.preventDefault()
      spacebarStart()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [spacebarStart])

  return (
    <div className="max-w-6xl mx-auto">
      {status === 'running' && (
        <div
          className="min-h-[var(--runner-height)]"
          style={
            {
              '--runner-height': `${RUNNER_CONTAINER_MIN_HEIGHT}px`,
            } as React.CSSProperties
          }
        >
          <div style={{ minHeight: RUNNER_CONTAINER_MIN_HEIGHT }}>
            {children({ onComplete, registerSpacebarStart })}
          </div>
        </div>
      )}

      {status === 'completed' && lastMetrics && (
        <div className="space-y-4">
          <ResultSummary exerciseId={exerciseId} metrics={lastMetrics} />
          {persistError && (
            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">
              {persistError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
