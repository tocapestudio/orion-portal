import type { ClinicalMeasureValue, ClinicalRealization, EvaluationResultRow, EvaluationTemplateRow } from "@/lib/data/perfil";
import type { Conditions } from "./compositeEngine";

/** "Resultado principal" a mostrar en tarjeta/histórico, según la
 * configuración de la plantilla (OD/OI/Bin, valor simple, o custom). */
export function formatResultValue(
  result: EvaluationResultRow,
  template: EvaluationTemplateRow
): string {
  if (template.requires_od_os_binocular) {
    const parts: string[] = [];
    if (result.value_od != null) parts.push(`OD ${result.value_od}`);
    if (result.value_os != null) parts.push(`OI ${result.value_os}`);
    if (result.value_binocular != null) parts.push(`Bin ${result.value_binocular}`);
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  if (result.primary_variable_value != null) {
    const unit = result.measurement_unit ?? template.measurement_unit;
    return unit ? `${result.primary_variable_value} ${unit}` : String(result.primary_variable_value);
  }

  if (result.custom_values && typeof result.custom_values === "object") {
    const entries = Object.entries(result.custom_values as Record<string, unknown>);
    if (entries.length > 0) return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
  }

  return "—";
}

/** Reconstruye el objeto de condiciones (compositeEngine.Conditions) a
 * partir de las columnas planas de una fila real de
 * evaluation_result_measures. */
export function conditionsFromMeasureValue(m: ClinicalMeasureValue): Conditions {
  return {
    distance: (m.distance as Conditions["distance"]) ?? undefined,
    laterality: (m.laterality as Conditions["laterality"]) ?? undefined,
    correction: (m.correction as Conditions["correction"]) ?? undefined,
    axis: (m.axis as Conditions["axis"]) ?? undefined,
    sense: (m.sense as Conditions["sense"]) ?? undefined,
    component: m.component ?? undefined,
  };
}

/** Etiqueta legible de condiciones para el histórico — solo muestra las
 * dimensiones realmente presentes, no inventa ninguna. Independiente del
 * formato compacto que usa EvaluationModal (conditionsLabel en
 * compositeEngine.ts) para no arriesgar el modal ya verificado. */
export function formatConditionsLabel(c: Conditions): string {
  const parts: string[] = [];
  if (c.distance) parts.push(c.distance);
  if (c.correction) parts.push(c.correction === "con" ? "con corrección" : "sin corrección");
  if (c.laterality) parts.push(c.laterality === "binocular" ? "Binocular" : c.laterality);
  if (c.sense) parts.push(c.sense);
  if (c.component) parts.push(c.component);
  return parts.length > 0 ? parts.join(" · ") : "Valor único";
}

/** Valor formateado de UNA medida concreta (numérica o categórica). */
export function formatMeasureValue(m: ClinicalMeasureValue): string {
  if (m.measureValueType === "categorical") return m.value_category ?? "—";
  if (m.value_numeric == null) return "—";
  return m.measurement_unit ? `${m.value_numeric} ${m.measurement_unit}` : String(m.value_numeric);
}

/**
 * Resumen de UNA realizacion compuesta para la tarjeta de Evaluaciones
 * Clínicas. Usa la medida marcada is_primary — pero solo si resuelve a
 * un unico valor sin ambigüedad (la medida principal sin condiciones, o
 * con condiciones pero con un solo valor registrado esa realización).
 * Si hay varias combinaciones con valor para la medida principal, NO
 * elige una arbitrariamente — eso requeriría saber cuál es "la"
 * condición relevante de cada prueba, que es justo el conocimiento
 * específico que este módulo no debe tener.
 */
export function formatCompositeSummary(realization: ClinicalRealization): string {
  if (realization.measures.length === 0) return "—";

  const primaryValues = realization.measures.filter((m) => m.measureIsPrimary);
  if (primaryValues.length === 1) return formatMeasureValue(primaryValues[0]);

  const count = realization.measures.length;
  return `${count} ${count === 1 ? "valor registrado" : "valores registrados"}`;
}
