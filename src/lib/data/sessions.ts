import { createClient } from "@/lib/supabase/server";

export interface SessionSummary {
  id: string;
  athleteId: string;
  athleteName: string | null;
  startedAt: string;
  status: string;
  initiatedBy: string;
  activityCount: number;
}

/**
 * Lectura real de core.sessions (RLS ya restringe a las sesiones de
 * los atletas del profesional). Solo lectura — la creación
 * (Diseñar > Crear sesión) queda deliberadamente pendiente.
 */
export async function getMySessions(): Promise<SessionSummary[]> {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, athlete_id, started_at, status, initiated_by, athletes(full_name)")
    .order("started_at", { ascending: false })
    .limit(50);

  if (!sessions || sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: activities } = await supabase
    .from("session_activities")
    .select("session_id")
    .in("session_id", ids);

  return sessions.map((s) => ({
    id: s.id,
    athleteId: s.athlete_id,
    athleteName: (s.athletes as { full_name: string } | null)?.full_name ?? null,
    startedAt: s.started_at,
    status: s.status,
    initiatedBy: s.initiated_by,
    activityCount: (activities ?? []).filter((a) => a.session_id === s.id).length,
  }));
}
