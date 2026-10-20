'use client'

/**
 * Monta el motor de Visual Memory Precision (orionPlayV2), con o sin
 * contexto de deportista. Mismo patron que ClickTargetsV2Runner.tsx/
 * ReactionTimeV2Runner.tsx: `contextLabel` sigue siendo puramente
 * informativo. `athleteId`, ahora, SI es funcional: cuando esta presente,
 * se cablea `onPersist` hacia submitPlayAttempt (extendida para aceptar
 * exerciseId 'visual-memory-precision' con su propia fila de catalogo -
 * NO reutiliza la de reaction-time).
 *
 * Autorizacion: NO se comprueba aqui ni en submitPlayAttempt si el
 * profesional puede operar sobre este athleteId - mismo criterio que
 * ReactionTimeV2Runner.tsx/ClickTargetsV2Runner.tsx.
 *
 * Ubicacion propia (src/components/orionPlayV2/visualMemory/), espejo de
 * reactionTime/ y clickTargets/ - no se reutiliza el runner de otro
 * ejercicio ni se crea una dependencia cruzada entre ejercicios.
 *
 * Cabecera sin "ORION Play" ni repeticion del nombre del ejercicio (mismo
 * criterio ya aplicado a los otros dos runners): el h1 "Visual Memory
 * Precision" ya lo renderiza VisualMemoryExercise.tsx. Esta franja
 * superior, ahora, solo aporta el badge de modo demo - `contextLabel` se
 * reenvia a VisualMemoryExercise.tsx como `athleteLabel` para que la
 * etiqueta del atleta se renderice junto a su propio h1 (ver ese
 * archivo), en vez de flotar por separado via PlayExerciseShell.tsx
 * (corrige el solapamiento visual que tenia antes).
 */

import ExerciseRunner, { type ExerciseOutcome } from '@/components/orionPlayV2/exercise-runner/ExerciseRunner'
import VisualMemoryExercise from '@/components/orionPlayV2/exercises/VisualMemoryExercise'
import { submitPlayAttempt } from '@/app/(portal)/visual-lab/play/actions'
import type { ExerciseMetrics } from '@/components/orionPlayV2/lib/types'

export default function VisualMemoryV2Runner({ contextLabel, athleteId }: { contextLabel?: string; athleteId?: string }) {
  const isDemo = !contextLabel

  const onPersist = athleteId
    ? async (
        metrics: ExerciseMetrics | Record<string, unknown>,
        outcome: ExerciseOutcome,
        idempotencyKey: string,
        effectiveConfig?: Record<string, unknown>
      ) => {
        const result = await submitPlayAttempt(athleteId, 'visual-memory-precision', metrics as Record<string, unknown>, {
          outcome,
          idempotencyKey,
          effectiveConfig,
        })
        if (result.error) throw new Error(result.error)
      }
    : undefined

  return (
    <div className="mx-auto max-w-6xl">
      {isDemo && (
        <div className="mb-2 flex justify-end">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Modo demo — resultados no guardados
          </span>
        </div>
      )}
      <ExerciseRunner exerciseId="visual-memory-precision" exerciseName="Visual Memory Precision" onPersist={onPersist}>
        {({ onComplete, registerSpacebarStart }) => (
          <VisualMemoryExercise
            onComplete={onComplete}
            canPersist={Boolean(athleteId)}
            registerSpacebarStart={registerSpacebarStart}
            athleteLabel={contextLabel}
          />
        )}
      </ExerciseRunner>
    </div>
  )
}
