"use client";

import { useActionState, useEffect } from "react";
import { createEvent, updateEvent, type EventFormState } from "@/app/(portal)/mi-agenda/actions";
import { EVENT_TYPES, toLocalDateInput, toLocalTimeInput, localDayTimeToIso, DAY_TIME_OPTIONS } from "./eventMeta";
import type { CalendarEvent } from "@/lib/data/agenda";
import AthletePicker from "./AthletePicker";

const initialState: EventFormState = { error: null, success: false };

interface Option {
  id: string;
  label: string;
  shortId?: number;
}

export default function EventFormModal({
  mode,
  event,
  defaultDay,
  defaultTime,
  defaultAthleteId,
  initialNote,
  athletes,
  clubs,
  onClose,
}: {
  mode: "create" | "edit";
  event?: CalendarEvent;
  defaultDay: string;
  defaultTime?: string;
  /** Preselecciona el atleta al crear desde su perfil (p.ej. pestaña
   * Agenda). Ignorado en modo "edit", donde manda el atleta real del
   * evento. */
  defaultAthleteId?: string;
  initialNote?: string;
  athletes: Option[];
  clubs: Option[];
  onClose: () => void;
}) {
  const action = mode === "create" ? createEvent : updateEvent;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state, onClose]);

  const startDay = event ? toLocalDateInput(event.start_at) : defaultDay;
  const startTime = event ? toLocalTimeInput(event.start_at) : (defaultTime ?? "09:00");
  const durationMin = event?.end_at
    ? Math.max(
        15,
        Math.round((new Date(event.end_at).getTime() - new Date(event.start_at).getTime()) / 60000)
      )
    : 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* max-h + flex-col: la cabecera y el pie quedan fijos (shrink-0) y
          solo el cuerpo del formulario hace scroll interno, para que el
          modal nunca se salga de pantalla ni quede cortado por arriba/abajo
          en ventanas bajas. El FormData/guardado no cambia — sigue siendo
          un unico <form> que envuelve cuerpo y pie. */}
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-orion-navy-100 px-6 py-4">
          <h2 className="text-base font-semibold text-orion-navy-900">
            {mode === "create" ? "Crear evento" : "Editar evento"}
          </h2>
          <button onClick={onClose} className="text-orion-navy-400 hover:text-orion-navy-700">
            ✕
          </button>
        </div>

        <form
          action={(formData) => {
            const day = String(formData.get("day") ?? "");
            const time = String(formData.get("time") ?? "");
            // Se calcula en el navegador (hora local real del profesional) y
            // se envia ya como ISO UTC — evita reinterpretar dia+hora en el
            // servidor, que podria estar en otro huso horario.
            formData.set("start_at_iso", localDayTimeToIso(day, time));
            formAction(formData);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
            {event && <input type="hidden" name="id" value={event.id} />}

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">Título</label>
              <input
                name="title"
                defaultValue={event?.title ?? ""}
                required
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-orion-navy-700">Día</label>
                <input
                  type="date"
                  name="day"
                  defaultValue={startDay}
                  required
                  className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-orion-navy-700">Hora</label>
                <select
                  name="time"
                  defaultValue={startTime}
                  className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                >
                  {/* Si la hora actual (editar un evento antiguo) cae fuera del
                      rango 07:00-22:00 o no es un cuarto exacto, se añade como
                      opcion extra para no perder ni alterar silenciosamente el
                      valor guardado. */}
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
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                Duración (minutos)
              </label>
              <input
                type="number"
                name="duration"
                min={15}
                step={15}
                defaultValue={durationMin}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">Tipo</label>
              <select
                name="type"
                defaultValue={event?.type ?? "appointment"}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                Club (opcional)
              </label>
              <select
                name="club_id"
                defaultValue={event?.club_id ?? ""}
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              >
                <option value="">— Ninguno —</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                Atleta / perfil (opcional)
              </label>
              <AthletePicker
                name="athlete_id"
                athletes={athletes}
                defaultAthleteId={event?.athlete_id ?? defaultAthleteId ?? ""}
              />
            </div>

            {defaultAthleteId && (
              <label className="flex items-center gap-2 text-sm text-orion-navy-700">
                {/* Un checkbox desmarcado no se incluye en el FormData —
                    este campo oculto es la unica forma de que la Server
                    Action distinga "desmarcado" de "este formulario ni
                    siquiera tiene el campo" (edicion desde /mi-agenda). */}
                <input type="hidden" name="add_to_my_agenda_present" value="1" />
                <input
                  type="checkbox"
                  name="add_to_my_agenda"
                  defaultChecked={event ? event.show_in_my_agenda : true}
                  className="h-4 w-4 rounded border-orion-navy-300"
                />
                Añadir a mi agenda
              </label>
            )}

            <label className="flex items-center gap-2 text-sm text-orion-navy-700">
              <input
                type="checkbox"
                name="notify"
                defaultChecked={event?.notify ?? true}
                className="h-4 w-4 rounded border-orion-navy-300"
              />
              Notificar al usuario
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                  Material (opcional)
                </label>
                <input
                  name="material"
                  defaultValue={event?.material ?? ""}
                  className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                  Lugar (opcional)
                </label>
                <input
                  name="location"
                  defaultValue={event?.location ?? ""}
                  className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                Observaciones{" "}
                <span className="font-normal text-orion-navy-400">
                  (nota interna — nunca visible para el atleta ni el coach)
                </span>
              </label>
              <textarea
                name="observaciones"
                rows={2}
                defaultValue={initialNote ?? ""}
                placeholder="Solo tú puedes ver esta nota"
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>

            {state.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-orion-navy-100 px-6 py-4">
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
              className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-800 disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
