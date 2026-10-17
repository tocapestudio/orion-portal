"use client";

import { useActionState, useEffect, useState } from "react";
import type { ClinicalRealization, EvaluationTemplateRow } from "@/lib/data/perfil";
import type { EvaluationTemplateMeasureRow } from "@/lib/data/library";
import {
  saveEvaluation,
  fetchMeasureDefinitions,
  fetchResultMeasures,
  type EvaluationFormState,
} from "./evaluacionesActions";
import { buildCompositeEntries, type CompositeEntry } from "./compositeEngine";

const initialState: EvaluationFormState = { error: null, success: false };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface CustomVariableDef {
  name: string;
}

function customVariableDefs(template: EvaluationTemplateRow | null): CustomVariableDef[] {
  if (!template || !Array.isArray(template.custom_variables)) return [];
  return (template.custom_variables as unknown as CustomVariableDef[]).filter(
    (d) => d && typeof d.name === "string"
  );
}

/** Describe la configuracion real de una plantilla en una palabra corta
 * — se usa SOLO para distinguir plantillas cuyo nombre coincide con
 * otra (ver templateOptionLabel). No cambia el nombre almacenado. */
function describeTemplateVariant(t: EvaluationTemplateRow): string {
  if (t.is_composite) return "Compuesta";
  if (t.requires_od_os_binocular) return "OD/OI/Binocular";
  if (t.has_repetitions) return "Repeticiones";
  if (t.has_custom_variables) return "Variables personalizadas";
  return "Valor único";
}

/**
 * Etiqueta a mostrar en el selector. Generica: si el nombre de esta
 * plantilla es unico dentro de la lista, se muestra tal cual — ninguna
 * plantilla con nombre unico cambia de aspecto. Solo cuando dos o mas
 * plantillas comparten exactamente el mismo name se añade un sufijo
 * derivado de su configuracion real, para que sean distinguibles sin
 * tocar el nombre guardado en Core. El value del <option> sigue siendo
 * siempre template.id, sin relacion con esta funcion.
 */
function templateOptionLabel(template: EvaluationTemplateRow, templates: EvaluationTemplateRow[]): string {
  const sameName = templates.filter((t) => t.name === template.name).length;
  if (sameName <= 1) return template.name;
  return `${template.name} · ${describeTemplateVariant(template)}`;
}

/**
 * Crear/editar UNA realizacion. Al editar, la plantilla queda
 * bloqueada (cambiar de plantilla seria otra evaluacion, no una
 * correccion) pero fecha/valores/notas son editables sin restriccion —
 * decision explicita: corregir la fecha no debe bloquearse.
 */
export default function EvaluationModal({
  athleteId,
  templates,
  editing,
  onClose,
}: {
  athleteId: string;
  templates: EvaluationTemplateRow[];
  editing?: ClinicalRealization;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveEvaluation, initialState);

  const [evaluationId] = useState(() => editing?.evaluation.id ?? crypto.randomUUID());
  const [resultId] = useState(() => editing?.result.id ?? crypto.randomUUID());
  const [templateId, setTemplateId] = useState(editing?.template.id ?? templates[0]?.id ?? "");
  const template = templates.find((t) => t.id === templateId) ?? editing?.template ?? null;

  const [date, setDate] = useState(editing?.evaluation.date ?? todayIso());
  const [notes, setNotes] = useState(editing?.result.notes ?? "");

  const [simpleValue, setSimpleValue] = useState(
    editing?.result.primary_variable_value != null ? String(editing.result.primary_variable_value) : ""
  );
  const [valueOd, setValueOd] = useState(
    editing?.result.value_od != null ? String(editing.result.value_od) : ""
  );
  const [valueOs, setValueOs] = useState(
    editing?.result.value_os != null ? String(editing.result.value_os) : ""
  );
  const [valueBinocular, setValueBinocular] = useState(
    editing?.result.value_binocular != null ? String(editing.result.value_binocular) : ""
  );
  const [repetitionValues, setRepetitionValues] = useState<string[]>(() => {
    if (editing?.result.repetitions && Array.isArray(editing.result.repetitions)) {
      return (editing.result.repetitions as { value: number }[]).map((r) => String(r.value));
    }
    return Array.from({ length: template?.repetition_count ?? 0 }, () => "");
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const existing = (editing?.result.custom_values as Record<string, unknown>) ?? {};
    const initial: Record<string, string> = {};
    for (const d of customVariableDefs(template)) {
      initial[d.name] = existing[d.name] != null ? String(existing[d.name]) : "";
    }
    return initial;
  });

  const [templateMeasures, setTemplateMeasures] = useState<EvaluationTemplateMeasureRow[] | null>(null);
  const [compositeEntries, setCompositeEntries] = useState<CompositeEntry[]>([]);

  useEffect(() => {
    // Sin reset sincrono al salir de composite: el bloque de medidas solo
    // se renderiza con mode==="composite", asi que el estado obsoleto
    // queda simplemente sin usar hasta que se vuelva a entrar aqui (y
    // entonces se sobrescribe con datos frescos).
    if (!template || !template.is_composite) return;
    let active = true;
    (async () => {
      const measures = await fetchMeasureDefinitions(template.id);
      const existingMeasures = editing ? await fetchResultMeasures(editing.result.id) : [];
      if (!active) return;
      setTemplateMeasures(measures);
      setCompositeEntries(buildCompositeEntries(measures, existingMeasures));
    })();
    return () => {
      active = false;
    };
  }, [template, editing]);

  useEffect(() => {
    if (state.success) onClose();
  }, [state, onClose]);

  if (!template) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <p className="text-sm text-orion-navy-700">
            No hay plantillas clínicas disponibles. Créalas en Diseñar → Diseñar Evaluaciones.
          </p>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm text-orion-navy-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mode: "composite" | "od_os_bin" | "repetitions" | "custom" | "simple" = template.is_composite
    ? "composite"
    : template.requires_od_os_binocular
      ? "od_os_bin"
      : template.has_repetitions
        ? "repetitions"
        : template.has_custom_variables
          ? "custom"
          : "simple";

  function updateComposite(id: string, patch: Partial<CompositeEntry>) {
    setCompositeEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function buildValuesJson() {
    if (mode === "composite") {
      return {
        mode,
        composite: compositeEntries
          .filter((e) => e.valueNumeric.trim() !== "" || e.valueCategory.trim() !== "")
          .map((e) => ({
            id: e.id,
            measureId: e.measureId,
            conditions: e.conditions,
            valueNumeric: e.valueType === "numeric" ? e.valueNumeric : null,
            valueCategory: e.valueType === "categorical" ? e.valueCategory : null,
          })),
      };
    }
    if (mode === "od_os_bin") return { mode, valueOd, valueOs, valueBinocular };
    if (mode === "repetitions") {
      return { mode, repetitions: repetitionValues.map((v) => Number(v) || 0) };
    }
    if (mode === "custom") {
      const cv: Record<string, number> = {};
      for (const [k, v] of Object.entries(customValues)) cv[k] = Number(v) || 0;
      return { mode, customValues: cv };
    }
    return { mode, simpleValue };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-orion-navy-100 px-6 py-4">
          <h2 className="text-base font-semibold text-orion-navy-900">
            {editing ? `Editar evaluación · ${template.name}` : "Nueva evaluación"}
          </h2>
          <button onClick={onClose} className="text-orion-navy-400 hover:text-orion-navy-700">
            ✕
          </button>
        </div>

        <form
          action={(formData) => {
            formData.set("values", JSON.stringify(buildValuesJson()));
            formData.set("measurement_unit", template.measurement_unit ?? "");
            formAction(formData);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="evaluation_id" value={evaluationId} />
          <input type="hidden" name="result_id" value={resultId} />
          <input type="hidden" name="athlete_id" value={athleteId} />
          <input type="hidden" name="template_id" value={template.id} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="notes" value={notes} />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                Tipo de evaluación
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={Boolean(editing)}
                required
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm disabled:bg-orion-navy-100"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {templateOptionLabel(t, templates)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>

            {mode === "composite" && (
              <div className="space-y-4">
                {templateMeasures === null ? (
                  <p className="text-xs text-orion-navy-400">Cargando medidas…</p>
                ) : templateMeasures.length === 0 ? (
                  <p className="text-xs text-orion-navy-400">
                    Esta plantilla compuesta todavía no tiene medidas definidas. Añádelas en
                    Biblioteca → Mis evaluaciones.
                  </p>
                ) : (
                  templateMeasures.map((measure) => (
                    <div
                      key={measure.id}
                      className="space-y-2 rounded-lg border border-orion-navy-100 p-3"
                    >
                      <p className="text-xs font-semibold text-orion-navy-700">
                        {measure.name}
                        {measure.is_primary && (
                          <span className="ml-1.5 rounded-full bg-orion-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-orion-navy-700">
                            Principal
                          </span>
                        )}
                        {measure.measurement_unit && (
                          <span className="ml-1.5 font-normal text-orion-navy-400">
                            ({measure.measurement_unit})
                          </span>
                        )}
                      </p>
                      <div className="space-y-1.5">
                        {compositeEntries
                          .filter((e) => e.measureId === measure.id)
                          .map((entry) => (
                            <div key={entry.id} className="flex items-center gap-2">
                              <span className="w-28 shrink-0 text-xs text-orion-navy-600">
                                {entry.label}
                              </span>
                              {entry.valueType === "categorical" ? (
                                <select
                                  value={entry.valueCategory}
                                  onChange={(e) =>
                                    updateComposite(entry.id, { valueCategory: e.target.value })
                                  }
                                  className="flex-1 rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
                                >
                                  <option value="">—</option>
                                  {(entry.allowedCategories ?? []).map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="number"
                                  step="any"
                                  value={entry.valueNumeric}
                                  onChange={(e) =>
                                    updateComposite(entry.id, { valueNumeric: e.target.value })
                                  }
                                  className="flex-1 rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {mode === "od_os_bin" && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-orion-navy-700">OD</label>
                  <input
                    type="number"
                    step="any"
                    value={valueOd}
                    onChange={(e) => setValueOd(e.target.value)}
                    className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-orion-navy-700">OI</label>
                  <input
                    type="number"
                    step="any"
                    value={valueOs}
                    onChange={(e) => setValueOs(e.target.value)}
                    className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                    Binocular
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={valueBinocular}
                    onChange={(e) => setValueBinocular(e.target.value)}
                    className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {mode === "repetitions" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                  Repeticiones {template.measurement_unit ? `(${template.measurement_unit})` : ""}
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {repetitionValues.map((v, i) => (
                    <input
                      key={i}
                      type="number"
                      step="any"
                      value={v}
                      onChange={(e) => {
                        const next = [...repetitionValues];
                        next[i] = e.target.value;
                        setRepetitionValues(next);
                      }}
                      placeholder={`#${i + 1}`}
                      className="w-full rounded-lg border border-orion-navy-200 px-2 py-2 text-sm"
                    />
                  ))}
                </div>
              </div>
            )}

            {mode === "custom" && (
              <div className="space-y-2">
                {Object.keys(customValues).map((name) => (
                  <div key={name}>
                    <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                      {name}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={customValues[name]}
                      onChange={(e) => setCustomValues({ ...customValues, [name]: e.target.value })}
                      className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {mode === "simple" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                  Resultado {template.measurement_unit ? `(${template.measurement_unit})` : ""}
                </label>
                <input
                  type="number"
                  step="any"
                  value={simpleValue}
                  onChange={(e) => setSimpleValue(e.target.value)}
                  className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>

            {state.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-orion-navy-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm text-orion-navy-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || (mode === "composite" && templateMeasures === null)}
              className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-800 disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
