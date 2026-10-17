"use client";

import ExerciseRunner from "@/components/orionPlay/ExerciseRunner";
import ReactionTimeExercise from "@/components/orionPlay/ReactionTimeExercise";

/**
 * Pegamento minimo entre el ExerciseRunner/ReactionTimeExercise copiados
 * de ORION Play y este atleta concreto. Ningun ejercicio mas conectado
 * todavia (Click Targets / Visual Memory quedan pendientes).
 */
export default function PlayReactionTimeClient({ athleteId }: { athleteId: string }) {
  return (
    <ExerciseRunner exerciseId="reaction-time" exerciseName="Reaction Time" athleteId={athleteId}>
      {({ onComplete }) => <ReactionTimeExercise onComplete={onComplete} />}
    </ExerciseRunner>
  );
}
