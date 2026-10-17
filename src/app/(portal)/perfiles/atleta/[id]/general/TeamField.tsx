"use client";

import { useActionState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { updateAthleteCategory, type CategoryFormState } from "./actions";

const initialState: CategoryFormState = { error: null, success: false };

/**
 * Categoria / Posicion / Dorsal. "Equipo" no aparece aqui ni en el
 * formulario — internamente sigue usando core.teams (la accion busca o
 * crea el equipo correspondiente por club+deporte+categoria), pero eso es
 * un detalle de implementacion invisible para el profesional.
 */
export default function TeamField({
  athleteId,
  clubId,
  currentCategory,
  currentPosition,
  currentDorsal,
  categories,
  editing,
  onSaved,
}: {
  athleteId: string;
  clubId: string | null;
  currentCategory: string | null;
  currentPosition: string | null;
  currentDorsal: number | null;
  categories: string[];
  editing: boolean;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateAthleteCategory, initialState);

  useCloseOnSuccess(state, onSaved);

  if (!editing) {
    return (
      <>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
            Categoría
          </p>
          <p className="truncate text-sm text-orion-navy-900" title={currentCategory ?? undefined}>
            {currentCategory ?? "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
            Posición
          </p>
          <p className="truncate text-sm text-orion-navy-900" title={currentPosition ?? undefined}>
            {currentPosition ?? "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">Dorsal</p>
          <p className="truncate text-sm text-orion-navy-900">{currentDorsal ?? "—"}</p>
        </div>
      </>
    );
  }

  if (!clubId) {
    return (
      <div className="col-span-2 sm:col-span-3">
        <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
          Categoría · Posición · Dorsal
        </p>
        <p className="text-xs text-orion-navy-400">
          Asigna primero un club para poder editar estos datos.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="col-span-2 space-y-2 sm:col-span-3">
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="club_id" value={clubId} />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
            Categoría
          </label>
          <input
            name="category"
            list="team-categories"
            defaultValue={currentCategory ?? ""}
            placeholder="Ej. Senior"
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
          <datalist id="team-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
            Posición
          </label>
          <input
            name="position"
            defaultValue={currentPosition ?? ""}
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
            Dorsal
          </label>
          <input
            name="dorsal"
            type="number"
            defaultValue={currentDorsal ?? ""}
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-orion-navy-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
