'use client'

/**
 * Monta el motor de Click Targets (orionPlayV2), con o sin contexto de
 * deportista. Mismo patron que ReactionTimeV2Runner.tsx: `contextLabel`
 * sigue siendo puramente informativo (nombre mostrado en la cabecera).
 * `athleteId`, ahora, SI es funcional: cuando esta presente, se cablea
 * `onPersist` hacia submitPlayAttempt (Server Action ya existente en
 * visual-lab/play/actions.ts, extendida para aceptar exerciseId
 * 'click-targets' con su propia fila de catalogo - NO reutiliza la de
 * reaction-time) para guardar la ejecucion real en
 * core.sessions/session_activities/results. En modo demo (athleteId
 * ausente) `onPersist` no se pasa, igual que antes.
 *
 * Autorizacion: NO se comprueba aqui ni en submitPlayAttempt si el
 * profesional puede operar sobre este athleteId - mismo criterio exacto
 * que ReactionTimeV2Runner.tsx, es responsabilidad de la RLS de
 * core.sessions.
 *
 * Ubicacion propia (src/components/orionPlayV2/clickTargets/), espejo de
 * src/components/orionPlayV2/reactionTime/ - no se reutiliza el runner de
 * Reaction Time ni se crea una dependencia cruzada entre ejercicios.
 *
 * Cabecera sin "ORION Play" ni repeticion del nombre del ejercicio: ese
 * contexto ya esta dado por la navegacion (Visual Lab -> ORION Play) y por
 * el propio h1 "Click Targets" que ya renderiza ClickTargetsExercise.tsx.
 * Esta franja superior, ahora, solo aporta lo que ClickTargetsExercise.tsx
 * no sabe: el nombre del atleta (contextLabel) y el badge de modo demo.
 */

import ExerciseRunner, { type ExerciseOutcome } from '@/components/orionPlayV2/exercise-runner/ExerciseRunner'
import ClickTargetsExercise from '@/components/orionPlayV2/exercises/ClickTargetsExercise'
import { submitPlayAttempt } from '@/app/(portal)/visual-lab/play/actions'
import type { ExerciseMetrics } from '@/components/orionPlayV2/lib/types'

export default function ClickTargetsV2Runner({ contextLabel, athleteId }: { contextLabel?: string; athleteId?: string }) {
  const isDemo = !contextLabel

  const onPersist = athleteId
    ? async (
        metrics: ExerciseMetrics | Record<string, unknown>,
        outcome: ExerciseOutcome,
        idempotencyKey: string,
        effectiveConfig?: Record<string, unknown>
      ) => {
        const result = await submitPlayAttempt(athleteId, 'click-targets', metrics as Record<string, unknown>, {
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
      <ExerciseRunner exerciseId="click-targets" exerciseName="Click Targets" onPersist={onPersist}>
        {({ onComplete, registerSpacebarStart }) => (
          <ClickTargetsExercise
            onComplete={onComplete}
            canPersist={Boolean(athleteId)}
            registerSpacebarStart={registerSpacebarStart}
          />
        )}
      </ExerciseRunner>
    </div>
  )
}
