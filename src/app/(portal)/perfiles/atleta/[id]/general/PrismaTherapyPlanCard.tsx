"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { savePrismaTherapyPlan, type PrismaFormState } from "./prismaActions";
import { PRISMA_PROCESS_STATUSES, prismaProcessStatusLabel } from "@/lib/prismaStatus";
import type { PrismaProfile } from "@/lib/data/prisma";

const initialState: PrismaFormState = { error: null, success: false };

export default function PrismaTherapyPlanCard({
  athleteId,
  profile,
}: {
  athleteId: string;
  profile: PrismaProfile | null;
}) {
  const [state, formAction, pending] = useActionState(savePrismaTherapyPlan, initialState);
  const [editing, setEditing] = useState(false);

  useCloseOnSuccess(state, () => setEditing(false));

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Plan de terapia y proceso PRISMA
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
              Estado del proceso PRISMA
            </label>
            <select
              name="process_status"
              defaultValue={profile?.process_status ?? "en_espera"}
              className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
            >
              {PRISMA_PROCESS_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {prismaProcessStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Frecuencia / orientación de trabajo
              </label>
              <input
                name="therapy_frequency"
                defaultValue={profile?.therapy_frequency ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Duración estimada
              </label>
              <input
                name="estimated_duration"
                defaultValue={profile?.estimated_duration ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Notas del plan
            </label>
            <textarea
              name="plan_notes"
              defaultValue={profile?.plan_notes ?? ""}
              rows={3}
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
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Estado del proceso PRISMA
            </p>
            <span className="mt-1 inline-block rounded-full bg-orion-navy-100 px-2.5 py-0.5 text-xs font-medium text-orion-navy-700">
              {prismaProcessStatusLabel(profile?.process_status ?? null)}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Frecuencia / orientación de trabajo
              </p>
              <p className="text-sm text-orion-navy-900">{profile?.therapy_frequency || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Duración estimada
              </p>
              <p className="text-sm text-orion-navy-900">{profile?.estimated_duration || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Notas del plan
              </p>
              <p className="whitespace-pre-wrap text-sm text-orion-navy-900">
                {profile?.plan_notes || "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <Link
        href={`/perfiles/atleta/${athleteId}/evaluaciones-clinicas`}
        className="mt-4 inline-block text-sm font-medium text-orion-navy-600 hover:underline"
      >
        Ver evaluaciones clínicas →
      </Link>
    </div>
  );
}
