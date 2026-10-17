"use client";

import { useActionState, useEffect, useState } from "react";
import type { EvaluationTemplateRow } from "@/lib/data/library";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import {
  createEvaluationTemplate,
  updateEvaluationTemplate,
  fetchTemplateMeasures,
  type EvalTemplateFormState,
} from "./actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";
import TemplateMeasuresEditor, {
  measureDraftFromRow,
  serializeMeasureDrafts,
  type MeasureDraft,
} from "./TemplateMeasuresEditor";

const initialState: EvalTemplateFormState = { error: null, success: false };

const TEST_TYPES = [
  "static_acuity",
  "dynamic_acuity",
  "peripheral_vision",
  "eye_tracking",
  "saccadic_movement",
  "reaction_time",
  "depth_perception",
  "hand_eye_coordination",
  "accommodation",
  "vergence",
  "contrast_sensitivity",
  "visual_memory",
  "custom",
];

function TemplateFields({ template }: { template?: EvaluationTemplateRow }) {
  return (
    <>
      <input
        name="name"
        placeholder="Nombre de la evaluación"
        defaultValue={template?.name ?? ""}
        required
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
      />
      <select
        name="test_type"
        defaultValue={template?.test_type ?? "custom"}
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
      >
        {TEST_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <textarea
        name="description"
        placeholder="Descripción (opcional)"
        rows={2}
        defaultValue={template?.description ?? ""}
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-3 gap-3">
        <input
          name="measurement_unit"
          placeholder="Unidad (ej. seg, %)"
          defaultValue={template?.measurement_unit ?? ""}
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
        <input
          name="min_value"
          type="number"
          step="any"
          placeholder="Mín."
          defaultValue={template?.min_value ?? ""}
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
        <input
          name="max_value"
          type="number"
          step="any"
          placeholder="Máx."
          defaultValue={template?.max_value ?? ""}
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-orion-navy-700">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="has_repetitions" defaultChecked={template?.has_repetitions ?? false} />
          Con repeticiones
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            name="requires_od_os_binocular"
            defaultChecked={template?.requires_od_os_binocular ?? false}
          />
          OD / OI / binocular
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="lower_is_better" defaultChecked={template?.lower_is_better ?? false} />
          Menor valor = mejor
        </label>
      </div>
    </>
  );
}

function CreateTemplateForm() {
  const [state, formAction, pending] = useActionState(createEvaluationTemplate, initialState);
  const [open, setOpen] = useState(false);
  const [isComposite, setIsComposite] = useState(false);
  const [measures, setMeasures] = useState<MeasureDraft[]>([]);

  useCloseOnSuccess(state, () => {
    setOpen(false);
    setIsComposite(false);
    setMeasures([]);
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${CREATE_ACTION_CLASSES}`}
      >
        + Nueva plantilla de evaluación
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        formData.set("is_composite", isComposite ? "on" : "off");
        if (isComposite) formData.set("measures", JSON.stringify(serializeMeasureDrafts(measures)));
        formAction(formData);
      }}
      className="space-y-3 rounded-xl border border-orion-navy-200 bg-orion-navy-100/40 p-4"
    >
      <TemplateFields />
      <label className="flex items-center gap-1.5 text-sm text-orion-navy-700">
        <input
          type="checkbox"
          checked={isComposite}
          onChange={(e) => setIsComposite(e.target.checked)}
        />
        Evaluación compuesta (varias medidas con sus propias condiciones)
      </label>
      {isComposite && <TemplateMeasuresEditor measures={measures} onChange={setMeasures} />}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar plantilla"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm font-medium text-orion-navy-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function TemplateRow({ template, editable }: { template: EvaluationTemplateRow; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateEvaluationTemplate, initialState);
  const [isComposite, setIsComposite] = useState(template.is_composite);
  const [measures, setMeasures] = useState<MeasureDraft[]>([]);
  const [measuresLoaded, setMeasuresLoaded] = useState(false);

  useCloseOnSuccess(state, () => {
    setEditing(false);
    // Fuerza recarga en la proxima edicion: lo recien guardado ya esta
    // persistido en Core y debe dejar de poder eliminarse.
    setMeasuresLoaded(false);
  });

  useEffect(() => {
    if (!editing || !isComposite || measuresLoaded) return;
    let active = true;
    fetchTemplateMeasures(template.id).then((rows) => {
      if (!active) return;
      setMeasures(rows.map(measureDraftFromRow));
      setMeasuresLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [editing, isComposite, measuresLoaded, template.id]);

  if (editing) {
    return (
      <form
        action={(formData) => {
          formData.set("is_composite", isComposite ? "on" : "off");
          if (isComposite) formData.set("measures", JSON.stringify(serializeMeasureDrafts(measures)));
          formAction(formData);
        }}
        className="space-y-3 rounded-xl border border-orion-navy-200 bg-orion-navy-100/40 p-4"
      >
        <input type="hidden" name="id" value={template.id} />
        <TemplateFields template={template} />
        <label className="flex items-center gap-1.5 text-sm text-orion-navy-700">
          <input
            type="checkbox"
            checked={isComposite}
            onChange={(e) => setIsComposite(e.target.checked)}
          />
          Evaluación compuesta (varias medidas con sus propias condiciones)
        </label>
        {isComposite &&
          (measuresLoaded ? (
            <TemplateMeasuresEditor measures={measures} onChange={setMeasures} />
          ) : (
            <p className="text-xs text-orion-navy-400">Cargando medidas…</p>
          ))}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm font-medium text-orion-navy-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-orion-navy-100 bg-white p-4">
      <div className="min-w-0">
        <p className="font-medium text-orion-navy-900">{template.name}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {template.test_type && (
            <span className="rounded-full bg-orion-navy-100 px-2 py-0.5 text-xs text-orion-navy-600">
              {template.test_type}
            </span>
          )}
          {template.is_default && (
            <span className="rounded-full bg-orion-accent/20 px-2 py-0.5 text-xs font-medium text-orion-navy-700">
              Predeterminada
            </span>
          )}
          {template.is_composite && (
            <span className="rounded-full bg-orion-navy-200 px-2 py-0.5 text-xs font-medium text-orion-navy-700">
              Compuesta
            </span>
          )}
        </div>
        {template.description && <p className="mt-1 text-sm text-orion-navy-700">{template.description}</p>}
      </div>
      {editable && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
        >
          Editar
        </button>
      )}
    </div>
  );
}

export default function EvaluationsClient({
  own,
  defaults,
}: {
  own: EvaluationTemplateRow[];
  defaults: EvaluationTemplateRow[];
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Mis plantillas
        </p>
        <CreateTemplateForm />
        {own.length === 0 && (
          <p className="py-4 text-center text-sm text-orion-navy-400">
            Todavía no has creado ninguna plantilla propia.
          </p>
        )}
        <div className="space-y-2">
          {own.map((t) => (
            <TemplateRow key={t.id} template={t} editable />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Plantillas predeterminadas
        </p>
        <div className="space-y-2">
          {defaults.map((t) => (
            <TemplateRow key={t.id} template={t} editable={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
