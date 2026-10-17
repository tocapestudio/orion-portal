import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { ActivityCatalogRow } from "@/lib/data/library";

export type AssignmentRow = Database["core"]["Tables"]["assignments"]["Row"];

export interface AssignmentWithActivity extends AssignmentRow {
  activity_catalog: Pick<ActivityCatalogRow, "name" | "category"> | null;
}

/**
 * Tareas para casa (core.assignments) de un atleta, con el nombre/categoria
 * de su actividad embebidos via la FK activity_catalog_id (unica, sin
 * ambiguedad). RLS ya filtra: professional ve/gestiona las de sus atletas,
 * athlete/coach solo lectura de las suyas — no se añade ningun filtro
 * adicional aqui.
 */
export async function getAssignmentsForAthlete(athleteId: string): Promise<AssignmentWithActivity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("*, activity_catalog(name, category)")
    .eq("athlete_id", athleteId)
    .order("scheduled_date", { ascending: true });
  return (data as AssignmentWithActivity[] | null) ?? [];
}
