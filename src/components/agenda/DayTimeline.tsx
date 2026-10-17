"use client";

import type { CalendarEvent } from "@/lib/data/agenda";
import { typeColor, typeLabel, formatEventTime } from "./eventMeta";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.2;
const SLOT_HEIGHT = SLOT_MINUTES * PX_PER_MINUTE;

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Vista de horario del dia seleccionado: dos franjas clicables por
 * hora (:00 y :30) para crear un evento con esa hora precargada —
 * los minutos intermedios (15/45) se ajustan a mano en el
 * formulario. Los eventos existentes se colocan encima, con altura
 * proporcional a su duracion real, y nunca se muestran como huecos
 * libres. Cada bloque abre edicion al clic (onEventClick, ya existia) y,
 * si se pasa onDelete, muestra un icono de papelera (misma confirmacion
 * que el listado lateral) — reutiliza exactamente updateEvent/deleteEvent
 * de /mi-agenda, sin logica nueva.
 */
export default function DayTimeline({
  events,
  onSlotClick,
  onEventClick,
  onDelete,
}: {
  events: CalendarEvent[];
  onSlotClick: (time: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
}) {
  const rangeStart = DAY_START_HOUR * 60;
  const rangeEnd = DAY_END_HOUR * 60;
  const totalMinutes = rangeEnd - rangeStart;

  const slots: { minutesFromStart: number; hour: number; minute: number }[] = [];
  for (let m = 0; m < totalMinutes; m += SLOT_MINUTES) {
    const totalMin = rangeStart + m;
    slots.push({
      minutesFromStart: m,
      hour: Math.floor(totalMin / 60),
      minute: totalMin % 60,
    });
  }

  const positioned = events.map((ev) => {
    const start = new Date(ev.start_at);
    const end = ev.end_at ? new Date(ev.end_at) : new Date(start.getTime() + 60 * 60_000);
    let startMin = minutesSinceMidnight(start) - rangeStart;
    let endMin = minutesSinceMidnight(end) - rangeStart;
    startMin = Math.max(0, Math.min(startMin, totalMinutes));
    endMin = Math.max(startMin + 15, Math.min(endMin, totalMinutes));
    return { ev, startMin, endMin, top: startMin * PX_PER_MINUTE, height: (endMin - startMin) * PX_PER_MINUTE };
  });

  function isSlotOccupied(minutesFromStart: number): boolean {
    const slotStart = minutesFromStart;
    const slotEnd = minutesFromStart + SLOT_MINUTES;
    return positioned.some((p) => p.startMin < slotEnd && p.endMin > slotStart);
  }

  return (
    <div className="h-full overflow-y-auto rounded-xl border border-orion-navy-100 bg-white">
      <div className="relative" style={{ height: totalMinutes * PX_PER_MINUTE }}>
        {slots.map(({ minutesFromStart, hour, minute }) => {
          const occupied = isSlotOccupied(minutesFromStart);
          const isHourMark = minute === 0;
          return (
            <button
              key={minutesFromStart}
              type="button"
              disabled={occupied}
              onClick={() =>
                onSlotClick(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)
              }
              style={{ height: SLOT_HEIGHT }}
              className={`flex w-full items-start gap-2 pl-2 pt-0.5 text-left border-t ${
                isHourMark ? "border-orion-navy-100" : "border-orion-navy-100/50"
              } ${occupied ? "cursor-default" : "cursor-pointer hover:bg-orion-navy-100/40"}`}
            >
              <span
                className={`w-11 shrink-0 text-[11px] ${
                  isHourMark ? "font-medium text-orion-navy-400" : "text-orion-navy-300"
                }`}
              >
                {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
            </button>
          );
        })}

        {positioned.map(({ ev, top, height }) => (
          <div
            key={ev.id}
            role="button"
            tabIndex={0}
            onClick={() => onEventClick(ev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEventClick(ev);
              }
            }}
            style={{ top, height, left: "3.5rem", right: "0.5rem" }}
            className={`group absolute cursor-pointer overflow-hidden rounded-md px-2 py-1 text-left text-white shadow-sm transition hover:brightness-110 ${typeColor(
              ev.type
            )}`}
          >
            <p className="truncate pr-5 text-[11px] font-semibold">
              {formatEventTime(ev.start_at)} · {ev.title}
            </p>
            <p className="truncate text-[10px] opacity-90">{typeLabel(ev.type)}</p>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("¿Eliminar este evento?")) onDelete(ev.id);
                }}
                title="Eliminar"
                aria-label="Eliminar evento"
                className="absolute right-1 top-1 rounded p-0.5 text-white/80 opacity-0 transition hover:bg-black/20 hover:text-white group-hover:opacity-100"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mismo patron de icono inline SVG ya usado en el resto del Portal
 * (p.ej. GoalCard, AssignmentCard) — no hay libreria de iconos instalada. */
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
