import { createClient } from "@/lib/supabase/server";
import { getMyActiveAthleteIds } from "./athletes";
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
 * Acotada explicitamente a la relacion activa del profesional
 * autenticado (ver getMyActiveAthleteIds en ./athletes) - no basta con
 * que RLS deje pasar la consulta porque el usuario tiene rol admin (las
 * policies "admin todo X" de sessions/session_activities/results son
 * globales, sin acotar por propietario). Si el atleta no pertenece al
 * profesional, se devuelve `[]` ANTES de consultar sessions - mismo
 * resultado que "no hay resultados todavia", nunca se distingue de "no
 * tienes acceso". La pagina que llama a esta funcion
 * (perfiles/atleta/[id]/layout.tsx) YA comprueba el acceso por separado
 * via getAthleteById antes de renderizar ninguna pestaña - esto es una
 * segunda capa, no la unica barrera.
 *
 * Cada consulta comprueba su propio error explicitamente y lanza en
 * caso de fallo real - nunca lo convierte en `[]` silencioso (eso haria
 * indistinguible un fallo de base de datos de "sin resultados").
 *
 * No verificado en esta tarea (no se ejecuta ninguna consulta real):
 * que esta cadena de consultas devuelva filas de verdad contra una base
 * real - ni que exista ya ningun resultado real de ORION Play para
 * ningun atleta.
 */
export async function getAthletePlayResults(athleteId: string): Promise<AthletePlayResult[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const athleteIds = await getMyActiveAthleteIds(supabase, user.id);
  if (!athleteIds.includes(athleteId)) return [];

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id")
    .eq("athlete_id", athleteId);
  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];
  const sessionIds = sessions.map((s) => s.id);

  const { data: activities, error: activitiesError } = await supabase
    .from("session_activities")
    .select("id, config_used, activity_catalog_id")
    .in("session_id", sessionIds);
  if (activitiesError) throw activitiesError;
  if (!activities || activities.length === 0) return [];

  const catalogIds = [...new Set(activities.map((a) => a.activity_catalog_id))];
  const { data: catalogRows, error: catalogError } = await supabase
    .from("activity_catalog")
    .select("id")
    .in("id", catalogIds)
    .eq("modality_id", "play");
  if (catalogError) throw catalogError;
  const playCatalogIds = new Set((catalogRows ?? []).map((c) => c.id));

  const playActivities = activities.filter((a) => playCatalogIds.has(a.activity_catalog_id));
  if (playActivities.length === 0) return [];
  const activityIds = playActivities.map((a) => a.id);
  const configByActivityId = new Map(
    playActivities.map((a) => [a.id, (a.config_used ?? null) as Record<string, unknown> | null])
  );

  const { data: results, error: resultsError } = await supabase
    .from("results")
    .select(
      "id, generated_at, accuracy_percent, total_trials, reaction_time_ms, errors_count, metrics, raw_data, session_activity_id"
    )
    .in("session_activity_id", activityIds)
    .order("generated_at", { ascending: false });
  if (resultsError) throw resultsError;

  return (results ?? []).map((r) =>
    mapPlayResultRow(r, configByActivityId.get(r.session_activity_id) ?? null)
  );
}
