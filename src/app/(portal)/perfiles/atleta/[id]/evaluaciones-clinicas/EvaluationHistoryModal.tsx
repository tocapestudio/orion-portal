"use client";

import { useEffect, useState, useTransition } from "react";
import type { ClinicalMeasureValue, ClinicalRealization, EvaluationTemplateRow } from "@/lib/data/perfil";
import { deleteEvaluation, fetchEvaluationHistory } from "./evaluacionesActions";
import {
  conditionsFromMeasureValue,
  formatConditionsLabel,
  formatMeasureValue,
  formatResultValue,
} from "./evaluationDisplay";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface MeasureGroup {
  measureId: string;
  measureName: string;
  isPrimary: boolean;
  displayOrder: number;
  values: ClinicalMeasureValue[];
}

/** Agrupa las medidas de una realizacion por medida de plantilla,
 * respetando display_order; dentro de cada medida ordena sus
 * combinaciones por su propia etiqueta, de forma generica (sin conocer
 * que dimension "importa mas" para ninguna prueba concreta). */
function groupMeasures(measures: ClinicalMeasureValue[]): MeasureGroup[] {
  const map = new Map<string, MeasureGroup>();
  for (const m of measures) {
    const existing = map.get(m.template_measure_id);
    if (existing) {
      existing.values.push(m);
    } else {
      map.set(m.template_measure_id, {
        measureId: m.template_measure_id,
        measureName: m.measureName,
        isPrimary: m.measureIsPrimary,
        displayOrder: m.measureDisplayOrder ?? 0,
        values: [m],
      });
    }
  }
  const groups = [...map.values()];
  groups.sort((a, b) => a.displayOrder - b.displayOrder);
  for (const g of groups) {
    g.values.sort((a, b) =>
      formatConditionsLabel(conditionsFromMeasureValue(a)).localeCompare(
        formatConditionsLabel(conditionsFromMeasureValue(b))
      )
    );
  }
  return groups;
}

export default function EvaluationHistoryModal({
  athleteId,
  template,
  onClose,
  onEdit,
}: {
  athleteId: string;
  template: EvaluationTemplateRow;
  onClose: () => void;
  onEdit: (realization: ClinicalRealization) => void;
}) {
  const [history, setHistory] = useState<ClinicalRealization[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [, startDeleteTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetchEvaluationHistory(athleteId, template.id).then((data) => {
      if (active) setHistory(data);
    });
    return () => {
      active = false;
    };
  }, [athleteId, template.id]);

  function handleDelete(r: ClinicalRealization) {
    if (
      !window.confirm(
        `¿Eliminar la realización del ${formatDate(r.evaluation.date)}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setDeleteError(null);
    setDeletingId(r.evaluation.id);
    startDeleteTransition(async () => {
      const res = await deleteEvaluation(r.evaluation.id, athleteId);
      if (res.error) {
        setDeleteError(res.error);
        setDeletingId(null);
        return;
      }
      // Solo esta realizacion desaparece de la lista local — el resto
      // del historico del mismo tipo, y el de cualquier otro, queda
      // intacto (cada una tiene su propia fila de evaluations).
      setHistory((prev) => (prev ? prev.filter((x) => x.evaluation.id !== r.evaluation.id) : prev));
      setDeletingId(null);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-orion-navy-100 px-6 py-4">
          <h2 className="text-base font-semibold text-orion-navy-900">{template.name}</h2>
          <button onClick={onClose} className="text-orion-navy-400 hover:text-orion-navy-700">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {history === null && <p className="text-sm text-orion-navy-400">Cargando…</p>}
          {history?.length === 0 && <p className="text-sm text-orion-navy-400">Sin realizaciones.</p>}
          {deleteError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{deleteError}</p>
          )}
          {history?.map((r) => (
            <div key={r.result.id} className="rounded-lg border border-orion-navy-100 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-orion-navy-900">{formatDate(r.evaluation.date)}</span>
                {!r.template.is_composite && (
                  <span className="text-orion-navy-700">{formatResultValue(r.result, r.template)}</span>
                )}
              </div>

              {r.template.is_composite && (
                <div className="mt-2 space-y-2">
                  {r.measures.length === 0 ? (
                    <p className="text-xs text-orion-navy-400">Sin medidas registradas.</p>
                  ) : (
                    groupMeasures(r.measures).map((group) => (
                      <div key={group.measureId}>
                        <p className="text-xs font-semibold text-orion-navy-700">
                          {group.measureName}
                          {group.isPrimary && (
                            <span className="ml-1.5 rounded-full bg-orion-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-orion-navy-700">
                              Principal
                            </span>
                          )}
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {group.values.map((v) => (
                            <div key={v.id} className="flex items-center justify-between text-xs">
                              <span className="text-orion-navy-500">
                                {formatConditionsLabel(conditionsFromMeasureValue(v))}
                              </span>
                              <span className="font-medium text-orion-navy-800">{formatMeasureValue(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {r.result.notes && <p className="mt-1 text-xs text-orion-navy-600">{r.result.notes}</p>}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => onEdit(r)}
                  disabled={deletingId === r.evaluation.id}
                  className="rounded-lg border border-orion-navy-200 px-2.5 py-1 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100 disabled:opacity-60"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(r)}
                  disabled={deletingId === r.evaluation.id}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {deletingId === r.evaluation.id ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
