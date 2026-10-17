"use client";

import { useActionState, useState } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { savePrismaSchoolInfo, type PrismaFormState } from "./prismaActions";
import type { PrismaProfile } from "@/lib/data/prisma";

const initialState: PrismaFormState = { error: null, success: false };

export default function PrismaSchoolCard({
  athleteId,
  profile,
}: {
  athleteId: string;
  profile: PrismaProfile | null;
}) {
  const [state, formAction, pending] = useActionState(savePrismaSchoolInfo, initialState);
  const [editing, setEditing] = useState(false);

  useCloseOnSuccess(state, () => setEditing(false));

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Colegio</p>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Colegio
              </label>
              <input
                name="school_name"
                defaultValue={profile?.school_name ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Curso
              </label>
              <input
                name="school_grade"
                defaultValue={profile?.school_grade ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Contacto del centro
              </label>
              <input
                name="school_contact"
                defaultValue={profile?.school_contact ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-orion-navy-400">
                Dificultades comunicadas
              </label>
              <textarea
                name="school_reported_difficulties"
                defaultValue={profile?.school_reported_difficulties ?? ""}
                rows={2}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-orion-navy-800">
            <input
              type="checkbox"
              name="needs_school_coordination"
              defaultChecked={profile?.needs_school_coordination ?? false}
              className="h-4 w-4"
            />
            Necesita coordinación con el centro
          </label>

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
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">Colegio</p>
            <p className="text-sm text-orion-navy-900">{profile?.school_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">Curso</p>
            <p className="text-sm text-orion-navy-900">{profile?.school_grade || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Contacto del centro
            </p>
            <p className="text-sm text-orion-navy-900">{profile?.school_contact || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Dificultades comunicadas
            </p>
            <p className="whitespace-pre-wrap text-sm text-orion-navy-900">
              {profile?.school_reported_difficulties || "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-orion-navy-400">
              Necesidad de coordinación con el centro
            </p>
            <p className="text-sm text-orion-navy-900">
              {profile?.needs_school_coordination ? "Sí" : "No"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
