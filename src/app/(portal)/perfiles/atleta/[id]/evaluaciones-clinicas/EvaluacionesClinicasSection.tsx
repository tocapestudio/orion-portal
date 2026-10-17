"use client";

import { useState } from "react";
import type { ClinicalEvaluationSummary, ClinicalRealization, EvaluationTemplateRow } from "@/lib/data/perfil";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";
import { formatCompositeSummary, formatResultValue } from "./evaluationDisplay";
import EvaluationModal from "./EvaluationModal";
import EvaluationHistoryModal from "./EvaluationHistoryModal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type ModalState = { type: "create" } | { type: "edit"; realization: ClinicalRealization } | null;

/**
 * Solo aparecen tipos de evaluacion con al menos una realizacion real
 * (nunca un catalogo de pruebas pendientes) — derivado en el servidor
 * por getClinicalEvaluationSummaries, agrupando evaluation_results por
 * evaluation_template_id.
 */
export default function EvaluacionesClinicasSection({
  athleteId,
  summaries,
  templates,
}: {
  athleteId: string;
  summaries: ClinicalEvaluationSummary[];
  templates: EvaluationTemplateRow[];
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [historyTemplate, setHistoryTemplate] = useState<EvaluationTemplateRow | null>(null);

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Evaluaciones Clínicas
        </p>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${CREATE_ACTION_CLASSES}`}
        >
          + Nueva evaluación
        </button>
      </div>

      {summaries.length === 0 ? (
        <p className="text-sm text-orion-navy-400">Sin evaluaciones clínicas registradas.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {summaries.map((s) => (
            <div key={s.template.id} className="rounded-lg border border-orion-navy-100 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-orion-navy-900">{s.template.name}</span>
                <span className="text-orion-navy-700">
                  {s.template.is_composite
                    ? formatCompositeSummary(s.latest)
                    : formatResultValue(s.latest.result, s.latest.template)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-orion-navy-500">
                <span>{formatDate(s.latest.evaluation.date)}</span>
                <span>
                  {s.count} {s.count === 1 ? "realización" : "realizaciones"}
                </span>
              </div>
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setHistoryTemplate(s.template)}
                  className="rounded-lg border border-orion-navy-200 px-2.5 py-1 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
                >
                  Ver histórico
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <EvaluationModal
          athleteId={athleteId}
          templates={templates}
          editing={modal.type === "edit" ? modal.realization : undefined}
          onClose={() => setModal(null)}
        />
      )}

      {historyTemplate && (
        <EvaluationHistoryModal
          athleteId={athleteId}
          template={historyTemplate}
          onClose={() => setHistoryTemplate(null)}
          onEdit={(realization) => {
            setHistoryTemplate(null);
            setModal({ type: "edit", realization });
          }}
        />
      )}
    </div>
  );
}
