import { createClient } from "@/lib/supabase/server";
import { mapPlayResultRow, type AthletePlayResult } from "./playResultsMapping";

export type { AthletePlayResult };

/**
 * Lectura real de core.sessions -> session_activities -> results para UN
 * deportista (athleteId), filtrada a los ejercicios de ORION Play
 * (activity_catalog.modality_id='play'). Mismo ESTILO que
 * getMySessions() (lib/data/sessions.ts): varias consultas planas
 * encadenadas por ids (nunca un embed anidado de PostgREST de 3 niveles,
 * cuya sintaxis con RLS no se ha probado en esta tarea - no se ejecuta
 * ninguna consulta contra Supabase aqui, solo se escribe el codigo).
 *
 * Relaciones reales usadas (confirmadas en database.types.ts, ninguna
 * inventada):
 *   sessions.athlete_id -> athletes.id (sessions_athlete_id_fkey)
 *   session_activities.session_id -> sessions.id (session_activities_session_id_fkey)
 *   session_activities.activity_catalog_id -> activity_catalog.id (session_activities_activity_catalog_id_fkey)
 *   results.session_activity_id -> session_activities.id (results_session_activity_id_fkey)
 *
 * El filtro `activity_catalog.modality_id === "play"` reutiliza
 * EXACTAMENTE la misma consulta (misma tabla, mismo campo, mismo cliente
 * autenticado) que ya usan resolveReactionTimeActivityId/
 * resolveActivityIdByName en visual-lab/play/actions.ts para resolver el
 * catalogo al guardar - no es un acceso nuevo sin precedente.
 *
 * RLS, no esta funcion, es quien decide que puede ver el profesional
 * autenticado - igual que getAthleteById/getMySessions (ver esos
 * archivos): el filtro `.eq("athlete_id", athleteId)` combinado con la
 * policy de SELECT de core.sessions ("professional lee sessions de sus
 * propios atletas") hace que, si el profesional NO tiene acceso a este
 * atleta, la consulta devuelva simplemente 0 filas - nunca datos de otro
 * profesional, nunca un error que distinga "no existe" de "no autorizado".
 * La pagina que llama a esta funcion (perfiles/atleta/[id]/layout.tsx) YA
 * comprueba el acceso por separado via getAthleteById antes de renderizar
 * ninguna pestaña - esto es una segunda capa, no la unica barrera.
 *
 * No verificado en esta tarea (no se ejecuta ninguna consulta real):
 * que esta cadena de 4 consultas devuelva filas de verdad contra una base
 * real - ni que exista ya ningun resultado real de ORION Play para
 * ningun atleta.
 */
export async function getAthletePlayResults(athleteId: string): Promise<AthletePlayResult[]> {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("athlete_id", athleteId);
  if (!sessions || sessions.length === 0) return [];
  const sessionIds = sessions.map((s) => s.id);

  const { data: activities } = await supabase
    .from("session_activities")
    .select("id, config_used, activity_catalog_id")
    .in("session_id", sessionIds);
  if (!activities || activities.length === 0) return [];

  const catalogIds = [...new Set(activities.map((a) => a.activity_catalog_id))];
  const { data: catalogRows } = await supabase
    .from("activity_catalog")
    .select("id")
    .in("id", catalogIds)
    .eq("modality_id", "play");
  const playCatalogIds = new Set((catalogRows ?? []).map((c) => c.id));

  const playActivities = activities.filter((a) => playCatalogIds.has(a.activity_catalog_id));
  if (playActivities.length === 0) return [];
  const activityIds = playActivities.map((a) => a.id);
  const configByActivityId = new Map(
    playActivities.map((a) => [a.id, (a.config_used ?? null) as Record<string, unknown> | null])
  );

  const { data: results } = await supabase
    .from("results")
    .select(
      "id, generated_at, accuracy_percent, total_trials, reaction_time_ms, errors_count, metrics, raw_data, session_activity_id"
    )
    .in("session_activity_id", activityIds)
    .order("generated_at", { ascending: false });

  return (results ?? []).map((r) =>
    mapPlayResultRow(r, configByActivityId.get(r.session_activity_id) ?? null)
  );
}
