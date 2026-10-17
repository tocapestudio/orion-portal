import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type CalendarEvent = Database["core"]["Tables"]["calendar_events"]["Row"];

/**
 * Eventos del profesional autenticado — RLS ya restringe a los
 * eventos de sus atletas o a sus eventos personales sin atleta
 * (core.calendar_events, ver policies "professional CRUD calendar
 * de sus atletas" / "professional CRUD calendar propios sin
 * atleta"). El filtro show_in_my_agenda=true es de aplicacion, no de
 * RLS (igual que getMyExercises() filtra por created_by sobre un SELECT
 * permisivo): deja fuera de ESTA vista los eventos creados desde el
 * perfil del atleta con "Añadir a mi agenda" desmarcado — siguen siendo
 * accesibles via getCalendarEventsForAthlete, que no aplica este filtro.
 */
export async function getMyCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("show_in_my_agenda", true)
    .order("start_at", { ascending: true });
  return data ?? [];
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
