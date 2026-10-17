"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface EventFormState {
  error: string | null;
  success: boolean;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Guarda/borra la nota interna del profesional sobre un evento
 * (core.calendar_event_notes) — separada de calendar_events a
 * proposito, ver el draft de migracion: RLS de esa tabla no da
 * acceso a athlete/coach, ni con policy ni por defecto.
 */
async function saveEventNote(
  supabase: SupabaseServerClient,
  eventId: string,
  professionalId: string,
  note: string
) {
  if (note) {
    await supabase.from("calendar_event_notes").upsert(
      {
        event_id: eventId,
        professional_id: professionalId,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,professional_id" }
    );
  } else {
    await supabase
      .from("calendar_event_notes")
      .delete()
      .eq("event_id", eventId)
      .eq("professional_id", professionalId);
  }
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const supabase = await createClient();
  const startAtIso = String(formData.get("start_at_iso") ?? "");
  const durationMin = Number(formData.get("duration") ?? 60);
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "appointment");
  const athleteId = String(formData.get("athlete_id") ?? "") || null;
  const clubId = String(formData.get("club_id") ?? "") || null;
  const material = String(formData.get("material") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notify = formData.get("notify") === "on";
  const observaciones = String(formData.get("observaciones") ?? "").trim();
  // Checkbox "Añadir a mi agenda": un checkbox desmarcado NO se incluye en
  // el FormData (igual que si nunca hubiera existido), asi que no basta con
  // mirar add_to_my_agenda — add_to_my_agenda_present (hidden, ver
  // EventFormModal) es lo unico que distingue "el formulario tenia el
  // campo y se desmarco" de "este formulario ni siquiera lo tiene" (crear
  // directamente desde /mi-agenda, donde el concepto no aplica => true).
  const showInMyAgenda = formData.has("add_to_my_agenda_present")
    ? formData.get("add_to_my_agenda") === "on"
    : true;

  if (!startAtIso || !title) {
    return { error: "El día y el título son obligatorios.", success: false };
  }

  const startAt = startAtIso;
  const endAt = new Date(
    new Date(startAt).getTime() + durationMin * 60_000
  ).toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from("calendar_events")
    .insert({
      title,
      type,
      start_at: startAt,
      end_at: endAt,
      athlete_id: athleteId,
      club_id: clubId,
      material,
      location,
      notify,
      show_in_my_agenda: showInMyAgenda,
      status: "scheduled",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: `No se pudo crear el evento: ${error?.message ?? ""}`, success: false };
  }

  if (user && observaciones) {
    await saveEventNote(supabase, created.id, user.id, observaciones);
  }

  revalidatePath("/mi-agenda");
  if (athleteId) revalidatePath(`/perfiles/atleta/${athleteId}/agenda`);
  return { error: null, success: true };
}

export async function updateEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const startAtIso = String(formData.get("start_at_iso") ?? "");
  const durationMin = Number(formData.get("duration") ?? 60);
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "appointment");
  const athleteId = String(formData.get("athlete_id") ?? "") || null;
  const clubId = String(formData.get("club_id") ?? "") || null;
  const material = String(formData.get("material") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const notify = formData.get("notify") === "on";
  const observaciones = String(formData.get("observaciones") ?? "").trim();

  if (!id || !startAtIso || !title) {
    return { error: "Faltan datos obligatorios.", success: false };
  }

  const startAt = startAtIso;
  const endAt = new Date(
    new Date(startAt).getTime() + durationMin * 60_000
  ).toISOString();

  // Igual que en createEvent: add_to_my_agenda_present (hidden) es lo unico
  // que distingue "el formulario tenia el checkbox y se desmarco" de "este
  // formulario no tiene el campo" (edicion desde /mi-agenda). Sin ese hidden
  // presente, no se incluye la columna en el update — así editar desde
  // /mi-agenda nunca sobreescribe un valor existente puesto desde el perfil.
  const showInMyAgendaUpdate = formData.has("add_to_my_agenda_present")
    ? { show_in_my_agenda: formData.get("add_to_my_agenda") === "on" }
    : {};

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title,
      type,
      start_at: startAt,
      end_at: endAt,
      athlete_id: athleteId,
      club_id: clubId,
      material,
      location,
      notify,
      ...showInMyAgendaUpdate,
    })
    .eq("id", id);

  if (error) {
    return { error: `No se pudo actualizar el evento: ${error.message}`, success: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await saveEventNote(supabase, id, user.id, observaciones);
  }

  revalidatePath("/mi-agenda");
  if (athleteId) revalidatePath(`/perfiles/atleta/${athleteId}/agenda`);
  return { error: null, success: true };
}

export async function reassignEvent(
  _prev: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const startAtIso = String(formData.get("start_at_iso") ?? "");

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("start_at, end_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return { error: "Evento no encontrado.", success: false };
  if (!startAtIso) return { error: "Faltan datos obligatorios.", success: false };

  const durationMs =
    new Date(existing.end_at ?? existing.start_at).getTime() -
    new Date(existing.start_at).getTime();
  const startAt = startAtIso;
  const endAt = new Date(new Date(startAt).getTime() + durationMs).toISOString();

  const { error } = await supabase
    .from("calendar_events")
    .update({ start_at: startAt, end_at: endAt })
    .eq("id", id);

  if (error) return { error: `No se pudo reasignar: ${error.message}`, success: false };

  revalidatePath("/mi-agenda");
  return { error: null, success: true };
}

/**
 * athleteId es opcional y solo sirve para revalidar tambien la pestaña
 * Agenda de ese perfil (p.ej. al borrar desde alli) — no cambia el
 * comportamiento existente en /mi-agenda, que sigue llamando con un solo
 * argumento.
 */
export async function deleteEvent(id: string, athleteId?: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("calendar_events").delete().eq("id", id);
  revalidatePath("/mi-agenda");
  if (athleteId) revalidatePath(`/perfiles/atleta/${athleteId}/agenda`);
}
