"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { savePrismaChildInfo, type PrismaFormState } from "./prismaActions";
import type { PrismaProfile } from "@/lib/data/prisma";

const initialState: PrismaFormState = { error: null, success: false };

export default function PrismaChildInfoCard({
  athleteId,
  profile,
}: {
  athleteId: string;
  profile: PrismaProfile | null;
}) {
  const [state, formAction, pending] = useActionState(savePrismaChildInfo, initialState);
  const [editing, setEditing] = useState(false);

  useCloseOnSuccess(state, () => setEditing(false));

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Información PRISMA
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
              Apodo
            </label>
            <input
              name="nickname"
              defaultValue={profile?.nickname ?? ""}
              className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Diagnósticos previos no oftalmológicos
            </label>
            <textarea
              name="prior_diagnoses"
              defaultValue={profile?.prior_diagnoses ?? ""}
              rows={2}
              className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Consideraciones para las sesiones
            </label>
            <textarea
              name="session_considerations"
              defaultValue={profile?.session_considerations ?? ""}
              rows={2}
              className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
            />
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
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">Apodo</p>
            <p className="text-sm text-orion-navy-900">{profile?.nickname || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Diagnósticos previos no oftalmológicos
            </p>
            <p className="whitespace-pre-wrap text-sm text-orion-navy-900">
              {profile?.prior_diagnoses || "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Consideraciones para las sesiones
            </p>
            <p className="whitespace-pre-wrap text-sm text-orion-navy-900">
              {profile?.session_considerations || "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
