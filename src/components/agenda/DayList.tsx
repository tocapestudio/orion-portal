"use client";

import Link from "next/link";
import type { CalendarEvent } from "@/lib/data/agenda";
import { typeColor, typeLabel, formatEventTime } from "./eventMeta";

interface Option {
  id: string;
  label: string;
}

function durationLabel(startIso: string, endIso: string | null): string {
  if (!endIso) return "";
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  if (minutes <= 0) return "";
  return minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} h` : `${minutes} min`;
}

export default function DayList({
  events,
  athletes = [],
  onEdit,
  onReassign,
  onDelete,
  showAthleteInfo = true,
}: {
  events: CalendarEvent[];
  athletes?: Option[];
  onEdit?: (event: CalendarEvent) => void;
  onReassign?: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  /** false cuando ya se esta dentro del perfil de ese atleta (p.ej. pestaña
   * Agenda del perfil): el nombre/enlace al propio perfil es redundante. */
  showAthleteInfo?: boolean;
}) {
  const athleteLabel = new Map(athletes.map((a) => [a.id, a.label]));
  const hasActions = Boolean(onEdit || onReassign || onDelete);

  return (
    <div className="space-y-2">
      {events.length === 0 && (
        <p className="py-6 text-center text-sm text-orion-navy-400">Sin eventos este día.</p>
      )}
      {events.map((ev) => (
        <div key={ev.id} className="rounded-lg border border-orion-navy-100 p-3">
          <div className="mb-1 flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${typeColor(ev.type)}`} />
            <p className="truncate text-sm font-medium text-orion-navy-900">{ev.title}</p>
          </div>
          <p className="text-xs text-orion-navy-500">
            {formatEventTime(ev.start_at)}
            {durationLabel(ev.start_at, ev.end_at) ? ` · ${durationLabel(ev.start_at, ev.end_at)}` : ""}
            {" · "}
            {typeLabel(ev.type)}
          </p>
          {showAthleteInfo && ev.athlete_id && (
            <p className="text-xs text-orion-navy-500">
              {athleteLabel.get(ev.athlete_id) ?? "Atleta"}
            </p>
          )}
          {ev.location && <p className="text-xs text-orion-navy-400">{ev.location}</p>}
          {showAthleteInfo && ev.athlete_id && (
            <Link
              href={`/perfiles/atleta/${ev.athlete_id}`}
              className="mt-1 inline-block text-xs font-medium text-orion-navy-600 hover:underline"
            >
              Ver perfil →
            </Link>
          )}
          {hasActions && (
            <div className="mt-2 flex gap-3 text-xs font-medium">
              {onEdit && (
                <button onClick={() => onEdit(ev)} className="text-orion-navy-600 hover:underline">
                  Editar
                </button>
              )}
              {onReassign && (
                <button onClick={() => onReassign(ev)} className="text-orion-navy-600 hover:underline">
                  Reasignar
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar este evento?")) onDelete(ev.id);
                  }}
                  className="text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
