import { notFound } from "next/navigation";
import PlayExerciseShell from "@/components/orionPlayV2/ui/PlayExerciseShell";
import ReactionTimeV2Runner from "@/components/orionPlayV2/reactionTime/ReactionTimeV2Runner";
import ClickTargetsV2Runner from "@/components/orionPlayV2/clickTargets/ClickTargetsV2Runner";
import VisualMemoryV2Runner from "@/components/orionPlayV2/visualMemory/VisualMemoryV2Runner";
import SimpleReactionV2Runner from "@/components/orionPlayV2/simpleReaction/SimpleReactionV2Runner";

/**
 * Modo demo del catalogo normal de ORION Play: solo tiene sentido hoy
 * para los ejercicios con modo demo implementado (Reaction Time, Click
 * Targets, Visual Memory Precision, Solo GO). Si alguna vez se navega
 * aqui con otro exerciseId, 404 explicito en vez de montar un runner por
 * error - no se asume nada. Sin seleccion de atleta, sin athleteId, sin
 * persistencia - ninguno de los 4 runners recibe athleteId aqui, asi que
 * ninguno cablea onPersist (ver cada *V2Runner.tsx: la condicion real de
 * "hay deportista" es la presencia de athleteId, no esta ruta) - esta
 * ruta demo no puede terminar guardando resultados reales por
 * construccion, no por una comprobacion adicional.
 */
const DEMO_EXERCISE_IDS = ["reaction-time", "click-targets", "visual-memory-precision", "simple-reaction"] as const;

export default async function PlayExerciseDemoPage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  if (!DEMO_EXERCISE_IDS.includes(exerciseId as (typeof DEMO_EXERCISE_IDS)[number])) notFound();

  return (
    <PlayExerciseShell>
      <div className="mx-auto max-w-6xl">
        {exerciseId === "reaction-time" ? (
          <ReactionTimeV2Runner />
        ) : exerciseId === "click-targets" ? (
          <ClickTargetsV2Runner />
        ) : exerciseId === "visual-memory-precision" ? (
          <VisualMemoryV2Runner />
        ) : (
          <SimpleReactionV2Runner />
        )}
      </div>
    </PlayExerciseShell>
  );
}
