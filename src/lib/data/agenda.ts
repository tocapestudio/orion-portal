import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { getMyActiveAthleteIds } from "@/lib/data/athletes";

export type CalendarEvent = Database["core"]["Tables"]["calendar_events"]["Row"];

/**
 * Eventos del profesional autenticado. El filtro show_in_my_agenda=true
 * es de aplicacion, no de RLS (igual que getMyExercises() filtra por
 * created_by sobre un SELECT permisivo): deja fuera de ESTA vista los
 * eventos creados desde el perfil del atleta con "Añadir a mi agenda"
 * desmarcado — siguen siendo accesibles via getCalendarEventsForAthlete,
 * que no aplica este filtro.
 *
 * core.calendar_events no tiene professional_id (ver getTodayEvents en
 * dashboard.ts para el mismo razonamiento completo): se filtra
 * explicitamente por relacion activa (con atleta) y por created_by
 * (sin atleta), ademas de RLS, porque "admin todo calendar_events" es
 * global.
 */
export async function getMyCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const athleteIds = await getMyActiveAthleteIds(supabase, user.id);

  const [{ data: ownEvents, error: ownError }, { data: athleteEvents, error: athleteError }] =
    await Promise.all([
      supabase
        .from("calendar_events")
        .select("*")
        .eq("show_in_my_agenda", true)
        .is("athlete_id", null)
        .eq("created_by", user.id),
      athleteIds.length > 0
        ? supabase
            .from("calendar_events")
            .select("*")
            .eq("show_in_my_agenda", true)
            .in("athlete_id", athleteIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (ownError) throw ownError;
  if (athleteError) throw athleteError;

  return [...(ownEvents ?? []), ...(athleteEvents ?? [])].sort((a, b) =>
    a.start_at.localeCompare(b.start_at)
  );
}

export async function getCalendarEventsForAthlete(athleteId: string): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("start_at", { ascending: true });
  return data ?? [];
}

/**
 * Notas internas del profesional por evento (core.calendar_event_notes).
 * RLS ya restringe esto a las propias del profesional — nunca visibles
 * para el atleta ni el coach, aunque ellos puedan leer el evento.
 */
export async function getMyEventNotes(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("calendar_event_notes").select("event_id, note");
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.event_id] = row.note;
  }
  return map;
}
