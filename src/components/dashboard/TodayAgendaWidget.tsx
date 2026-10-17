"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TodayEvent } from "@/lib/data/dashboard";
import { typeLabel, typeColor } from "@/components/agenda/eventMeta";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function durationLabel(startIso: string, endIso: string | null): string {
  if (!endIso) return "";
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  if (minutes <= 0) return "";
  return minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} h` : `${minutes} min`;
}

export default function TodayAgendaWidget({ events }: { events: TodayEvent[] }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 60_000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const nowMs = now?.getTime() ?? null;

  const isFinished = (e: TodayEvent) => {
    const end = e.endAt ? new Date(e.endAt).getTime() : new Date(e.startAt).getTime();
    return nowMs !== null && end < nowMs;
  };

  // Prioriza lo que sigue en curso o pendiente hoy; si todo ya paso, muestra
  // igualmente los primeros del dia en vez de una lista vacia.
  const relevant = nowMs === null ? events : events.filter((e) => !isFinished(e));
  const source = relevant.length > 0 ? relevant : events;
  const visibleEvents = source.slice(0, 2);
  const hiddenCount = events.length - visibleEvents.length;

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Agenda de hoy
        </p>
        <Link href="/mi-agenda" className="text-xs font-medium text-orion-navy-500 hover:underline">
          Ver Mi Agenda completa →
        </Link>
      </div>

      {events.length === 0 && (
        <p className="py-6 text-center text-sm text-orion-navy-400">
          No tienes eventos programados para hoy.
        </p>
      )}

      <div className="relative space-y-2">
        {(() => {
          const nowLineIndex =
            nowMs === null
              ? -1
              : visibleEvents.findIndex((e) => new Date(e.startAt).getTime() > nowMs);
          const insertAt = nowLineIndex === -1 && nowMs !== null ? visibleEvents.length : nowLineIndex;

          const nowLine = now && (
            <div key="now-line" className="flex items-center gap-2 py-0.5">
              <span className="text-[11px] font-semibold text-orion-accent">
                {formatTime(now.toISOString())}
              </span>
              <span className="h-0.5 flex-1 rounded-full bg-orion-accent" />
            </div>
          );

          const nodes: React.ReactNode[] = [];
          visibleEvents.forEach((e, i) => {
            if (nowMs !== null && i === insertAt) nodes.push(nowLine);

            const start = new Date(e.startAt).getTime();
            const end = e.endAt ? new Date(e.endAt).getTime() : start;
            const isPast = nowMs !== null && (end || start) < nowMs;

            const content = (
              <div className="flex items-center gap-3 rounded-lg border border-orion-navy-100 bg-white p-3 text-sm transition hover:border-orion-navy-400">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${typeColor(e.type)}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-orion-navy-900">
                    {e.athleteName ?? e.title}
                  </p>
                  <p className="truncate text-xs text-orion-navy-500">
                    {typeLabel(e.type)}
                    {e.programLabel ? ` · ${e.programLabel}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-orion-navy-500">
                  <p className="font-semibold text-orion-navy-800">{formatTime(e.startAt)}</p>
                  {durationLabel(e.startAt, e.endAt) && <p>{durationLabel(e.startAt, e.endAt)}</p>}
                </div>
              </div>
            );

            nodes.push(
              <div key={e.id} className={isPast ? "opacity-50" : ""}>
                {e.athleteId ? (
                  <Link href={`/perfiles/atleta/${e.athleteId}`} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          });
          if (nowMs !== null && insertAt === visibleEvents.length) nodes.push(nowLine);

          return nodes;
        })()}
      </div>

      {hiddenCount > 0 && (
        <Link
          href="/mi-agenda"
          className="mt-2 block text-center text-xs font-medium text-orion-navy-500 hover:underline"
        >
          Ver {hiddenCount} evento{hiddenCount === 1 ? "" : "s"} más →
        </Link>
      )}
    </div>
  );
}
