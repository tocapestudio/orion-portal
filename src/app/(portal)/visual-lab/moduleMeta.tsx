import type { ReactElement } from "react";

/**
 * Metadatos visuales compartidos de los 4 modulos de Visual Lab — fuente
 * unica usada tanto por el hub (page.tsx) como por el detalle
 * ([modality]/page.tsx), para no duplicar iconos/definiciones/estado en
 * dos sitios. Pura presentacion: core.modalities no tiene columnas de
 * descripcion/estado, asi que viven aqui como constantes de codigo, igual
 * que ya hacia el mapa NOTES existente en [modality]/page.tsx.
 */

export type ModuleTone = "accent" | "neutral" | "muted";

/**
 * Override de presentacion del nombre visible — core.modalities.label
 * sigue siendo "Actividad manual" (no se toca Core); aqui solo se
 * renombra lo que ve el profesional. id/ruta siguen siendo "manual".
 */
export const MODULE_LABELS: Record<string, string> = {
  manual: "ORION Tools",
};

export const MODULE_DEFINITIONS: Record<string, string> = {
  play: "Ejercicios visuales digitales en pantalla, sin necesidad de dispositivo físico.",
  react: "Entrenamiento visual mediante los nodos físicos ORION React, controlados por Bluetooth.",
  frame:
    "Dispositivo físico con estímulos periféricos para entrenamiento de consciencia direccional y atención periférica.",
  manual: "Entrenamiento visual con herramientas y material físico del profesional.",
};

export const MODULE_STATUS: Record<string, { label: string; tone: ModuleTone }> = {
  play: { label: "Preparado para integración", tone: "accent" },
  react: { label: "Preparado para integración", tone: "neutral" },
  frame: { label: "Próximamente", tone: "muted" },
  manual: { label: "Disponible", tone: "neutral" },
};

const STATUS_PILL_CLASSES: Record<ModuleTone, string> = {
  accent: "bg-orion-accent/15 text-orion-accent",
  neutral: "bg-orion-navy-100 text-orion-navy-600",
  muted: "bg-orion-navy-50 text-orion-navy-300",
};

export function StatusPill({ moduleId }: { moduleId: string }) {
  const status = MODULE_STATUS[moduleId];
  if (!status) return null;
  return (
    <span
      className={`inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_PILL_CLASSES[status.tone]}`}
    >
      {status.label}
    </span>
  );
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Triangulo de Play puro (relleno, sin pantalla/monitor alrededor) —
 * icono reconocible de ORION Play, tanto para la identidad del modulo
 * como para la accion de reproducir/iniciar: mismo simbolo en los dos
 * sentidos, nunca mezclado con una forma de pantalla/monitor. */
function PlayModuleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

/** Red de 3 nodos conectados — representa los nodos fisicos ORION React. */
function ReactModuleIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="6" cy="7" r="2.1" />
      <circle cx="18" cy="7" r="2.1" />
      <circle cx="12" cy="18" r="2.1" />
      <path d="M7.8 8.3 10.8 16M16.2 8.3 13.2 16M7.9 7h8.2" />
    </svg>
  );
}

/** Cuadrado con estimulos (LEDs/pulsadores) en el punto medio de cada
 * arista — representa el dispositivo fisico real, no un wearable tipo
 * gafas: 4 puntos de estimulo periferico, uno por lado. */
function FrameModuleIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <circle cx="12" cy="5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Maletin de herramientas — material/herramientas fisicas de terapia
 * visual del profesional (Brock Cord, Hecostix, Vector Ball, FocusLaser,
 * gafas estroboscopicas, etc.), no un unico objeto concreto. */
function ToolsModuleIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3.5" y="9" width="17" height="10" rx="1.5" />
      <path d="M8 9V6.5A1.5 1.5 0 0 1 9.5 5h5A1.5 1.5 0 0 1 16 6.5V9" />
      <path d="M3.5 13.5h17M12 11.5v4" />
    </svg>
  );
}

function GenericModuleIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 12v.01" />
    </svg>
  );
}

const MODULE_ICONS: Record<string, (props: { className?: string }) => ReactElement> = {
  play: PlayModuleIcon,
  react: ReactModuleIcon,
  frame: FrameModuleIcon,
  manual: ToolsModuleIcon,
};

export function ModuleIcon({ moduleId, className = "h-6 w-6" }: { moduleId: string; className?: string }) {
  const Icon = MODULE_ICONS[moduleId] ?? GenericModuleIcon;
  return <Icon className={className} />;
}
