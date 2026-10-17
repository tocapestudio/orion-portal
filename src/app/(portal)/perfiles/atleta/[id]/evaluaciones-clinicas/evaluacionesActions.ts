"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getClinicalEvaluationHistory,
  getEvaluationResultMeasures,
  type ClinicalRealization,
  type EvaluationResultMeasureRow,
} from "@/lib/data/perfil";
import { getEvaluationTemplateMeasures, type EvaluationTemplateMeasureRow } from "@/lib/data/library";
import type { Database } from "@/types/database.types";
import type { Conditions } from "./compositeEngine";
import { syncAcuityFromEvaluation } from "./fichaOptometricaActions";

type EvaluationResultInsert = Database["core"]["Tables"]["evaluation_results"]["Insert"];
type EvaluationResultMeasureInsert = Database["core"]["Tables"]["evaluation_result_measures"]["Insert"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface EvaluationFormState {
  error: string | null;
  success: boolean;
}

interface CompositeValuePayload {
  id: string;
  measureId: string;
  conditions: Conditions;
  valueNumeric: string | null;
  valueCategory: string | null;
}

interface ValuesPayload {
  mode: "simple" | "od_os_bin" | "repetitions" | "custom" | "composite";
  simpleValue?: string;
  valueOd?: string;
  valueOs?: string;
  valueBinocular?: string;
  repetitions?: number[];
  customValues?: Record<string, number>;
  composite?: CompositeValuePayload[];
}

function parseValues(raw: FormDataEntryValue | null): ValuesPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(String(raw));
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ValuesPayload;
  } catch {
    return null;
  }
}

function toNumberOrNull(v: string | undefined | null): number | null {
  if (!v || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Guarda las medidas de una realizacion compuesta. Igual que
 * saveTemplateMeasures en Diseñar: nunca hace DELETE, usa upsert por id
 * (ids estables generados en el modal, el mismo id de una combinacion
 * medida+condiciones nunca cambia entre creacion y edicion — por eso no
 * puede haber filas duplicadas para la misma combinacion). Valida contra
 * la definicion REAL de cada medida en servidor, nunca contra lo que
 * mande el formulario: tipo numerico/categorico, categorias permitidas y
 * componentes permitidos.
 */
async function saveCompositeMeasures(
  supabase: SupabaseServerClient,
  resultId: string,
  templateId: string,
  entries: CompositeValuePayload[]
): Promise<string | null> {
  if (entries.length === 0) return null;

  const measureIds = [...new Set(entries.map((e) => e.measureId))];
  const { data: defs, error: defsError } = await supabase
    .from("evaluation_template_measures")
    .select("*")
    .eq("evaluation_template_id", templateId)
    .in("id", measureIds);
  if (defsError) return defsError.message;

  const defsById = new Map((defs ?? []).map((d) => [d.id, d]));

  const rows: EvaluationResultMeasureInsert[] = [];
  for (const entry of entries) {
    const def = defsById.get(entry.measureId);
    if (!def) continue; // la medida no pertenece a esta plantilla — se descarta

    const isNumeric = def.value_type !== "categorical";
    const numericValue = isNumeric ? toNumberOrNull(entry.valueNumeric) : null;
    const categoryValue = !isNumeric ? (entry.valueCategory?.trim() || null) : null;
    if (numericValue == null && categoryValue == null) continue; // combinacion vacia, no se guarda

    if (!isNumeric && categoryValue) {
      const allowed = def.allowed_categories ?? [];
      if (allowed.length > 0 && !allowed.includes(categoryValue)) continue;
    }
    if (entry.conditions.component) {
      const allowedComponents = def.component_options ?? [];
      if (allowedComponents.length > 0 && !allowedComponents.includes(entry.conditions.component)) continue;
    }

    rows.push({
      id: entry.id,
      evaluation_result_id: resultId,
      template_measure_id: entry.measureId,
      distance: entry.conditions.distance ?? null,
      laterality: entry.conditions.laterality ?? null,
      correction: entry.conditions.correction ?? null,
      axis: entry.conditions.axis ?? null,
      sense: entry.conditions.sense ?? null,
      component: entry.conditions.component ?? null,
      value_numeric: numericValue,
      value_category: categoryValue,
      measurement_unit: def.measurement_unit,
    });
  }

  if (rows.length === 0) return null;

  const { error } = await supabase
    .from("evaluation_result_measures")
    .upsert(rows, { onConflict: "id" });
  return error ? error.message : null;
}

/**
 * Crea o corrige UNA realizacion (visita + resultado). Nunca agrupa por
 * fecha con otras realizaciones — cada una tiene su propio par de ids
 * estables (evaluation_id/result_id), generados en el modal y
 * reutilizados en la edicion, igual que el patron ya usado en Tablon
 * para evitar el problema de RLS con INSERT...RETURNING.
 *
 * Orden: primero se sube la visita (core.evaluations), despues el
 * resultado (core.evaluation_results) — su policy de RLS exige que la
 * visita ya exista con el profesional correcto, igual que
 * board_post_media exige que exista antes el board_post.
 */
export async function saveEvaluation(
  _prev: EvaluationFormState,
  formData: FormData
): Promise<EvaluationFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const resultId = String(formData.get("result_id") ?? "");
  const athleteId = String(formData.get("athlete_id") ?? "");
  const templateId = String(formData.get("template_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const measurementUnit = String(formData.get("measurement_unit") ?? "").trim() || null;
  const values = parseValues(formData.get("values"));

  if (!evaluationId || !resultId || !athleteId || !templateId || !date || !values) {
    return { error: "Faltan datos obligatorios.", success: false };
  }

  const { error: evalError } = await supabase.from("evaluations").upsert(
    {
      id: evaluationId,
      athlete_id: athleteId,
      professional_id: user.id,
      date,
      nature: "clinical",
    },
    { onConflict: "id" }
  );
  if (evalError) {
    return { error: `No se pudo guardar la evaluación: ${evalError.message}`, success: false };
  }

  const resultRow: EvaluationResultInsert = {
    id: resultId,
    evaluation_id: evaluationId,
    evaluation_template_id: templateId,
    measurement_unit: measurementUnit,
    notes,
    value_od: null,
    value_os: null,
    value_binocular: null,
    primary_variable_value: null,
    repetitions: null,
    rep_count: null,
    rep_average: null,
    custom_values: null,
  };

  if (values.mode === "od_os_bin") {
    resultRow.value_od = toNumberOrNull(values.valueOd);
    resultRow.value_os = toNumberOrNull(values.valueOs);
    resultRow.value_binocular = toNumberOrNull(values.valueBinocular);
  } else if (values.mode === "repetitions" && values.repetitions && values.repetitions.length > 0) {
    resultRow.repetitions = values.repetitions.map((value, index) => ({
      rep_number: index + 1,
      value,
      laterality: null,
      success: null,
    }));
    resultRow.rep_count = values.repetitions.length;
    resultRow.rep_average =
      values.repetitions.reduce((sum, v) => sum + v, 0) / values.repetitions.length;
    resultRow.primary_variable_value = resultRow.rep_average;
  } else if (values.mode === "custom" && values.customValues) {
    resultRow.custom_values = values.customValues;
  } else if (values.mode !== "composite") {
    resultRow.primary_variable_value = toNumberOrNull(values.simpleValue);
  }
  // mode === "composite": el resultado cabecera no lleva columnas planas
  // — el detalle vive en evaluation_result_measures (ver mas abajo).

  const { error: resultError } = await supabase
    .from("evaluation_results")
    .upsert(resultRow, { onConflict: "id" });
  if (resultError) {
    return {
      error: `No se pudo guardar el resultado: ${resultError.message}`,
      success: false,
    };
  }

  if (values.mode === "composite") {
    const measuresError = await saveCompositeMeasures(
      supabase,
      resultId,
      templateId,
      values.composite ?? []
    );
    if (measuresError) {
      return {
        error: `Evaluación guardada, pero no se pudieron guardar las medidas: ${measuresError}`,
        success: false,
      };
    }

    // Sincronizacion hibrida evaluacion -> Ficha Optometrica: SOLO ocurre
    // aqui, al guardar una realizacion, nunca al consultar el historico.
    // syncAcuityFromEvaluation ignora cualquier template que no sea AV
    // Estatica (AV Dinamica queda preparada pero no activada todavia) y
    // respeta los valores con source='manual' sin tocarlos.
    await syncAcuityFromEvaluation(supabase, {
      athleteId,
      templateId,
      date,
      entries: values.composite ?? [],
    });
  }

  revalidatePath(`/perfiles/atleta/${athleteId}/evaluaciones-clinicas`);
  return { error: null, success: true };
}

/**
 * Elimina UNA realizacion completa (la visita core.evaluations y, en
 * cascada ya existente en Core — ON DELETE CASCADE en
 * evaluation_results.evaluation_id y en
 * evaluation_result_measures.evaluation_result_id — su resultado y sus
 * medidas si era compuesta). Nunca toca evaluation_templates ni otras
 * realizaciones: cada realizacion tiene su propia fila de evaluations,
 * nunca comparte visita con otra fecha.
 *
 * Unico riesgo real verificado antes de implementar esto:
 * core.goals.evaluation_id y core.calendar_events.evaluation_id tambien
 * referencian evaluations(id), SIN cascada — si alguna vez se enlaza un
 * objetivo o evento a esta realizacion (hoy esa funcionalidad no esta
 * construida en el Portal, 0 filas la usan), el DELETE fallaria con un
 * error de FK en vez de silenciosamente dejar algo roto. Se captura y
 * se devuelve como mensaje claro, no se fuerza ni se ignora.
 */
export async function deleteEvaluation(
  evaluationId: string,
  athleteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("evaluations").delete().eq("id", evaluationId);
  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "No se pudo eliminar: hay un objetivo o evento de agenda enlazado a esta evaluación.",
      };
    }
    return { error: `No se pudo eliminar: ${error.message}` };
  }

  revalidatePath(`/perfiles/atleta/${athleteId}/evaluaciones-clinicas`);
  return { error: null };
}

export async function fetchEvaluationHistory(
  athleteId: string,
  templateId: string
): Promise<ClinicalRealization[]> {
  return getClinicalEvaluationHistory(athleteId, templateId);
}

/** Definiciones de medidas de una plantilla compuesta — usado por
 * EvaluationModal para generar el formulario dinamico. */
export async function fetchMeasureDefinitions(templateId: string): Promise<EvaluationTemplateMeasureRow[]> {
  return getEvaluationTemplateMeasures(templateId);
}

/** Valores ya guardados de una realizacion compuesta — usado por
 * EvaluationModal al entrar en modo edicion. */
export async function fetchResultMeasures(evaluationResultId: string): Promise<EvaluationResultMeasureRow[]> {
  return getEvaluationResultMeasures(evaluationResultId);
}
