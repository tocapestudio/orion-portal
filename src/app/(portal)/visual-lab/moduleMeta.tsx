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
 * Override de presentacion del nombre visible. id/ruta de cada modulo
 * nunca cambian aqui.
 *
 * 3a pasada (jerarquia tipografica): se fija explicitamente "ORION X"
 * para los 4 modulos del hub (play/react/frame/tools), en vez de confiar
 * en el label real de core.modalities (que podria no llevar el prefijo
 * "ORION" en todos los casos) - el texto en mayusculas final
 * ("ORION PLAY", etc.) lo aplica page.tsx via `uppercase`, no aqui (se
 * guarda en may/min normal, mismo criterio que ya usaba ORION React para
 * sus propias etiquetas de menu - ver .home-grid-main .home-button span,
 * text-transform:uppercase sobre texto normal, no texto ya en mayusculas).
 * "manual" se deja fuera a proposito (ya no tiene tarjeta en el hub, ver
 * SECONDARY_ORDER) - sigue cayendo a su propio core.modalities.label.
 */
export const MODULE_LABELS: Record<string, string> = {
  play: "ORION Play",
  react: "ORION React",
  frame: "ORION Frame",
  tools: "ORION Tools",
};

/**
 * 6a pasada (fuente real del logotipo "ORION x REACT"): "ORION" conserva
 * la tipografia Y el color que ya tenga el elemento padre (Geist Sans,
 * la del Portal - no se toca su identidad); la segunda palabra
 * (Play/React/Frame/Tools) se renderiza en mayusculas con `font-rajdhani`
 * MAS su propio color de MODULE_NAME_ACCENT - mismo tamaño de fuente que
 * "ORION" en los dos casos (ningun `text-*` propio aqui, solo hereda del
 * padre), nunca un subtitulo.
 *
 * `font-rajdhani` (pesos 600/700) es la fuente REAL del logotipo "ORION x
 * REACT" de la app ORION React, confirmado leyendo su index.html (.logo
 * span, y la composicion de la pantalla de inicio) - antes (4a/5a pasada)
 * se usaba Geist Mono como alternativa porque no se habia comprobado
 * descargar una copia local; en esta pasada se verifico su licencia (SIL
 * Open Font License 1.1, Indian Type Foundry 2014 - permite explicitamente
 * empaquetar una copia local) y se descargo una unica vez desde Google
 * Fonts (fonts.gstatic.com, subconjunto latin, pesos 600/700 - los mismos
 * que usa ORION React) a public/fonts/rajdhani-{600,700}.woff2 + su
 * OFL.txt, autohospedada via @font-face en globals.css - SIN ninguna
 * peticion externa en tiempo de ejecucion. Ver globals.css para el
 * detalle completo (@font-face, --font-rajdhani).
 */
export const MODULE_NAME_ACCENT: Record<string, string> = {
  // Blanco (ORION) + azul mas apagado que el blanco, legible sobre el
  // fondo marino oscuro del hero - reutiliza el mismo tono ya usado para
  // el icono de Play en esa misma tarjeta (orion-sky), sin introducir un
  // color nuevo.
  play: "text-orion-sky",
  // Cian mas profundo/saturado que el orion-sky actual (que se conserva
  // sin cambios en el icono/borde) - pedido explicitamente porque el
  // tono actual se veia "excesivamente claro" para texto de palabra
  // completa, no solo para un icono pequeño.
  react: "text-[#0c7a96]",
  // Azul medio/grisaceo, dentro de la propia escala navy (no un acento
  // nuevo) - mas oscuro que el navy-500 del icono, para buen contraste
  // como texto de palabra completa.
  frame: "text-orion-navy-600",
  // Verde mas profundo que el orion-accent actual (que se conserva sin
  // cambios en el icono/borde), misma familia de tono, no un verde
  // generico ajeno a la identidad del modulo.
  tools: "text-[#1a8f60]",
};

/**
 * Sin elemento propio (Fragment): el padre (el <p>/<span> que ya existe
 * en cada pantalla) sigue controlando tamaño/color/peso base de "ORION"
 * - esta funcion solo decide que trozo de texto usa
 * `font-rajdhani uppercase` + su color de acento propio.
 *
 * 7a pasada (equivalencia optica con "ORION"): a igual font-size en px,
 * Rajdhani se percibe mas pequeña que Geist Sans porque su cap-height
 * (altura real de las mayusculas, lo unico que importa aqui porque esta
 * palabra siempre se ve en mayusculas via `uppercase`) es menor en
 * proporcion a su propio tamaño de fuente. Medido directamente en los
 * binarios reales de ambas fuentes (fontTools, tabla OS/2 sCapHeight,
 * unitsPerEm=1000 en las dos):
 *   - Geist (node_modules/next/.../geist-latin.woff2): sCapHeight 710
 *   - Rajdhani (public/fonts/rajdhani-700.woff2):      sCapHeight 643
 * Ratio 710/643 = 1.1042 - ese valor (1.104em) fue el primer ajuste,
 * pensado para igualar la altura MEDIBLE de las mayusculas. El usuario
 * comprobo el resultado visualmente y pidio un 10-15% adicional sobre
 * ESE tamaño (ya no es equivalencia metrica pura, sino percepcion
 * optica subjetiva: a igual cap-height matematico, Rajdhani sigue
 * leyendose algo mas pequeña por su trazo/proporciones generales) -
 * 1.104 * 1.13 = 1.248, redondeado a `text-[1.25em]` (+13.2% sobre el
 * 1.104 anterior, dentro del rango pedido). "ORION" no cambia de
 * tamaño en ningun momento. El `em` es relativo al font-size HEREDADO
 * del <p> padre (el span no fija uno propio), asi que escala igual en
 * el hero de Play (text-3xl) y en las 3 tarjetas inferiores (text-lg).
 * `tracking-wide` vive en el <p> padre, no en este span: su
 * letter-spacing ya es un valor absoluto heredado (no se recalcula en
 * em sobre el tamaño mayor del span), por lo que el espaciado entre
 * ambas palabras no cambia. El peso (700) ya coincidia con el real de
 * Rajdhani-700 antes de este ajuste - sin cambios de color ni de
 * layout.
 */
export function ModuleTitle({ moduleId }: { moduleId: string }) {
  const label = MODULE_LABELS[moduleId];
  if (!label) return null;
  const spaceIdx = label.indexOf(" ");
  if (spaceIdx === -1) return <>{label}</>;
  const first = label.slice(0, spaceIdx);
  const rest = label.slice(spaceIdx + 1);
  return (
    <>
      {first}{" "}
      <span className={`font-rajdhani text-[1.25em] uppercase ${MODULE_NAME_ACCENT[moduleId] ?? ""}`}>{rest}</span>
    </>
  );
}

export const MODULE_DEFINITIONS: Record<string, string> = {
  play: "Ejercicios visuales digitales en pantalla, sin necesidad de dispositivo físico.",
  react: "Entrenamiento con los nodos físicos ORION React, por Bluetooth.",
  frame: "Estímulos periféricos para atención y consciencia direccional.",
  manual: "Entrenamiento visual con herramientas y material físico del profesional.",
  tools: "Herramientas digitales y material físico para terapia visual.",
};

/**
 * Solo los modulos sin estado real necesitan entrada aqui (StatusPill
 * devuelve null si no hay ninguna) - react/tools ya se quitaron
 * deliberadamente: ambos son funcionales hoy, la etiqueta sobraba
 * ("Preparado para integración"/"Disponible" sugerian que faltaba algo
 * cuando no es el caso). frame SI la conserva: sigue en fase de diseño
 * de hardware, es informacion real, no una etiqueta de relleno.
 */
export const MODULE_STATUS: Record<string, { label: string; tone: ModuleTone }> = {
  play: { label: "Preparado para integración", tone: "accent" },
  frame: { label: "Próximamente", tone: "muted" },
  manual: { label: "Disponible", tone: "neutral" },
};

const STATUS_PILL_CLASSES: Record<ModuleTone, string> = {
  accent: "bg-orion-accent/15 text-orion-accent",
  neutral: "bg-orion-navy-100 text-orion-navy-600",
  muted: "bg-orion-navy-50 text-orion-navy-300",
};

/**
 * Identidad cromatica por modulo, SOLO para las 3 tarjetas secundarias
 * del hub (react/frame/tools) - play tiene su propio tratamiento ya
 * fijo (hero, navy+sky) y no usa esto.
 *
 * 3a pasada (mas contraste, visible en reposo): `border` ya NO lleva
 * opacidad reducida (antes /40, apenas se distinguia sobre blanco,
 * especialmente el cian de react) - color solido desde el reposo, el
 * borde nunca depende de :hover para notarse. `hoverBorder` ahora sube
 * un escalon mas oscuro/saturado (no es el mismo color repetido) para
 * que el estado interactivo siga siendo distinguible.
 *
 * La tarjeta en si sigue SIEMPRE blanca (`bg-white`, fijo en page.tsx,
 * no en esta tabla) - el color nunca cubre la superficie grande de la
 * tarjeta, solo icono + fondo pequeño del icono + borde. El titulo sigue
 * SIEMPRE siendo texto oscuro (`text-orion-navy-900`, fijo en page.tsx).
 */
export const MODULE_CARD_THEME: Record<
  string,
  { icon: string; iconBg: string; border: string; hoverBorder: string }
> = {
  react: {
    icon: "text-orion-sky",
    iconBg: "bg-orion-sky/10",
    border: "border-orion-sky",
    hoverBorder: "hover:border-[#2fb3cf]",
  },
  tools: {
    icon: "text-orion-accent",
    iconBg: "bg-orion-accent/10",
    border: "border-orion-accent",
    hoverBorder: "hover:border-[#28b87b]",
  },
  frame: {
    // Azul grisaceo (escala navy, no un acento vibrante): sigue en fase
    // de diseño de hardware, no deberia aparentar el mismo nivel de
    // disponibilidad que react/tools - navy-400 da suficiente contraste
    // sobre blanco sin ser un acento tan vivo como los otros dos.
    icon: "text-orion-navy-500",
    iconBg: "bg-orion-navy-100",
    border: "border-orion-navy-400",
    hoverBorder: "hover:border-orion-navy-600",
  },
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

/** Pantalla (monitor) con un estimulo dentro - representa un generador
 * de estimulos visuales en pantalla, distinto del maletin de material
 * fisico de ToolsModuleIcon (que sigue siendo el icono de "manual"). */
function OrionToolsModuleIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
      <circle cx="9.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M13.5 8.3l2.7 2.7-2.7 2.7" />
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
  tools: OrionToolsModuleIcon,
};

export function ModuleIcon({ moduleId, className = "h-6 w-6" }: { moduleId: string; className?: string }) {
  const Icon = MODULE_ICONS[moduleId] ?? GenericModuleIcon;
  return <Icon className={className} />;
}
