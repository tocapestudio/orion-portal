"use client";

import { useActionState, useState, useTransition } from "react";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import type { AssignmentWithActivity } from "@/lib/data/assignments";
import { updateAssignment, completeAssignment, deleteAssignment, type AssignmentFormState } from "./actions";

const initialState: AssignmentFormState = { error: null, success: false };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  completed: "✓ Hecho",
  skipped: "Omitida",
  overdue: "Atrasada",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-orion-navy-100 text-orion-navy-700",
  completed: "bg-emerald-100 text-emerald-700",
  skipped: "bg-orion-navy-100 text-orion-navy-400",
  overdue: "bg-red-100 text-red-700",
};

function formatDate(d: string | null): string | null {
  if (!d) return null;
  const [year, month, day] = d.split("-");
  if (!year || !month || !day) return d;
  return `${day}/${month}/${year}`;
}

/** planned_duration vuelve de Postgres como texto de interval (ej.
 * "00:30:00") — se parsea solo el caso HH:MM:SS, suficiente para
 * duraciones de tarea en minutos/horas introducidas desde el formulario. */
function durationLabel(interval: string | null): string | null {
  if (!interval) return null;
  const match = interval.match(/^(\d+):(\d+):\d+$/);
  if (!match) return interval;
  const totalMin = Number(match[1]) * 60 + Number(match[2]);
  if (totalMin <= 0) return null;
  return totalMin >= 60 ? `${Math.round((totalMin / 60) * 10) / 10} h` : `${totalMin} min`;
}

/**
 * Tarjeta de UNA tarea para casa (core.assignments). canEdit=false
 * (atleta/coach) oculta Editar/Eliminar — RLS (professional CRUD de sus
 * atletas, resto SELECT) es la proteccion real. El boton "Hecho" se
 * muestra a cualquiera que vea una tarea pending/overdue (profesional
 * incluido) porque ambos actores tienen permiso real de completarla via
 * RLS/trigger — ver completeAssignment.
 */
export default function AssignmentCard({
  assignment,
  athleteId,
  canEdit,
}: {
  assignment: AssignmentWithActivity;
  athleteId: string;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateAssignment, initialState);
  const [editing, setEditing] = useState(false);
  const [busy, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  useCloseOnSuccess(state, () => setEditing(false));

  const canComplete = assignment.status === "pending" || assignment.status === "overdue";

  function handleComplete() {
    setActionError(null);
    startTransition(async () => {
      const res = await completeAssignment(assignment.id, athleteId);
      if (res.error) setActionError(res.error);
    });
  }

  function handleDelete() {
    const name = assignment.activity_catalog?.name ?? "esta tarea";
    if (!window.confirm(`¿Eliminar la tarea "${name}"? Esta acción no se puede deshacer.`)) return;
    setActionError(null);
    startTransition(async () => {
      const res = await deleteAssignment(assignment.id, athleteId);
      if (res.error) setActionError(res.error);
    });
  }

  if (editing) {
    return (
      <form action={formAction} className="space-y-2 rounded-lg border border-orion-navy-200 bg-orion-navy-50 p-3">
        <input type="hidden" name="assignment_id" value={assignment.id} />
        <input type="hidden" name="athlete_id" value={athleteId} />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            name="scheduled_date"
            defaultValue={assignment.scheduled_date ?? ""}
            required
            className="rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            name="due_date"
            defaultValue={assignment.due_date ?? ""}
            className="rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            name="duration"
            min={1}
            placeholder="Duración (min)"
            className="rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
          />
          <input
            name="frequency"
            defaultValue={assignment.frequency ?? ""}
            placeholder="Frecuencia"
            className="rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
          />
        </div>
        <textarea
          name="instructions"
          defaultValue={assignment.instructions ?? ""}
          placeholder="Instrucciones"
          rows={2}
          className="w-full rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
        />
        <textarea
          name="objective"
          defaultValue={assignment.objective ?? ""}
          placeholder="Objetivo"
          rows={2}
          className="w-full rounded-lg border border-orion-navy-200 px-2 py-1.5 text-sm"
        />
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <div className="flex gap-2">
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

  const duration = durationLabel(assignment.planned_duration);
  const isDone = assignment.status === "completed";

  return (
    <div className={`rounded-lg border border-orion-navy-100 p-2.5 ${isDone ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-orion-navy-900">
            {assignment.activity_catalog?.name ?? "Tarea"}
          </p>
          <p className="text-xs text-orion-navy-500">
            {formatDate(assignment.scheduled_date) ?? "Sin fecha"}
            {duration ? ` · ${duration}` : ""}
          </p>
          {assignment.instructions && (
            <p className="mt-0.5 text-xs text-orion-navy-500">{assignment.instructions}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUS_STYLE[assignment.status] ?? STATUS_STYLE.pending
          }`}
        >
          {STATUS_LABEL[assignment.status] ?? assignment.status}
        </span>
      </div>

      {actionError && <p className="mt-1 text-xs text-red-600">{actionError}</p>}

      {(canComplete || canEdit) && (
        <div className="mt-1.5 flex justify-end gap-1">
          {canComplete && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={busy}
              title="Marcar como hecho"
              aria-label="Marcar tarea como hecho"
              className="rounded p-1 text-orion-navy-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-60"
            >
              <CheckCircleIcon />
            </button>
          )}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy}
                title="Editar"
                aria-label="Editar tarea"
                className="rounded p-1 text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700 disabled:opacity-60"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                title="Eliminar"
                aria-label="Eliminar tarea"
                className="rounded p-1 text-orion-navy-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Mismo patron de iconos inline SVG ya usado en el resto del Portal
 * (p.ej. GoalCard) — no hay libreria de iconos instalada. */
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
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
