"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/data/agenda";
import type { AssignmentWithActivity } from "@/lib/data/assignments";
import type { ActivityCatalogRow } from "@/lib/data/library";
import { toDateKey, dateToKey } from "@/components/agenda/eventMeta";
import MonthCalendar, { startOfMonth } from "@/components/agenda/MonthCalendar";
import DayList from "@/components/agenda/DayList";
import EventFormModal from "@/components/agenda/EventFormModal";
import { deleteEvent } from "@/app/(portal)/mi-agenda/actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";
import AssignmentForm from "./AssignmentForm";
import AssignmentCard from "./AssignmentCard";

interface Option {
  id: string;
  label: string;
  shortId?: number;
}

/**
 * Agenda del perfil del atleta: calendario mensual (izquierda) + panel del
 * dia seleccionado (derecha, mas ancho), que separa visualmente dos
 * conceptos distintos: EVENTOS (calendar_events del dia, con hora) y
 * TAREAS PARA CASA (core.assignments del dia, sin hora — solo actividades
 * manuales/fisicas por ahora, sin conectar todavia Biblioteca/Visual
 * Lab/ORION Play). Ambos se crean/editan/eliminan desde los botones de la
 * cabecera del panel (solo canEdit), con el atleta y el dia ya
 * preseleccionados. EventFormModal y createEvent/updateEvent/deleteEvent
 * son exactamente los de /mi-agenda (sin sistema paralelo) — solo se les
 * añadio un defaultAthleteId opcional (ignorado en modo "edit") y una
 * revalidacion adicional de esta ruta.
 */
export default function ProfileAgendaClient({
  athleteId,
  events,
  assignments,
  manualActivities,
  canEdit,
  professionalAthletes,
  clubs,
  eventNotes,
}: {
  athleteId: string;
  events: CalendarEvent[];
  assignments: AssignmentWithActivity[];
  manualActivities: ActivityCatalogRow[];
  canEdit: boolean;
  professionalAthletes: Option[];
  clubs: Option[];
  eventNotes: Record<string, string>;
}) {
  const today = new Date();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState(dateToKey(today));
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = toDateKey(ev.start_at);
      map.set(key, [...(map.get(key) ?? []), ev]);
    }
    return map;
  }, [events]);

  const dayEvents = (eventsByDay.get(selectedDay) ?? []).sort((a, b) =>
    a.start_at.localeCompare(b.start_at)
  );

  const selectedDateLabel = new Date(`${selectedDay}T00:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dayAssignments = assignments.filter((a) => a.scheduled_date === selectedDay);
  const pendingDayAssignments = dayAssignments.filter((a) => a.status !== "completed");
  const completedDayAssignments = dayAssignments.filter((a) => a.status === "completed");

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[30fr_70fr] lg:grid-rows-[minmax(0,1fr)]">
      {/* Calendario mensual */}
      <div className="flex flex-col rounded-xl border border-orion-navy-100 bg-white p-4 lg:min-h-0">
        <p className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Calendario
        </p>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          eventsByDay={eventsByDay}
        />
      </div>

      {/* Dia seleccionado: panel unico, mas ancho, con Eventos y Tareas
          claramente separados (conceptos distintos: un evento tiene hora,
          una tarea no). Botones de creacion viven en la cabecera del
          panel, no pertenecen a ninguna de las dos secciones. */}
      <div className="flex flex-col rounded-xl border border-orion-navy-100 bg-white p-4 lg:min-h-0">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-orion-navy-400">Día seleccionado</p>
            <p className="text-base font-semibold capitalize text-orion-navy-900">{selectedDateLabel}</p>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setCreatingEvent(true)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${CREATE_ACTION_CLASSES}`}
              >
                + Nuevo evento
              </button>
              <AssignmentForm
                athleteId={athleteId}
                manualActivities={manualActivities}
                defaultDate={selectedDay}
              />
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          {/* EVENTOS — calendar_events del dia, con hora */}
          <div className="flex min-h-0 flex-1 flex-col lg:w-1/2">
            <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
              Eventos
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DayList
                events={dayEvents}
                showAthleteInfo={false}
                onEdit={canEdit ? setEditingEvent : undefined}
                onDelete={canEdit ? (id) => deleteEvent(id, athleteId) : undefined}
              />
            </div>
          </div>

          <div className="hidden w-px shrink-0 bg-orion-navy-100 lg:block" />

          {/* TAREAS PARA CASA — core.assignments del dia, sin hora */}
          <div className="flex min-h-0 flex-1 flex-col lg:w-1/2">
            <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
              Tareas para casa
            </p>
            {dayAssignments.length === 0 ? (
              <p className="py-6 text-center text-sm text-orion-navy-400">Sin tareas este día.</p>
            ) : (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {pendingDayAssignments.map((a) => (
                  <AssignmentCard key={a.id} assignment={a} athleteId={athleteId} canEdit={canEdit} />
                ))}
                {completedDayAssignments.map((a) => (
                  <AssignmentCard key={a.id} assignment={a} athleteId={athleteId} canEdit={canEdit} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {creatingEvent && (
        <EventFormModal
          mode="create"
          defaultDay={selectedDay}
          defaultAthleteId={athleteId}
          athletes={professionalAthletes}
          clubs={clubs}
          onClose={() => setCreatingEvent(false)}
        />
      )}
      {editingEvent && (
        <EventFormModal
          mode="edit"
          event={editingEvent}
          defaultDay={selectedDay}
          defaultAthleteId={athleteId}
          initialNote={eventNotes[editingEvent.id] ?? ""}
          athletes={professionalAthletes}
          clubs={clubs}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}
