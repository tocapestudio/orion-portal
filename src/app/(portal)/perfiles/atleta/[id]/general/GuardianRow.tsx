"use client";

import { useActionState, useState, useTransition } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { updateGuardian, deleteGuardian, type GuardianFormState } from "./prismaActions";
import type { PrismaGuardian } from "@/lib/data/prisma";

const initialState: GuardianFormState = { error: null, success: false };

export default function GuardianRow({ guardian }: { guardian: PrismaGuardian }) {
  const [state, formAction, pending] = useActionState(updateGuardian, initialState);
  const [editing, setEditing] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useCloseOnSuccess(state, () => setEditing(false));

  function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar a ${guardian.full_name} como tutor? Esta acción no se puede deshacer.`
      )
    )
      return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteGuardian(guardian.id, guardian.athlete_id);
      if (res.error) setDeleteError(res.error);
    });
  }

  if (editing) {
    return (
      <form action={formAction} className="space-y-3 rounded-lg border border-orion-navy-200 bg-orion-navy-100/40 p-4">
        <input type="hidden" name="id" value={guardian.id} />
        <input type="hidden" name="athlete_id" value={guardian.athlete_id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="full_name"
            defaultValue={guardian.full_name}
            required
            placeholder="Nombre completo"
            className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            name="relationship"
            defaultValue={guardian.relationship ?? ""}
            placeholder="Relación (madre, padre, tutor legal…)"
            className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
          <input
            name="phone"
            defaultValue={guardian.phone ?? ""}
            placeholder="Teléfono"
            className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
          <input
            name="email"
            type="email"
            defaultValue={guardian.email ?? ""}
            placeholder="Email"
            className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm sm:col-span-2"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-orion-navy-800">
            <input type="checkbox" name="can_pickup" defaultChecked={guardian.can_pickup} className="h-4 w-4" />
            Autorizado para recogida
          </label>
          <label className="flex items-center gap-2 text-sm text-orion-navy-800">
            <input
              type="checkbox"
              name="is_primary_contact"
              defaultChecked={guardian.is_primary_contact}
              className="h-4 w-4"
            />
            Contacto principal
          </label>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orion-navy-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-orion-navy-200 px-4 py-2 text-xs font-medium text-orion-navy-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-orion-navy-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-orion-navy-900">{guardian.full_name}</p>
          <p className="text-xs text-orion-navy-500">
            {guardian.relationship || "Relación no especificada"}
          </p>
          <p className="mt-1 text-sm text-orion-navy-700">
            {guardian.phone || "—"} {guardian.email ? `· ${guardian.email}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {guardian.is_primary_contact && (
              <span className="rounded-full bg-orion-navy-700 px-2 py-0.5 text-[11px] font-medium text-white">
                Contacto principal
              </span>
            )}
            {guardian.can_pickup && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Autorizado a recoger
              </span>
            )}
            <span className="rounded-full bg-orion-navy-100 px-2 py-0.5 text-[11px] font-medium text-orion-navy-600">
              {guardian.user_id ? "Con cuenta" : "Sin cuenta"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-orion-navy-200 px-2.5 py-1 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deletePending}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Eliminar
          </button>
        </div>
      </div>
      {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
    </div>
  );
}
