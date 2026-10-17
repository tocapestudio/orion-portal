"use client";

import { useActionState, useEffect } from "react";
import { reassignEvent, type EventFormState } from "@/app/(portal)/mi-agenda/actions";
import { toLocalDateInput, toLocalTimeInput, localDayTimeToIso, DAY_TIME_OPTIONS } from "./eventMeta";
import type { CalendarEvent } from "@/lib/data/agenda";

const initialState: EventFormState = { error: null, success: false };

export default function ReassignModal({
  event,
  onClose,
}: {
  event: CalendarEvent;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(reassignEvent, initialState);
  const startTime = toLocalTimeInput(event.start_at);

  useEffect(() => {
    if (state.success) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xs rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-orion-navy-900">Reasignar evento</h2>
        <form
          action={(formData) => {
            const day = String(formData.get("day") ?? "");
            const time = String(formData.get("time") ?? "");
            formData.set("start_at_iso", localDayTimeToIso(day, time));
            formAction(formData);
          }}
          className="space-y-3"
        >
          <input type="hidden" name="id" value={event.id} />
          <div>
            <label className="mb-1 block text-xs font-medium text-orion-navy-700">Nuevo día</label>
            <input
              type="date"
              name="day"
              defaultValue={toLocalDateInput(event.start_at)}
              required
              className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-orion-navy-700">Nueva hora</label>
            <select
              name="time"
              defaultValue={startTime}
              className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
            >
              {/* Si la hora actual cae fuera del rango 07:00-22:00 o no es un
                  cuarto exacto, se añade como opcion extra para no perder ni
                  alterar silenciosamente el valor guardado. */}
              {!DAY_TIME_OPTIONS.includes(startTime) && (
                <option value={startTime}>{startTime}</option>
              )}
              {DAY_TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {state.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm text-orion-navy-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Reasignar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
