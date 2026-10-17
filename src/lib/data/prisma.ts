import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type PrismaProfile = Database["core"]["Tables"]["prisma_profile"]["Row"];
export type PrismaGuardian = Database["core"]["Tables"]["prisma_guardians"]["Row"];

export interface PrismaGuardianNoteRow {
  id: string;
  note: string;
  created_at: string;
  guardian_name: string;
}

export interface PrismaProfessionalNoteRow {
  id: string;
  note: string;
  created_at: string;
  professional_name: string;
}

/** Ficha PRISMA del niño/a (1:1). RLS: profesional vinculado/admin, sin acceso para nadie mas en esta pantalla. */
export async function getPrismaProfile(athleteId: string): Promise<PrismaProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prisma_profile")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return data ?? null;
}

/** Tutores del niño/a, contacto principal primero. */
export async function getPrismaGuardians(athleteId: string): Promise<PrismaGuardian[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prisma_guardians")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("is_primary_contact", { ascending: false })
    .order("full_name");
  return data ?? [];
}

/** Observaciones del tutor con el nombre del autor resuelto (sin depender de embedding de FK, que aqui es ambiguo por la FK compuesta). */
export async function getPrismaGuardianNotes(athleteId: string): Promise<PrismaGuardianNoteRow[]> {
  const supabase = await createClient();
  const [{ data: notes }, { data: guardians }] = await Promise.all([
    supabase
      .from("prisma_guardian_notes")
      .select("id, note, created_at, guardian_id")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false }),
    supabase.from("prisma_guardians").select("id, full_name").eq("athlete_id", athleteId),
  ]);

  const nameByGuardianId = new Map((guardians ?? []).map((g) => [g.id, g.full_name]));
  return (notes ?? []).map((n) => ({
    id: n.id,
    note: n.note,
    created_at: n.created_at,
    guardian_name: nameByGuardianId.get(n.guardian_id) ?? "Tutor",
  }));
}

/** Observaciones profesionales con el nombre del autor resuelto (professional_id -> professionals, no -> profiles directamente). */
export async function getPrismaProfessionalNotes(
  athleteId: string
): Promise<PrismaProfessionalNoteRow[]> {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("prisma_professional_notes")
    .select("id, note, created_at, professional_id")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });

  const ids = [...new Set((notes ?? []).map((n) => n.professional_id))];
  let nameByProfessionalId = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    nameByProfessionalId = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Profesional"]));
  }

  return (notes ?? []).map((n) => ({
    id: n.id,
    note: n.note,
    created_at: n.created_at,
    professional_name: nameByProfessionalId.get(n.professional_id) ?? "Profesional",
  }));
}
