import { notFound } from "next/navigation";
import { getAthleteById } from "@/lib/data/athletes";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import PlayExerciseShell from "@/components/orionPlayV2/ui/PlayExerciseShell";
import { getPlayExercise } from "@/components/orionPlay/catalog";
import PlayReactionTimeClient from "./PlayReactionTimeClient";
import ReactionTimeV2Runner from "@/components/orionPlayV2/reactionTime/ReactionTimeV2Runner";
import ClickTargetsV2Runner from "@/components/orionPlayV2/clickTargets/ClickTargetsV2Runner";
import VisualMemoryV2Runner from "@/components/orionPlayV2/visualMemory/VisualMemoryV2Runner";
import SimpleReactionV2Runner from "@/components/orionPlayV2/simpleReaction/SimpleReactionV2Runner";

/**
 * Ultimo tramo del flujo: catalogo -> elegir atleta -> ESTE PASO
 * (instrucciones/configuracion -> ejecutar -> resultado -> guardar).
 * "Volver" salta siempre directamente a ORION Play, sin pasar por la
 * pantalla de seleccion de atleta - el flujo completo de un ejercicio
 * (seleccion/demo/ejecucion) se trata como un unico nivel bajo ORION Play
 * a efectos de navegacion jerarquica. Para Reaction Time/Click Targets/
 * Visual Memory ese "Volver" es el icono de PlayExerciseShell.tsx (ver ese
 * archivo); el resto de ejercicios (rama de abajo, hoy inalcanzable porque
 * ninguno mas tiene available=true) sigue usando SecondaryScreenShell con
 * backHref fijo, como siempre.
 *
 * Solo se añade el contexto del atleta en la cabecera, que no existia en
 * el original (orion-lab-fe) porque alli el usuario autenticado ERA el
 * atleta.
 *
 * getAthleteById ya respeta RLS — si el profesional autenticado no tiene
 * acceso a este atleta, esta lectura devuelve null y la pagina da 404
 * antes de ejecutar nada. La autorizacion real de ESCRITURA la hace la
 * propia RLS de core.sessions al insertar, en submitPlayAttempt — eso
 * sigue siendo la UNICA barrera real: athleteId se pasa tal cual a
 * ReactionTimeV2Runner (ver ese archivo), nunca se trata aqui como prueba
 * de autorizacion.
 *
 * Reaction Time ("Go/No Go" en la interfaz, mismo id tecnico
 * `reaction-time`), Click Targets, Visual Memory Precision y Solo GO
 * (`simple-reaction`) son, a partir de esta fase, la excepcion: usan su
 * propio Runner V2 (orionPlayV2) en vez de PlayReactionTimeClient (V1).
 * Los 4 tienen ya persistencia real conectada (athleteId -> onPersist ->
 * submitPlayAttempt, que acepta los 4 exerciseId - ver actions.ts para el
 * mapeo; Solo GO sigue reutilizando provisionalmente el
 * activity_catalog_id de 'reaction-time' (deuda tecnica ya documentada),
 * Click Targets/Visual Memory resuelven su propia fila de catalogo,
 * independiente). El resto de ejercicios (hoy, ninguno mas tiene
 * available=true, asi que esta rama nunca se alcanza para ellos) sigue
 * exactamente igual.
 */
export default async function PlayRunExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string; athleteId: string }>;
}) {
  const { exerciseId, athleteId } = await params;
  const exercise = getPlayExercise(exerciseId);
  if (!exercise || !exercise.available) notFound();

  const athlete = await getAthleteById(athleteId);
  if (!athlete) notFound();

  if (exercise.id === "reaction-time") {
    return (
      <PlayExerciseShell athleteLabel={athlete.full_name}>
        <ReactionTimeV2Runner contextLabel={athlete.full_name} athleteId={athleteId} />
      </PlayExerciseShell>
    );
  }

  if (exercise.id === "click-targets") {
    return (
      <PlayExerciseShell athleteLabel={athlete.full_name}>
        <ClickTargetsV2Runner contextLabel={athlete.full_name} athleteId={athleteId} />
      </PlayExerciseShell>
    );
  }

  if (exercise.id === "visual-memory-precision") {
    return (
      <PlayExerciseShell athleteLabel={athlete.full_name}>
        <VisualMemoryV2Runner contextLabel={athlete.full_name} athleteId={athleteId} />
      </PlayExerciseShell>
    );
  }

  if (exercise.id === "simple-reaction") {
    return (
      <PlayExerciseShell athleteLabel={athlete.full_name}>
        <SimpleReactionV2Runner contextLabel={athlete.full_name} athleteId={athleteId} />
      </PlayExerciseShell>
    );
  }

  return (
    <SecondaryScreenShell backHref="/visual-lab/play">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-sm text-orion-navy-500">
          {exercise.name} —{" "}
          <span className="font-medium text-orion-navy-700">{athlete.full_name}</span>
        </p>

        <PlayReactionTimeClient athleteId={athleteId} />
      </div>
    </SecondaryScreenShell>
  );
}
