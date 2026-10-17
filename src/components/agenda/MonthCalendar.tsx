"use client";

import type { CalendarEvent } from "@/lib/data/agenda";
import { typeColor, dateToKey } from "./eventMeta";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function buildMonthGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const firstWeekday = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  const cells: Date[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), i - firstWeekday + 1));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return cells;
}

export default function MonthCalendar({
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
  eventsByDay,
  compact = false,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: string;
  onSelectDay: (key: string) => void;
  eventsByDay: Map<string, CalendarEvent[]>;
  compact?: boolean;
}) {
  const grid = buildMonthGrid(month);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="rounded-md px-2 py-1 text-orion-navy-500 hover:bg-orion-navy-100"
        >
          ‹
        </button>
        <p className={`font-semibold text-orion-navy-900 ${compact ? "text-xs" : "text-sm"}`}>
          {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
        </p>
        <button
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="rounded-md px-2 py-1 text-orion-navy-500 hover:bg-orion-navy-100"
        >
          ›
        </button>
      </div>

      <div
        className={`grid grid-cols-7 gap-1 text-center font-medium text-orion-navy-400 ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day) => {
          const key = dateToKey(day);
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const dayEvts = eventsByDay.get(key) ?? [];
          const isSelected = key === selectedDay;

          return (
            <button
              key={key}
              onClick={() => onSelectDay(key)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border p-0.5 transition ${
                compact ? "h-9 text-[11px]" : "h-16 text-xs"
              } ${
                isSelected
                  ? "border-orion-navy-600 bg-orion-navy-100"
                  : "border-transparent hover:bg-orion-navy-100/60"
              } ${isCurrentMonth ? "text-orion-navy-900" : "text-orion-navy-300"}`}
            >
              <span className={dayEvts.length > 0 ? "font-bold" : "font-normal"}>
                {day.getDate()}
              </span>
              {compact ? (
                dayEvts.length > 0 && (
                  <span className={`h-1 w-1 rounded-full ${typeColor(dayEvts[0].type)}`} />
                )
              ) : (
                <span className="flex flex-wrap justify-center gap-0.5">
                  {dayEvts.slice(0, 4).map((ev) => (
                    <span key={ev.id} className={`h-1.5 w-1.5 rounded-full ${typeColor(ev.type)}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
