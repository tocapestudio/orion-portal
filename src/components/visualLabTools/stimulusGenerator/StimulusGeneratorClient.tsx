"use client";

/**
 * Generador de estimulos (ORION Tools) - 5o incremento: rediseño de la
 * pantalla de configuracion a 3 columnas (navegacion de categorias |
 * configuracion de la categoria seleccionada + ajustes generales | vista
 * previa + acciones), sustituyendo la cuadricula de 4 tarjetas
 * simultaneas del incremento anterior. PURA reorganizacion visual: la
 * logica de sorteo/validacion (stimulusConfig.ts), el guardado de
 * actividad (createToolActivity), el guardado de configuracion
 * predeterminada (tool_presets), el modo demo y la ejecucion a pantalla
 * completa NO cambian de comportamiento, solo de disposicion en pantalla
 * - ver el comentario de cada seccion para el detalle de que se movio.
 *
 * El plegado/desplegado POR TARJETA del incremento anterior ya no tiene
 * sentido (solo se muestra una categoria a la vez, ver `selectedCategory`
 * mas abajo) y se retira de ESTE archivo - summarizeColorsCategory/
 * summarizeSymbolCategory siguen existiendo y probadas en
 * stimulusConfig.ts (no se borran, podrian reutilizarse en el futuro),
 * simplemente este componente ya no las llama.
 *
 * Persona principal HEREDADA de Visual Lab + participantes adicionales:
 * sin cambios de comportamiento (PrimaryAthleteIndicator.tsx,
 * ParticipantsManager.tsx, sin tocar) - solo cambian de posicion, ahora
 * en la columna derecha junto a la vista previa y las acciones
 * principales, en vez de en una franja propia encima de las columnas.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useVerifiedSelectedAthlete } from "@/lib/useVerifiedSelectedAthlete";
import PrimaryAthleteIndicator from "./PrimaryAthleteIndicator";
import ParticipantsManager, { type Participant } from "./ParticipantsManager";
import {
  createToolActivity,
  saveStimulusGeneratorDefaultConfig,
  getStimulusGeneratorDefaultConfig,
} from "@/app/(portal)/visual-lab/tools/actions";
import {
  DEFAULT_STIMULUS_CONFIG,
  STIMULUS_GENERATOR_STORAGE_KEY,
  resolveStimulusGeneratorConfig,
  canStartGenerator,
  pickRandomStimulus,
  computeNextPresentationStep,
  CATEGORY_IDS,
  BASE_COLOR_PALETTE,
  BASE_ELEMENTS,
  type StimulusGeneratorConfig,
  type ColorsCategoryConfig,
  type SymbolCategoryConfig,
  type CategoryId,
  type StimulusSize,
  type SymbolBackground,
  type SymbolColorMode,
  type ColorsDisplayMode,
  type TransitionMode,
  type GeneratedStimulus,
  type PresentationStep,
  type IntervalMode,
} from "./stimulusConfig";

type Stage = "config" | "running" | "finished";
type SaveState = "idle" | "saving" | "saved" | "error";
/**
 * 'pending': intento de fullscreen real en curso (acabamos de pedirlo,
 * la respuesta - exito o fallo - todavia no ha llegado). 'active': el
 * navegador confirmo la entrada en fullscreen real. 'unavailable': la
 * API no existe, el intento fallo de verdad, o el usuario salio del
 * fullscreen real (Escape) - en los 3 casos corresponde mostrar el
 * aviso, nunca mientras esta 'pending'.
 */
type FullscreenStatus = "pending" | "active" | "unavailable";

const CATEGORY_LABELS: Record<CategoryId, string> = {
  colors: "Colores",
  numbers: "Números",
  letters: "Letras",
  shapes: "Formas",
};

const SHAPE_LABELS: Record<string, string> = {
  circle: "Círculo",
  square: "Cuadrado",
  triangle: "Triángulo",
  star: "Estrella",
};

const SIZE_LABELS: Record<StimulusSize, string> = { sm: "Pequeño", md: "Mediano", lg: "Grande" };

/** Sin tarjeta decorativa + escala comun por geometria (sin cambios
 * respecto al incremento anterior): el FONDO configurado cubre toda la
 * superficie disponible (pantalla completa en ejecucion, panel de vista
 * previa en configuracion) y el simbolo se pinta encima, centrado.
 * `vmin` en ejecucion para no depender de una caja fija y no recortarse
 * en ninguna proporcion de pantalla; la forma usa un `vmin` algo mayor
 * que el texto para una presencia visual comparable (una forma rellena
 * ocupa mas su caja que una letra dentro de su propio em-box). */
const RUNNING_TEXT_CLASS: Record<StimulusSize, string> = { sm: "text-[18vmin]", md: "text-[30vmin]", lg: "text-[45vmin]" };
const RUNNING_SHAPE_CLASS: Record<StimulusSize, string> = {
  sm: "h-[24vmin] w-[24vmin]",
  md: "h-[38vmin] w-[38vmin]",
  lg: "h-[55vmin] w-[55vmin]",
};

/** Vista previa: panel pequeño y fijo (no el viewport completo) - usa
 * unidades fijas, no `vmin`. */
const PREVIEW_PANEL_CLASS = "h-48 w-48";
const PREVIEW_TEXT_CLASS: Record<StimulusSize, string> = { sm: "text-5xl", md: "text-6xl", lg: "text-7xl" };
const PREVIEW_SHAPE_CLASS: Record<StimulusSize, string> = { sm: "h-14 w-14", md: "h-20 w-20", lg: "h-28 w-28" };

/** Chip flotante siempre legible sobre el fondo DINAMICO de la pantalla
 * de ejecucion (blanco/negro/el color del estimulo). */
const FLOATING_LABEL_CLASS = "rounded-md bg-white/90 px-2 py-1 text-xs text-orion-navy-700 shadow-sm";

function toggleArrayItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function loadStoredConfig(): StimulusGeneratorConfig {
  if (typeof window === "undefined") return DEFAULT_STIMULUS_CONFIG;
  try {
    const raw = window.localStorage.getItem(STIMULUS_GENERATOR_STORAGE_KEY);
    if (!raw) return DEFAULT_STIMULUS_CONFIG;
    const parsed = JSON.parse(raw);
    return resolveStimulusGeneratorConfig(parsed) ?? DEFAULT_STIMULUS_CONFIG;
  } catch {
    return DEFAULT_STIMULUS_CONFIG;
  }
}

const toggleButtonClass = (active: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-semibold ${
    active ? "border-orion-navy-900 bg-orion-navy-900 text-white" : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
  }`;

/** 7o incremento: el borde ya NO es la UNICA señal de seleccion (pedido
 * explicitamente - un cambio sutil de color de borde es dificil de
 * percibir sobre ciertos tonos, especialmente los claros como el nuevo
 * amarillo limon). Un color seleccionado ahora tiene: borde grueso +
 * anillo exterior (ring, mismo tono, doble señal de contorno) + la
 * insignia `SelectedCheckBadge` (ver abajo) - esta ultima es la señal
 * realmente independiente del color de fondo, porque su propio fondo es
 * SIEMPRE el mismo (navy oscuro + anillo blanco), nunca el del swatch
 * que marca. */
const colorSwatchClass = (active: boolean) =>
  `h-7 w-7 shrink-0 rounded-full border-2 ${
    active ? "border-orion-navy-900 ring-2 ring-orion-navy-900 ring-offset-2" : "border-orion-navy-200"
  }`;

/** Insignia de "seleccionado" - fondo FIJO (nunca el color del swatch
 * que marca), para seguir siendo legible sobre cualquier tono, incluidos
 * blanco y amarillo claro. */
function SelectedCheckBadge() {
  return (
    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orion-navy-900 ring-2 ring-white">
      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/**
 * Fila de navegacion (columna izquierda) - un `<div role="button">` en
 * vez de un `<button>` real: un `<input>` dentro de un `<button>` es
 * marcado invalido (contenido interactivo anidado), asi que la casilla
 * de activar/desactivar va como HERMANO, no dentro, con su propio
 * `stopPropagation` en el click para que marcarla/desmarcarla NUNCA
 * cambie tambien la categoria seleccionada (son dos acciones
 * independientes, ver seccion 1-2 del diseño aprobado).
 */
function CategoryNavItem({
  label,
  enabled,
  onToggleEnabled,
  active,
  onSelect,
}: {
  label: string;
  enabled: boolean;
  onToggleEnabled: (checked: boolean) => void;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex w-auto shrink-0 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition lg:w-full ${
        active ? "bg-orion-navy-900 text-white" : "text-orion-navy-700 hover:bg-orion-navy-50"
      }`}
    >
      <span className="truncate">{label}</span>
      <input
        type="checkbox"
        checked={enabled}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onToggleEnabled(e.target.checked)}
        aria-label={`Activar ${label} en la secuencia`}
        className={`h-4 w-4 shrink-0 cursor-pointer ${active ? "accent-white" : "accent-orion-navy-900"}`}
      />
    </div>
  );
}

/**
 * Lista editable de colores (categoria "colors": sus `elements`; una
 * categoria de simbolo en modo 'palette': su `palette`).
 *
 * 8o incremento (paleta simplificada): la fila principal muestra los 9
 * presets de BASE_COLOR_PALETTE SIEMPRE en el mismo sitio, como botones
 * de activar/desactivar (circulo pequeño = no seleccionado, circulo con
 * anillo + insignia = seleccionado) - ya NO se divide en "ya añadidos"
 * (que desaparecian de la fila de presets al añadirlos) vs "disponibles
 * para añadir" del incremento anterior: con solo 9 colores fijos, una
 * fila ESTABLE que nunca reordena ni hace desaparecer presets es mas
 * clara. Cualquier color PERSONALIZADO ya guardado (que no sea uno de
 * los 9 presets - p.ej. de una configuracion antigua) se muestra aparte,
 * con su propia etiqueta, para no mezclarse con la fila de presets. El
 * selector de color libre vive en su PROPIA fila, separada por un borde
 * y una etiqueta ("Color personalizado") - nunca parece un color mas de
 * la paleta (pedido explicitamente). Añade directamente al elegir (sin
 * boton "Añadir color" - ver el comentario de StimulusGeneratorClient
 * mas arriba sobre por que el boton anterior podia añadir negro sin que
 * nadie lo hubiera elegido).
 */
function ColorListEditor({
  colors,
  onChange,
  presets,
}: {
  colors: string[];
  onChange: (next: string[]) => void;
  presets: readonly string[];
}) {
  const [draft, setDraft] = useState("#000000");
  const customColors = colors.filter((c) => !presets.includes(c));

  const toggleColor = (hex: string) => onChange(colors.includes(hex) ? colors.filter((c) => c !== hex) : [...colors, hex]);
  const removeColor = (hex: string) => onChange(colors.filter((c) => c !== hex));
  const addCustomColor = (hex: string) => {
    const normalized = hex.toLowerCase();
    setDraft(normalized);
    if (colors.includes(normalized)) return;
    onChange([...colors, normalized]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((hex) => {
          const selected = colors.includes(hex);
          return (
            <button
              key={hex}
              type="button"
              onClick={() => toggleColor(hex)}
              title={hex}
              aria-label={hex}
              aria-pressed={selected}
              className={`relative ${colorSwatchClass(selected)}`}
              style={{ backgroundColor: hex }}
            >
              {selected && <SelectedCheckBadge />}
            </button>
          );
        })}
      </div>

      {customColors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-orion-navy-400">Personalizados:</span>
          {customColors.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => removeColor(hex)}
              title={`Quitar ${hex}`}
              aria-label={`Quitar ${hex} (seleccionado)`}
              className={`group relative ${colorSwatchClass(true)}`}
              style={{ backgroundColor: hex }}
            >
              <span className="absolute inset-0 hidden items-center justify-center rounded-full bg-black/45 text-xs font-bold text-white group-hover:flex">
                ×
              </span>
              <SelectedCheckBadge />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-orion-navy-100 pt-2">
        <span className="shrink-0 text-xs text-orion-navy-400">Color personalizado:</span>
        <input
          type="color"
          value={draft}
          onChange={(e) => addCustomColor(e.target.value)}
          aria-label="Elegir y añadir un color personalizado"
          title="Elegir y añadir un color personalizado"
          className="h-7 w-9 shrink-0 cursor-pointer rounded border border-orion-navy-200 p-0"
        />
      </div>
    </div>
  );
}

/** Un unico color (modo 'fixed'). Mismo criterio de diseño que
 * ColorListEditor: fila ESTABLE de los 9 presets (toggle de seleccion
 * unica, el pulsado pasa a ser el nuevo color) + el selector libre en su
 * propia fila separada, con anillo propio si el color actual es
 * personalizado (no coincide con ningun preset) para seguir señalando
 * claramente cual es la seleccion vigente en ese caso tambien. */
function SingleColorPicker({
  color,
  onChange,
  presets,
}: {
  color: string;
  onChange: (next: string) => void;
  presets: readonly string[];
}) {
  const normalized = color.toLowerCase();
  const isCustom = !presets.includes(normalized);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((hex) => {
          const selected = normalized === hex;
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              className={`relative ${colorSwatchClass(selected)}`}
              style={{ backgroundColor: hex }}
              aria-pressed={selected}
              aria-label={hex}
              title={hex}
            >
              {selected && <SelectedCheckBadge />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-orion-navy-100 pt-2">
        <span className="shrink-0 text-xs text-orion-navy-400">Color personalizado:</span>
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Color personalizado"
          title="Color personalizado"
          className={`h-7 w-9 shrink-0 cursor-pointer rounded border p-0 ${isCustom ? "border-orion-navy-900 ring-2 ring-orion-navy-900 ring-offset-2" : "border-orion-navy-200"}`}
        />
      </div>
    </div>
  );
}

/**
 * Campos de la categoria "colors" - ya SIN su propia casilla de
 * activar/desactivar (eso vive ahora en CategoryNavItem, columna
 * izquierda, visible aunque esta categoria no este seleccionada) ni
 * plegado propio (solo se muestra una categoria a la vez, ver
 * `selectedCategory`). "Colores" no tiene fondo/color de simbolo propio
 * (su contenido YA ES el color, ver stimulusConfig.ts) - por eso su
 * panel es mas simple que el de numeros/letras/formas, no porque falte
 * nada.
 */
/** 6o incremento: selector de presentacion (Pantalla completa/Cuadrado)
 * + fondo exterior, este ultimo SOLO visible en modo 'square' (en
 * 'fullscreen' no hay fondo exterior que configurar - mostrarlo igualmente
 * seria un control sin efecto, justo el "ruido" que se pidio evitar). */
function ColorsCategoryFields({
  config,
  onChange,
}: {
  config: ColorsCategoryConfig;
  onChange: (next: ColorsCategoryConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs text-orion-navy-500">Presentación</p>
        <div className="flex gap-2">
          {(["fullscreen", "square"] as ColorsDisplayMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...config, displayMode: mode })}
              className={toggleButtonClass(config.displayMode === mode)}
            >
              {mode === "fullscreen" ? "Pantalla completa" : "Cuadrado"}
            </button>
          ))}
        </div>
      </div>
      {config.displayMode === "square" && (
        <div>
          <p className="mb-1.5 text-xs text-orion-navy-500">Fondo</p>
          <div className="flex gap-2">
            {(["white", "black"] as SymbolBackground[]).map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => onChange({ ...config, background: bg })}
                className={toggleButtonClass(config.background === bg)}
              >
                {bg === "white" ? "Blanco" : "Negro"}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="mb-1.5 text-xs text-orion-navy-500">
          Colores disponibles — el estímulo de esta categoría ES directamente el color.
        </p>
        <ColorListEditor colors={config.elements} onChange={(elements) => onChange({ ...config, elements })} presets={BASE_COLOR_PALETTE} />
      </div>
    </div>
  );
}

/** Campos de numeros/letras/formas - misma logica que el incremento
 * anterior, sin la casilla de activar (ver ColorsCategoryFields). */
function SymbolCategoryFields({
  id,
  config,
  onChange,
}: {
  id: Exclude<CategoryId, "colors">;
  config: SymbolCategoryConfig;
  onChange: (next: SymbolCategoryConfig) => void;
}) {
  const baseElements = BASE_ELEMENTS[id];
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs text-orion-navy-500">Elementos disponibles</p>
          {/* 6o incremento (abecedario completo, 26 letras): "seleccionar
              todas y desmarcar despues las que no se quieran" pedido
              explicitamente para Letras - generico para las 3 categorias
              de simbolo porque comparten este mismo componente, sin coste
              adicional. Solo AÑADE una comodidad, no cambia ningun
              comportamiento existente. */}
          <div className="flex shrink-0 gap-2 text-xs font-medium">
            <button type="button" onClick={() => onChange({ ...config, elements: [...baseElements] })} className="text-orion-accent hover:underline">
              Todas
            </button>
            <button type="button" onClick={() => onChange({ ...config, elements: [] })} className="text-orion-navy-400 hover:underline">
              Ninguna
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {baseElements.map((el) => {
            const active = config.elements.includes(el);
            return (
              <button
                key={el}
                type="button"
                onClick={() => onChange({ ...config, elements: toggleArrayItem(config.elements, el) })}
                className={toggleButtonClass(active)}
              >
                {id === "shapes" ? SHAPE_LABELS[el] ?? el : el}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-orion-navy-500">Fondo</p>
        <div className="flex gap-2">
          {(["white", "black"] as SymbolBackground[]).map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => onChange({ ...config, background: bg })}
              className={toggleButtonClass(config.background === bg)}
            >
              {bg === "white" ? "Blanco" : "Negro"}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs text-orion-navy-500">Color del símbolo</p>
        <div className="mb-2 flex gap-2">
          {(["fixed", "palette"] as SymbolColorMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ ...config, colorMode: mode })}
              className={toggleButtonClass(config.colorMode === mode)}
            >
              {mode === "fixed" ? "Fijo" : "Paleta aleatoria"}
            </button>
          ))}
        </div>
        {config.colorMode === "fixed" ? (
          <SingleColorPicker color={config.color} onChange={(color) => onChange({ ...config, color })} presets={BASE_COLOR_PALETTE} />
        ) : (
          <ColorListEditor colors={config.palette} onChange={(palette) => onChange({ ...config, palette })} presets={BASE_COLOR_PALETTE} />
        )}
      </div>
    </div>
  );
}

function ShapeGlyph({ shape, color, className }: { shape: string; color: string; className?: string }) {
  if (shape === "circle") return <div className={`rounded-full ${className}`} style={{ backgroundColor: color }} />;
  if (shape === "square") return <div className={className} style={{ backgroundColor: color }} />;
  if (shape === "star") {
    return (
      <svg viewBox="0 0 24 24" fill={color} className={className}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  // triangle
  return (
    <svg viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M12 3l9 18H3L12 3z" />
    </svg>
  );
}

/** Pinta el estimulo SIN tarjeta decorativa - sin cambios respecto al
 * incremento anterior (ver ese comentario original): `fillClassName`
 * lleva el fondo y centra; `textClassName`/`shapeClassName` llegan
 * resueltos por tamaño y contexto. */
/**
 * 7o incremento: `stimulus` admite `null` para la fase vacia de la
 * transicion "Pantalla vacía" (ver computeNextPresentationStep en
 * stimulusConfig.ts) - en ese caso se pinta SOLO `blankBackground`, sin
 * ningun color/letra/numero/forma encima. La vista previa nunca pasa
 * `stimulus=null` con esta intencion (su propio guard en el caller ya
 * evita llamar a este componente sin un estimulo, ver mas abajo), asi
 * que `blankBackground` solo es relevante en la pantalla de ejecucion.
 */
function StimulusDisplay({
  stimulus,
  blankBackground,
  fillClassName,
  textClassName,
  shapeClassName,
}: {
  stimulus: GeneratedStimulus | null;
  blankBackground?: SymbolBackground;
  fillClassName: string;
  textClassName: string;
  shapeClassName: string;
}) {
  if (!stimulus) {
    const bgClass = blankBackground === "black" ? "bg-orion-navy-950" : "bg-white";
    return <div className={`${bgClass} ${fillClassName}`} />;
  }
  if (stimulus.category === "colors") {
    if (stimulus.colorsDisplayMode === "square") {
      // 6o incremento: fondo exterior configurado (blanco/negro) llenando
      // TODO el area disponible, con un cuadrado centrado encima a la
      // MISMA escala que las formas (reutiliza `shapeClassName` tal
      // cual, sin un 3er mapa de tamaños - "coherente con los tamaños de
      // letras, numeros y figuras" pedido explicitamente).
      const squareBgClass = stimulus.background === "black" ? "bg-orion-navy-950" : "bg-white";
      return (
        <div className={`flex items-center justify-center ${squareBgClass} ${fillClassName}`}>
          <div className={`rounded-2xl shadow-inner ${shapeClassName}`} style={{ backgroundColor: stimulus.value }} />
        </div>
      );
    }
    // 'fullscreen' - comportamiento historico, sin cambios: el color
    // ocupa TODA la superficie, sin fondo exterior independiente.
    return <div className={`flex items-center justify-center ${fillClassName}`} style={{ backgroundColor: stimulus.value }} />;
  }
  const bgClass = stimulus.background === "black" ? "bg-orion-navy-950" : "bg-white";
  if (stimulus.category === "numbers" || stimulus.category === "letters") {
    return (
      <div
        className={`flex items-center justify-center font-bold leading-none ${bgClass} ${fillClassName} ${textClassName}`}
        style={{ color: stimulus.renderColor }}
      >
        {stimulus.value}
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center ${bgClass} ${fillClassName}`}>
      <ShapeGlyph shape={stimulus.value} color={stimulus.renderColor} className={shapeClassName} />
    </div>
  );
}

export default function StimulusGeneratorClient() {
  const { verified } = useVerifiedSelectedAthlete();
  const [stage, setStage] = useState<Stage>("config");
  const [config, setConfig] = useState<StimulusGeneratorConfig>(DEFAULT_STIMULUS_CONFIG);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("colors");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [previewStimulus, setPreviewStimulus] = useState<GeneratedStimulus | null>(null);
  const [currentStep, setCurrentStep] = useState<PresentationStep | null>(null);
  const [fullscreenStatus, setFullscreenStatus] = useState<FullscreenStatus>("pending");
  const [groupObservation, setGroupObservation] = useState("");
  const [individualObservations, setIndividualObservations] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [presetSaveState, setPresetSaveState] = useState<SaveState>("idle");
  const [presetSaveError, setPresetSaveError] = useState<string | null>(null);
  /** 8o incremento: ver el efecto que consulta getStimulusGeneratorDefaultConfig
   * mas abajo - explica por que existe este estado. */
  const [presetLoadState, setPresetLoadState] = useState<"loading" | "loaded">("loading");

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const stopRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga inicial SINCRONA (localStorage o DEFAULT_STIMULUS_CONFIG), y
  // la configuracion predeterminada real (core.tool_presets, ver
  // tools/actions.ts) por encima si existe y es valida - SIN CAMBIOS
  // respecto al incremento anterior (ver ese comentario original para el
  // razonamiento completo de compatibilidad).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(loadStoredConfig());
  }, []);

  // 8o incremento: auditoria completa de las rutas de inicializacion (ver
  // informe) - ningun `setConfig` muta DEFAULT_STIMULUS_CONFIG, y la
  // precedencia (predeterminada de BD > localStorage > default) ya era
  // correcta. Confirmado por lectura directa de core.tool_presets: el
  // predeterminado YA guardado tiene colors=activa/resto=inactiva
  // (correcto) - no es la causa de "4 activas".
  //
  // La UNICA brecha real que queda, estructuralmente posible, es un
  // destello visual: el efecto de arriba (localStorage, SINCRONO) pinta
  // su valor ANTES de que la consulta a la BD (ASINCRONA) resuelva -
  // durante esa ventana breve, si localStorage tuviera un valor antiguo
  // de antes de que existiera el guardado explicito (cuando CADA cambio
  // se autoguardaba), la pantalla de configuracion podria mostrar
  // brevemente ESE valor antiguo antes de que la BD lo corrija. Se cierra
  // esa ventana sin cambiar NINGUN valor por defecto: la etapa 'config'
  // no se pinta hasta que esta consulta termine (ver el guard mas abajo,
  // antes del `return` de la etapa 'config') - localStorage sigue
  // siendo la carga sincrona INICIAL (para no depender solo de la red),
  // pero ya no es lo ULTIMO que el usuario puede llegar a ver antes de
  // que la fuente predeterminada real la sustituya si corresponde.
  useEffect(() => {
    let cancelled = false;
    getStimulusGeneratorDefaultConfig()
      .then(({ config: dbConfig }) => {
        if (cancelled) return;
        if (dbConfig) {
          const resolved = resolveStimulusGeneratorConfig(dbConfig);
          if (resolved) setConfig(resolved);
        }
      })
      .finally(() => {
        if (!cancelled) setPresetLoadState("loaded");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Vista previa: sin cambios de logica respecto al incremento anterior.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewStimulus(pickRandomStimulus(config));
  }, [config]);

  // Fullscreen real: sin cambios de logica respecto al incremento
  // anterior (ver ese comentario original para el detalle completo).
  useEffect(() => {
    const handleChange = () => setFullscreenStatus(document.fullscreenElement ? "active" : "unavailable");
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (stage !== "running") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullscreenStatus("pending");
    const el = stageContainerRef.current;
    if (!el || typeof el.requestFullscreen !== "function") {
      setFullscreenStatus("unavailable");
      return;
    }
    el.requestFullscreen().catch(() => setFullscreenStatus("unavailable"));
  }, [stage]);

  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // 7o incremento: el bucle ya NO llama a pickRandomStimulus/
  // computeNextIntervalMs por separado - ambos viven dentro de
  // computeNextPresentationStep (stimulusConfig.ts, logica pura y
  // testeada), que decide el SIGUIENTE paso (estimulo o vacio, y su
  // duracion) a partir del paso ANTERIOR. `tick` encadena cada paso al
  // siguiente pasandolo como argumento (en vez de leerlo de un estado
  // externo) - mismo guardado `stopRef` de siempre para poder cortar la
  // cadena desde handleStop sin dejar un setTimeout huerfano.
  const runLoop = useCallback((cfg: StimulusGeneratorConfig) => {
    stopRef.current = false;
    const tick = (previous: PresentationStep | null) => {
      if (stopRef.current) return;
      const next = computeNextPresentationStep(cfg, previous, Math.random);
      if (!next) {
        stopRef.current = true;
        return;
      }
      setCurrentStep(next);
      timeoutRef.current = setTimeout(() => tick(next), next.durationMs);
    };
    tick(null);
  }, []);

  // Modo demo: sin cambios de comportamiento respecto al incremento
  // anterior - iniciar no exige una persona seleccionada, solo que haya
  // al menos una categoria activa con algun elemento.
  const canStart = canStartGenerator(config);
  const isDemoMode = !verified;

  const handleStart = useCallback(() => {
    setStage("running");
    runLoop(config);
  }, [config, runLoop]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setFullscreenStatus("pending");
    setCurrentStep(null);
    setGroupObservation("");
    setIndividualObservations({});
    setSaveState("idle");
    setSaveError(null);
    setStage("finished");
  }, []);

  const handleExitWithoutSaving = useCallback(() => {
    setStage("config");
  }, []);

  const handleSave = useCallback(async () => {
    if (!verified) {
      setSaveState("error");
      setSaveError("No hay ninguna persona seleccionada.");
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    const mode = participants.length > 0 ? "shared" : "individual";
    const allParticipants = [
      { athleteId: verified.athleteId, individualObservation: individualObservations[verified.athleteId] ?? null },
      ...participants.map((p) => ({ athleteId: p.id, individualObservation: individualObservations[p.id] ?? null })),
    ];
    const result = await createToolActivity("stimulus_generator", mode, { ...config }, groupObservation, allParticipants);
    if (result.error) {
      setSaveState("error");
      setSaveError(result.error);
      return;
    }
    setSaveState("saved");
  }, [config, groupObservation, individualObservations, participants, verified]);

  const handleSavePreset = useCallback(async () => {
    setPresetSaveState("saving");
    setPresetSaveError(null);
    const result = await saveStimulusGeneratorDefaultConfig({ ...config });
    if (result.error) {
      setPresetSaveState("error");
      setPresetSaveError(result.error);
      return;
    }
    setPresetSaveState("saved");
    setTimeout(() => setPresetSaveState("idle"), 2000);
  }, [config]);

  if (stage === "finished") {
    if (!verified) {
      return (
        <div className="mx-auto max-w-xl space-y-5 text-center">
          <h1 className="text-lg font-semibold text-orion-navy-900">Generador de estímulos — demostración</h1>
          <p className="text-sm text-orion-navy-500">
            Esta fue una ejecución de demostración, sin ninguna persona seleccionada — no se ha guardado ninguna actividad ni
            observación.
          </p>
          <button
            type="button"
            onClick={handleExitWithoutSaving}
            className="rounded-xl bg-orion-navy-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900"
          >
            Nueva configuración
          </button>
        </div>
      );
    }

    const allParticipants = [{ id: verified.athleteId, label: verified.fullName }, ...participants];
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-lg font-semibold text-orion-navy-900">Generador de estímulos — resultado</h1>

        {saveState === "saved" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Observaciones guardadas correctamente.
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-orion-navy-700">
              Observación general (opcional)
              <textarea
                value={groupObservation}
                onChange={(e) => setGroupObservation(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-orion-navy-100 bg-white px-3 py-2 text-sm text-orion-navy-900 focus:border-orion-accent focus:outline-none"
                placeholder="Notas generales de la actividad…"
              />
            </label>

            <div className="space-y-3">
              {allParticipants.map((p) => (
                <label key={p.id} className="block text-sm font-medium text-orion-navy-700">
                  Observación de {p.label} (opcional)
                  <textarea
                    value={individualObservations[p.id] ?? ""}
                    onChange={(e) => setIndividualObservations((m) => ({ ...m, [p.id]: e.target.value }))}
                    rows={2}
                    className="mt-1.5 w-full rounded-xl border border-orion-navy-100 bg-white px-3 py-2 text-sm text-orion-navy-900 focus:border-orion-accent focus:outline-none"
                  />
                </label>
              ))}
            </div>

            {saveState === "error" && saveError && <p className="text-sm text-red-600">{saveError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="rounded-xl bg-orion-navy-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900 disabled:opacity-50"
              >
                {saveState === "saving" ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={handleExitWithoutSaving}
                className="rounded-xl border border-orion-navy-200 px-4 py-2.5 text-sm font-medium text-orion-navy-700 hover:bg-orion-navy-50"
              >
                Salir sin guardar
              </button>
            </div>
          </>
        )}

        {saveState === "saved" && (
          <button
            type="button"
            onClick={handleExitWithoutSaving}
            className="rounded-xl border border-orion-navy-200 px-4 py-2.5 text-sm font-medium text-orion-navy-700 hover:bg-orion-navy-50"
          >
            Nueva configuración
          </button>
        )}
      </div>
    );
  }

  if (stage === "running") {
    return (
      <div ref={stageContainerRef} className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className={FLOATING_LABEL_CLASS + " absolute left-4 top-4"}>
          {isDemoMode ? (
            "Modo demo"
          ) : (
            <>
              {verified.fullName} · ORION ID #{verified.shortId}
              {participants.length > 0 && ` + ${participants.length} más`}
            </>
          )}
        </div>
        {currentStep && (
          <StimulusDisplay
            stimulus={currentStep.stimulus}
            blankBackground={currentStep.background}
            fillClassName="h-full w-full"
            textClassName={RUNNING_TEXT_CLASS[config.size]}
            shapeClassName={RUNNING_SHAPE_CLASS[config.size]}
          />
        )}
        <button
          type="button"
          onClick={handleStop}
          className="absolute bottom-6 right-6 rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-orion-navy-900"
        >
          Detener
        </button>
        {fullscreenStatus === "unavailable" && (
          <p className={FLOATING_LABEL_CLASS + " absolute bottom-6 left-6"}>
            Pantalla completa real no activa en este momento — la secuencia sigue funcionando con normalidad.
          </p>
        )}
      </div>
    );
  }

  // stage === 'config'. Antes de pintar nada: esperar a que se resuelva
  // la consulta de la configuracion predeterminada (ver el efecto de
  // arriba) - evita el destello descrito ahi. Deliberadamente un mensaje
  // minimo, sin ningun esqueleto de las 3 columnas (no hay nada fiable
  // que mostrar todavia).
  if (presetLoadState === "loading") {
    return <div className="py-16 text-center text-sm text-orion-navy-400">Cargando configuración…</div>;
  }

  // 3 columnas: navegacion | configuracion de la categoria seleccionada +
  // ajustes generales | vista previa + acciones. `lg:items-start` en el
  // grid: cada columna crece segun SU PROPIO contenido sin estirar a las
  // demas - cambiar de categoria (columna central) nunca desplaza
  // verticalmente la columna derecha, que ademas queda `sticky` para
  // seguir visible al hacer scroll si el contenido central es mas alto
  // que la pantalla.
  const selectedCategoryConfig = config.categories[selectedCategory];
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-orion-accent">ORION TOOLS</p>
        <h1 className="text-xl font-bold text-orion-navy-900">Generador de estímulos</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[11rem_1fr_19rem] lg:items-start">
        {/* Columna izquierda: navegacion de categorias - horizontal en
            movil (scroll si no cabe), vertical en escritorio. Activar/
            desactivar es independiente de seleccionar (ver
            CategoryNavItem): nunca cambia `config` al cambiar de
            categoria seleccionada. */}
        <div className="flex gap-2 overflow-x-auto rounded-xl border border-orion-navy-100 bg-white p-2 lg:sticky lg:top-4 lg:flex-col lg:gap-1 lg:self-start lg:overflow-visible">
          {CATEGORY_IDS.map((id) => (
            <CategoryNavItem
              key={id}
              label={CATEGORY_LABELS[id]}
              enabled={config.categories[id].enabled}
              onToggleEnabled={(enabled) =>
                setConfig((prev) => ({ ...prev, categories: { ...prev.categories, [id]: { ...prev.categories[id], enabled } } }))
              }
              active={selectedCategory === id}
              onSelect={() => setSelectedCategory(id)}
            />
          ))}
        </div>

        {/* Columna central: SOLO la configuracion de la categoria
            seleccionada, mas los ajustes generales (tamaño/intervalo),
            compartidos por las 4 y SIEMPRE visibles debajo - nunca
            dentro del panel de una categoria concreta. */}
        <div className="space-y-4">
          <div className="rounded-xl border border-orion-navy-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-orion-navy-900">{CATEGORY_LABELS[selectedCategory]}</h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  selectedCategoryConfig.enabled ? "bg-orion-accent/10 text-[#1a8f60]" : "bg-orion-navy-50 text-orion-navy-400"
                }`}
              >
                {selectedCategoryConfig.enabled ? "Activa" : "Inactiva"}
              </span>
            </div>
            {selectedCategory === "colors" ? (
              <ColorsCategoryFields
                config={config.categories.colors}
                onChange={(c) => setConfig((prev) => ({ ...prev, categories: { ...prev.categories, colors: c } }))}
              />
            ) : (
              <SymbolCategoryFields
                id={selectedCategory}
                config={config.categories[selectedCategory]}
                onChange={(c) => setConfig((prev) => ({ ...prev, categories: { ...prev.categories, [selectedCategory]: c } }))}
              />
            )}
          </div>

          <div className="rounded-xl border border-orion-navy-100 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Tamaño del estímulo</p>
            <div className="mb-4 flex gap-2">
              {(["sm", "md", "lg"] as StimulusSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, size }))}
                  className={toggleButtonClass(config.size === size)}
                >
                  {SIZE_LABELS[size]}
                </button>
              ))}
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Intervalo entre estímulos</p>
            <div className="mb-2 flex gap-2">
              {(["fixed", "random"] as IntervalMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, intervalMode: mode }))}
                  className={toggleButtonClass(config.intervalMode === mode)}
                >
                  {mode === "fixed" ? "Fijo" : "Aleatorio"}
                </button>
              ))}
            </div>
            {config.intervalMode === "fixed" ? (
              <label className="flex items-center gap-3 text-sm text-orion-navy-700">
                Duración
                <input
                  type="number"
                  min={200}
                  step={100}
                  value={config.intervalMs}
                  onChange={(e) => setConfig((c) => ({ ...c, intervalMs: Math.max(200, parseInt(e.target.value) || 200) }))}
                  className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
                />
                ms
              </label>
            ) : (
              <div className="flex flex-wrap items-center gap-4 text-sm text-orion-navy-700">
                <label className="flex items-center gap-2">
                  Mínimo
                  <input
                    type="number"
                    min={200}
                    step={100}
                    value={config.intervalMinMs}
                    onChange={(e) => setConfig((c) => ({ ...c, intervalMinMs: Math.max(200, parseInt(e.target.value) || 200) }))}
                    className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
                  />
                  ms
                </label>
                <label className="flex items-center gap-2">
                  Máximo
                  <input
                    type="number"
                    min={200}
                    step={100}
                    value={config.intervalMaxMs}
                    onChange={(e) => setConfig((c) => ({ ...c, intervalMaxMs: Math.max(200, parseInt(e.target.value) || 200) }))}
                    className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
                  />
                  ms
                </label>
              </div>
            )}

            {/* 7o incremento: ajuste GLOBAL, no por categoria - vive aqui
                junto a Tamaño/Intervalo (no dentro del panel de ninguna
                categoria concreta), por eso mismo motivo. */}
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
              Transición entre estímulos
            </p>
            <div className="flex gap-2">
              {(["continuous", "blank"] as TransitionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, transitionMode: mode }))}
                  className={toggleButtonClass(config.transitionMode === mode)}
                >
                  {mode === "continuous" ? "Continuo" : "Pantalla vacía"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columna derecha: vista previa estable + acciones principales,
            en el orden pedido (Iniciar, Guardar como predeterminada,
            persona/modo demo, añadir participantes). `sticky` para que
            siga visible si la columna central crece mas que la
            pantalla. */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-orion-navy-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Vista previa</p>
            {previewStimulus ? (
              <StimulusDisplay
                stimulus={previewStimulus}
                fillClassName={`${PREVIEW_PANEL_CLASS} rounded-xl shadow-inner`}
                textClassName={PREVIEW_TEXT_CLASS[config.size]}
                shapeClassName={PREVIEW_SHAPE_CLASS[config.size]}
              />
            ) : (
              <p className="py-6 text-center text-xs text-orion-navy-400">
                Activa al menos una categoría con algún elemento seleccionado para ver una vista previa.
              </p>
            )}

            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="w-full rounded-xl bg-orion-navy-950 px-6 py-3 text-base font-semibold text-white hover:bg-orion-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Iniciar
            </button>
            {!canStart && (
              <p className="text-center text-xs text-orion-navy-400">Activa al menos una categoría con algún elemento seleccionado.</p>
            )}
            {canStart && isDemoMode && (
              <p className="text-center text-xs text-orion-navy-400">
                Sin persona seleccionada — se iniciará en modo demo (no se guardará ninguna actividad).
              </p>
            )}

            <div className="w-full border-t border-orion-navy-100 pt-3">
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={presetSaveState === "saving"}
                className="w-full rounded-lg border border-orion-navy-200 px-4 py-2 text-xs font-semibold text-orion-navy-700 hover:border-orion-navy-400 disabled:opacity-50"
              >
                {presetSaveState === "saving" ? "Guardando…" : presetSaveState === "saved" ? "Guardada ✓" : "Guardar como predeterminada"}
              </button>
              {presetSaveState === "error" && presetSaveError && (
                <p className="mt-1.5 text-center text-xs text-red-600">{presetSaveError}</p>
              )}
            </div>

            <div className="w-full border-t border-orion-navy-100 pt-3">
              <PrimaryAthleteIndicator
                actions={
                  verified ? (
                    <ParticipantsManager primaryAthleteId={verified.athleteId} participants={participants} onChange={setParticipants} />
                  ) : undefined
                }
              />
              {verified && participants.length > 0 && (
                <p className="mt-2 text-center text-xs text-orion-navy-500">Modo compartido — {1 + participants.length} personas.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
