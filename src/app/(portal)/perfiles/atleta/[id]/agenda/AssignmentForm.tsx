"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { createAssignment, type AssignmentFormState } from "./actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";
import type { ActivityCatalogRow } from "@/lib/data/library";

const initialState: AssignmentFormState = { error: null, success: false };
/** Mismo literal que actions.ts (archivo "use server", no puede exportar
 * constantes no-funcion) — marca la opcion "crear actividad nueva". */
const NEW_ACTIVITY_VALUE = "__new__";

/**
 * Unico punto de entrada para crear tareas para casa: boton "+ Nueva
 * tarea" + modal, mismo patron que GoalForm. "Actividad" permite elegir
 * una ya existente del catalogo manual propio (reutiliza modality_id=
 * "manual", igual que Biblioteca > Mis ejercicios) o crear una nueva sobre
 * la marcha sin salir del modal.
 */
export default function AssignmentForm({
  athleteId,
  manualActivities,
  defaultDate,
}: {
  athleteId: string;
  manualActivities: ActivityCatalogRow[];
  /** Precarga "Fecha programada" con el dia que se esta viendo en el panel
   * (sigue siendo un campo editable, no cambia la funcionalidad). */
  defaultDate?: string;
}) {
  const [state, formAction, pending] = useActionState(createAssignment, initialState);
  const [open, setOpen] = useState(false);
  const [activitySelection, setActivitySelection] = useState<string>(
    manualActivities[0]?.id ?? NEW_ACTIVITY_VALUE
  );

  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${CREATE_ACTION_CLASSES}`}
      >
        + Nueva tarea
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-orion-navy-100 px-6 py-4">
              <h2 className="text-base font-semibold text-orion-navy-900">Nueva tarea para casa</h2>
              <button onClick={() => setOpen(false)} className="text-orion-navy-400 hover:text-orion-navy-700">
                ✕
              </button>
            </div>

            <form action={formAction} className="space-y-3 px-6 py-4">
              <input type="hidden" name="athlete_id" value={athleteId} />

              <label className="block text-xs text-orion-navy-500">
                Actividad
                <select
                  name="activity_catalog_id"
                  value={activitySelection}
                  onChange={(e) => setActivitySelection(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                >
                  {manualActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                  <option value={NEW_ACTIVITY_VALUE}>+ Nueva actividad manual…</option>
                </select>
              </label>

              {activitySelection === NEW_ACTIVITY_VALUE && (
                <input
                  name="new_activity_name"
                  placeholder="Nombre de la actividad (ej. Cordón de Brock)"
                  required
                  className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-orion-navy-500">
                  Fecha programada
                  <input
                    type="date"
                    name="scheduled_date"
                    defaultValue={defaultDate}
                    required
                    className="mt-1 w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-orion-navy-500">
                  Fecha límite
                  <input
                    type="date"
                    name="due_date"
                    className="mt-1 w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-orion-navy-500">
                  Duración (min)
                  <input
                    type="number"
                    name="duration"
                    min={1}
                    className="mt-1 w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-orion-navy-500">
                  Frecuencia
                  <input
                    name="frequency"
                    placeholder="ej. diario"
                    className="mt-1 w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block text-xs text-orion-navy-500">
                Instrucciones
                <textarea
                  name="instructions"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-xs text-orion-navy-500">
                Objetivo
                <textarea
                  name="objective"
                  rows={2}
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
                  {pending ? "Guardando…" : "Crear tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
