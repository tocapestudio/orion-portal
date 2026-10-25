"use client";

/**
 * ORION Tools · Cartas · Hart - primera herramienta del modulo Cartas.
 * Mismo lenguaje visual y patrones ya probados en Oculomotricidad
 * (OculomotorClient.tsx) y el Generador de estimulos
 * (StimulusGeneratorClient.tsx), sin reutilizar sus componentes internos
 * directamente (son privados de esos modulos) - lo que SI se reutiliza
 * tal cual son los CATALOGOS compartidos (BASE_LETTERS/BASE_NUMBERS de
 * stimulusGenerator/stimulusConfig.ts).
 *
 * SIN MOTOR DE ANIMACION: a diferencia de Oculomotricidad, Hart es una
 * carta ESTATICA (una rejilla generada, sin movimiento) - no hace falta
 * ningun rAF/setTimeout/ref de estado de reproduccion. "Regenerar" es
 * una accion puntual (un nuevo sorteo), no un proceso continuo que
 * pueda quedar "corriendo en segundo plano".
 *
 * SIN PERSISTENCIA en esta fase (pedido explicitamente: "no crees
 * acciones de persistencia... el guardado con nombre se abordara en una
 * fase posterior") - la configuracion vive solo en memoria mientras dura
 * la sesion, igual que Oculomotricidad.
 *
 * Vista de PRESENTACION separada de la de CONFIGURACION (pedido
 * explicitamente: "separar claramente la configuracion de la carta de
 * su presentacion ampliada") - mismo patron de pantalla completa ya
 * probado en Oculomotricidad: base CSS incondicional (`fixed inset-0`)
 * + Fullscreen API como mejora progresiva, resiliente a Escape.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_HART_CONFIG,
  HART_MIN_ROWS,
  HART_MAX_ROWS,
  HART_MIN_COLUMNS,
  HART_MAX_COLUMNS,
  clampHartRows,
  clampHartColumns,
  generateHartCells,
  type HartCardConfig,
  type HartContent,
  type HartColorMode,
  type HartPresentation,
  type HartSize,
  type HartCell,
} from "./hartConfig";
import { BASE_LETTERS, BASE_NUMBERS } from "../../stimulusGenerator/stimulusConfig";
import CartasNav from "../CartasNav";

type ViewMode = "config" | "presentation";
/** Mismo tri-estado y mismo razonamiento que en OculomotorClient.tsx/
 * StimulusGeneratorClient.tsx: fullscreen real es una mejora progresiva,
 * nunca un requisito para que la presentacion funcione. */
type FullscreenStatus = "pending" | "active" | "unavailable";

const HART_CONTENT_LABELS: Record<HartContent, string> = {
  letters: "Letras",
  numbers: "Números",
  mixed: "Mixto (letras y números)",
};
const HART_COLOR_MODE_LABELS: Record<HartColorMode, string> = {
  neutral: "Neutro",
  monochromeRed: "Monocromo rojo",
  monochromeGreen: "Monocromo verde",
  redGreen: "Rojo-verde",
};
const HART_PRESENTATION_LABELS: Record<HartPresentation, string> = { near: "Cerca", far: "Lejos" };
const HART_SIZE_LABELS: Record<HartSize, string> = { sm: "Pequeño", md: "Mediano", lg: "Grande" };

/** Catalogos de contenido resueltos - 'mixed' combina ambos, reutilizados
 * TAL CUAL de stimulusConfig.ts (nunca duplicados, ver tambien el
 * comentario de cabecera de hartConfig.ts sobre por que esa resolucion
 * vive aqui y no en el modulo de logica pura). */
const HART_CONTENT_POOLS: Record<HartContent, readonly string[]> = {
  letters: BASE_LETTERS,
  numbers: BASE_NUMBERS,
  mixed: [...BASE_LETTERS, ...BASE_NUMBERS],
};

/** Tamaño BASE de cada estimulo - en la vista previa en linea, rem fijo
 * (columna de ancho estable); en la vista de presentacion, vmin (relativo
 * al viewport, para llenar la pantalla igual de bien en cualquier
 * dispositivo) - mismo criterio ya usado en el Generador de estimulos
 * ("vmin-based in execution, fixed scale in preview"). "Lejos" multiplica
 * ambos (letras mas grandes que "Cerca" al mismo tamaño, coherente con
 * un chart de lejos real) - nunca pretende representar una distancia
 * fisica calibrada, solo una escala mayor. */
const HART_SIZE_REM_PREVIEW: Record<HartSize, number> = { sm: 1, md: 1.5, lg: 2.25 };
const HART_SIZE_VMIN_PRESENTATION: Record<HartSize, number> = { sm: 4, md: 6, lg: 8.5 };
const HART_PRESENTATION_SCALE: Record<HartPresentation, number> = { near: 1, far: 1.6 };

const toggleButtonClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold ${
    active ? "border-orion-navy-900 bg-orion-navy-900 text-white" : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
  }`;

/** Tipografia de los estimulos: sans-serif (Geist Sans), ya cargada
 * globalmente por el proyecto via next/font (ver layout.tsx y la var CSS
 * `--font-geist-sans` en globals.css) - se reutiliza tal cual, nunca una
 * dependencia nueva. Geist distingue bien I/l/1 y O/0, mejor que la
 * monoespaciada con serifa usada antes. */
const HART_STIMULUS_FONT_FAMILY = "var(--font-geist-sans), system-ui, sans-serif";

/** Rejilla renderizada - usada TAL CUAL tanto en la vista previa en linea
 * como en la de presentacion, solo cambia `fontSize`/`gap` (CSS, no
 * logica). `columns` fija el numero de columnas del grid; el numero de
 * filas lo resuelve el propio CSS grid (auto-flow) a partir de
 * `cells.length`. */
function HartGrid({ cells, columns, fontSize, gap }: { cells: HartCell[]; columns: number; fontSize: string; gap: string }) {
  return (
    <div className="grid place-items-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          className="font-bold leading-none"
          style={{ color: cell.color, fontSize, fontFamily: HART_STIMULUS_FONT_FAMILY }}
        >
          {cell.content}
        </div>
      ))}
    </div>
  );
}

function HartDistributionFields({ config, onChange }: { config: HartCardConfig; onChange: (next: HartCardConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4">
        <label className="block">
          <p className="mb-1 text-xs text-orion-navy-500">Filas</p>
          <input
            type="number"
            min={HART_MIN_ROWS}
            max={HART_MAX_ROWS}
            value={config.rows}
            onChange={(e) => onChange({ ...config, rows: clampHartRows(Number(e.target.value)) })}
            className="w-20 rounded-lg border border-orion-navy-200 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <p className="mb-1 text-xs text-orion-navy-500">Columnas</p>
          <input
            type="number"
            min={HART_MIN_COLUMNS}
            max={HART_MAX_COLUMNS}
            value={config.columns}
            onChange={(e) => onChange({ ...config, columns: clampHartColumns(Number(e.target.value)) })}
            className="w-20 rounded-lg border border-orion-navy-200 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <p className="text-xs text-orion-navy-400">{config.rows * config.columns} estímulos en total.</p>
    </div>
  );
}

function HartContentFields({ config, onChange }: { config: HartCardConfig; onChange: (next: HartCardConfig) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(HART_CONTENT_LABELS) as HartContent[]).map((content) => (
        <button key={content} type="button" onClick={() => onChange({ ...config, content })} className={toggleButtonClass(config.content === content)}>
          {HART_CONTENT_LABELS[content]}
        </button>
      ))}
    </div>
  );
}

function HartSizeFields({ config, onChange }: { config: HartCardConfig; onChange: (next: HartCardConfig) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(HART_SIZE_LABELS) as HartSize[]).map((size) => (
        <button key={size} type="button" onClick={() => onChange({ ...config, size })} className={toggleButtonClass(config.size === size)}>
          {HART_SIZE_LABELS[size]}
        </button>
      ))}
    </div>
  );
}

function HartPresentationFields({ config, onChange }: { config: HartCardConfig; onChange: (next: HartCardConfig) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(HART_PRESENTATION_LABELS) as HartPresentation[]).map((presentation) => (
          <button
            key={presentation}
            type="button"
            onClick={() => onChange({ ...config, presentation })}
            className={toggleButtonClass(config.presentation === presentation)}
          >
            {HART_PRESENTATION_LABELS[presentation]}
          </button>
        ))}
      </div>
      <p className="text-xs text-orion-navy-400">Variante de escala visual, no representa una distancia física calibrada.</p>
    </div>
  );
}

function HartColorFields({ config, onChange }: { config: HartCardConfig; onChange: (next: HartCardConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(HART_COLOR_MODE_LABELS) as HartColorMode[]).map((colorMode) => (
          <button
            key={colorMode}
            type="button"
            onClick={() => onChange({ ...config, colorMode })}
            className={toggleButtonClass(config.colorMode === colorMode)}
          >
            {HART_COLOR_MODE_LABELS[colorMode]}
          </button>
        ))}
      </div>
      {(config.colorMode === "monochromeRed" || config.colorMode === "redGreen") && (
        <label className="flex items-center gap-2 text-xs text-orion-navy-500">
          Rojo
          <input
            type="color"
            value={config.redHex}
            onChange={(e) => onChange({ ...config, redHex: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
          />
        </label>
      )}
      {(config.colorMode === "monochromeGreen" || config.colorMode === "redGreen") && (
        <label className="flex items-center gap-2 text-xs text-orion-navy-500">
          Verde
          <input
            type="color"
            value={config.greenHex}
            onChange={(e) => onChange({ ...config, greenHex: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
          />
        </label>
      )}
      {config.colorMode !== "neutral" && (
        <p className="text-xs text-orion-navy-400">Los tonos son orientativos y editables, no representan un valor clínicamente calibrado.</p>
      )}
    </div>
  );
}

export default function HartClient() {
  const [config, setConfig] = useState<HartCardConfig>(DEFAULT_HART_CONFIG);
  // randomFn fijo (nunca Math.random) en el estado inicial: este valor se
  // renderiza tanto en el servidor (SSR) como en la primera pasada de
  // hidratacion del cliente, y Math.random() produce resultados distintos
  // en cada entorno -> "Hydration failed because the server rendered text
  // didn't match the client". El useEffect de abajo sustituye este
  // contenido deterministico por uno realmente aleatorio justo despues del
  // montaje (solo en cliente, tras hidratar), igual que
  // StimulusGeneratorClient.tsx evita el mismo problema en su vista previa.
  const [cells, setCells] = useState<HartCell[]>(() => generateHartCells(DEFAULT_HART_CONFIG, HART_CONTENT_POOLS[DEFAULT_HART_CONFIG.content], () => 0));
  const [view, setView] = useState<ViewMode>("config");
  const [fullscreenStatus, setFullscreenStatus] = useState<FullscreenStatus>("pending");
  const presentationContainerRef = useRef<HTMLDivElement | null>(null);

  // Regenera automaticamente cuando cambian filas/columnas/contenido/
  // color (los UNICOS parametros que afectan al SORTEO) - nunca al
  // cambiar tamaño/presentacion, que son solo escala visual sobre el
  // mismo contenido ya generado ("la generacion de una nueva carta no
  // debe cambiar... los demas parametros configurados" aplica tambien a
  // la inversa: cambiar tamaño/presentacion no debe regenerar
  // contenido). Mismo patron ya probado en StimulusGeneratorClient.tsx
  // para su vista previa (useEffect + eslint-disable puntual, nunca un
  // calculo derivado en cada render: Math.random() en render cambiaria
  // la carta en cualquier re-render no relacionado).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCells(generateHartCells(config, HART_CONTENT_POOLS[config.content]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.rows, config.columns, config.content, config.colorMode, config.redHex, config.greenHex]);

  const handleRegenerate = useCallback(() => {
    setCells(generateHartCells(config, HART_CONTENT_POOLS[config.content], Math.random));
  }, [config]);

  // Regenerar con la barra espaciadora - UN SOLO listener global en
  // `window`, activo durante toda la vida del componente (nunca se
  // añade/quita al cambiar de vista config/presentacion ni al entrar/salir
  // de fullscreen real, porque ninguna de esas transiciones desmonta este
  // componente - evita duplicados por construccion). Se ignora si el foco
  // esta en un control donde Espacio ya tiene su propio comportamiento
  // (input/textarea/select/boton/enlace/editable), lo que de paso evita
  // la doble regeneracion cuando el foco esta en el propio boton
  // "Regenerar" (el navegador ya activa su onClick con Espacio). `repeat`
  // descarta las pulsaciones repetidas al mantener la tecla pulsada - una
  // sola regeneracion por pulsacion inicial. `preventDefault` evita que la
  // pagina haga scroll (comportamiento nativo de Espacio).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      handleRegenerate();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRegenerate]);

  // Fullscreen real: mismo patron ya probado en OculomotorClient.tsx/
  // StimulusGeneratorClient.tsx.
  useEffect(() => {
    const handleChange = () => setFullscreenStatus(document.fullscreenElement ? "active" : "unavailable");
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (view !== "presentation") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullscreenStatus("pending");
    const el = presentationContainerRef.current;
    if (!el || typeof el.requestFullscreen !== "function") {
      setFullscreenStatus("unavailable");
      return;
    }
    el.requestFullscreen().catch(() => setFullscreenStatus("unavailable"));
  }, [view]);

  // Limpieza al desmontar - nunca deja la pagina atascada en fullscreen
  // real tras salir de la herramienta.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const handleEnterPresentation = useCallback(() => setView("presentation"), []);
  const handleExitPresentation = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setFullscreenStatus("pending");
    setView("config");
  }, []);

  // Vista de PRESENTACION: SIN ningun control de configuracion (requisito
  // explicito) - mismo patron de rama de retorno separada ya usado en
  // OculomotorClient.tsx para su vista de ejercicio.
  if (view === "presentation") {
    const scale = HART_PRESENTATION_SCALE[config.presentation];
    const fontSize = `${HART_SIZE_VMIN_PRESENTATION[config.size] * scale}vmin`;
    return (
      <div ref={presentationContainerRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-[4vmin]">
        <HartGrid cells={cells} columns={config.columns} fontSize={fontSize} gap="3vmin" />
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            className="rounded-xl border border-orion-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
          >
            Regenerar
          </button>
          <button
            type="button"
            onClick={handleExitPresentation}
            className="rounded-xl border border-orion-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
          >
            Salir
          </button>
        </div>
        {fullscreenStatus === "unavailable" && (
          <p className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-md bg-white/90 px-2 py-1 text-xs text-orion-navy-700 shadow-sm">
            Pantalla completa real no activa en este momento — la presentación sigue funcionando con normalidad.
          </p>
        )}
      </div>
    );
  }

  const previewScale = HART_PRESENTATION_SCALE[config.presentation];
  const previewFontSize = `${HART_SIZE_REM_PREVIEW[config.size] * previewScale}rem`;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-[#1a8f60]">ORION TOOLS · CARTAS</p>
        <h1 className="text-xl font-bold text-orion-navy-900">Hart</h1>
      </div>

      {/* Navegacion horizontal del modulo Cartas - SOLO en la vista de
          configuracion, nunca en la presentacion a pantalla completa
          (misma logica que Oculomotricidad: la navegacion/config
          desaparece durante la ejecucion/presentacion). */}
      <CartasNav active="hart" />

      {/* 2 columnas: configuracion (ancho flexible) | vista previa (ancho
          ESTABLE, 20rem) - mismo patron antiscroll ya validado en
          Oculomotricidad. min-w-0 en la columna de configuracion por el
          mismo motivo ya documentado alli: sin el, un grid item con
          `whitespace-nowrap` en sus botones puede forzar la rejilla
          entera a desbordar en vez de envolver. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-2.5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Distribución</h2>
              <HartDistributionFields config={config} onChange={setConfig} />
            </div>
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Contenido</h2>
              <HartContentFields config={config} onChange={setConfig} />
            </div>
          </div>

          <div className="grid items-start gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Tamaño</h2>
              <HartSizeFields config={config} onChange={setConfig} />
            </div>
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Presentación</h2>
              <HartPresentationFields config={config} onChange={setConfig} />
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
            <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Color</h2>
            <HartColorFields config={config} onChange={setConfig} />
          </div>
        </div>

        {/* Vista previa - ancho ESTABLE (20rem), controles siempre
            accesibles. */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-orion-navy-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Vista previa</p>
            <div className="flex w-full items-center justify-center overflow-auto rounded-xl border border-orion-navy-100 bg-white p-3" style={{ minHeight: "8rem" }}>
              <HartGrid cells={cells} columns={config.columns} fontSize={previewFontSize} gap="0.6rem" />
            </div>

            {/* Jerarquia de botones: "Ver en pantalla completa" como
                accion principal (solida), "Regenerar" como secundaria -
                mismo criterio ya establecido en Oculomotricidad. */}
            <div className="flex w-full flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleEnterPresentation}
                className="rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900"
              >
                Ver en pantalla completa
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="rounded-xl border border-orion-navy-200 px-5 py-2.5 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50"
              >
                Regenerar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
