"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { createGuardian, type GuardianFormState } from "./prismaActions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

const initialState: GuardianFormState = { error: null, success: false };

export default function CreateGuardianForm({ athleteId }: { athleteId: string }) {
  const [state, formAction, pending] = useActionState(createGuardian, initialState);
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(state, () => setOpen(false));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
      >
        + Añadir tutor
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mb-3 space-y-3 rounded-lg border border-orion-navy-200 bg-orion-navy-100/40 p-4"
    >
      <input type="hidden" name="athlete_id" value={athleteId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="full_name"
          required
          placeholder="Nombre completo"
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm sm:col-span-2"
        />
        <input
          name="relationship"
          placeholder="Relación (madre, padre, tutor legal…)"
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
        <input
          name="phone"
          placeholder="Teléfono"
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-orion-navy-800">
          <input type="checkbox" name="can_pickup" className="h-4 w-4" />
          Autorizado para recogida
        </label>
        <label className="flex items-center gap-2 text-sm text-orion-navy-800">
          <input type="checkbox" name="is_primary_contact" className="h-4 w-4" />
          Contacto principal
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60 ${CREATE_ACTION_CLASSES}`}
        >
          {pending ? "Guardando…" : "Añadir tutor"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-orion-navy-200 px-4 py-2 text-xs font-medium text-orion-navy-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
