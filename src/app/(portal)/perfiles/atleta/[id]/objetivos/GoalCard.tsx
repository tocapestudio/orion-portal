"use client";

import { useActionState, useState, useTransition } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import type { Goal } from "@/lib/data/perfil";
import { updateGoal, completeGoal, deleteGoal, type GoalFormState } from "./actions";

const initialState: GoalFormState = { error: null, success: false };

const STATUS_LABEL: Record<string, string> = {
  active: "En curso",
  completed: "Logrado",
  abandoned: "Abandonado",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-orion-navy-100 text-orion-navy-700",
  completed: "bg-emerald-100 text-emerald-700",
  abandoned: "bg-red-100 text-red-700",
};

function formatDate(d: string) {
  const [year, month, day] = d.split("-");
  if (!year || !month || !day) return d;
  return `${day}/${month}/${year}`;
}

/**
 * Tarjeta de UN objetivo, reutilizada para generales y especificos
 * (prop emphasize da a los generales mas peso visual: "pocos, grandes y
 * muy visibles"). canEdit=false (usuario/coach) oculta Editar/Marcar como
 * logrado/Eliminar — RLS (professional CRUD, resto SELECT) es la
 * proteccion real, esto solo evita mostrar controles que fallarian igual.
 */
export default function GoalCard({
  goal,
  athleteId,
  canEdit,
  emphasize = false,
}: {
  goal: Goal;
  athleteId: string;
  canEdit: boolean;
  emphasize?: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateGoal, initialState);
  const [editing, setEditing] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [busy, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  useCloseOnSuccess(state, () => setEditing(false));

  function handleComplete() {
    setConfirmingComplete(false);
    setActionError(null);
    startTransition(async () => {
      const res = await completeGoal(goal.id, athleteId);
      if (res.error) setActionError(res.error);
    });
  }

  function handleDelete() {
    if (!window.confirm(`¿Eliminar el objetivo "${goal.title}"? Esta acción no se puede deshacer.`)) return;
    setActionError(null);
    startTransition(async () => {
      const res = await deleteGoal(goal.id, athleteId);
      if (res.error) setActionError(res.error);
    });
  }

  if (editing) {
    return (
      <form action={formAction} className={`rounded-lg border border-orion-navy-200 bg-orion-navy-50 ${emphasize ? "p-4" : "p-3"}`}>
        <input type="hidden" name="goal_id" value={goal.id} />
        <input type="hidden" name="athlete_id" value={athleteId} />
        <div className="space-y-2">
          <input
            name="title"
            defaultValue={goal.title}
            required
            className="w-full rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
          />
          <textarea
            name="description"
            defaultValue={goal.description ?? ""}
            rows={2}
            className="w-full rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            name="target_date"
            defaultValue={goal.target_date ?? ""}
            className="rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
          />
        </div>
        {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orion-navy-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`rounded-lg border border-orion-navy-100 ${emphasize ? "p-4" : "min-h-[3.25rem] py-2 px-2.5"}`}>
      <div className={`flex items-start justify-between gap-2 ${emphasize ? "" : "gap-1.5"}`}>
        <div className="min-w-0">
          <p className={emphasize ? "text-lg font-semibold text-orion-navy-900" : "text-sm font-medium text-orion-navy-900"}>
            {goal.title}
          </p>
          {goal.description && (
            <p className={emphasize ? "text-sm text-orion-navy-500" : "text-xs text-orion-navy-500"}>{goal.description}</p>
          )}
          {goal.target_date && (
            <p className="mt-0.5 text-xs text-orion-navy-400">Fecha objetivo: {formatDate(goal.target_date)}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[goal.status] ?? STATUS_STYLE.active}`}
        >
          {STATUS_LABEL[goal.status] ?? goal.status}
        </span>
      </div>

      {actionError && <p className="mt-1 text-xs text-red-600">{actionError}</p>}

      {canEdit && (
        <div className={`flex justify-end gap-1 ${emphasize ? "mt-2" : "mt-1"}`}>
          {goal.status === "active" && (
            <button
              type="button"
              onClick={() => setConfirmingComplete(true)}
              disabled={busy}
              title="Marcar como logrado"
              aria-label="Marcar objetivo como logrado"
              className="rounded p-1 text-orion-navy-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-60"
            >
              <CheckCircleIcon />
            </button>
          )}
          {goal.status === "completed" && (
            <span
              title="Objetivo logrado"
              role="img"
              aria-label="Objetivo logrado"
              className="rounded p-1 text-emerald-600"
            >
              <CheckCircleIcon filled />
            </span>
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            title="Editar"
            aria-label="Editar objetivo"
            className="rounded p-1 text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700 disabled:opacity-60"
          >
            <PencilIcon />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            title="Eliminar"
            aria-label="Eliminar objetivo"
            className="rounded p-1 text-orion-navy-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <TrashIcon />
          </button>
        </div>
      )}

      {confirmingComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <p className="text-sm font-semibold text-orion-navy-900">¿Marcar este objetivo como logrado?</p>
            <p className="mt-1.5 text-xs text-orion-navy-500">
              Una vez confirmado, el logro se registrará y podrá aparecer en el tablón del usuario.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingComplete(false)}
                disabled={busy}
                className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                Sí, marcar como logrado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mismo patron de iconos inline SVG ya usado en el resto del Portal
 * (p.ej. FichaOptometricaForm) — no hay libreria de iconos instalada. */
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function CheckCircleIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
    >
      <circle cx="12" cy="12" r="9" fill={filled ? "currentColor" : "none"} />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" stroke={filled ? "white" : "currentColor"} />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
