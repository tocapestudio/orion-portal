import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type WorkProfile = Database["core"]["Tables"]["athlete_work_profile"]["Row"];

/**
 * Datos profesionales (AVANZA) de un atleta. RLS ya restringe la fila a
 * admin / profesional vinculado / el propio atleta — sin filtro manual.
 */
export async function getWorkProfile(athleteId: string): Promise<WorkProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_work_profile")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return data ?? null;
}

/** Profesion (occupation) por atleta, en bloque, para listas. */
export async function getOccupationsForAthletes(
  athleteIds: string[]
): Promise<Map<string, string>> {
  if (athleteIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_work_profile")
    .select("athlete_id, occupation")
    .in("athlete_id", athleteIds);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.occupation) map.set(row.athlete_id, row.occupation);
  }
  return map;
}
