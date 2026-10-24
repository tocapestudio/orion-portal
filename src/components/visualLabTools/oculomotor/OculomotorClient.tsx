"use client";

/**
 * ORION Tools · Oculomotricidad - dos modalidades independientes
 * (seguimiento visual continuo / movimientos sacadicos discretos), 3
 * columnas (navegacion de modalidad | configuracion | vista previa
 * funcional), mismo lenguaje visual y patrones que el Generador de
 * estimulos ya publicado (StimulusGeneratorClient.tsx) - PERO sin
 * reutilizar sus componentes internos directamente (son privados de ese
 * modulo, y tocar ese archivo esta fuera de alcance: "no alteres el
 * comportamiento del Generador de estimulos"). Lo que SI se reutiliza
 * tal cual son los CATALOGOS de contenido (BASE_COLOR_PALETTE/
 * BASE_LETTERS/BASE_NUMBERS/BASE_SHAPES de stimulusConfig.ts) - mismos
 * valores, mismo orden, pedido explicitamente.
 *
 * SIN PERSISTENCIA: a diferencia del Generador de estimulos, esta
 * herramienta no guarda ninguna configuracion predeterminada ni crea
 * ninguna actividad - no hay seleccion de deportista, no hay modo demo,
 * no hay "Guardar". Decision explicita del diseño aprobado ("no
 * inventes flujos de persistencia ni requisitos de registro"): la vista
 * previa ES la ejecucion (no existe un modo de ejecucion separado), asi
 * que no hace falta conservar ningun patron de navegacion/seleccion de
 * deportista que no tendria ningun efecto real.
 *
 * MOTOR DE ANIMACION: seguimiento visual usa requestAnimationFrame y
 * actualiza la posicion del estimulo escribiendo DIRECTAMENTE en
 * `stimulusRef.current.style` (sin pasar por estado de React en cada
 * frame) - el unico modo de mantener 60fps fluidos sin "actualizaciones
 * de estado innecesarias" (pedido explicitamente). Sacadicos usa una
 * cadena de setTimeout (igual que el Generador de estimulos), ya que son
 * eventos discretos poco frecuentes, no una animacion continua - ahi SI
 * se usa estado de React sin problema de rendimiento.
 *
 * SELECCION DE CONTENIDO (colores/letras/numeros/simbolos): el numero de
 * elementos marcados determina el comportamiento automaticamente (ya NO
 * existe un selector explicito "Fijo"/"Aleatorio", pedido explicitamente
 * en esta iteracion) - 0 = no se puede arrancar, 1 = permanece fijo, 2+ =
 * el motor alterna aleatoriamente SOLO entre los marcados. Ver
 * getSelectedStimulusElements/resolveInitialStimulusElement/
 * pickNextRandomElement en oculomotorConfig.ts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_OCULOMOTOR_CONFIG,
  PURSUIT_SPEED_PRESETS_MS,
  SACCADE_INTERVAL_PRESETS_MS,
  RANDOM_AMPLITUDE_MIN_PERCENT,
  resolveTimingMs,
  resolveAmplitudePercent,
  computePursuitPoint,
  computeNextSaccadePosition,
  isDurationComplete,
  shouldChangePursuitElement,
  pickNextRandomElement,
  canStartOculomotorExercise,
  getSelectedStimulusElements,
  resolveInitialStimulusElement,
  pickNextRandomWalkWaypoint,
  catmullRomPoint,
  resolveRandomWalkSegmentDurationMs,
  type OculomotorConfig,
  type OculomotorModality,
  type PursuitPattern,
  type SaccadePattern,
  type TimingConfig,
  type TimingMode,
  type TimingPreset,
  type WorkAreaConfig,
  type WorkAreaMode,
  type OculomotorStimulusType,
  type OculomotorStimulusConfig,
  type DurationMode,
  type NormalizedPoint,
} from "./oculomotorConfig";
import { BASE_COLOR_PALETTE, BASE_LETTERS, BASE_NUMBERS, BASE_SHAPES } from "../stimulusGenerator/stimulusConfig";

type PlaybackState = "idle" | "playing" | "paused" | "stopped";
type ViewMode = "config" | "exercise";

/** Igual tri-estado y mismo razonamiento que FullscreenStatus en
 * StimulusGeneratorClient.tsx: 'pending' = acabamos de pedir fullscreen
 * real y aun no hay confirmacion; 'active' = el navegador confirmo;
 * 'unavailable' = no soportado o rechazado (incluida la salida via
 * Escape) - en los 3 casos la vista de ejercicio sigue ocupando toda la
 * pantalla via CSS (`fixed inset-0`), fullscreen real es una mejora
 * progresiva, nunca un requisito para que el ejercicio funcione. */
type FullscreenStatus = "pending" | "active" | "unavailable";

const MODALITY_LABELS: Record<OculomotorModality, string> = { pursuit: "Seguimiento visual", saccades: "Movimientos sacádicos" };

const PURSUIT_PATTERN_LABELS: Record<PursuitPattern, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  h: "H",
  cross: "Cruzado (X)",
  circular: "Circular",
  curved: "Curvo",
  random: "Aleatorio",
};

const SACCADE_PATTERN_LABELS: Record<SaccadePattern, string> = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  diagonal: "Diagonal",
  h: "H",
  x: "X",
  random: "Aleatorio",
};

const TIMING_MODE_LABELS: Record<TimingMode, string> = { adjustable: "Ajustable", preset: "Predefinida", random: "Aleatoria" };
const TIMING_PRESET_LABELS: Record<TimingPreset, string> = { slow: "Lenta", medium: "Media", fast: "Rápida" };
const WORK_AREA_LABELS: Record<WorkAreaMode, string> = { fullscreen: "Pantalla completa", reduced: "Amplitud reducida", random: "Amplitud aleatoria" };
const STIMULUS_TYPE_LABELS: Record<OculomotorStimulusType, string> = {
  colorCircle: "Círculo de color",
  blackOnWhite: "Punto negro sobre blanco",
  whiteOnBlack: "Punto blanco sobre negro",
  letter: "Letra",
  number: "Número",
  symbol: "Símbolo",
};
const STIMULUS_SIZE_LABELS: Record<"sm" | "md" | "lg", string> = { sm: "Pequeño", md: "Mediano", lg: "Grande" };
const STIMULUS_SIZE_PX: Record<"sm" | "md" | "lg", number> = { sm: 28, md: 44, lg: 64 };
const SHAPE_LABELS: Record<string, string> = { circle: "Círculo", square: "Cuadrado", triangle: "Triángulo", star: "Estrella" };

/** Sustantivo singular/plural por tipo - usado SOLO en los textos de
 * estado ("selecciona al menos un/una...", "entre los N ... marcados")
 * para que el mensaje se lea natural en español segun la categoria
 * activa, en vez de un generico "elemento(s)" repetido en todas. */
const ELEMENT_NOUN: Record<"colorCircle" | "letter" | "number" | "symbol", { singular: string; plural: string; article: string }> = {
  colorCircle: { singular: "color", plural: "colores", article: "un" },
  letter: { singular: "letra", plural: "letras", article: "una" },
  number: { singular: "número", plural: "números", article: "un" },
  symbol: { singular: "símbolo", plural: "símbolos", article: "un" },
};

// `whitespace-nowrap`: a proposito, para que en columnas estrechas (la
// fila Estimulo/Duracion del grid antiscroll, o resoluciones de
// escritorio mas modestas como 1280px) el texto de una etiqueta larga
// ("Punto negro sobre blanco", "Lenta (8000 ms/ciclo)") nunca parta
// dentro del propio boton (eso lo hace mas alto y menos legible) - en
// vez de eso, el boton entero pasa a la siguiente fila del contenedor
// `flex flex-wrap` que ya envuelve a todos estos grupos de botones.
const toggleButtonClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold ${
    active ? "border-orion-navy-900 bg-orion-navy-900 text-white" : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
  }`;

/** Mismo patron visual que StimulusGeneratorClient.tsx (colorSwatchClass/
 * SelectedCheckBadge) - reimplementado localmente a proposito (ese
 * componente es privado de ese modulo, acoplarlos esta fuera de alcance),
 * pedido explicitamente: "siguiendo el patron visual del Generador de
 * estimulos". La insignia tiene fondo FIJO (navy + anillo blanco), nunca
 * el color del swatch que marca, para seguir siendo legible sobre
 * cualquier tono (incluidos blanco y amarillo claro). */
const colorSwatchClass = (active: boolean) =>
  `h-6 w-6 shrink-0 rounded-full border-2 ${
    active ? "border-orion-navy-900 ring-2 ring-orion-navy-900 ring-offset-2" : "border-orion-navy-200"
  }`;

function SelectedCheckBadge() {
  return (
    <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-orion-navy-900 ring-2 ring-white">
      <svg viewBox="0 0 24 24" className="h-2 w-2 text-white" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/** Selector de modalidad HORIZONTAL superior (sustituye a la navegacion
 * lateral del incremento anterior) - 2 pestañas de igual ancho, bien
 * diferenciadas por color solido cuando activas, nunca solo por un
 * borde/subrayado sutil. `whitespace-nowrap` SOLO desde `sm:` (640px) -
 * en movil (390px) el contenedor no tiene ancho suficiente para
 * "Movimientos sacádicos" en una sola linea sin recortarse (detectado
 * midiendo scrollWidth>clientWidth del boton en el propio navegador), asi
 * que ahi se permite envolver a 2 lineas como antes (pedido explicito:
 * "mantén una adaptación correcta en móvil" / "evita que el texto se
 * corte"). En escritorio (>=640px, cubre con margen las 3 resoluciones
 * pedidas: 1280/1400/1920) se fuerza una sola linea. */
function ModalityTab({ label, active, onSelect }: { label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`whitespace-normal rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition sm:whitespace-nowrap ${
        active ? "bg-orion-navy-900 text-white" : "text-orion-navy-700 hover:bg-orion-navy-50"
      }`}
    >
      {label}
    </button>
  );
}

/** Figura simple para el tipo de estimulo "symbol" - reutiliza los IDs
 * de BASE_SHAPES (stimulusConfig.ts) pero con su propio renderizado
 * local (el componente equivalente del Generador de estimulos es
 * privado de ese modulo) - un circulo/cuadrado/triangulo/estrella
 * relleno, sin color propio (hereda `currentColor`, igual criterio que
 * en el Generador). */
function ShapeGlyph({ shape, sizePx }: { shape: string; sizePx: number }) {
  const style = { width: sizePx, height: sizePx };
  if (shape === "circle") return <div className="rounded-full bg-orion-navy-900" style={style} />;
  if (shape === "square") return <div className="bg-orion-navy-900" style={style} />;
  if (shape === "star") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="text-orion-navy-900" style={style}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="text-orion-navy-900" style={style}>
      <path d="M12 3l9 18H3L12 3z" />
    </svg>
  );
}

/** Contenido del estimulo EN VIVO - `displayElement` es el elemento
 * ACTUALMENTE mostrado (color hex / letra / numero / id de forma),
 * calculado y actualizado por el motor (ver `displayElement` state en
 * OculomotorClient). Puramente presentacional, usado tanto en reposo
 * (centrado) como moviendose (reposicionado por el motor de animacion a
 * traves de `stimulusRef`, nunca re-renderizado por esto). */
function StimulusVisual({
  type,
  displayElement,
  size,
}: {
  type: OculomotorStimulusType;
  displayElement: string | null;
  size: "sm" | "md" | "lg";
}) {
  const sizePx = STIMULUS_SIZE_PX[size];
  switch (type) {
    case "colorCircle":
      return <div className="rounded-full shadow-inner" style={{ width: sizePx, height: sizePx, backgroundColor: displayElement ?? "#cbd5e1" }} />;
    case "blackOnWhite":
      return <div className="rounded-full bg-orion-navy-950" style={{ width: sizePx, height: sizePx }} />;
    case "whiteOnBlack":
      return <div className="rounded-full bg-white" style={{ width: sizePx, height: sizePx }} />;
    case "letter":
    case "number":
      return (
        <div
          className="flex items-center justify-center font-bold text-orion-navy-900"
          style={{ width: sizePx, height: sizePx, fontSize: sizePx * 0.7, lineHeight: 1 }}
        >
          {displayElement ?? ""}
        </div>
      );
    case "symbol":
      return <ShapeGlyph shape={displayElement ?? "circle"} sizePx={sizePx} />;
  }
}

/** Fondo del escenario - SIEMPRE blanco, salvo "whiteOnBlack" (el UNICO
 * tipo cuyo contenido necesita fondo negro para tener contraste
 * suficiente). */
function getStageBackgroundClass(type: OculomotorStimulusType): string {
  return type === "whiteOnBlack" ? "bg-orion-navy-950" : "bg-white";
}

function TimingConfigFields({
  label,
  showLabel = true,
  config,
  onChange,
  presetTable,
  adjustableMin,
  adjustableMax,
  adjustableStep,
  unitsHint,
}: {
  label: string;
  /** false cuando el llamador ya muestra `label` como titulo de tarjeta
   * (ver bloque "Velocidad"/"Intervalo" en el panel de configuracion) -
   * `label` se sigue usando para el aria-label del slider, solo se
   * omite su repeticion visual. */
  showLabel?: boolean;
  config: TimingConfig;
  onChange: (next: TimingConfig) => void;
  presetTable: Record<TimingPreset, number>;
  adjustableMin: number;
  adjustableMax: number;
  adjustableStep: number;
  unitsHint: string;
}) {
  return (
    <div>
      {showLabel && <p className="mb-1.5 text-xs text-orion-navy-500">{label}</p>}
      <div className="mb-2 flex flex-wrap gap-2">
        {(["adjustable", "preset", "random"] as TimingMode[]).map((mode) => (
          <button key={mode} type="button" onClick={() => onChange({ ...config, mode })} className={toggleButtonClass(config.mode === mode)}>
            {TIMING_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      {config.mode === "adjustable" && (
        <div className="space-y-1">
          <input
            type="range"
            min={adjustableMin}
            max={adjustableMax}
            step={adjustableStep}
            value={config.valueMs}
            onChange={(e) => onChange({ ...config, valueMs: Number(e.target.value) })}
            className="w-full"
            aria-label={`${label} (${unitsHint})`}
          />
          <p className="text-xs text-orion-navy-500">
            {config.valueMs} {unitsHint}
          </p>
        </div>
      )}
      {config.mode === "preset" && (
        <div className="flex flex-wrap gap-2">
          {(["slow", "medium", "fast"] as TimingPreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange({ ...config, preset })}
              className={toggleButtonClass(config.preset === preset)}
            >
              {TIMING_PRESET_LABELS[preset]} ({presetTable[preset]} {unitsHint})
            </button>
          ))}
        </div>
      )}
      {config.mode === "random" && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-orion-navy-700">
          <label className="flex items-center gap-2">
            Mínimo
            <input
              type="number"
              min={adjustableMin}
              step={adjustableStep}
              value={config.minMs}
              onChange={(e) => onChange({ ...config, minMs: Math.max(adjustableMin, Number(e.target.value) || adjustableMin) })}
              className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
            />
            {unitsHint}
          </label>
          <label className="flex items-center gap-2">
            Máximo
            <input
              type="number"
              min={adjustableMin}
              step={adjustableStep}
              value={config.maxMs}
              onChange={(e) => onChange({ ...config, maxMs: Math.max(adjustableMin, Number(e.target.value) || adjustableMin) })}
              className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
            />
            {unitsHint}
          </label>
        </div>
      )}
    </div>
  );
}

// Sin label interno visible a proposito: el llamador siempre envuelve
// esto en una tarjeta titulada "Área de trabajo y amplitud" (ver panel
// de configuracion), repetirlo aqui seria redundante.
function WorkAreaFields({ config, onChange }: { config: WorkAreaConfig; onChange: (next: WorkAreaConfig) => void }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {(["fullscreen", "reduced", "random"] as WorkAreaMode[]).map((mode) => (
          <button key={mode} type="button" onClick={() => onChange({ ...config, mode })} className={toggleButtonClass(config.mode === mode)}>
            {WORK_AREA_LABELS[mode]}
          </button>
        ))}
      </div>
      {(config.mode === "reduced" || config.mode === "random") && (
        <div className="space-y-1">
          <input
            type="range"
            min={25}
            max={75}
            step={5}
            value={config.amplitudePercent}
            onChange={(e) => onChange({ ...config, amplitudePercent: Number(e.target.value) })}
            className="w-full"
            aria-label="Amplitud (%)"
          />
          <p className="text-xs text-orion-navy-500">
            {config.mode === "reduced"
              ? `${config.amplitudePercent}% del área disponible`
              : `Hasta ${config.amplitudePercent}% (varía entre ${RANDOM_AMPLITUDE_MIN_PERCENT}% y ese máximo)`}
          </p>
        </div>
      )}
    </div>
  );
}

/** Grupo 4 (tipo de estimulo) - separado de color/caracter y tamaño para
 * que el componente padre pueda colocarlos en celdas de rejilla
 * distintas, pedido explicitamente ("no conviertas cada parametro en una
 * tarjeta vertical independiente... distribuye horizontalmente"). Sin
 * label interno visible (el llamador titula la tarjeta "Tipo de
 * estímulo"). */
function StimulusTypeFields({ stimulus, onChange }: { stimulus: OculomotorStimulusConfig; onChange: (next: OculomotorStimulusConfig) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STIMULUS_TYPE_LABELS) as OculomotorStimulusType[]).map((type) => (
          <button key={type} type="button" onClick={() => onChange({ ...stimulus, type })} className={toggleButtonClass(stimulus.type === type)}>
            {STIMULUS_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

function toggleArrayItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * Grupo 5 (contenido seleccionable del estimulo) - YA NO hay selector
 * explicito "Fijo"/"Aleatorio" (eliminado, pedido explicitamente): se
 * muestra DIRECTAMENTE la paleta/catalogo con seleccion MULTIPLE, y el
 * numero de elementos marcados determina el comportamiento (ver
 * ELEMENT_NOUN/getSelectedStimulusElements). Mismo patron visual que el
 * Generador de estimulos en cada caso:
 * - colorCircle: swatches con anillo + insignia de tick (como
 *   ColorListEditor/SelectedCheckBadge), paleta de 9 presets SIN atajo
 *   "Todas/Ninguna" (el Generador tampoco lo tiene para colores, son
 *   pocos y se marcan uno a uno comodamente).
 * - letter/number/symbol: botones toggle solidos (como
 *   SymbolCategoryFields, sin insignia de tick - el relleno solido YA
 *   es la señal de seleccion ahi, igual que en el Generador) + atajo
 *   "Todas"/"Ninguna" (el Generador SI lo tiene aqui, especialmente util
 *   para las 26 letras).
 * - blackOnWhite/whiteOnBlack: sin contenido seleccionable (contraste
 *   fijo por diseño).
 */
function StimulusSelectionFields({
  stimulus,
  onChange,
}: {
  stimulus: OculomotorStimulusConfig;
  onChange: (next: OculomotorStimulusConfig) => void;
}) {
  if (stimulus.type === "colorCircle") {
    const selected = stimulus.colorElements;
    const noun = ELEMENT_NOUN.colorCircle;
    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {BASE_COLOR_PALETTE.map((hex) => {
            const active = selected.includes(hex);
            return (
              <button
                key={hex}
                type="button"
                onClick={() => onChange({ ...stimulus, colorElements: toggleArrayItem(selected, hex) })}
                className={`relative ${colorSwatchClass(active)}`}
                style={{ backgroundColor: hex }}
                aria-pressed={active}
                aria-label={hex}
                title={hex}
              >
                {active && <SelectedCheckBadge />}
              </button>
            );
          })}
        </div>
        <SelectionStatusMessage count={selected.length} noun={noun} />
      </div>
    );
  }

  if (stimulus.type === "letter" || stimulus.type === "number" || stimulus.type === "symbol") {
    const catalog = stimulus.type === "letter" ? BASE_LETTERS : stimulus.type === "number" ? BASE_NUMBERS : BASE_SHAPES;
    const field = stimulus.type === "letter" ? "letterElements" : stimulus.type === "number" ? "numberElements" : "symbolElements";
    const selected = stimulus[field];
    const noun = ELEMENT_NOUN[stimulus.type];
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-orion-navy-500">Elementos disponibles</p>
          {/* Atajo "Todas"/"Ninguna" (mismo patron que SymbolCategoryFields
              en el Generador de estimulos) - especialmente util con las 26
              letras. */}
          <div className="flex shrink-0 gap-2 text-xs font-medium">
            <button type="button" onClick={() => onChange({ ...stimulus, [field]: [...catalog] })} className="text-orion-accent hover:underline">
              Todas
            </button>
            <button type="button" onClick={() => onChange({ ...stimulus, [field]: [] })} className="text-orion-navy-400 hover:underline">
              Ninguna
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {catalog.map((el) => (
            <button
              key={el}
              type="button"
              onClick={() => onChange({ ...stimulus, [field]: toggleArrayItem(selected, el) })}
              className={toggleButtonClass(selected.includes(el))}
            >
              {stimulus.type === "symbol" ? SHAPE_LABELS[el] ?? el : el}
            </button>
          ))}
        </div>
        <SelectionStatusMessage count={selected.length} noun={noun} />
      </div>
    );
  }

  // 'blackOnWhite'/'whiteOnBlack': sin contenido seleccionable (el
  // contraste es fijo por diseño, ver getStageBackgroundClass) - nada
  // que mostrar en este grupo. Se mantienen como tipos de estimulo
  // independientes, nunca convertidos en opciones cromaticas del modo
  // aleatorio (sin justificacion funcional para ello: el punto es
  // SIEMPRE blanco o SIEMPRE negro por definicion de cada tipo).
  return <p className="text-xs text-orion-navy-400">Este tipo de estímulo no tiene contenido seleccionable (contraste fijo).</p>;
}

/** Mensaje de estado derivado DIRECTAMENTE del numero de seleccionados -
 * la misma regla en los 3 casos posibles, centralizada aqui para no
 * repetirla en cada rama de StimulusSelectionFields. */
function SelectionStatusMessage({ count, noun }: { count: number; noun: { singular: string; plural: string; article: string } }) {
  if (count === 0) {
    return (
      <p className="text-xs font-semibold text-red-600">
        Selecciona al menos {noun.article} {noun.singular} para continuar.
      </p>
    );
  }
  if (count === 1) {
    return (
      <p className="text-xs text-orion-navy-500">
        {noun.article === "una" ? "Una" : "Un"} {noun.singular} seleccionad{noun.article === "una" ? "a" : "o"}: permanecerá fijo durante la ejecución.
      </p>
    );
  }
  const feminine = noun.article === "una";
  return (
    <p className="text-xs text-orion-navy-500">
      {count} {noun.plural} seleccionad{feminine ? "as" : "os"}: el ejercicio alternará aleatoriamente entre {feminine ? "ellas" : "ellos"}.
    </p>
  );
}

// Sin label interno visible (el llamador titula la tarjeta "Tamaño").
function StimulusSizeFields({ stimulus, onChange }: { stimulus: OculomotorStimulusConfig; onChange: (next: OculomotorStimulusConfig) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["sm", "md", "lg"] as const).map((size) => (
          <button key={size} type="button" onClick={() => onChange({ ...stimulus, size })} className={toggleButtonClass(stimulus.size === size)}>
            {STIMULUS_SIZE_LABELS[size]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OculomotorClient() {
  const [config, setConfig] = useState<OculomotorConfig>(DEFAULT_OCULOMOTOR_CONFIG);
  const [playback, setPlayback] = useState<PlaybackState>("idle");
  const [view, setView] = useState<ViewMode>("config");
  const [fullscreenStatus, setFullscreenStatus] = useState<FullscreenStatus>("pending");

  // Un UNICO par de refs para el escenario/estimulo, reutilizado TAL
  // CUAL tanto por la vista previa en linea (columna derecha de
  // configuracion) como por la vista de ejercicio a pantalla completa -
  // nunca ambas montadas a la vez (`view` decide cual de las 2 ramas de
  // JSX se renderiza, ver el `return` de mas abajo), asi que React
  // reasigna estos refs automaticamente al nodo DOM que corresponda en
  // cada momento. El motor de animacion (pursuitFrame/saccadeTick) no
  // sabe ni le importa en cual de las 2 vistas esta escribiendo.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stimulusRef = useRef<HTMLDivElement | null>(null);
  const exerciseContainerRef = useRef<HTMLDivElement | null>(null);
  const playbackRef = useRef<PlaybackState>("idle");
  const rafIdRef = useRef<number | null>(null);
  const saccadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startedAtRef = useRef(0);
  const totalPausedMsRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);

  // Usados SOLO por los 6 patrones DETERMINISTAS (horizontal/vertical/h/
  // cruzado/circular/curvo) - el patron 'random' usa su PROPIO sistema
  // de estado mas abajo (randomWalk*Ref), con su propio criterio de
  // "cuando re-sortear la amplitud" (por tramo, no por ciclo - un paseo
  // continuo no tiene "ciclos").
  const cycleIndexRef = useRef(-1);
  const cycleAmplitudeRef = useRef(0.5);
  const resolvedCycleMsRef = useRef(4000);

  // Estado del PASEO ALEATORIO continuo (patron 'random' de seguimiento,
  // ver pickNextRandomWalkWaypoint/catmullRomPoint en oculomotorConfig.ts)
  // - `waypoints` en coordenadas CENTRADAS (radio <=1), crece de forma
  // perezosa segun hace falta; `segmentIndex`/`segmentStartElapsedMs`/
  // `segmentDurationMs` ubican "en que tramo estamos y cuanto llevamos"
  // usando el mismo criterio de TIEMPO ABSOLUTO transcurrido (no deltas
  // acumulados por frame) que el resto del motor, para ser robusto a
  // saltos grandes (pestaña en segundo plano, etc.) sin perder la
  // correspondencia tramo/tiempo.
  const randomWalkWaypointsRef = useRef<NormalizedPoint[]>([]);
  const randomWalkAngleRef = useRef(0);
  const randomWalkSegmentIndexRef = useRef(0);
  const randomWalkSegmentStartElapsedMsRef = useRef(0);
  const randomWalkSegmentDurationMsRef = useRef(0);

  const saccadeIndexRef = useRef(-1);
  const saccadeNextTickAtRef = useRef(0);
  const saccadeRemainingMsRef = useRef<number | null>(null);

  // Elemento de contenido EN VIVO (color/letra/numero/simbolo): mismo
  // criterio documentado en la iteracion anterior para el color - estado
  // de React porque los cambios son poco frecuentes (1 cada
  // PURSUIT_ELEMENT_CHANGE_INTERVAL_MS, o 1 por salto de sacadicos), muy
  // lejos de 60fps. `lastElementRef`/`lastElementChangeAtRef` son el
  // estado interno que el motor lee/escribe en cada frame/tick sin pasar
  // por React.
  const [displayElement, setDisplayElement] = useState<string | null>(resolveInitialStimulusElement(config.stimulus));
  const lastElementRef = useRef<string | null>(resolveInitialStimulusElement(config.stimulus));
  const lastElementChangeAtRef = useRef(0);

  // Sincroniza `displayElement` cada vez que cambia la configuracion del
  // estimulo (tipo o seleccion) EN REPOSO - directamente en el manejador
  // de cambio (nunca con un useEffect "espejo de props" separado, patron
  // que el linter de hooks de este proyecto señala como innecesario).
  // Compara el elemento inicial RESUELTO antes/despues en vez de cada
  // campo individualmente, asi cubre de una vez cambios de tipo,
  // seleccion marcada/desmarcada, etc.
  const handleStimulusChange = useCallback((stimulus: OculomotorStimulusConfig) => {
    setConfig((c) => ({ ...c, stimulus }));
    const nextInitial = resolveInitialStimulusElement(stimulus);
    if (nextInitial !== lastElementRef.current) {
      lastElementRef.current = nextInitial;
      setDisplayElement(nextInitial);
    }
  }, []);

  useEffect(() => {
    playbackRef.current = playback;
  }, [playback]);

  // Limpieza al desmontar (cambiar de pagina, etc.) - nunca deja un
  // rAF/timeout huerfano corriendo en segundo plano, ni la pagina
  // atascada en fullscreen real tras salir de la herramienta.
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (saccadeTimeoutRef.current) clearTimeout(saccadeTimeoutRef.current);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Fullscreen real: mismo patron ya probado en
  // StimulusGeneratorClient.tsx - un listener global (`fullscreenchange`,
  // cubre tambien la salida via Escape) mas un efecto que PIDE fullscreen
  // real solo al ENTRAR en la vista de ejercicio. Si el navegador lo
  // rechaza o no lo soporta, `fullscreenStatus` pasa a 'unavailable' y la
  // vista de ejercicio sigue funcionando igual (CSS `fixed inset-0`).
  useEffect(() => {
    const handleChange = () => setFullscreenStatus(document.fullscreenElement ? "active" : "unavailable");
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (view !== "exercise") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullscreenStatus("pending");
    const el = exerciseContainerRef.current;
    if (!el || typeof el.requestFullscreen !== "function") {
      setFullscreenStatus("unavailable");
      return;
    }
    el.requestFullscreen().catch(() => setFullscreenStatus("unavailable"));
  }, [view]);

  const applyPointToStage = useCallback((point: NormalizedPoint, sizePx: number) => {
    const stage = stageRef.current;
    const el = stimulusRef.current;
    if (!stage || !el) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    // Centro del estimulo acotado a [sizePx/2, dimension-sizePx/2] - nunca
    // se recorta en el borde, incluso en 'fullscreen' (amplitud 100%).
    const cx = sizePx / 2 + point.x * Math.max(0, w - sizePx);
    const cy = sizePx / 2 + point.y * Math.max(0, h - sizePx);
    el.style.left = `${cx - sizePx / 2}px`;
    el.style.top = `${cy - sizePx / 2}px`;
  }, []);

  // Genera waypoints del paseo aleatorio HASTA que el buffer alcance al
  // menos `index` (perezoso: nunca genera de mas, solo lo que hace falta
  // para resolver el tramo/spline actual - "si se utilizan segmentos
  // sucesivos, genera anticipadamente los siguientes puntos para que la
  // transicion sea continua").
  const ensureRandomWalkWaypoint = useCallback((index: number) => {
    while (randomWalkWaypointsRef.current.length <= index) {
      const last = randomWalkWaypointsRef.current[randomWalkWaypointsRef.current.length - 1];
      const { point, angle } = pickNextRandomWalkWaypoint(last, randomWalkAngleRef.current, Math.random);
      randomWalkWaypointsRef.current.push(point);
      randomWalkAngleRef.current = angle;
    }
  }, []);

  // Posicion del paseo aleatorio para un `elapsedMs` dado (tiempo
  // ABSOLUTO desde que arranco la ejecucion, mismo criterio que el resto
  // del motor - robusto a saltos grandes, p.ej. pestaña en segundo
  // plano: el bucle `while` de mas abajo avanza tantos tramos como haga
  // falta de una vez, nunca se "atasca"). Avanza de tramo en tramo segun
  // el tiempo transcurrido, generando mas waypoints segun hace falta, y
  // evalua la spline Catmull-Rom del tramo actual. La amplitud se
  // re-sortea una vez por TRAMO NUEVO si el area de trabajo es
  // 'random' (nunca a mitad de un tramo en curso) - el equivalente, para
  // un paseo sin ciclos, del re-sorteo "una vez por ciclo" que usan los
  // patrones deterministas.
  const computeRandomWalkPoint = useCallback(
    (elapsedMs: number): NormalizedPoint => {
      ensureRandomWalkWaypoint(randomWalkSegmentIndexRef.current + 2);
      let segStart = randomWalkSegmentStartElapsedMsRef.current;
      let segDur = randomWalkSegmentDurationMsRef.current;
      while (elapsedMs >= segStart + segDur) {
        segStart += segDur;
        randomWalkSegmentIndexRef.current += 1;
        ensureRandomWalkWaypoint(randomWalkSegmentIndexRef.current + 2);
        const i = randomWalkSegmentIndexRef.current;
        const waypoints = randomWalkWaypointsRef.current;
        const segLen = Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
        segDur = resolveRandomWalkSegmentDurationMs(segLen, resolvedCycleMsRef.current);
        cycleAmplitudeRef.current = resolveAmplitudePercent(config.pursuit.workArea, Math.random) / 100;
      }
      randomWalkSegmentStartElapsedMsRef.current = segStart;
      randomWalkSegmentDurationMsRef.current = segDur;
      const t = Math.min(1, Math.max(0, (elapsedMs - segStart) / segDur));
      const i = randomWalkSegmentIndexRef.current;
      const waypoints = randomWalkWaypointsRef.current;
      const p0 = waypoints[Math.max(0, i - 1)];
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const p3 = waypoints[i + 2];
      const centered = catmullRomPoint(p0, p1, p2, p3, t);
      const r = cycleAmplitudeRef.current / 2;
      return {
        x: Math.min(1, Math.max(0, 0.5 + r * centered.x)),
        y: Math.min(1, Math.max(0, 0.5 + r * centered.y)),
      };
    },
    [config.pursuit.workArea, ensureRandomWalkWaypoint]
  );

  // `pursuitFrame`/`saccadeTick` se llaman a SI MISMAS para encadenar el
  // siguiente frame/salto (requestAnimationFrame/setTimeout). Auto-
  // referenciarse por el NOMBRE de un useCallback desde su propio cuerpo
  // es un patron inseguro (la referencia memoizada podria no reflejar
  // cambios de `config` entre renders) y el linter de hooks de este
  // proyecto lo señala como error. Para permitir `useCallback` (necesario
  // para que las llamadas a `performance.now()` queden dentro de una
  // funcion reconocida como "manejador", no como codigo de render) sin
  // auto-referencia directa, la recursion pasa por un ref que siempre
  // apunta a la version MAS RECIENTE de la funcion.
  const pursuitFrameRef = useRef<() => void>(() => {});
  const saccadeTickRef = useRef<() => void>(() => {});

  const stopInternal = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (saccadeTimeoutRef.current) {
      clearTimeout(saccadeTimeoutRef.current);
      saccadeTimeoutRef.current = null;
    }
    // "Reiniciar debe restaurar el estado inicial... sin incorporar
    // elementos no seleccionados" - y lo mismo al Detener (pedido
    // explicitamente en la iteracion anterior, sigue aplicando aqui): a
    // diferencia de la posicion (que se queda donde estaba, con valor
    // clinico), un elemento aleatorio a medio ciclo no tiene ese mismo
    // valor, asi que SI se restablece aqui al primero de los
    // seleccionados.
    const initial = resolveInitialStimulusElement(config.stimulus);
    lastElementRef.current = initial;
    setDisplayElement(initial);
    setPlayback("stopped");
  }, [config.stimulus]);

  const pursuitFrame = useCallback(() => {
    if (playbackRef.current !== "playing") return;
    const now = performance.now();
    const elapsedMs = now - startedAtRef.current - totalPausedMsRef.current;

    if (isDurationComplete(elapsedMs, config.duration)) {
      stopInternal();
      return;
    }

    // El patron 'random' usa su PROPIO sistema de paseo continuo (sin
    // ciclos, sin fase 0..1 periodica - exactamente lo que se pidio
    // corregir: "parece repetir un recorrido en bucle"). Los 6 patrones
    // deterministas conservan el sistema de ciclo/fase SIN NINGUN
    // cambio ("no cambies los patrones deterministas existentes").
    let point: NormalizedPoint;
    if (config.pursuit.pattern === "random") {
      point = computeRandomWalkPoint(elapsedMs);
    } else {
      const cycleMs = resolvedCycleMsRef.current;
      const rawCycle = elapsedMs / cycleMs;
      const currentCycle = Math.floor(rawCycle);
      const phase = rawCycle - currentCycle;

      // Amplitud: fija para toda la ejecucion si el area de trabajo no es
      // 'random'; re-sorteada en cada CICLO NUEVO si lo es (nunca a mitad
      // de un recorrido en curso).
      if (currentCycle !== cycleIndexRef.current) {
        cycleIndexRef.current = currentCycle;
        cycleAmplitudeRef.current = resolveAmplitudePercent(config.pursuit.workArea, Math.random) / 100;
      }

      point = computePursuitPoint(config.pursuit.pattern, phase, cycleAmplitudeRef.current);
    }
    applyPointToStage(point, STIMULUS_SIZE_PX[config.stimulus.size]);

    // Cambio de contenido: SOLO si hay 2+ elementos seleccionados (1 =
    // permanece fijo, pedido explicitamente) y en PUNTOS DE CAMBIO
    // definidos (shouldChangePursuitElement/
    // PURSUIT_ELEMENT_CHANGE_INTERVAL_MS), no en cada frame - el bucle
    // sigue corriendo a 60fps para la POSICION, el contenido solo se
    // actualiza cada ~1.5s. Nunca toca `point`/la trayectoria/la
    // amplitud/la duracion: es una rama totalmente independiente de lo
    // anterior.
    const selected = getSelectedStimulusElements(config.stimulus);
    if (selected.length >= 2 && shouldChangePursuitElement(now - lastElementChangeAtRef.current)) {
      const nextElement = pickNextRandomElement(selected, lastElementRef.current, Math.random);
      lastElementRef.current = nextElement;
      lastElementChangeAtRef.current = now;
      setDisplayElement(nextElement);
    }

    rafIdRef.current = requestAnimationFrame(() => pursuitFrameRef.current());
  }, [config, applyPointToStage, stopInternal, computeRandomWalkPoint]);

  useEffect(() => {
    pursuitFrameRef.current = pursuitFrame;
  }, [pursuitFrame]);

  const saccadeTick = useCallback(() => {
    if (playbackRef.current !== "playing") return;
    const now = performance.now();
    const elapsedMs = now - startedAtRef.current - totalPausedMsRef.current;

    if (isDurationComplete(elapsedMs, config.duration)) {
      stopInternal();
      return;
    }

    const amplitudeFraction = resolveAmplitudePercent(config.saccade.workArea, Math.random) / 100;
    const { point, index } = computeNextSaccadePosition(config.saccade.pattern, saccadeIndexRef.current, amplitudeFraction, Math.random);
    saccadeIndexRef.current = index;
    applyPointToStage(point, STIMULUS_SIZE_PX[config.stimulus.size]);

    // Cambio de contenido en sacadicos: SOLO si hay 2+ elementos
    // seleccionados, junto con CADA nueva posicion (sin temporizador
    // propio, sin alterar el intervalo configurado) - pedido
    // explicitamente ("el estimulo puede cambiar al presentar una nueva
    // posicion").
    const selected = getSelectedStimulusElements(config.stimulus);
    if (selected.length >= 2) {
      const nextElement = pickNextRandomElement(selected, lastElementRef.current, Math.random);
      lastElementRef.current = nextElement;
      lastElementChangeAtRef.current = now;
      setDisplayElement(nextElement);
    }

    const intervalMs = resolveTimingMs(config.saccade.interval, SACCADE_INTERVAL_PRESETS_MS, Math.random);
    saccadeNextTickAtRef.current = performance.now() + intervalMs;
    saccadeTimeoutRef.current = setTimeout(() => saccadeTickRef.current(), intervalMs);
  }, [config, applyPointToStage, stopInternal]);

  useEffect(() => {
    saccadeTickRef.current = saccadeTick;
  }, [saccadeTick]);

  const handlePlay = useCallback(() => {
    // "Ningun elemento seleccionado: no se permite iniciar la ejecucion"
    // - mismo guard en el boton (ver `disabled` mas abajo) Y aqui, por si
    // se llega a invocar de otra forma (p.ej. "Iniciar en pantalla
    // completa").
    if (!canStartOculomotorExercise(config.stimulus)) return;
    // Defensa adicional contra "reproducciones duplicadas" (pedido
    // explicitamente: "no deben duplicarse requestAnimationFrame,
    // temporizadores ni listeners") - cancela cualquier rAF/timeout que
    // pudiera seguir activo ANTES de programar uno nuevo. En el flujo
    // normal de la UI esto ya es un no-op (los botones que llaman a
    // handlePlay solo se muestran en idle/stopped), pero deja la
    // invariante garantizada por construccion, no solo por convencion.
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (saccadeTimeoutRef.current) {
      clearTimeout(saccadeTimeoutRef.current);
      saccadeTimeoutRef.current = null;
    }
    startedAtRef.current = performance.now();
    totalPausedMsRef.current = 0;
    pausedAtRef.current = null;
    cycleIndexRef.current = -1;
    saccadeIndexRef.current = -1;
    resolvedCycleMsRef.current = resolveTimingMs(config.pursuit.speed, PURSUIT_SPEED_PRESETS_MS, Math.random);
    if (config.pursuit.pattern === "random") {
      // Arranca el paseo aleatorio desde el CENTRO (0,0 en coordenadas
      // centradas - mismo punto de partida que el resto de patrones,
      // que empiezan en fase 0 = centro), con un angulo inicial al azar
      // y un segundo waypoint ya generado (hacen falta al menos 2 para
      // poder calcular la duracion/spline del primer tramo).
      const first: NormalizedPoint = { x: 0, y: 0 };
      const { point: second, angle } = pickNextRandomWalkWaypoint(first, Math.random() * Math.PI * 2, Math.random);
      randomWalkWaypointsRef.current = [first, second];
      randomWalkAngleRef.current = angle;
      randomWalkSegmentIndexRef.current = 0;
      randomWalkSegmentStartElapsedMsRef.current = 0;
      cycleAmplitudeRef.current = resolveAmplitudePercent(config.pursuit.workArea, Math.random) / 100;
      const firstSegmentLength = Math.hypot(second.x - first.x, second.y - first.y);
      randomWalkSegmentDurationMsRef.current = resolveRandomWalkSegmentDurationMs(firstSegmentLength, resolvedCycleMsRef.current);
    }
    // El contenido SIEMPRE arranca en un punto de partida determinista
    // (el primero de los seleccionados) - nunca con un sorteo antes
    // incluso de que el ejercicio empiece a moverse.
    const initial = resolveInitialStimulusElement(config.stimulus);
    lastElementRef.current = initial;
    lastElementChangeAtRef.current = startedAtRef.current;
    setDisplayElement(initial);
    setPlayback("playing");
    playbackRef.current = "playing";
    if (config.modality === "pursuit") {
      rafIdRef.current = requestAnimationFrame(() => pursuitFrameRef.current());
    } else {
      saccadeTickRef.current();
    }
  }, [config]);

  const handlePause = useCallback(() => {
    if (playbackRef.current !== "playing") return;
    pausedAtRef.current = performance.now();
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (config.modality === "saccades") {
      if (saccadeTimeoutRef.current) clearTimeout(saccadeTimeoutRef.current);
      saccadeTimeoutRef.current = null;
      saccadeRemainingMsRef.current = Math.max(0, saccadeNextTickAtRef.current - performance.now());
    }
    setPlayback("paused");
  }, [config]);

  const handleResume = useCallback(() => {
    if (playbackRef.current !== "paused") return;
    if (pausedAtRef.current != null) {
      totalPausedMsRef.current += performance.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setPlayback("playing");
    playbackRef.current = "playing";
    if (config.modality === "pursuit") {
      rafIdRef.current = requestAnimationFrame(() => pursuitFrameRef.current());
    } else {
      // Reanuda con el tiempo RESTANTE guardado al pausar (ver
      // handlePause), no un intervalo completo nuevo - evita que pausar/
      // reanudar alargue artificialmente la espera hasta el proximo
      // salto.
      const remaining = saccadeRemainingMsRef.current ?? 0;
      saccadeNextTickAtRef.current = performance.now() + remaining;
      saccadeTimeoutRef.current = setTimeout(() => saccadeTickRef.current(), remaining);
    }
  }, [config]);

  const handleStop = useCallback(() => {
    stopInternal();
  }, [stopInternal]);

  const handleReset = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (saccadeTimeoutRef.current) {
      clearTimeout(saccadeTimeoutRef.current);
      saccadeTimeoutRef.current = null;
    }
    totalPausedMsRef.current = 0;
    pausedAtRef.current = null;
    cycleIndexRef.current = -1;
    saccadeIndexRef.current = -1;
    // "Reiniciar debe restaurar el estado inicial de forma coherente, sin
    // incorporar elementos no seleccionados" - mismo criterio que
    // stopInternal.
    const initial = resolveInitialStimulusElement(config.stimulus);
    lastElementRef.current = initial;
    setDisplayElement(initial);
    setPlayback("idle");
    playbackRef.current = "idle";
    if (stimulusRef.current && stageRef.current) {
      applyPointToStage({ x: 0.5, y: 0.5 }, STIMULUS_SIZE_PX[config.stimulus.size]);
    }
  }, [applyPointToStage, config.stimulus]);

  // Cambiar de modalidad mientras se ejecuta: detener primero, nunca
  // solapar un bucle de pursuit con uno de saccades.
  const handleSelectModality = useCallback((modality: OculomotorModality) => {
    if (playbackRef.current === "playing" || playbackRef.current === "paused") {
      stopInternal();
    }
    setConfig((c) => ({ ...c, modality }));
  }, [stopInternal]);

  // "Iniciar en pantalla completa": vista previa y ejercicio son
  // reproducciones INDEPENDIENTES - nunca deben quedar las 2 activas a
  // la vez (pedido explicitamente: "iniciar a pantalla completa debe
  // detener y limpiar cualquier reproduccion de la vista previa antes de
  // comenzar el ejercicio"). `stopInternal()` cancela cualquier rAF/
  // timeout pendiente de la vista previa ANTES de que `handlePlay()`
  // programe uno nuevo - sin este orden, si la vista previa ya tuviera
  // un bucle activo, `handlePlay()` programaria un SEGUNDO bucle sin
  // cancelar el primero (2 `requestAnimationFrame` escribiendo a la vez,
  // "reproduccion oculta en segundo plano"). SIEMPRE arranca una
  // ejecucion nueva (mismo criterio que "Reproducir vista previa", solo
  // visible en el mismo estado idle/stopped).
  const handleEnterFullscreen = useCallback(() => {
    stopInternal();
    handlePlay();
    setView("exercise");
  }, [stopInternal, handlePlay]);

  // Salir SIEMPRE detiene el ejercicio por completo (cambio respecto al
  // diseño anterior, que lo dejaba continuar en la vista previa - pedido
  // explicitamente corregir: "al salir de pantalla completa, se debe
  // volver a la configuracion con el ejercicio detenido y los controles
  // habilitados" / "no debe existir una reproduccion oculta en segundo
  // plano"). `stopInternal()` cancela rAF/timeout y dejar `playback` en
  // 'stopped' (isRunning=false), asi el fieldset de configuracion se
  // habilita de inmediato al volver.
  const handleExitExercise = useCallback(() => {
    stopInternal();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setFullscreenStatus("pending");
    setView("config");
  }, [stopInternal]);

  const isRunning = playback === "playing" || playback === "paused";
  const canStart = canStartOculomotorExercise(config.stimulus);
  const selectableNoun =
    config.stimulus.type === "colorCircle" || config.stimulus.type === "letter" || config.stimulus.type === "number" || config.stimulus.type === "symbol"
      ? ELEMENT_NOUN[config.stimulus.type]
      : null;

  // Vista de ejercicio dedicada: SIN paneles de configuracion ni
  // navegacion lateral del portal (requisito explicito), misma
  // estrategia que la etapa 'running' de StimulusGeneratorClient.tsx -
  // `fixed inset-0` como base CSS incondicional (funciona aunque
  // fullscreen real no este disponible), fullscreen real como mejora
  // progresiva pedida en el efecto de arriba. Reutiliza `stageRef`/
  // `stimulusRef` (mismo par que la vista previa en linea) y TODOS los
  // manejadores de reproduccion tal cual - cero logica nueva de
  // seguimiento/sacadicos aqui, solo presentacion.
  if (view === "exercise") {
    return (
      <div
        ref={exerciseContainerRef}
        className={`fixed inset-0 z-50 ${getStageBackgroundClass(config.stimulus.type)}`}
      >
        <div ref={stageRef} className="absolute inset-0">
          <div ref={stimulusRef} className="absolute" style={{ left: "calc(50% - 22px)", top: "calc(50% - 22px)" }}>
            <StimulusVisual type={config.stimulus.type} displayElement={displayElement} size={config.stimulus.size} />
          </div>
        </div>

        <div className="absolute left-4 top-4 rounded-md bg-white/90 px-2 py-1 text-xs text-orion-navy-700 shadow-sm">
          {MODALITY_LABELS[config.modality]}
        </div>

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          {playback === "playing" ? (
            <button
              type="button"
              onClick={handlePause}
              className="rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-orion-navy-900"
            >
              Pausar
            </button>
          ) : (
            <button
              type="button"
              onClick={playback === "paused" ? handleResume : handlePlay}
              className="rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-orion-navy-900"
            >
              {playback === "paused" ? "Reanudar" : "Reproducir"}
            </button>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-orion-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
          >
            Reiniciar
          </button>
          <button
            type="button"
            onClick={handleExitExercise}
            className="rounded-xl border border-orion-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
          >
            Salir
          </button>
        </div>

        {fullscreenStatus === "unavailable" && (
          <p className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-md bg-white/90 px-2 py-1 text-xs text-orion-navy-700 shadow-sm">
            Pantalla completa real no activa en este momento — el ejercicio sigue funcionando con normalidad.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-[#1a8f60]">ORION TOOLS</p>
        <h1 className="text-xl font-bold text-orion-navy-900">Oculomotricidad</h1>
      </div>

      {/* Controles de configuracion CONGELADOS mientras se reproduce o
          esta en pausa (evita el riesgo de cambiar patron/velocidad/etc.
          a mitad de una ejecucion en curso, que el motor de animacion no
          esta diseñado para reflejar en caliente - ver comentario de
          `saccadeTick`). DOS fieldsets separados (selector de modalidad +
          panel de configuracion), porque ya no son hermanos directos de
          un mismo grid "contents" (el selector vive FUERA, encima, de la
          rejilla de 2 columnas) - la vista previa (controles de
          reproduccion) queda fuera de AMBOS, siempre activa. */}
      <fieldset disabled={isRunning} className="contents">
        {/* Selector de modalidad HORIZONTAL superior (sustituye a la
            navegacion lateral del incremento anterior) - 2 pestañas
            iguales, centradas, ancho estable independiente del resto del
            layout. */}
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-1.5 rounded-xl border border-orion-navy-100 bg-white p-1.5">
          {(["pursuit", "saccades"] as OculomotorModality[]).map((modality) => (
            <ModalityTab
              key={modality}
              label={MODALITY_LABELS[modality]}
              active={config.modality === modality}
              onSelect={() => handleSelectModality(modality)}
            />
          ))}
        </div>
      </fieldset>

      {/* 2 columnas: configuracion (ancho flexible, usa TODO el espacio
          horizontal disponible) | vista previa (ancho ESTABLE, 20rem,
          igual en cualquier resolucion de escritorio). min-w-0 en la
          columna de configuracion por el mismo motivo documentado mas
          abajo en cada tarjeta: sin el, un grid item con
          `whitespace-nowrap` en sus botones puede forzar la rejilla
          entera a desbordar en vez de envolver. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <fieldset disabled={isRunning} className="contents">
          <div className="min-w-0 space-y-2.5">
            {/* Grupo 1: Patron de movimiento - ancho completo (el que mas
                varia en cantidad de opciones: 7 patrones en seguimiento). */}
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Patrón de movimiento</h2>
              <div className="flex flex-wrap gap-2">
                {config.modality === "pursuit"
                  ? (Object.keys(PURSUIT_PATTERN_LABELS) as PursuitPattern[]).map((pattern) => (
                      <button
                        key={pattern}
                        type="button"
                        onClick={() => setConfig((c) => ({ ...c, pursuit: { ...c.pursuit, pattern } }))}
                        className={toggleButtonClass(config.pursuit.pattern === pattern)}
                      >
                        {PURSUIT_PATTERN_LABELS[pattern]}
                      </button>
                    ))
                  : (Object.keys(SACCADE_PATTERN_LABELS) as SaccadePattern[]).map((pattern) => (
                      <button
                        key={pattern}
                        type="button"
                        onClick={() => setConfig((c) => ({ ...c, saccade: { ...c.saccade, pattern } }))}
                        className={toggleButtonClass(config.saccade.pattern === pattern)}
                      >
                        {SACCADE_PATTERN_LABELS[pattern]}
                      </button>
                    ))}
              </div>
            </div>

            {/* Grupos 2+3: Velocidad/Intervalo | Area de trabajo y amplitud -
                misma fila, aprovechan el ancho ahora disponible (ya no hay
                columna de navegacion lateral quitandole sitio). */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
                <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">
                  {config.modality === "pursuit" ? "Velocidad" : "Intervalo entre posiciones"}
                </h2>
                {config.modality === "pursuit" ? (
                  <TimingConfigFields
                    label="Velocidad"
                    showLabel={false}
                    config={config.pursuit.speed}
                    onChange={(speed) => setConfig((c) => ({ ...c, pursuit: { ...c.pursuit, speed } }))}
                    presetTable={PURSUIT_SPEED_PRESETS_MS}
                    adjustableMin={800}
                    adjustableMax={10000}
                    adjustableStep={200}
                    unitsHint="ms/ciclo"
                  />
                ) : (
                  <TimingConfigFields
                    label="Intervalo entre posiciones"
                    showLabel={false}
                    config={config.saccade.interval}
                    onChange={(interval) => setConfig((c) => ({ ...c, saccade: { ...c.saccade, interval } }))}
                    presetTable={SACCADE_INTERVAL_PRESETS_MS}
                    adjustableMin={200}
                    adjustableMax={4000}
                    adjustableStep={100}
                    unitsHint="ms"
                  />
                )}
              </div>

              <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
                <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Área de trabajo y amplitud</h2>
                {config.modality === "pursuit" ? (
                  <WorkAreaFields
                    config={config.pursuit.workArea}
                    onChange={(workArea) => setConfig((c) => ({ ...c, pursuit: { ...c.pursuit, workArea } }))}
                  />
                ) : (
                  <WorkAreaFields
                    config={config.saccade.workArea}
                    onChange={(workArea) => setConfig((c) => ({ ...c, saccade: { ...c.saccade, workArea } }))}
                  />
                )}
              </div>
            </div>

            {/* Grupos 4+5: Tipo de estimulo | Contenido seleccionable del
                estimulo - misma fila. El bloque de seleccion es el mas
                variable en altura de todo el panel (26 letras, 9 swatches
                de color...) - emparejarlo con "Tipo de estimulo" (6
                botones cortos) en vez de con "Duracion" (muy corta) evita
                que esa altura variable se SUME aparte como fila propia: al
                compartir fila, la altura de la fila es el MAXIMO de las 2
                tarjetas, no la suma. items-start para que "Tipo de
                estimulo" (normalmente mas corto) no se estire para igualar
                a su vecina - ocupa solo lo que necesita (pedido
                explicitamente). */}
            <div className="grid items-start gap-3 md:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
                <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Tipo de estímulo</h2>
                <StimulusTypeFields stimulus={config.stimulus} onChange={handleStimulusChange} />
              </div>

              <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
                <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">
                  {selectableNoun ? `Selección de ${selectableNoun.plural}` : "Color o carácter del estímulo"}
                </h2>
                <StimulusSelectionFields stimulus={config.stimulus} onChange={handleStimulusChange} />
              </div>
            </div>

            {/* Grupos 6+7: Tamaño | Duracion - ambas muy cortas, misma fila;
                items-start por el mismo motivo de arriba (ninguna de las 2
                debe estirarse para igualar a la otra). */}
            <div className="grid items-start gap-3 md:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
                <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Tamaño</h2>
                <StimulusSizeFields stimulus={config.stimulus} onChange={handleStimulusChange} />
              </div>

              <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
                <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Duración</h2>
                <div className="mb-2 flex flex-wrap gap-2">
                  {(["manual", "timed"] as DurationMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setConfig((c) => ({ ...c, duration: { ...c.duration, mode } }))}
                      className={toggleButtonClass(config.duration.mode === mode)}
                    >
                      {mode === "manual" ? "Manual (hasta detener)" : "Duración definida"}
                    </button>
                  ))}
                </div>
                {config.duration.mode === "timed" && (
                  <label className="flex items-center gap-3 text-sm text-orion-navy-700">
                    Duración
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={config.duration.timedMs}
                      onChange={(e) =>
                        setConfig((c) => ({ ...c, duration: { ...c.duration, timedMs: Math.max(1000, Number(e.target.value) || 1000) } }))
                      }
                      className="w-28 rounded-lg border border-orion-navy-200 px-2 py-1"
                    />
                    ms
                  </label>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Vista previa - ancho ESTABLE (20rem), controles de
              reproduccion y acceso a pantalla completa siempre
              accesibles, fuera del fieldset (nunca se deshabilitan). */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-orion-navy-100 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Vista previa</p>
              {/* aspect-[3/2] en vez de aspect-square (antes 320x320px, ahora
                  320x213px aprox): reduce la altura del area de movimiento
                  SIN tocar el tamaño del estimulo (STIMULUS_SIZE_PX, un
                  parametro clinico) ni el ancho de la columna - solo el
                  contenedor. applyPointToStage ya escala la posicion segun
                  el ancho/alto REAL del contenedor (stage.clientWidth/
                  clientHeight de forma independiente), asi que la relacion
                  entre el contenedor y el movimiento se conserva
                  automaticamente, sin ningun cambio en la logica de
                  posicionamiento. */}
              <div
                ref={stageRef}
                className={`relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-orion-navy-100 ${getStageBackgroundClass(config.stimulus.type)}`}
              >
                <div ref={stimulusRef} className="absolute" style={{ left: "calc(50% - 22px)", top: "calc(50% - 22px)" }}>
                  <StimulusVisual type={config.stimulus.type} displayElement={displayElement} size={config.stimulus.size} />
                </div>
              </div>

              {/* Jerarquia de botones (pedido explicitamente): 1) Iniciar en
                  pantalla completa - accion PRINCIPAL (la ejecucion
                  clinica real), solida y destacada. 2) Reproducir vista
                  previa - accion secundaria, texto explicito para que
                  nunca se confunda con "iniciar el ejercicio". 3)
                  Reiniciar - secundaria. Ningun boton generico
                  "Reproducir" suelto en ningun estado. */}
              <div className="flex w-full flex-wrap justify-center gap-2">
                {playback === "idle" || playback === "stopped" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleEnterFullscreen}
                      disabled={!canStart}
                      className="rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Iniciar en pantalla completa
                    </button>
                    <button
                      type="button"
                      onClick={handlePlay}
                      disabled={!canStart}
                      className="rounded-xl border border-orion-navy-200 px-5 py-2.5 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Reproducir vista previa
                    </button>
                  </>
                ) : playback === "playing" ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="rounded-xl border border-orion-navy-200 px-5 py-2.5 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50"
                  >
                    Pausar vista previa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="rounded-xl border border-orion-navy-200 px-5 py-2.5 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50"
                  >
                    Reanudar vista previa
                  </button>
                )}
                {isRunning && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="rounded-xl border border-orion-navy-200 px-5 py-2.5 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50"
                  >
                    Detener
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-orion-navy-200 px-5 py-2.5 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50"
                >
                  Reiniciar
                </button>
              </div>
              {!canStart && (playback === "idle" || playback === "stopped") && (
                <p className="text-center text-xs font-semibold text-red-600">
                  Selecciona al menos {selectableNoun ? `${selectableNoun.article} ${selectableNoun.singular}` : "una opción"} para
                  iniciar.
                </p>
              )}
              {playback === "stopped" && <p className="text-center text-xs text-orion-navy-400">Vista previa detenida.</p>}
            </div>
          </div>
        </div>
      </div>
  );
}
