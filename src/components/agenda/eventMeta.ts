export const EVENT_TYPES = [
  { value: "appointment", label: "Consulta", color: "bg-orion-navy-500" },
  { value: "training", label: "Entrenamiento", color: "bg-orion-accent" },
  { value: "evaluation", label: "Evaluación", color: "bg-amber-500" },
  { value: "session", label: "Sesión", color: "bg-purple-500" },
  { value: "assignment", label: "Tarea asignada", color: "bg-pink-500" },
  { value: "deadline", label: "Fecha límite", color: "bg-red-500" },
  { value: "reminder", label: "Recordatorio", color: "bg-slate-400" },
] as const;

export function typeLabel(type: string): string {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function typeColor(type: string): string {
  return EVENT_TYPES.find((t) => t.value === type)?.color ?? "bg-orion-navy-400";
}

/**
 * Claves de dia/hora SIEMPRE en la zona horaria LOCAL del navegador,
 * nunca por slice() crudo del ISO (que es UTC) — un slice crudo
 * desfasa la hora mostrada respecto a la real siempre que el huso
 * horario del usuario no sea UTC+0.
 */
export function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function toDateKey(iso: string): string {
  return dateToKey(new Date(iso));
}

export function toLocalDateInput(iso: string): string {
  return toDateKey(iso);
}

export function toLocalTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/** Combina dia+hora (del formulario, en hora LOCAL del navegador) en un ISO UTC correcto. */
export function localDayTimeToIso(day: string, time: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = (time || "09:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0).toISOString();
}

/**
 * Opciones del selector de Hora: 07:00 a 22:00 (ambos incluidos) en pasos
 * de 15 minutos, generadas dinamicamente — nunca escritas una a una. Mismo
 * formato "HH:MM" en 24h que esperan localDayTimeToIso y el FormData.
 * Fuente unica reutilizada por EventFormModal y ReassignModal (ambos
 * formularios de /mi-agenda y del perfil del atleta).
 */
export const DAY_TIME_OPTIONS: string[] = (() => {
  const times: string[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    for (const minute of ["00", "15", "30", "45"]) {
      if (hour === 22 && minute !== "00") break;
      times.push(`${String(hour).padStart(2, "0")}:${minute}`);
    }
  }
  return times;
})();
