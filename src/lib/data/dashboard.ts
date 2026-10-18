import { createClient } from "@/lib/supabase/server";
import { getMyActiveAthleteIds } from "@/lib/data/athletes";

export interface TodayEvent {
  id: string;
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  athleteId: string | null;
  athleteName: string | null;
  programLabel: string | null;
}

/**
 * Eventos de HOY del profesional autenticado, para el resumen
 * operativo de Inicio. No sustituye a Mi Agenda: es solo lectura,
 * acotada al dia actual. show_in_my_agenda=true es el mismo filtro de
 * aplicacion que usa getMyCalendarEvents() — este widget es parte de la
 * agenda personal del profesional, asi que debe respetar igual la opcion
 * "Añadir a mi agenda" de los eventos creados desde el perfil del atleta.
 *
 * core.calendar_events no tiene columna professional_id: un evento
 * pertenece al profesional de dos formas distintas (ver policies RLS
 * "professional CRUD calendar de sus atletas" / "...propios sin
 * atleta") - con atleta, via la relacion activa en athlete_professional;
 * sin atleta, via created_by = este profesional. Se filtra
 * explicitamente por ambas, ademas de RLS, porque "admin todo
 * calendar_events" es global y mostraria los eventos de cualquiera.
 */
export async function getTodayEvents(): Promise<TodayEvent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const myActiveAthleteIds = await getMyActiveAthleteIds(supabase, user.id);

  const [{ data: ownEvents, error: ownError }, { data: athleteEvents, error: athleteError }] =
    await Promise.all([
      supabase
        .from("calendar_events")
        .select("*")
        .eq("show_in_my_agenda", true)
        .is("athlete_id", null)
        .eq("created_by", user.id)
        .gte("start_at", startOfDay)
        .lt("start_at", endOfDay),
      myActiveAthleteIds.length > 0
        ? supabase
            .from("calendar_events")
            .select("*")
            .eq("show_in_my_agenda", true)
            .in("athlete_id", myActiveAthleteIds)
            .gte("start_at", startOfDay)
            .lt("start_at", endOfDay)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (ownError) throw ownError;
  if (athleteError) throw athleteError;

  const rows = [...(ownEvents ?? []), ...(athleteEvents ?? [])].sort((a, b) =>
    a.start_at.localeCompare(b.start_at)
  );
  const athleteIds = Array.from(new Set(rows.map((e) => e.athlete_id).filter(Boolean))) as string[];

  const athleteMap = new Map<string, string>();
  const programByAthlete = new Map<string, string>();

  if (athleteIds.length > 0) {
    const [{ data: athletes }, { data: athletePrograms }, { data: programDefs }] = await Promise.all([
      supabase.from("athletes").select("id, full_name").in("id", athleteIds),
      supabase.from("athlete_programs").select("athlete_id, program_id").in("athlete_id", athleteIds),
      supabase.from("programs").select("id, label"),
    ]);

    (athletes ?? []).forEach((a) => athleteMap.set(a.id, a.full_name));
    const programLabelById = new Map((programDefs ?? []).map((p) => [p.id, p.label]));
    (athletePrograms ?? []).forEach((p) => {
      if (!programByAthlete.has(p.athlete_id)) {
        programByAthlete.set(p.athlete_id, programLabelById.get(p.program_id) ?? p.program_id);
      }
    });
  }

  return rows.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    startAt: e.start_at,
    endAt: e.end_at,
    athleteId: e.athlete_id,
    athleteName: e.athlete_id ? athleteMap.get(e.athlete_id) ?? null : null,
    programLabel: e.athlete_id ? programByAthlete.get(e.athlete_id) ?? null : null,
  }));
}
