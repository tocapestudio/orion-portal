"use client";

import { useActionState } from "react";
import type { Club } from "@/lib/data/clubs";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { updateAthleteClub, type ClubFormState } from "./actions";

const initialState: ClubFormState = { error: null, success: false };

export default function ClubField({
  athleteId,
  currentClubId,
  currentClubName,
  clubs,
  editing,
  onSaved,
}: {
  athleteId: string;
  currentClubId: string | null;
  currentClubName: string | null;
  clubs: Club[];
  editing: boolean;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateAthleteClub, initialState);

  useCloseOnSuccess(state, onSaved);

  if (!editing) {
    return (
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">Club</p>
        <p className="truncate text-sm text-orion-navy-900" title={currentClubName ?? undefined}>
          {currentClubName ?? "—"}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="col-span-2 space-y-2 sm:col-span-4">
      <input type="hidden" name="athlete_id" value={athleteId} />
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
        Club
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="club_id"
          defaultValue={currentClubId ?? ""}
          className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        >
          <option value="">— Ninguno —</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orion-navy-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar club"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
