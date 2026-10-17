"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { saveWorkProfile, type WorkProfileFormState } from "./actions";
import type { WorkProfile } from "@/lib/data/workProfile";

const initialState: WorkProfileFormState = { error: null, success: false };

const FIELDS: { name: keyof WorkProfile; label: string; multiline?: boolean }[] = [
  { name: "occupation", label: "Profesión / ocupación" },
  { name: "workplace", label: "Empresa o lugar de trabajo" },
  { name: "work_hours", label: "Horas de trabajo" },
  { name: "work_shift_type", label: "Tipo de jornada" },
  { name: "visual_needs", label: "Necesidades visuales relacionadas con el trabajo", multiline: true },
  { name: "notes", label: "Observaciones profesionales", multiline: true },
];

export default function ProfessionalDataCard({
  athleteId,
  workProfile,
  canEdit,
}: {
  athleteId: string;
  workProfile: WorkProfile | null;
  /** Solo admin o el profesional vinculado al atleta — el propio RLS de
   * core.athlete_work_profile es la proteccion real; esto solo evita
   * mostrar un boton que fallaria igualmente al guardar. */
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveWorkProfile, initialState);
  const [editing, setEditing] = useState(false);

  useCloseOnSuccess(state, () => setEditing(false));

  const hasData = FIELDS.some((f) => workProfile?.[f.name]);

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Datos profesionales
        </p>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
          >
            {hasData ? "Editar" : "Añadir datos profesionales"}
          </button>
        )}
        {canEdit && editing && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
          >
            Cancelar
          </button>
        )}
      </div>

      {editing ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="athlete_id" value={athleteId} />
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.name} className={f.multiline ? "sm:col-span-2" : undefined}>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                  {f.label}
                </label>
                {f.multiline ? (
                  <textarea
                    name={f.name}
                    defaultValue={workProfile?.[f.name] ?? ""}
                    rows={3}
                    className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    name={f.name}
                    defaultValue={workProfile?.[f.name] ?? ""}
                    className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </form>
      ) : hasData ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name} className={f.multiline ? "sm:col-span-2" : undefined}>
              <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                {f.label}
              </p>
              <p className="whitespace-pre-wrap text-sm text-orion-navy-900">
                {workProfile?.[f.name] || "—"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-orion-navy-400">
          {canEdit ? "Todavía no hay datos profesionales registrados." : "Sin datos profesionales registrados."}
        </p>
      )}
    </div>
  );
}
