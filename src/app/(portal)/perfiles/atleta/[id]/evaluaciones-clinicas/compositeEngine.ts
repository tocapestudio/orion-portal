import type { EvaluationTemplateMeasureRow } from "@/lib/data/library";
import type { EvaluationResultMeasureRow } from "@/lib/data/perfil";

/**
 * Motor generico de evaluaciones compuestas. NO conoce Agudeza Visual,
 * Binocularidad ni ninguna prueba por nombre — solo sabe leer los flags
 * needs_* de una medida y generar las combinaciones de condiciones que
 * esos flags implican. Reutilizable para cualquier plantilla compuesta
 * que se diseñe en el futuro.
 */
export interface Conditions {
  distance?: "VL" | "VP";
  laterality?: "OD" | "OI" | "binocular";
  correction?: "con" | "sin";
  axis?: "horizontal" | "vertical";
  sense?: "exo" | "eso" | "hiper";
  component?: string;
}

interface AxisDef {
  key: string;
  label: string;
  options: Conditions[];
}

const DISTANCE_AXIS: Conditions[] = [{ distance: "VL" }, { distance: "VP" }];
const LATERALITY_AXIS: Conditions[] = [{ laterality: "OD" }, { laterality: "OI" }, { laterality: "binocular" }];
const CORRECTION_AXIS: Conditions[] = [{ correction: "con" }, { correction: "sin" }];
/** axis+sense viajan juntos como UNA dimension: horizontal solo admite
 * exo/eso, vertical solo admite hiper (combinado con laterality para
 * saber que ojo, decision ya cerrada en el diseño del modelo clinico) —
 * por eso NO es un producto cartesiano de axis×sense (eso generaria
 * combinaciones invalidas como horizontal+hiper). */
const DIRECTION_AXIS: Conditions[] = [
  { axis: "horizontal", sense: "exo" },
  { axis: "horizontal", sense: "eso" },
  { axis: "vertical", sense: "hiper" },
];

/** Que ejes activa una medida, segun sus propios flags needs_* — nunca
 * segun su nombre. */
export function axesForMeasure(measure: EvaluationTemplateMeasureRow): AxisDef[] {
  const axes: AxisDef[] = [];
  if (measure.needs_distance) axes.push({ key: "distance", label: "Distancia", options: DISTANCE_AXIS });
  if (measure.needs_laterality) axes.push({ key: "laterality", label: "Lateralidad", options: LATERALITY_AXIS });
  if (measure.needs_correction) axes.push({ key: "correction", label: "Corrección", options: CORRECTION_AXIS });
  if (measure.needs_direction) axes.push({ key: "direction", label: "Eje / sentido", options: DIRECTION_AXIS });
  if (measure.needs_component) {
    const options = (measure.component_options ?? []).map((c) => ({ component: c }));
    axes.push({ key: "component", label: "Componente", options });
  }
  return axes;
}

/** Producto cartesiano de los ejes activos. Sin ejes activos devuelve
 * UNA combinacion vacia (la medida es un valor unico, sin condiciones). */
export function combinationsForMeasure(measure: EvaluationTemplateMeasureRow): Conditions[] {
  const axes = axesForMeasure(measure);
  if (axes.length === 0) return [{}];
  return axes.reduce<Conditions[]>(
    (acc, axis) => acc.flatMap((combo) => axis.options.map((opt) => ({ ...combo, ...opt }))),
    [{}]
  );
}

const CONDITION_KEYS: (keyof Conditions)[] = ["distance", "correction", "laterality", "axis", "sense", "component"];

export function conditionsEqual(a: Conditions, b: Conditions): boolean {
  return CONDITION_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null));
}

export function conditionsLabel(c: Conditions): string {
  const parts: string[] = [];
  if (c.distance) parts.push(c.distance);
  if (c.correction) parts.push(c.correction);
  if (c.laterality) parts.push(c.laterality === "binocular" ? "Bin" : c.laterality);
  if (c.axis || c.sense) parts.push([c.axis, c.sense].filter(Boolean).join(" "));
  if (c.component) parts.push(c.component);
  return parts.length > 0 ? parts.join(" · ") : "Valor";
}

export interface CompositeEntry {
  id: string;
  /** true si ya existe como fila real en evaluation_result_measures —
   * al guardar se actualiza por id, nunca se duplica. */
  persisted: boolean;
  measureId: string;
  measureName: string;
  valueType: "numeric" | "categorical";
  measurementUnit: string | null;
  allowedCategories: string[] | null;
  conditions: Conditions;
  label: string;
  valueNumeric: string;
  valueCategory: string;
}

/**
 * Genera TODAS las combinaciones de TODAS las medidas de la plantilla.
 * Si se pasan resultados existentes (edicion), cada combinacion que
 * coincide exactamente con una fila ya guardada reutiliza su id real y
 * precarga su valor — asi guardar vuelve a escribir la MISMA fila
 * (UPDATE via upsert por id), nunca crea un duplicado para la misma
 * medida+condiciones.
 */
export function buildCompositeEntries(
  measures: EvaluationTemplateMeasureRow[],
  existing: EvaluationResultMeasureRow[] = []
): CompositeEntry[] {
  const entries: CompositeEntry[] = [];
  for (const measure of measures) {
    for (const conditions of combinationsForMeasure(measure)) {
      const match = existing.find(
        (r) =>
          r.template_measure_id === measure.id &&
          conditionsEqual(conditions, {
            distance: (r.distance as Conditions["distance"]) ?? undefined,
            laterality: (r.laterality as Conditions["laterality"]) ?? undefined,
            correction: (r.correction as Conditions["correction"]) ?? undefined,
            axis: (r.axis as Conditions["axis"]) ?? undefined,
            sense: (r.sense as Conditions["sense"]) ?? undefined,
            component: r.component ?? undefined,
          })
      );
      entries.push({
        id: match?.id ?? crypto.randomUUID(),
        persisted: Boolean(match),
        measureId: measure.id,
        measureName: measure.name,
        valueType: measure.value_type === "categorical" ? "categorical" : "numeric",
        measurementUnit: measure.measurement_unit,
        allowedCategories: measure.allowed_categories,
        conditions,
        label: conditionsLabel(conditions),
        valueNumeric: match?.value_numeric != null ? String(match.value_numeric) : "",
        valueCategory: match?.value_category ?? "",
      });
    }
  }
  return entries;
}
