"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AssignmentFormState {
  error: string | null;
  success: boolean;
}

const NEW_ACTIVITY_VALUE = "__new__";

function toPlannedDuration(durationMin: number | null): string | null {
  return durationMin && durationMin > 0 ? `${durationMin} minutes` : null;
}

/**
 * Crea una tarea para casa: reutiliza o crea (modality_id="manual") la
 * actividad de core.activity_catalog y crea el core.assignments. NO crea
 * ningun core.calendar_events — las tareas son un concepto totalmente
 * separado de los eventos de agenda (no deben aparecer en /mi-agenda del
 * profesional como una cita). Siguen siendo visibles en la pestaña Agenda
 * del perfil (seccion Tareas para casa, via getAssignmentsForAthlete) y,
 * mas adelante, en la agenda propia del atleta.
 */
export async function createAssignment(
  _prev: AssignmentFormState,
  formData: FormData
): Promise<AssignmentFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const activityCatalogIdRaw = String(formData.get("activity_catalog_id") ?? "");
  const newActivityName = String(formData.get("new_activity_name") ?? "").trim();
  const scheduledDate = String(formData.get("scheduled_date") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const durationMin = formData.get("duration") ? Number(formData.get("duration")) : null;
  const frequency = String(formData.get("frequency") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const objective = String(formData.get("objective") ?? "").trim() || null;

  if (!athleteId || !scheduledDate) {
    return { error: "La fecha programada es obligatoria.", success: false };
  }
  if (!activityCatalogIdRaw) {
    return { error: "Selecciona o crea una actividad.", success: false };
  }

  let activityCatalogId = activityCatalogIdRaw;

  if (activityCatalogIdRaw === NEW_ACTIVITY_VALUE) {
    if (!newActivityName) {
      return { error: "El nombre de la nueva actividad es obligatorio.", success: false };
    }
    const { data: createdActivity, error: activityError } = await supabase
      .from("activity_catalog")
      .insert({
        name: newActivityName,
        modality_id: "manual",
        nature: "performance",
        created_by: user.id,
        active: true,
      })
      .select("id")
      .single();

    if (activityError || !createdActivity) {
      return { error: `No se pudo crear la actividad: ${activityError?.message ?? ""}`, success: false };
    }
    activityCatalogId = createdActivity.id;
  }

  const { error: assignmentError } = await supabase.from("assignments").insert({
    athlete_id: athleteId,
    activity_catalog_id: activityCatalogId,
    scheduled_date: scheduledDate,
    due_date: dueDate,
    planned_duration: toPlannedDuration(durationMin),
    frequency,
    instructions,
    objective,
    status: "pending",
    created_by: user.id,
  });

  if (assignmentError) {
    return { error: `No se pudo crear la tarea: ${assignmentError.message}`, success: false };
  }

  revalidatePath(`/perfiles/atleta/${athleteId}/agenda`);
  return { error: null, success: true };
}

/**
 * Edita fecha/duracion/frecuencia/instrucciones/objetivo de una tarea
 * existente (no cambia la actividad ni el atleta, igual que updateGoal no
 * permite cambiar goal_type). No toca calendar_events — las tareas no
 * generan ningun evento de agenda.
 */
export async function updateAssignment(
  _prev: AssignmentFormState,
  formData: FormData
): Promise<AssignmentFormState> {
  const supabase = await createClient();

  const assignmentId = String(formData.get("assignment_id") ?? "");
  const athleteId = String(formData.get("athlete_id") ?? "");
  const scheduledDate = String(formData.get("scheduled_date") ?? "") || null;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const durationMin = formData.get("duration") ? Number(formData.get("duration")) : null;
  const frequency = String(formData.get("frequency") ?? "").trim() || null;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const objective = String(formData.get("objective") ?? "").trim() || null;

  if (!assignmentId || !athleteId || !scheduledDate) {
    return { error: "La fecha programada es obligatoria.", success: false };
  }

  const { error } = await supabase
    .from("assignments")
    .update({
      scheduled_date: scheduledDate,
      due_date: dueDate,
      planned_duration: toPlannedDuration(durationMin),
      frequency,
      instructions,
      objective,
    })
    .eq("id", assignmentId);

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidatePath(`/perfiles/atleta/${athleteId}/agenda`);
  return { error: null, success: true };
}

/**
 * Marca una tarea como hecha. Usable tanto por el profesional (policy
 * "professional CRUD assignments de sus atletas") como por el propio
 * atleta (policy + trigger que solo permite status pending/overdue ->
 * completed y ningun otro cambio) — el unico update es {status:
 * "completed"}, compatible con ambos mecanismos de RLS ya existentes.
 */
export async function completeAssignment(
  assignmentId: string,
  athleteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ status: "completed" })
    .eq("id", assignmentId);

  if (error) return { error: `No se pudo marcar como hecho: ${error.message}` };

  revalidatePath(`/perfiles/atleta/${athleteId}/agenda`);
  return { error: null };
}

/**
 * Elimina una tarea. El delete sobre calendar_events (por assignment_id) se
 * mantiene como red de seguridad puramente defensiva: las tareas ya no
 * crean ningun calendar_events, pero una tarea creada ANTES de este cambio
 * si pudo haberlo creado, y calendar_events.assignment_id no tiene ON
 * DELETE CASCADE (NO ACTION) — sin este paso, borrar una de esas tareas
 * heredadas fallaria por violacion de FK. Para tareas nuevas este delete
 * simplemente no encuentra ninguna fila.
 */
export async function deleteAssignment(
  assignmentId: string,
  athleteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error: eventError } = await supabase
    .from("calendar_events")
    .delete()
    .eq("assignment_id", assignmentId);
  if (eventError) return { error: `No se pudo eliminar el evento asociado: ${eventError.message}` };

  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) return { error: `No se pudo eliminar la tarea: ${error.message}` };

  revalidatePath(`/perfiles/atleta/${athleteId}/agenda`);
  return { error: null };
}
