'use client'

/**
 * Monta el motor V2 de Solo GO (orionPlayV2) - espejo literal de
 * ReactionTimeV2Runner.tsx para el nuevo exerciseId 'simple-reaction'.
 * Mismo criterio exacto: `contextLabel` informativo, `athleteId` decide
 * si se cablea `onPersist` hacia submitPlayAttempt (ya acepta
 * 'simple-reaction' ademas de 'reaction-time' - ver actions.ts para el
 * mapeo de persistencia y la deuda tecnica documentada alli). En modo
 * demo (athleteId ausente) no se persiste nada, igual que Go/No Go.
 *
 * Autorizacion: misma nota que ReactionTimeV2Runner.tsx - no se comprueba
 * aqui si el profesional puede operar sobre este athleteId, eso lo hace
 * la RLS de core.sessions al insertar (sin cambios, se reutiliza
 * exactamente la misma politica).
 *
 * Ubicacion propia (src/components/orionPlayV2/simpleReaction/), espejo
 * de reactionTime/clickTargets/visualMemory - no se reutiliza el runner
 * de otro ejercicio.
 */

import ExerciseRunner, { type ExerciseOutcome } from '@/components/orionPlayV2/exercise-runner/ExerciseRunner'
import SimpleReactionExercise from '@/components/orionPlayV2/exercises/SimpleReactionExercise'
import { submitPlayAttempt } from '@/app/(portal)/visual-lab/play/actions'
import type { ExerciseMetrics } from '@/components/orionPlayV2/lib/types'

export default function SimpleReactionV2Runner({ contextLabel, athleteId }: { contextLabel?: string; athleteId?: string }) {
  const isDemo = !contextLabel

  const onPersist = athleteId
    ? async (
        metrics: ExerciseMetrics | Record<string, unknown>,
        outcome: ExerciseOutcome,
        idempotencyKey: string,
        effectiveConfig?: Record<string, unknown>
      ) => {
        const result = await submitPlayAttempt(athleteId, 'simple-reaction', metrics as Record<string, unknown>, {
          outcome,
          idempotencyKey,
          effectiveConfig,
        })
        if (result.error) throw new Error(result.error)
      }
    : undefined

  return (
    <div className="mx-auto max-w-6xl">
      {/* Nombre del atleta eliminado de aqui (ajuste visual posterior a la
          Fase 3): ahora lo muestra AthleteTag.tsx, junto al boton de volver
          (ver PlayExerciseShell.tsx) - evita la duplicacion que habia junto
          al titulo del ejercicio. contextLabel/isDemo siguen intactos: la
          condicion real de "modo demo" sigue siendo Boolean(athleteId)/
          !contextLabel, sin cambios funcionales, solo deja de renderizarse
          como texto aqui. */}
      {isDemo && (
        <div className="mb-2 flex justify-end">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Modo demo — resultados no guardados
          </span>
        </div>
      )}
      <ExerciseRunner exerciseId="simple-reaction" exerciseName="Tiempo de reacción" onPersist={onPersist}>
        {({ onComplete, registerSpacebarStart }) => (
          <SimpleReactionExercise
            onComplete={onComplete}
            canPersist={Boolean(athleteId)}
            registerSpacebarStart={registerSpacebarStart}
          />
        )}
      </ExerciseRunner>
    </div>
  )
}
