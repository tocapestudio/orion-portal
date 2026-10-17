"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface PrismaFormState {
  error: string | null;
  success: boolean;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/**
 * Las 4 acciones de core.prisma_profile actualizan cada una solo su propio
 * subconjunto de columnas via upsert (onConflict: athlete_id) — como todas
 * las columnas NOT NULL de la tabla tienen DEFAULT, un upsert parcial nunca
 * pisa los datos guardados por otra card. RLS (profesional/admin) es quien
 * de verdad protege la escritura; esto solo evita mostrar un formulario que
 * fallaria igual al guardar.
 */
export async function savePrismaChildInfo(
  _prev: PrismaFormState,
  formData: FormData
): Promise<PrismaFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return { error: "Falta el atleta.", success: false };

  const { error } = await supabase.from("prisma_profile").upsert(
    {
      athlete_id: athleteId,
      nickname: str(formData.get("nickname")),
      prior_diagnoses: str(formData.get("prior_diagnoses")),
      session_considerations: str(formData.get("session_considerations")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" }
  );

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

export async function savePrismaSchoolInfo(
  _prev: PrismaFormState,
  formData: FormData
): Promise<PrismaFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return { error: "Falta el atleta.", success: false };

  const { error } = await supabase.from("prisma_profile").upsert(
    {
      athlete_id: athleteId,
      school_name: str(formData.get("school_name")),
      school_grade: str(formData.get("school_grade")),
      school_contact: str(formData.get("school_contact")),
      school_reported_difficulties: str(formData.get("school_reported_difficulties")),
      needs_school_coordination: formData.get("needs_school_coordination") === "on",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" }
  );

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

export async function savePrismaReferralInfo(
  _prev: PrismaFormState,
  formData: FormData
): Promise<PrismaFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return { error: "Falta el atleta.", success: false };

  const { error } = await supabase.from("prisma_profile").upsert(
    {
      athlete_id: athleteId,
      consultation_reason: str(formData.get("consultation_reason")),
      referred_by: str(formData.get("referred_by")),
      referral_reference: str(formData.get("referral_reference")),
      reported_symptoms: str(formData.get("reported_symptoms")),
      referral_date: str(formData.get("referral_date")),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" }
  );

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

export async function savePrismaTherapyPlan(
  _prev: PrismaFormState,
  formData: FormData
): Promise<PrismaFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return { error: "Falta el atleta.", success: false };

  const { error } = await supabase.from("prisma_profile").upsert(
    {
      athlete_id: athleteId,
      therapy_frequency: str(formData.get("therapy_frequency")),
      estimated_duration: str(formData.get("estimated_duration")),
      plan_notes: str(formData.get("plan_notes")),
      process_status: String(formData.get("process_status") ?? "en_espera"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" }
  );

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

export interface GuardianFormState {
  error: string | null;
  success: boolean;
}

/**
 * Como mucho un tutor "contacto principal" por niño/a (indice unico parcial
 * en Core) — si se marca uno nuevo como principal, primero se desmarca
 * cualquier otro en una llamada separada (mismo patron que athlete_club al
 * cambiar de club: cerrar lo anterior, abrir lo nuevo).
 */
export async function createGuardian(
  _prev: GuardianFormState,
  formData: FormData
): Promise<GuardianFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!athleteId || !fullName) return { error: "El nombre es obligatorio.", success: false };

  const isPrimary = formData.get("is_primary_contact") === "on";

  if (isPrimary) {
    const { error: clearError } = await supabase
      .from("prisma_guardians")
      .update({ is_primary_contact: false })
      .eq("athlete_id", athleteId)
      .eq("is_primary_contact", true);
    if (clearError) return { error: `No se pudo guardar: ${clearError.message}`, success: false };
  }

  const { error } = await supabase.from("prisma_guardians").insert({
    athlete_id: athleteId,
    full_name: fullName,
    relationship: str(formData.get("relationship")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    can_pickup: formData.get("can_pickup") === "on",
    is_primary_contact: isPrimary,
  });

  if (error) return { error: `No se pudo crear el tutor: ${error.message}`, success: false };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

export async function updateGuardian(
  _prev: GuardianFormState,
  formData: FormData
): Promise<GuardianFormState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const athleteId = String(formData.get("athlete_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!id || !athleteId || !fullName) return { error: "El nombre es obligatorio.", success: false };

  const isPrimary = formData.get("is_primary_contact") === "on";

  if (isPrimary) {
    const { error: clearError } = await supabase
      .from("prisma_guardians")
      .update({ is_primary_contact: false })
      .eq("athlete_id", athleteId)
      .eq("is_primary_contact", true)
      .neq("id", id);
    if (clearError) return { error: `No se pudo guardar: ${clearError.message}`, success: false };
  }

  const { error } = await supabase
    .from("prisma_guardians")
    .update({
      full_name: fullName,
      relationship: str(formData.get("relationship")),
      phone: str(formData.get("phone")),
      email: str(formData.get("email")),
      can_pickup: formData.get("can_pickup") === "on",
      is_primary_contact: isPrimary,
    })
    .eq("id", id);

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

export async function deleteGuardian(
  guardianId: string,
  athleteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("prisma_guardians").delete().eq("id", guardianId);
  if (error) return { error: `No se pudo eliminar: ${error.message}` };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null };
}

/** Observaciones profesionales: append-only por diseño — no hay accion de editar/borrar a proposito. */
export async function createPrismaProfessionalNote(
  _prev: PrismaFormState,
  formData: FormData
): Promise<PrismaFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!athleteId || !note) return { error: "Escribe una observación.", success: false };

  const { error } = await supabase.from("prisma_professional_notes").insert({
    athlete_id: athleteId,
    professional_id: user.id,
    note,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}
