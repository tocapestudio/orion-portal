"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/lib/data/agenda";
import { toDateKey, dateToKey } from "./eventMeta";
import MonthCalendar, { startOfMonth } from "./MonthCalendar";
import DayTimeline from "./DayTimeline";
import DayList from "./DayList";
import EventFormModal from "./EventFormModal";
import ReassignModal from "./ReassignModal";
import { deleteEvent } from "@/app/(portal)/mi-agenda/actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

interface Option {
  id: string;
  label: string;
}

export default function AgendaClient({
  events,
  athletes,
  clubs,
  notes,
}: {
  events: CalendarEvent[];
  athletes: Option[];
  clubs: Option[];
  notes: Record<string, string>;
}) {
  const today = new Date();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState(dateToKey(today));
  const [expandedCalendar, setExpandedCalendar] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createTime, setCreateTime] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [reassigning, setReassigning] = useState<CalendarEvent | null>(null);

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

  function openCreateAt(time?: string) {
    setCreateTime(time);
    setCreating(true);
  }

  function handleSelectDay(key: string) {
    setSelectedDay(key);
    setExpandedCalendar(false);
  }

  return (
    <div className="grid gap-4 lg:h-full lg:grid-cols-[260px_minmax(0,1fr)_300px]">
      {/* IZQUIERDA: calendario mensual compacto */}
      <div className="rounded-xl border border-orion-navy-100 bg-white p-3 lg:self-start">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
            Calendario
          </p>
          <button
            onClick={() => setExpandedCalendar(true)}
            className="text-xs font-medium text-orion-navy-500 hover:underline"
          >
            Ampliar
          </button>
        </div>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          eventsByDay={eventsByDay}
          compact
        />
      </div>

      {/* CENTRO: agenda del dia por horas — unica columna con scroll interno */}
      <div className="flex flex-col rounded-xl border border-orion-navy-100 bg-white p-4 lg:h-full lg:min-h-0">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-orion-navy-400">Agenda del día</p>
            <p className="text-sm font-semibold capitalize text-orion-navy-900">
              {selectedDateLabel}
            </p>
          </div>
          <button
            onClick={() => openCreateAt(undefined)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${CREATE_ACTION_CLASSES}`}
          >
            + Crear evento
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <DayTimeline
            events={dayEvents}
            onSlotClick={(time) => openCreateAt(time)}
            onEventClick={(ev) => setEditing(ev)}
            onDelete={deleteEvent}
          />
        </div>
      </div>

      {/* DERECHA: listado del dia */}
      <div className="flex flex-col rounded-xl border border-orion-navy-100 bg-white p-4 lg:h-full lg:min-h-0">
        <p className="mb-3 shrink-0 text-xs uppercase tracking-wide text-orion-navy-400">
          Listado ({dayEvents.length})
        </p>
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <DayList
            events={dayEvents}
            athletes={athletes}
            onEdit={setEditing}
            onReassign={setReassigning}
            onDelete={deleteEvent}
          />
        </div>
      </div>

      {expandedCalendar && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/40 p-4"
          onClick={() => setExpandedCalendar(false)}
        >
          <div
            className="w-full max-w-2xl cursor-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-orion-navy-900">Vista mensual</h2>
              <button
                onClick={() => setExpandedCalendar(false)}
                className="text-orion-navy-400 hover:text-orion-navy-700"
              >
                ✕
              </button>
            </div>
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              selectedDay={selectedDay}
              onSelectDay={handleSelectDay}
              eventsByDay={eventsByDay}
            />
          </div>
        </div>
      )}

      {creating && (
        <EventFormModal
          mode="create"
          defaultDay={selectedDay}
          defaultTime={createTime}
          athletes={athletes}
          clubs={clubs}
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <EventFormModal
          mode="edit"
          event={editing}
          defaultDay={selectedDay}
          initialNote={notes[editing.id] ?? ""}
          athletes={athletes}
          clubs={clubs}
          onClose={() => setEditing(null)}
        />
      )}
      {reassigning && <ReassignModal event={reassigning} onClose={() => setReassigning(null)} />}
    </div>
  );
}
