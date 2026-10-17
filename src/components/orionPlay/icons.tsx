/**
 * Iconos del catalogo de ejercicios de ORION Play, recuperando el
 * significado de los heroicons originales (BoltIcon, CursorArrowRaysIcon,
 * EyeIcon, AcademicCapIcon de app/exercises/page.tsx) como SVG inline —
 * el Portal no tiene @heroicons/react instalado. Mismo estilo que el
 * resto de iconos del Portal (viewBox 24, stroke currentColor).
 */

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Reaction Time — equivalente a BoltIcon. */
export function BoltIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

/** Click Targets — equivalente a CursorArrowRaysIcon. */
export function TargetIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Visual Memory — equivalente a EyeIcon. */
export function EyeIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

/** Solo GO — equivalente a un cronometro/stopwatch (no existia antes en
 * este archivo), para distinguirlo visualmente de Go/No Go (BoltIcon),
 * ya que ambos miden tiempo de reaccion pero representan tareas
 * distintas (con/sin dimension de inhibicion). */
export function StopwatchIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
      <path d="M12 2v3" />
    </svg>
  );
}
