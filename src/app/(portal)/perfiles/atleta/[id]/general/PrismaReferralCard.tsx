"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { savePrismaReferralInfo, type PrismaFormState } from "./prismaActions";
import type { PrismaProfile } from "@/lib/data/prisma";

const initialState: PrismaFormState = { error: null, success: false };

export default function PrismaReferralCard({
  athleteId,
  profile,
}: {
  athleteId: string;
  profile: PrismaProfile | null;
}) {
  const [state, formAction, pending] = useActionState(savePrismaReferralInfo, initialState);
  const [editing, setEditing] = useState(false);

  useCloseOnSuccess(state, () => setEditing(false));

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Motivo de consulta
        </p>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
        >
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>

      {editing ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="athlete_id" value={athleteId} />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Motivo de consulta
            </label>
            <textarea
              name="consultation_reason"
              defaultValue={profile?.consultation_reason ?? ""}
              rows={2}
              className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Quién deriva
              </label>
              <input
                name="referred_by"
                defaultValue={profile?.referred_by ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Referencia de derivación
              </label>
              <input
                name="referral_reference"
                defaultValue={profile?.referral_reference ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Síntomas comunicados
              </label>
              <textarea
                name="reported_symptoms"
                defaultValue={profile?.reported_symptoms ?? ""}
                rows={2}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Fecha de derivación
              </label>
              <input
                type="date"
                name="referral_date"
                defaultValue={profile?.referral_date ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Motivo de consulta
            </p>
            <p className="whitespace-pre-wrap text-sm text-orion-navy-900">
              {profile?.consultation_reason || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Quién deriva
            </p>
            <p className="text-sm text-orion-navy-900">{profile?.referred_by || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Referencia de derivación
            </p>
            <p className="text-sm text-orion-navy-900">{profile?.referral_reference || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Síntomas comunicados
            </p>
            <p className="whitespace-pre-wrap text-sm text-orion-navy-900">
              {profile?.reported_symptoms || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Fecha de derivación
            </p>
            <p className="text-sm text-orion-navy-900">{profile?.referral_date || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
