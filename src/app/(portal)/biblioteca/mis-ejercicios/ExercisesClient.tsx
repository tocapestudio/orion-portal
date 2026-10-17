"use client";

import { useActionState, useState, useTransition } from "react";
import type { ActivityCatalogRow } from "@/lib/data/library";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { createExercise, updateExercise, setExerciseActive, type ExerciseFormState } from "./actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

const initialState: ExerciseFormState = { error: null, success: false };

function ExerciseFields({ exercise }: { exercise?: ActivityCatalogRow }) {
  return (
    <>
      <input
        name="name"
        placeholder="Nombre del ejercicio"
        defaultValue={exercise?.name ?? ""}
        required
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
      />
      <input
        name="category"
        placeholder="Categoría (texto libre, ej. oculomotricidad, coordinación...)"
        defaultValue={exercise?.category ?? ""}
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
      />
      <input
        name="objective"
        placeholder="Objetivo (opcional)"
        defaultValue={exercise?.objective ?? ""}
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
      />
      <textarea
        name="description"
        placeholder="Instrucciones / descripción (opcional)"
        rows={3}
        defaultValue={exercise?.description ?? ""}
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
      />
    </>
  );
}

function CreateExerciseForm() {
  const [state, formAction, pending] = useActionState(createExercise, initialState);
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(state, () => setOpen(false));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${CREATE_ACTION_CLASSES}`}
      >
        + Nuevo ejercicio
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-orion-navy-200 bg-orion-navy-100/40 p-4">
      <ExerciseFields />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar ejercicio"}
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

function ExerciseRow({ exercise }: { exercise: ActivityCatalogRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateExercise, initialState);
  const [archiving, startArchiving] = useTransition();

  useCloseOnSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form action={formAction} className="space-y-3 rounded-xl border border-orion-navy-200 bg-orion-navy-100/40 p-4">
        <input type="hidden" name="id" value={exercise.id} />
        <ExerciseFields exercise={exercise} />
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
    <div
      className={`flex items-start justify-between gap-3 rounded-lg border border-orion-navy-100 bg-white p-4 ${
        !exercise.active ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium text-orion-navy-900">{exercise.name}</p>
        {exercise.category && (
          <span className="mt-1 inline-block rounded-full bg-orion-navy-100 px-2 py-0.5 text-xs text-orion-navy-600">
            {exercise.category}
          </span>
        )}
        {exercise.objective && <p className="mt-1 text-xs text-orion-navy-500">{exercise.objective}</p>}
        {exercise.description && <p className="mt-1 text-sm text-orion-navy-700">{exercise.description}</p>}
        {!exercise.active && <p className="mt-1 text-xs font-medium text-orion-navy-400">Archivado</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
        >
          Editar
        </button>
        <button
          type="button"
          disabled={archiving}
          onClick={() =>
            startArchiving(() => {
              void setExerciseActive(exercise.id, !exercise.active);
            })
          }
          className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100 disabled:opacity-60"
        >
          {exercise.active ? "Archivar" : "Reactivar"}
        </button>
      </div>
    </div>
  );
}

export default function ExercisesClient({ exercises }: { exercises: ActivityCatalogRow[] }) {
  return (
    <div className="space-y-4">
      <CreateExerciseForm />

      {exercises.length === 0 && (
        <p className="py-8 text-center text-sm text-orion-navy-400">
          Todavía no has creado ningún ejercicio propio.
        </p>
      )}

      <div className="space-y-2">
        {exercises.map((ex) => (
          <ExerciseRow key={ex.id} exercise={ex} />
        ))}
      </div>
    </div>
  );
}
