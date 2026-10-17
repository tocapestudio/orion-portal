import { getAthletePlayResults } from "@/lib/data/playResults";
import {
  groupResultsByExercise,
  getExerciseRecord,
  getExerciseRecordBreakdown,
  type PlayExerciseRecord,
  type PlayRecordEntry,
} from "@/lib/data/playResultsMapping";
import RendimientoVisualClient from "./RendimientoVisualClient";

/**
 * Server Component: lee + agrupa + calcula records (todo reutilizando
 * getAthletePlayResults/playResultsMapping.ts), y le pasa el resultado
 * YA calculado al componente cliente (RendimientoVisualClient), que solo
 * gestiona la interaccion listado<->ficha de detalle. Ninguna agrupacion
 * ni calculo de record se repite en el cliente.
 *
 * Solo aparecen aqui los ejercicios que el deportista ha utilizado AL
 * MENOS una vez (groupResultsByExercise ya excluye los que no tienen
 * ningun resultado) - nunca se rellenan los 4 ejercicios del catalogo
 * por defecto.
 *
 * Estados: "ausencia de resultados" lo gestiona el propio
 * RendimientoVisualClient cuando `groups` llega vacio; "carga" la cubre
 * loading.tsx (Suspense automatico de Next.js); "error" lo cubre
 * error.tsx - ambos sin cambios respecto a la version anterior de esta
 * pestaña.
 */
export default async function RendimientoVisualTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const results = await getAthletePlayResults(id);
  const groups = groupResultsByExercise(results);
  const records: Record<string, PlayExerciseRecord | null> = Object.fromEntries(
    groups.map((group) => [group.exerciseId, getExerciseRecord(group.exerciseId, group.results)])
  );
  const recordBreakdowns: Record<string, PlayRecordEntry[]> = Object.fromEntries(
    groups.map((group) => [group.exerciseId, getExerciseRecordBreakdown(group.exerciseId, group.results)])
  );

  return (
    <RendimientoVisualClient groups={groups} records={records} recordBreakdowns={recordBreakdowns} />
  );
}
