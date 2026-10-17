"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { createGoal, type GoalFormState } from "./actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

const initialState: GoalFormState = { error: null, success: false };

/**
 * Unico punto de entrada para crear objetivos: boton "+ Nuevo objetivo" +
 * modal con el selector General/Especifico dentro (antes era un
 * formulario fijo siempre visible pegado a Especificos). Reutiliza
 * createGoal tal cual — mismo payload, mismo goal_type.
 */
export default function GoalForm({ athleteId }: { athleteId: string }) {
  const [state, formAction, pending] = useActionState(createGoal, initialState);
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${CREATE_ACTION_CLASSES}`}
      >
        + Nuevo objetivo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-orion-navy-100 px-6 py-4">
              <h2 className="text-base font-semibold text-orion-navy-900">Nuevo objetivo</h2>
              <button onClick={() => setOpen(false)} className="text-orion-navy-400 hover:text-orion-navy-700">
                ✕
              </button>
            </div>

            <form action={formAction} className="space-y-3 px-6 py-4">
              <input type="hidden" name="athlete_id" value={athleteId} />

              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="goal_type" value="specific" defaultChecked />
                  Específico
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="goal_type" value="general" />
                  General
                </label>
              </div>

              <input
                name="title"
                placeholder="Título del objetivo"
                required
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
              <textarea
                name="description"
                placeholder="Descripción (opcional)"
                rows={2}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
              <label className="block text-xs text-orion-navy-500">
                Fecha objetivo (opcional)
                <input
                  type="date"
                  name="target_date"
                  className="mt-1 w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                />
              </label>

              {state.error && <p className="text-sm text-red-600">{state.error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm font-medium text-orion-navy-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${CREATE_ACTION_CLASSES}`}
                >
                  {pending ? "Guardando…" : "Crear objetivo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
