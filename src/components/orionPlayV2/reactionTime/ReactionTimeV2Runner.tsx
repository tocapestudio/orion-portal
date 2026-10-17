'use client'

/**
 * Monta el motor V2 de Reaction Time (orionPlayV2, nombre visible "Go/No
 * Go" - identificador tecnico `reaction-time` sin cambios), con o sin
 * contexto de deportista. `contextLabel` sigue siendo puramente
 * informativo (nombre mostrado en la cabecera). `athleteId`, en cambio,
 * SI es funcional: cuando esta presente, se cablea `onPersist` hacia
 * submitPlayAttempt (Server Action ya existente en
 * visual-lab/play/actions.ts) para guardar la ejecucion real en
 * core.sessions/session_activities/results. En modo demo (athleteId
 * ausente) `onPersist` no se pasa, asi que ExerciseRunner no intenta
 * persistir nada - la condicion real de "hay deportista" es la
 * presencia del UUID, no el string contextLabel. Esa misma condicion
 * (`Boolean(athleteId)`) se reenvia a ReactionTimeExercise.tsx como
 * `canPersist`, que decide si se muestra "Guardar resultados" y si
 * "Repetir" avisa antes de perder resultados sin guardar - en demo
 * ninguno de los dos tiene sentido, nunca hay nada real que guardar.
 *
 * Autorizacion: NO se comprueba aqui ni en submitPlayAttempt si el
 * profesional puede operar sobre este athleteId - esa es exactamente la
 * responsabilidad de la RLS de core.sessions
 * (is_professional_of_athlete(athlete_id) en la policy de INSERT),
 * verificada en la base real antes de este cambio. Confiar en athleteId
 * aqui solo decide QUE pedir guardar, nunca SI esta permitido guardarlo.
 *
 * Ubicacion compartida (src/components/orionPlayV2/reactionTime/):
 * usado tanto por la ruta de prueba aislada
 * (/visual-lab/play-v2-test/reaction-time/...) como por el catalogo
 * normal (/visual-lab/play/reaction-time/...) - un unico componente,
 * sin duplicar.
 *
 * Cabecera sin "ORION Play" ni repeticion del nombre del ejercicio: ese
 * contexto ya esta dado por la navegacion (Visual Lab -> ORION Play) y
 * por el propio h1 "Go/No Go" que ya renderiza ReactionTimeExercise.tsx.
 * Esta franja superior, ahora, solo aporta lo que ReactionTimeExercise.tsx
 * no sabe: el nombre del atleta (contextLabel) y el badge de modo demo.
 */

import ExerciseRunner, { type ExerciseOutcome } from '@/components/orionPlayV2/exercise-runner/ExerciseRunner'
import ReactionTimeExercise from '@/components/orionPlayV2/exercises/ReactionTimeExercise'
import { submitPlayAttempt } from '@/app/(portal)/visual-lab/play/actions'
import type { ExerciseMetrics } from '@/components/orionPlayV2/lib/types'

export default function ReactionTimeV2Runner({ contextLabel, athleteId }: { contextLabel?: string; athleteId?: string }) {
  const isDemo = !contextLabel

  const onPersist = athleteId
    ? async (
        metrics: ExerciseMetrics | Record<string, unknown>,
        outcome: ExerciseOutcome,
        idempotencyKey: string,
        effectiveConfig?: Record<string, unknown>
      ) => {
        const result = await submitPlayAttempt(athleteId, 'reaction-time', metrics as Record<string, unknown>, {
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
      <ExerciseRunner exerciseId="reaction-time" exerciseName="Go/No Go" onPersist={onPersist}>
        {({ onComplete, registerSpacebarStart }) => (
          <ReactionTimeExercise
            onComplete={onComplete}
            canPersist={Boolean(athleteId)}
            registerSpacebarStart={registerSpacebarStart}
          />
        )}
      </ExerciseRunner>
    </div>
  )
}
