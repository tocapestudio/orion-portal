"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ExerciseFormState {
  error: string | null;
  success: boolean;
}

export async function createExercise(
  _prev: ExerciseFormState,
  formData: FormData
): Promise<ExerciseFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const objective = String(formData.get("objective") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) return { error: "El nombre es obligatorio.", success: false };

  const { error } = await supabase.from("activity_catalog").insert({
    name,
    category,
    objective,
    description,
    modality_id: "manual",
    nature: "performance",
    created_by: user.id,
    active: true,
  });

  if (error) return { error: `No se pudo crear: ${error.message}`, success: false };

  revalidatePath("/biblioteca/mis-ejercicios");
  return { error: null, success: true };
}

export async function updateExercise(
  _prev: ExerciseFormState,
  formData: FormData
): Promise<ExerciseFormState> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const objective = String(formData.get("objective") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!id || !name) return { error: "El nombre es obligatorio.", success: false };

  const { error } = await supabase
    .from("activity_catalog")
    .update({ name, category, objective, description })
    .eq("id", id)
    .eq("modality_id", "manual");

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidatePath("/biblioteca/mis-ejercicios");
  return { error: null, success: true };
}

export async function setExerciseActive(id: string, active: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_catalog")
    .update({ active })
    .eq("id", id)
    .eq("modality_id", "manual");

  if (error) return { error: error.message };
  revalidatePath("/biblioteca/mis-ejercicios");
  return { error: null };
}
