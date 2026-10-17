import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type OpticalProfileHeader = Database["core"]["Tables"]["athlete_optical_profile"]["Row"];
export type OpticalRefractionRow =
  Database["core"]["Tables"]["athlete_optical_profile_refraction"]["Row"];
export type OpticalKeratometryRow =
  Database["core"]["Tables"]["athlete_optical_profile_keratometry"]["Row"];
export type OpticalPrismRow = Database["core"]["Tables"]["athlete_optical_profile_prism"]["Row"];
export type OpticalAcuityRow = Database["core"]["Tables"]["athlete_optical_profile_acuity"]["Row"];
export type OpticalPioRow = Database["core"]["Tables"]["athlete_optical_profile_pio"]["Row"];

export interface OptometriaSummary {
  evaluationId: string;
  date: string;
}

export interface OpticalProfile {
  evaluationId: string;
  header: OpticalProfileHeader | null;
  refraction: OpticalRefractionRow[];
  keratometry: OpticalKeratometryRow[];
  prism: OpticalPrismRow[];
  acuity: OpticalAcuityRow[];
  pio: OpticalPioRow[];
}

/**
 * Lista de optometrias (visitas) del atleta, mas reciente primero. Una
 * "optometria" es una core.evaluations que tiene cabecera propia en
 * athlete_optical_profile (join !inner) — asi se distingue de cualquier
 * otra evaluations nature='clinical' que pertenezca a Clinical
 * Evaluations (p.ej. una realizacion de AV Estatica), que nunca tiene fila
 * en athlete_optical_profile.
 */
export async function getOptometriaList(athleteId: string): Promise<OptometriaSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluations")
    .select("id, date, athlete_optical_profile!inner(evaluation_id)")
    .eq("athlete_id", athleteId)
    .order("date", { ascending: false });

  return (data ?? []).map((row) => ({ evaluationId: row.id, date: row.date }));
}

/**
 * Estado de la Ficha Optometrica para UNA optometria concreta (una visita).
 * Si no se pasa evaluationId, resuelve la mas reciente (= "ficha actual").
 * Devuelve null si el atleta todavia no tiene ninguna optometria — en ese
 * caso la UI solo puede ofrecer "Nueva optometria".
 *
 * Las 6 tablas se leen en paralelo (mismo criterio que getAthleteBoard).
 * RLS ya restringe las filas a admin / profesional vinculado, sin filtro
 * manual aqui, igual que getWorkProfile.
 */
export async function getOpticalProfile(
  athleteId: string,
  evaluationId?: string
): Promise<OpticalProfile | null> {
  const supabase = await createClient();

  let targetEvaluationId = evaluationId;
  if (!targetEvaluationId) {
    const list = await getOptometriaList(athleteId);
    targetEvaluationId = list[0]?.evaluationId;
  }
  if (!targetEvaluationId) return null;

  const [header, refraction, keratometry, prism, acuity, pio] = await Promise.all([
    supabase
      .from("athlete_optical_profile")
      .select("*")
      .eq("evaluation_id", targetEvaluationId)
      .maybeSingle(),
    supabase.from("athlete_optical_profile_refraction").select("*").eq("evaluation_id", targetEvaluationId),
    supabase.from("athlete_optical_profile_keratometry").select("*").eq("evaluation_id", targetEvaluationId),
    supabase.from("athlete_optical_profile_prism").select("*").eq("evaluation_id", targetEvaluationId),
    supabase.from("athlete_optical_profile_acuity").select("*").eq("evaluation_id", targetEvaluationId),
    supabase.from("athlete_optical_profile_pio").select("*").eq("evaluation_id", targetEvaluationId),
  ]);

  return {
    evaluationId: targetEvaluationId,
    header: header.data ?? null,
    refraction: refraction.data ?? [],
    keratometry: keratometry.data ?? [],
    prism: prism.data ?? [],
    acuity: acuity.data ?? [],
    pio: pio.data ?? [],
  };
}
