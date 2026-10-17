import { notFound } from "next/navigation";
import { getMyAthletes } from "@/lib/data/athletes";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { getPlayExercise } from "@/components/orionPlay/catalog";
import PlayAthletePicker from "./PlayAthletePicker";
import ReactionTimeV2AthletePicker from "@/components/orionPlayV2/reactionTime/ReactionTimeV2AthletePicker";
import ClickTargetsV2AthletePicker from "@/components/orionPlayV2/clickTargets/ClickTargetsV2AthletePicker";
import VisualMemoryV2AthletePicker from "@/components/orionPlayV2/visualMemory/VisualMemoryV2AthletePicker";
import AthleteSelectionGate from "@/components/orionPlayV2/ui/AthleteSelectionGate";

/**
 * Paso intermedio del flujo: catalogo -> ESTE PASO (elegir atleta) ->
 * ExerciseRunner. El original de ORION Play no tenia este paso (su
 * usuario autenticado ES el atleta); aqui el profesional opera el
 * Portal para un perfil concreto, asi que la seleccion de atleta se
 * inserta aqui, entre el catalogo y las instrucciones/ejecucion — nunca
 * sustituye al catalogo como pantalla principal.
 *
 * Reaction Time, Click Targets y Visual Memory Precision son, a partir de
 * esta fase, la excepcion: en vez del flujo V1 (PlayAthletePicker sin modo
 * demo), usan su propio AthletePicker V2 (deportista o modo demo)
 * apuntando a ./[athleteId] y ./demo de ESTA MISMA carpeta. El resto de
 * ejercicios (hoy, ninguno mas tiene available=true) sigue exactamente el
 * camino V1 de siempre, sin tocar.
 */
export default async function PlayExercisePickAthletePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await params;
  const exercise = getPlayExercise(exerciseId);
  if (!exercise) notFound();

  const athletes = await getMyAthletes();

  return (
    <SecondaryScreenShell backHref="/visual-lab/play">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orion-accent/15">
            <exercise.Icon className="h-6 w-6 text-orion-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-orion-navy-900">{exercise.name}</h1>
            <p className="text-sm text-gray-600">{exercise.description}</p>
          </div>
        </div>

        {!exercise.available ? (
          <div className="rounded-xl border border-orion-navy-100 bg-white p-8 text-center">
            <p className="text-gray-600">This exercise isn&apos;t connected to ORION Core yet.</p>
          </div>
        ) : exercise.id === "reaction-time" ? (
          // AthleteSelectionGate (Fase 3, Paso 2): si ya hay una seleccion
          // activa de Visual Lab, verificada en servidor, salta
          // directamente a la ejecucion real sin mostrar este picker -
          // sin esa seleccion (o si es invalida), se muestra el picker tal
          // cual, sin ningun cambio. Mismo patron en los 4 ejercicios.
          <AthleteSelectionGate exerciseId={exercise.id}>
            <ReactionTimeV2AthletePicker
              basePath={`/visual-lab/play/${exercise.id}`}
              athletes={athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }))}
            />
          </AthleteSelectionGate>
        ) : exercise.id === "click-targets" ? (
          <AthleteSelectionGate exerciseId={exercise.id}>
            <ClickTargetsV2AthletePicker
              basePath={`/visual-lab/play/${exercise.id}`}
              athletes={athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }))}
            />
          </AthleteSelectionGate>
        ) : exercise.id === "visual-memory-precision" ? (
          <AthleteSelectionGate exerciseId={exercise.id}>
            <VisualMemoryV2AthletePicker
              basePath={`/visual-lab/play/${exercise.id}`}
              athletes={athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }))}
            />
          </AthleteSelectionGate>
        ) : exercise.id === "simple-reaction" ? (
          // ReactionTimeV2AthletePicker ya es generico (basePath/athletes,
          // sin ningun texto ni logica propia de Go/No Go) - se reutiliza
          // tal cual en vez de duplicarlo, a diferencia de los componentes
          // de ejecucion (que si son propios por ejercicio).
          <AthleteSelectionGate exerciseId={exercise.id}>
            <ReactionTimeV2AthletePicker
              basePath={`/visual-lab/play/${exercise.id}`}
              athletes={athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }))}
            />
          </AthleteSelectionGate>
        ) : (
          <div className="rounded-xl border border-orion-navy-100 bg-white p-6">
            <p className="mb-4 text-sm font-medium text-orion-navy-700">
              Select the athlete profile to run this exercise for
            </p>
            {athletes.length === 0 ? (
              <p className="text-sm text-orion-navy-400">No tienes atletas disponibles todavía.</p>
            ) : (
              <PlayAthletePicker
                exerciseId={exercise.id}
                athletes={athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }))}
              />
            )}
          </div>
        )}
      </div>
    </SecondaryScreenShell>
  );
}
