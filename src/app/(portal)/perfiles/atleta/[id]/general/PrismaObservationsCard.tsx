"use client";

import { useActionState } from "react";
import { createPrismaProfessionalNote, type PrismaFormState } from "./prismaActions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";
import type { PrismaGuardianNoteRow, PrismaProfessionalNoteRow } from "@/lib/data/prisma";

const initialState: PrismaFormState = { error: null, success: false };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PrismaObservationsCard({
  athleteId,
  guardianNotes,
  professionalNotes,
}: {
  athleteId: string;
  guardianNotes: PrismaGuardianNoteRow[];
  professionalNotes: PrismaProfessionalNoteRow[];
}) {
  const [state, formAction, pending] = useActionState(createPrismaProfessionalNote, initialState);

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
        Observaciones
      </p>

      <div className="mb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-orion-navy-400">
          Observaciones del tutor
        </p>
        {guardianNotes.length === 0 ? (
          <p className="text-sm text-orion-navy-400">Todavía no hay observaciones del tutor.</p>
        ) : (
          <div className="space-y-2">
            {guardianNotes.map((n) => (
              <div key={n.id} className="rounded-lg bg-orion-navy-100/60 p-3 text-sm">
                <p className="text-orion-navy-900">{n.note}</p>
                <p className="mt-1 text-xs text-orion-navy-500">
                  {n.guardian_name} · {formatDate(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-orion-navy-100 pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-orion-navy-400">
          Observaciones profesionales
        </p>
        {professionalNotes.length === 0 ? (
          <p className="mb-3 text-sm text-orion-navy-400">Todavía no hay observaciones profesionales.</p>
        ) : (
          <div className="mb-3 space-y-2">
            {professionalNotes.map((n) => (
              <div key={n.id} className="rounded-lg border border-orion-navy-100 p-3 text-sm">
                <p className="text-orion-navy-900">{n.note}</p>
                <p className="mt-1 text-xs text-orion-navy-500">
                  {n.professional_name} · {formatDate(n.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}

        <form action={formAction} className="space-y-2">
          <input type="hidden" name="athlete_id" value={athleteId} />
          <textarea
            name="note"
            required
            rows={2}
            placeholder="Añadir una observación profesional…"
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className={`rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-60 ${CREATE_ACTION_CLASSES}`}
          >
            {pending ? "Guardando…" : "+ Añadir observación"}
          </button>
        </form>
      </div>
    </div>
  );
}
