import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type ActivityCatalogRow = Database["core"]["Tables"]["activity_catalog"]["Row"];
export type EvaluationTemplateRow = Database["core"]["Tables"]["evaluation_templates"]["Row"];
export type EvaluationTemplateMeasureRow =
  Database["core"]["Tables"]["evaluation_template_measures"]["Row"];

/**
 * Ejercicios propios del profesional (modality_id='manual', creados
 * por el mismo). El RLS de lectura de activity_catalog es compartido
 * (cualquier autenticado puede leer el catalogo), pero "Mis
 * ejercicios" filtra a los propios como alcance de la funcionalidad,
 * no como control de seguridad.
 */
export async function getMyExercises(): Promise<ActivityCatalogRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("activity_catalog")
    .select("*")
    .eq("modality_id", "manual")
    .eq("created_by", user.id)
    .order("name");
  return data ?? [];
}

export async function getEvaluationTemplates(nature?: "clinical" | "performance"): Promise<{
  own: EvaluationTemplateRow[];
  defaults: EvaluationTemplateRow[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase.from("evaluation_templates").select("*").order("name");
  if (nature) query = query.eq("nature", nature);
  const { data } = await query;
  const rows = data ?? [];

  return {
    own: rows.filter((r) => r.created_by === user?.id),
    defaults: rows.filter((r) => r.is_default),
  };
}

/**
 * Medidas de una plantilla COMPUESTA (core.evaluation_template_measures).
 * Vacio tanto si la plantilla no tiene medidas como si no existe o no es
 * visible por RLS — el consumidor siempre recibe una coleccion, nunca
 * null, para poder iterarla directamente.
 */
export async function getEvaluationTemplateMeasures(
  templateId: string
): Promise<EvaluationTemplateMeasureRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluation_template_measures")
    .select("*")
    .eq("evaluation_template_id", templateId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}
