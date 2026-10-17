import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Program = Database["core"]["Tables"]["programs"]["Row"];

/** Orden de presentacion fijo (no alfabetico) usado en toda la UI del Portal. */
const DISPLAY_ORDER = ["prisma", "keratos", "avanza"];

export async function getPrograms(): Promise<Program[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").eq("active", true);
  return (data ?? []).sort(
    (a, b) => DISPLAY_ORDER.indexOf(a.id) - DISPLAY_ORDER.indexOf(b.id)
  );
}

export async function getAthleteProgramIds(athleteId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_programs")
    .select("program_id")
    .eq("athlete_id", athleteId);
  return (data ?? []).map((r) => r.program_id);
}

export async function getAthletesByProgram(programId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_programs")
    .select("athlete_id")
    .eq("program_id", programId);
  return (data ?? []).map((r) => r.athlete_id);
}
