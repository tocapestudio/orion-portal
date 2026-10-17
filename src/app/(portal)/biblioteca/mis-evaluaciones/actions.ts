"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEvaluationTemplateMeasures, type EvaluationTemplateMeasureRow } from "@/lib/data/library";
import type { Database } from "@/types/database.types";

type EvaluationTemplateMeasureInsert = Database["core"]["Tables"]["evaluation_template_measures"]["Insert"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface EvalTemplateFormState {
  error: string | null;
  success: boolean;
}

function readCommonFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const test_type = String(formData.get("test_type") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const measurement_unit = String(formData.get("measurement_unit") ?? "").trim() || null;
  const minRaw = String(formData.get("min_value") ?? "").trim();
  const maxRaw = String(formData.get("max_value") ?? "").trim();
  const min_value = minRaw ? Number(minRaw) : null;
  const max_value = maxRaw ? Number(maxRaw) : null;
  const has_repetitions = formData.get("has_repetitions") === "on";
  const requires_od_os_binocular = formData.get("requires_od_os_binocular") === "on";
  const lower_is_better = formData.get("lower_is_better") === "on";
  const is_composite = formData.get("is_composite") === "on";

  return {
    name,
    test_type,
    description,
    measurement_unit,
    min_value,
    max_value,
    has_repetitions,
    requires_od_os_binocular,
    lower_is_better,
    is_composite,
  };
}

interface MeasurePayload {
  id: string;
  name: string;
  value_type: "numeric" | "categorical";
  measurement_unit: string | null;
  allowed_categories: string[] | null;
  needs_distance: boolean;
  needs_laterality: boolean;
  needs_correction: boolean;
  needs_direction: boolean;
  needs_component: boolean;
  component_options: string[] | null;
  is_primary: boolean;
}

function parseMeasures(raw: FormDataEntryValue | null): MeasurePayload[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is MeasurePayload =>
        m &&
        typeof m.id === "string" &&
        typeof m.name === "string" &&
        m.name.trim().length > 0 &&
        (m.value_type === "numeric" || m.value_type === "categorical")
    );
  } catch {
    return [];
  }
}

/**
 * Guarda las medidas de una plantilla compuesta. NUNCA hace DELETE — no
 * hay policy de DELETE para el profesional en
 * evaluation_template_measures, decision explicita para no tocar RLS.
 *
 * Proteccion de historico: para cada medida que YA existe en Core, se
 * vuelve a comprobar aqui — en servidor, sin confiar en lo que mande el
 * cliente — si ya tiene resultados via
 * core.evaluation_template_measure_has_results(). Esa funcion es
 * SECURITY DEFINER a proposito: el RLS normal de
 * evaluation_result_measures solo dejaria ver al profesional sus propios
 * atletas, pero una plantilla puede haberla usado OTRO profesional con
 * los suyos — sin la funcion, esta comprobacion tendria un punto ciego
 * real. Si tiene resultados, solo se actualizan is_primary/display_order
 * y los 9 campos semanticos (name, value_type, measurement_unit,
 * allowed_categories, needs_distance, needs_laterality, needs_correction,
 * needs_direction, needs_component, component_options) se dejan
 * intactos tal como estan guardados, sin importar lo que haya enviado el
 * formulario. Las medidas nuevas (id aun no presente en Core) no tienen
 * historico que proteger, se insertan completas.
 */
async function saveTemplateMeasures(
  supabase: SupabaseServerClient,
  templateId: string,
  measures: MeasurePayload[]
): Promise<string | null> {
  if (measures.length === 0) return null;

  const { data: existingRows, error: existingError } = await supabase
    .from("evaluation_template_measures")
    .select("id")
    .eq("evaluation_template_id", templateId);
  if (existingError) return existingError.message;
  const existingIds = new Set((existingRows ?? []).map((r) => r.id));

  for (let index = 0; index < measures.length; index++) {
    const m = measures[index];

    if (!existingIds.has(m.id)) {
      const row: EvaluationTemplateMeasureInsert = {
        id: m.id,
        evaluation_template_id: templateId,
        name: m.name,
        value_type: m.value_type,
        measurement_unit: m.measurement_unit,
        allowed_categories: m.value_type === "categorical" ? m.allowed_categories : null,
        needs_distance: m.needs_distance,
        needs_laterality: m.needs_laterality,
        needs_correction: m.needs_correction,
        needs_direction: m.needs_direction,
        needs_component: m.needs_component,
        component_options: m.needs_component ? m.component_options : null,
        is_primary: m.is_primary,
        display_order: index,
      };
      const { error } = await supabase.from("evaluation_template_measures").insert(row);
      if (error) return error.message;
      continue;
    }

    const { data: hasResults, error: checkError } = await supabase.rpc(
      "evaluation_template_measure_has_results",
      { measure_id: m.id }
    );
    if (checkError) return checkError.message;

    if (hasResults) {
      const { error } = await supabase
        .from("evaluation_template_measures")
        .update({ is_primary: m.is_primary, display_order: index })
        .eq("id", m.id);
      if (error) return error.message;
    } else {
      const { error } = await supabase
        .from("evaluation_template_measures")
        .update({
          name: m.name,
          value_type: m.value_type,
          measurement_unit: m.measurement_unit,
          allowed_categories: m.value_type === "categorical" ? m.allowed_categories : null,
          needs_distance: m.needs_distance,
          needs_laterality: m.needs_laterality,
          needs_correction: m.needs_correction,
          needs_direction: m.needs_direction,
          needs_component: m.needs_component,
          component_options: m.needs_component ? m.component_options : null,
          is_primary: m.is_primary,
          display_order: index,
        })
        .eq("id", m.id);
      if (error) return error.message;
    }
  }

  return null;
}

export async function createEvaluationTemplate(
  _prev: EvalTemplateFormState,
  formData: FormData
): Promise<EvalTemplateFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const fields = readCommonFields(formData);
  if (!fields.name) return { error: "El nombre es obligatorio.", success: false };

  const { data: inserted, error } = await supabase
    .from("evaluation_templates")
    .insert({ ...fields, created_by: user.id, is_default: false })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: `No se pudo crear: ${error?.message ?? "error desconocido"}`, success: false };
  }

  if (fields.is_composite) {
    const measuresError = await saveTemplateMeasures(
      supabase,
      inserted.id,
      parseMeasures(formData.get("measures"))
    );
    if (measuresError) {
      return {
        error: `Plantilla creada, pero no se pudieron guardar las medidas: ${measuresError}`,
        success: false,
      };
    }
  }

  revalidatePath("/biblioteca/mis-evaluaciones");
  return { error: null, success: true };
}

export async function updateEvaluationTemplate(
  _prev: EvalTemplateFormState,
  formData: FormData
): Promise<EvalTemplateFormState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const fields = readCommonFields(formData);
  if (!id || !fields.name) return { error: "El nombre es obligatorio.", success: false };

  const { error } = await supabase.from("evaluation_templates").update(fields).eq("id", id);

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  if (fields.is_composite) {
    const measuresError = await saveTemplateMeasures(supabase, id, parseMeasures(formData.get("measures")));
    if (measuresError) {
      return {
        error: `Plantilla guardada, pero no se pudieron guardar las medidas: ${measuresError}`,
        success: false,
      };
    }
  }

  revalidatePath("/biblioteca/mis-evaluaciones");
  return { error: null, success: true };
}

export interface TemplateMeasureWithUsage extends EvaluationTemplateMeasureRow {
  /** true si ya existe al menos un resultado clinico para esta medida,
   * de cualquier profesional (via la funcion SECURITY DEFINER — ver
   * saveTemplateMeasures). Determina que campos bloquea el editor. */
  hasResults: boolean;
}

/** Lectura bajo demanda para el editor (server action, ya que
 * getEvaluationTemplateMeasures requiere contexto de servidor y se
 * invoca desde un componente cliente al entrar en modo edicion). */
export async function fetchTemplateMeasures(templateId: string): Promise<TemplateMeasureWithUsage[]> {
  const rows = await getEvaluationTemplateMeasures(templateId);
  if (rows.length === 0) return [];

  const supabase = await createClient();
  return Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.rpc("evaluation_template_measure_has_results", {
        measure_id: row.id,
      });
      return { ...row, hasResults: data === true };
    })
  );
}
