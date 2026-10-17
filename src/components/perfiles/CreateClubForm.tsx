"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { createClub, type CreateClubState } from "@/app/(portal)/perfiles/[programa]/actions";
import type { Sport } from "@/lib/data/clubs";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

const initialState: CreateClubState = { error: null, success: false };

export default function CreateClubForm({ sports }: { sports: Sport[] }) {
  const [state, formAction, pending] = useActionState(createClub, initialState);
  const [open, setOpen] = useState(false);

  useCloseOnSuccess(state, () => setOpen(false));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${CREATE_ACTION_CLASSES}`}
      >
        + Crear club
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-orion-navy-200 bg-orion-navy-100/40 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Nombre del club"
          required
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm sm:col-span-2"
        />
        <select
          name="sport_id"
          defaultValue=""
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        >
          <option value="">Deporte (opcional)</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          name="logo_url"
          placeholder="URL del escudo (opcional)"
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${CREATE_ACTION_CLASSES}`}
        >
          {pending ? "Creando…" : "Crear club"}
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
