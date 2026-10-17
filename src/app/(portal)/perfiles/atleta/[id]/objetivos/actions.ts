"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface GoalFormState {
  error: string | null;
  success: boolean;
}

export async function createGoal(
  _prev: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const targetDate = String(formData.get("target_date") ?? "") || null;
  const goalTypeRaw = String(formData.get("goal_type") ?? "specific");
  const goalType = goalTypeRaw === "general" ? "general" : "specific";

  if (!athleteId || !title) {
    return { error: "El título es obligatorio.", success: false };
  }

  const { error } = await supabase.from("goals").insert({
    athlete_id: athleteId,
    professional_id: user.id,
    title,
    description,
    target_date: targetDate,
    progress_mode: "manual",
    status: "active",
    goal_type: goalType,
  });

  if (error) return { error: `No se pudo crear el objetivo: ${error.message}`, success: false };

  revalidatePath(`/perfiles/atleta/${athleteId}/objetivos`);
  return { error: null, success: true };
}

/**
 * Edita titulo/descripcion/fecha objetivo de un goal existente. No permite
 * cambiar goal_type tras crearlo (no se ha pedido) ni status (eso lo hace
 * completeGoal, mas abajo) — RLS (professional CRUD de sus atletas) es la
 * proteccion real, igual que el resto de acciones de este archivo.
 */
export async function updateGoal(
  _prev: GoalFormState,
  formData: FormData
): Promise<GoalFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const goalId = String(formData.get("goal_id") ?? "");
  const athleteId = String(formData.get("athlete_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const targetDate = String(formData.get("target_date") ?? "") || null;

  if (!goalId || !athleteId || !title) {
    return { error: "El título es obligatorio.", success: false };
  }

  const { error } = await supabase
    .from("goals")
    .update({ title, description, target_date: targetDate })
    .eq("id", goalId);

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidatePath(`/perfiles/atleta/${athleteId}/objetivos`);
  return { error: null, success: true };
}

/** Marca un objetivo como logrado (status='completed'). No reinterpreta
 * ni borra nada — solo cambia el estado. */
export async function completeGoal(
  goalId: string,
  athleteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("goals").update({ status: "completed" }).eq("id", goalId);
  if (error) return { error: `No se pudo marcar como logrado: ${error.message}` };

  revalidatePath(`/perfiles/atleta/${athleteId}/objetivos`);
  return { error: null };
}

/** Elimina un objetivo por completo. Cada goal es independiente (su propia
 * fila), no afecta a ningun otro objetivo ni al atleta. */
export async function deleteGoal(
  goalId: string,
  athleteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };

  revalidatePath(`/perfiles/atleta/${athleteId}/objetivos`);
  return { error: null };
}
