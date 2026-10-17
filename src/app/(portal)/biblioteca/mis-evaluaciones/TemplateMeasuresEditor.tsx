"use client";

import type { TemplateMeasureWithUsage } from "./actions";

export interface MeasureDraft {
  id: string;
  /** true si esta medida ya existe en Core — no se puede eliminar desde
   * aqui (no hay policy DELETE para el profesional en
   * evaluation_template_measures, decision explicita: solo se puede
   * eliminar una medida mientras siga sin guardar). */
  persisted: boolean;
  /** true si ya existe al menos un resultado clinico para esta medida
   * (de cualquier profesional). Bloquea los 9 campos semanticos — solo
   * is_primary y el reordenado siguen editables, para no reinterpretar
   * retroactivamente datos ya guardados. */
  hasResults: boolean;
  name: string;
  value_type: "numeric" | "categorical";
  measurement_unit: string;
  allowed_categories: string;
  needs_distance: boolean;
  needs_laterality: boolean;
  needs_correction: boolean;
  needs_direction: boolean;
  needs_component: boolean;
  component_options: string;
  is_primary: boolean;
}

export function emptyMeasureDraft(): MeasureDraft {
  return {
    id: crypto.randomUUID(),
    persisted: false,
    hasResults: false,
    name: "",
    value_type: "numeric",
    measurement_unit: "",
    allowed_categories: "",
    needs_distance: false,
    needs_laterality: false,
    needs_correction: false,
    needs_direction: false,
    needs_component: false,
    component_options: "",
    is_primary: false,
  };
}

export function measureDraftFromRow(row: TemplateMeasureWithUsage): MeasureDraft {
  return {
    id: row.id,
    persisted: true,
    hasResults: row.hasResults,
    name: row.name,
    value_type: row.value_type === "categorical" ? "categorical" : "numeric",
    measurement_unit: row.measurement_unit ?? "",
    allowed_categories: (row.allowed_categories ?? []).join(", "),
    needs_distance: row.needs_distance,
    needs_laterality: row.needs_laterality,
    needs_correction: row.needs_correction,
    needs_direction: row.needs_direction,
    needs_component: row.needs_component,
    component_options: (row.component_options ?? []).join(", "),
    is_primary: row.is_primary,
  };
}

/** Payload que viaja al server action — el orden del array ES el
 * display_order final (se recalcula en servidor a partir del indice). */
export function serializeMeasureDrafts(measures: MeasureDraft[]) {
  return measures.map((m) => ({
    id: m.id,
    name: m.name.trim(),
    value_type: m.value_type,
    measurement_unit: m.measurement_unit.trim() || null,
    allowed_categories:
      m.value_type === "categorical"
        ? m.allowed_categories
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
    needs_distance: m.needs_distance,
    needs_laterality: m.needs_laterality,
    needs_correction: m.needs_correction,
    needs_direction: m.needs_direction,
    needs_component: m.needs_component,
    component_options: m.needs_component
      ? m.component_options
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null,
    is_primary: m.is_primary,
  }));
}

const CHECKBOX_CLASSES = "flex items-center gap-1.5";

/**
 * Editor de medidas de una plantilla compuesta. Añadir/editar/reordenar
 * siempre disponibles; eliminar solo para medidas todavia sin guardar
 * (persisted=false) — decision explicita del usuario, sin tocar RLS.
 */
export default function TemplateMeasuresEditor({
  measures,
  onChange,
}: {
  measures: MeasureDraft[];
  onChange: (measures: MeasureDraft[]) => void;
}) {
  function update(index: number, patch: Partial<MeasureDraft>) {
    const next = [...measures];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(measures.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= measures.length) return;
    const next = [...measures];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border border-orion-navy-200 bg-orion-navy-100/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
        Medidas de esta evaluación
      </p>

      {measures.length === 0 && (
        <p className="text-xs text-orion-navy-400">Todavía no hay medidas definidas.</p>
      )}

      {measures.map((m, i) => (
        <div key={m.id} className="space-y-2 rounded-lg border border-orion-navy-100 bg-white p-3">
          <div className="flex items-center gap-2">
            <input
              value={m.name}
              onChange={(e) => update(i, { name: e.target.value })}
              disabled={m.hasResults}
              placeholder="Nombre de la medida (ej. Forias, Esfera, Agudeza)"
              className="flex-1 rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm disabled:bg-orion-navy-100"
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="rounded-md border border-orion-navy-200 px-2 py-1 text-xs text-orion-navy-700 disabled:opacity-30"
              aria-label="Mover arriba"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === measures.length - 1}
              className="rounded-md border border-orion-navy-200 px-2 py-1 text-xs text-orion-navy-700 disabled:opacity-30"
              aria-label="Mover abajo"
            >
              ↓
            </button>
            {m.persisted ? (
              <span
                title="Ya guardada — no se puede eliminar desde aquí"
                className="cursor-not-allowed px-1 text-xs text-orion-navy-300"
              >
                🔒
              </span>
            ) : (
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                aria-label="Quitar medida"
              >
                ✕
              </button>
            )}
          </div>

          {m.hasResults && (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
              Esta medida ya tiene resultados registrados — su definición no puede modificarse.
              Solo puedes reordenarla o marcarla como principal.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <select
              value={m.value_type}
              onChange={(e) => update(i, { value_type: e.target.value as "numeric" | "categorical" })}
              disabled={m.hasResults}
              className="rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm disabled:bg-orion-navy-100"
            >
              <option value="numeric">Numérico</option>
              <option value="categorical">Categórico</option>
            </select>
            <input
              value={m.measurement_unit}
              onChange={(e) => update(i, { measurement_unit: e.target.value })}
              disabled={m.hasResults}
              placeholder="Unidad (ej. D, Δ, cm)"
              className="rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm disabled:bg-orion-navy-100"
            />
          </div>

          {m.value_type === "categorical" && (
            <input
              value={m.allowed_categories}
              onChange={(e) => update(i, { allowed_categories: e.target.value })}
              disabled={m.hasResults}
              placeholder="Categorías válidas separadas por comas (ej. fusion, supresion_od)"
              className="w-full rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm disabled:bg-orion-navy-100"
            />
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-orion-navy-700">
            <label className={CHECKBOX_CLASSES}>
              <input
                type="checkbox"
                checked={m.needs_distance}
                onChange={(e) => update(i, { needs_distance: e.target.checked })}
                disabled={m.hasResults}
              />
              VL / VP
            </label>
            <label className={CHECKBOX_CLASSES}>
              <input
                type="checkbox"
                checked={m.needs_laterality}
                onChange={(e) => update(i, { needs_laterality: e.target.checked })}
                disabled={m.hasResults}
              />
              OD / OI / Binocular
            </label>
            <label className={CHECKBOX_CLASSES}>
              <input
                type="checkbox"
                checked={m.needs_correction}
                onChange={(e) => update(i, { needs_correction: e.target.checked })}
                disabled={m.hasResults}
              />
              con / sin corrección
            </label>
            <label className={CHECKBOX_CLASSES}>
              <input
                type="checkbox"
                checked={m.needs_direction}
                onChange={(e) => update(i, { needs_direction: e.target.checked })}
                disabled={m.hasResults}
              />
              eje / sentido
            </label>
            <label className={CHECKBOX_CLASSES}>
              <input
                type="checkbox"
                checked={m.needs_component}
                onChange={(e) => update(i, { needs_component: e.target.checked })}
                disabled={m.hasResults}
              />
              componente (borroso/ruptura…)
            </label>
            <label className={CHECKBOX_CLASSES}>
              <input
                type="checkbox"
                checked={m.is_primary}
                onChange={(e) => update(i, { is_primary: e.target.checked })}
              />
              Medida principal
            </label>
          </div>

          {m.needs_component && (
            <input
              value={m.component_options}
              onChange={(e) => update(i, { component_options: e.target.value })}
              disabled={m.hasResults}
              placeholder="Componentes válidos separados por comas (ej. blur, break, recovery)"
              className="w-full rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm disabled:bg-orion-navy-100"
            />
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...measures, emptyMeasureDraft()])}
        className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
      >
        + Añadir medida
      </button>
    </div>
  );
}
