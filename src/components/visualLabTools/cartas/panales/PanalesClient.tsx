"use client";

/**
 * ORION Tools · Cartas · Panales - retícula de hexagonos "punta arriba"
 * (pointy-top) con numeros 1-9, en filas alternas desplazadas (patron de
 * panal), inspirada en la plantilla de referencia proporcionada. Mismos
 * patrones ya probados en HartClient.tsx/McDonaldClient.tsx:
 * regeneracion por boton y barra espaciadora, pantalla completa (CSS
 * fija + Fullscreen API como mejora progresiva), navegacion de Cartas
 * (CartasNav), primera generacion REAL en un unico efecto de montaje
 * (lección aprendida en McDonaldClient.tsx), tonos rojo/azul
 * configurables con el MISMO patron visual que Hart/McDonald
 * (`<input type="color">` + etiqueta, ver PanalesColorFields).
 *
 * LAYOUT (2ª pasada): config a la izquierda (ancho FIJO modesto) | vista
 * previa a la derecha (ocupa TODO el resto del espacio) - mismo patron
 * de rejilla de 2 columnas que Hart/McDonald, pero con el enfasis
 * INVERTIDO: alli la columna de vista previa es la de ancho fijo y la
 * de configuracion la flexible; aqui es al reves, porque el requisito
 * explicito de Panales siempre ha sido maximizar el espacio de la
 * cartilla, con una configuracion "compacta".
 *
 * MEDICION EN PIXELES (ver useMeasuredSize): la geometria pura
 * (panalesConfig.ts) solo conoce PORCENTAJES/proporciones, nunca
 * pixeles - esta UI mide el espacio disponible real (ResizeObserver) y
 * calcula el tamaño en pixeles que maximiza el hexagono SIN deformarlo
 * (ajuste tipo "contain"). El MISMO hook de medicion (con un REF
 * CALLBACK, no un objeto ref fijo - ver su comentario, bug real
 * detectado y corregido en la version anterior) sirve para la columna
 * de vista previa y para la vista de pantalla completa.
 *
 * TAMAÑO DE CELDA (`cellSize`, ampliado en esta pasada): un UNICO factor
 * de escala (PANALES_CELL_SCALE) reduce o aumenta el CONTENEDOR del
 * panal respecto al tamaño maximo ajustado al espacio disponible -
 * nunca estira el panal mas alla de ese maximo ("Grande" = 100% del
 * ajuste, el comportamiento de la version anterior). Como el tamaño de
 * fuente se calcula como una fraccion FIJA del ancho de CADA hexagono
 * (que ya varia con el factor de escala), el numero crece/encoge
 * automaticamente junto con la celda sin necesitar una tabla aparte.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PANALES_CONFIG,
  computeHexGridLayout,
  generatePanalesCells,
  resolvePanalesCellColor,
  clampPanalesRows,
  clampPanalesColumns,
  PANALES_MIN_ROWS,
  PANALES_MAX_ROWS,
  PANALES_MIN_COLUMNS,
  PANALES_MAX_COLUMNS,
  type PanalesCardConfig,
  type PanalesCellSize,
  type PanalesCell,
} from "./panalesConfig";
import CartasNav from "../CartasNav";

type ViewMode = "config" | "presentation";
/** Mismo tri-estado y mismo razonamiento que en HartClient.tsx/
 * McDonaldClient.tsx. */
type FullscreenStatus = "pending" | "active" | "unavailable";

const PANALES_CELL_SIZE_LABELS: Record<PanalesCellSize, string> = { sm: "Pequeño", md: "Mediano", lg: "Grande" };

/** Factor de escala UNICO (hexagonos + numeros juntos) respecto al
 * tamaño maximo ajustado al espacio disponible - "lg" = 100% (usa todo
 * el espacio, el comportamiento de la version anterior), "sm"/"md"
 * reducen el panal COMPLETO (nunca lo deforman: se escalan ambos ejes
 * por igual) y lo dejan centrado dentro del espacio disponible, sin
 * estirarlo artificialmente (requisito explicito). */
const PANALES_CELL_SCALE: Record<PanalesCellSize, number> = { sm: 0.62, md: 0.82, lg: 1 };

/** Fraccion FIJA del ancho de CADA hexagono que ocupa el numero - unica
 * para los 3 tamaños a proposito: como el hexagono YA escala con
 * PANALES_CELL_SCALE, el numero escala junto con el automaticamente sin
 * necesitar un segundo factor (evita un doble escalado). */
const PANALES_NUMBER_TO_HEX_RATIO = 0.4;

/** Encogimiento del hexagono VISIBLE respecto a la celda que le asigna
 * la rejilla - crea la separacion visible entre hexagonos (requisito
 * explicito: "no deben compartir bordes ni formar una malla continua").
 * 0.86 dibuja el hexagono real al 86% del hueco que le corresponde,
 * dejando un margen uniforme y claramente perceptible alrededor, EN
 * CUALQUIER tamaño de celda (porcentaje relativo, no un valor fijo en
 * pixeles). */
const PANALES_HEX_FILL_RATIO = 0.86;

/** Misma tipografia que Hart/McDonald (Geist Sans, ya cargada
 * globalmente por el proyecto) - identidad visual coherente entre
 * herramientas de Cartas. */
const PANALES_STIMULUS_FONT_FAMILY = "var(--font-geist-sans), system-ui, sans-serif";

/** Hexagono "punta arriba" (pointy-top: vertice arriba/abajo, lados
 * verticales planos izquierda/derecha) - MISMA orientacion que asume la
 * geometria de panalesConfig.ts (ver su cabecera). */
const HEX_CLIP_PATH = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const toggleButtonClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold ${
    active ? "border-orion-navy-900 bg-orion-navy-900 text-white" : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
  }`;

/** Mide con ResizeObserver el tamaño REAL en pixeles del contenedor
 * referenciado - unico hook de medicion, reutilizado tanto por la
 * columna de vista previa como por la vista de pantalla completa. REF
 * CALLBACK (no un objeto ref fijo): la vista de configuracion y la de
 * presentacion son dos ramas de `return` DISTINTAS, asi que el nodo DOM
 * medido cambia por completo al alternar entre ambas - un ref callback
 * hace que React invoque esta funcion cada vez que el nodo adjunto
 * cambia (montaje de uno nuevo O desmontaje con `null`), permitiendo
 * crear/desconectar el ResizeObserver exactamente cuando corresponde
 * (bug real detectado y corregido en la version anterior: un
 * `useRef`+`useEffect([])` fijo solo observaba el PRIMER nodo montado y
 * dejaba `size` congelado en 0x0 en la vista nueva). El `setSize` ocurre
 * dentro del callback del observer (una suscripcion a un sistema
 * externo, el caso de uso legitimo de efectos), nunca de forma sincrona
 * en el cuerpo de un efecto. */
function useMeasuredSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  const setRef = useCallback((el: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);
  return [setRef, size] as const;
}

/** Rejilla de hexagonos ya ajustada a un tamaño en pixeles concreto
 * (`containerWidthPx`/`containerHeightPx`, ya calculados por el padre
 * aplicando el ajuste al espacio disponible Y el factor de escala de
 * `cellSize` - ver cabecera del archivo). Cada celda es un hexagono
 * posicionado de forma ABSOLUTA dentro de un contenedor `relative` del
 * tamaño exacto calculado - sin ningun elemento adicional de borde/
 * rejilla: el panal se percibe exclusivamente por la posicion/forma de
 * los propios hexagonos. El color de cada hexagono se resuelve AQUI, en
 * cada render, a partir de su marca `isRed` y los tonos ACTUALES
 * (`redHex`/`blueHex`) - nunca se guarda un color ya resuelto, por eso
 * cambiar de tono se refleja de inmediato sin regenerar nada. */
function PanalesHexGrid({
  cells,
  layout,
  containerWidthPx,
  containerHeightPx,
  redHex,
  blueHex,
}: {
  cells: PanalesCell[];
  layout: ReturnType<typeof computeHexGridLayout>;
  containerWidthPx: number;
  containerHeightPx: number;
  redHex: string;
  blueHex: string;
}) {
  const hexWidthPx = (layout.hexWidthPercent / 100) * containerWidthPx;
  const hexHeightPx = (layout.hexHeightPercent / 100) * containerHeightPx;
  const fontSizePx = hexWidthPx * PANALES_NUMBER_TO_HEX_RATIO;
  return (
    <div className="relative" style={{ width: containerWidthPx, height: containerHeightPx }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          className="absolute flex items-center justify-center font-bold text-white"
          style={{
            left: `${cell.xPercent}%`,
            top: `${cell.yPercent}%`,
            width: hexWidthPx * PANALES_HEX_FILL_RATIO,
            height: hexHeightPx * PANALES_HEX_FILL_RATIO,
            transform: "translate(-50%, -50%)",
            backgroundColor: resolvePanalesCellColor(cell.isRed, redHex, blueHex),
            clipPath: HEX_CLIP_PATH,
            fontSize: fontSizePx,
            fontFamily: PANALES_STIMULUS_FONT_FAMILY,
          }}
        >
          {cell.content}
        </div>
      ))}
    </div>
  );
}

/** Selectores de tono rojo/azul - MISMO patron visual (`<input
 * type="color">` + etiqueta + aviso "orientativo, no clinicamente
 * calibrado") ya usado en HartColorFields/McDonaldColorFields, nunca
 * importado de ahi (cada herramienta de Cartas es privada, ver
 * panalesConfig.ts), solo el PATRON se reutiliza. A diferencia de Hart/
 * McDonald, Panales no tiene "modo de color" (siempre hay rojo Y azul a
 * la vez), asi que los 2 selectores se muestran siempre. */
function PanalesColorFields({ config, onChange }: { config: PanalesCardConfig; onChange: (next: PanalesCardConfig) => void }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs text-orion-navy-500">
        Rojo
        <input
          type="color"
          value={config.redHex}
          onChange={(e) => onChange({ ...config, redHex: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-orion-navy-500">
        Azul
        <input
          type="color"
          value={config.blueHex}
          onChange={(e) => onChange({ ...config, blueHex: e.target.value })}
          className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
        />
      </label>
      <p className="text-xs text-orion-navy-400">Los tonos son orientativos y editables, no representan un valor clínicamente calibrado.</p>
    </div>
  );
}

export default function PanalesClient() {
  const [config, setConfig] = useState<PanalesCardConfig>(DEFAULT_PANALES_CONFIG);
  // randomFn fijo (nunca Math.random) en el estado inicial - mismo motivo
  // ya documentado (y corregido tras un bug real) en McDonaldClient.tsx:
  // evita el "Hydration failed" por generar contenido distinto en
  // servidor y cliente. El useEffect de mas abajo sustituye este
  // placeholder por contenido REAL una sola vez, justo tras montar.
  const [cells, setCells] = useState<PanalesCell[]>(() => generatePanalesCells(DEFAULT_PANALES_CONFIG, () => 0));
  const [view, setView] = useState<ViewMode>("config");
  const [fullscreenStatus, setFullscreenStatus] = useState<FullscreenStatus>("pending");
  const presentationContainerRef = useRef<HTMLDivElement | null>(null);
  const [measuredRef, measuredSize] = useMeasuredSize();

  const layout = useMemo(() => computeHexGridLayout(config.rows, config.columns), [config.rows, config.columns]);

  // Ajuste tipo "contain": el eje que antes se agota (ancho o alto)
  // limita el tamaño final (sin el factor de escala de `cellSize`
  // todavia) - garantiza que el panal NUNCA se deforme ni se corte.
  const { maxFitWidthPx, maxFitHeightPx } = useMemo(() => {
    if (measuredSize.width <= 0 || measuredSize.height <= 0) return { maxFitWidthPx: 0, maxFitHeightPx: 0 };
    let width = measuredSize.width;
    let height = width / layout.containerAspectRatio;
    if (height > measuredSize.height) {
      height = measuredSize.height;
      width = height * layout.containerAspectRatio;
    }
    return { maxFitWidthPx: width, maxFitHeightPx: height };
  }, [measuredSize.width, measuredSize.height, layout.containerAspectRatio]);

  // Aplica el factor de escala de `cellSize` SOBRE el tamaño maximo ya
  // ajustado - "lg" usa el 100% (todo el espacio disponible); "sm"/"md"
  // encogen el panal COMPLETO (misma proporcion en los dos ejes, nunca
  // se deforma) y quedan centrados dentro del espacio disponible (el
  // contenedor que lo envuelve ya centra con flex, ver el JSX) en vez de
  // estirarse para rellenarlo.
  const scale = PANALES_CELL_SCALE[config.cellSize];
  const fittedWidthPx = maxFitWidthPx * scale;
  const fittedHeightPx = maxFitHeightPx * scale;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCells(generatePanalesCells(DEFAULT_PANALES_CONFIG, Math.random));
  }, []);

  // Cambiar filas/columnas SIEMPRE regenera de forma SINCRONA (en el
  // mismo manejador, nunca en un efecto reactivo aparte) - misma leccion
  // aprendida (y corregida) en McDonaldClient.tsx: la cantidad de celdas
  // depende de rows*columns, y un efecto reactivo introduciria una
  // ventana con `cells` todavia desactualizado respecto al nuevo
  // `layout`. Al actualizar config y cells en la MISMA funcion, React
  // los aplica en el mismo commit, sin ningun render intermedio
  // desincronizado.
  const handleDimensionsChange = useCallback(
    (rows: number, columns: number) => {
      const next: PanalesCardConfig = { ...config, rows: clampPanalesRows(rows), columns: clampPanalesColumns(columns) };
      setConfig(next);
      setCells(generatePanalesCells(next, Math.random));
    },
    [config]
  );

  // Tamaño de celda y tonos rojo/azul son COSMETICOS puros (nunca
  // afectan al numero de celdas, su contenido ni que celdas son rojas/
  // azules - ver resolvePanalesCellColor en panalesConfig.ts) - no
  // necesitan regenerar nada, un simple setConfig re-renderiza con el
  // nuevo tamaño/color de inmediato.
  const handleCosmeticChange = useCallback((next: PanalesCardConfig) => {
    setConfig(next);
  }, []);

  const handleRegenerate = useCallback(() => {
    setCells(generatePanalesCells(config, Math.random));
  }, [config]);

  // Regenerar con la barra espaciadora - MISMO mecanismo (y mismas
  // protecciones) que Hart/McDonald: un unico listener global en
  // `window`, ignorado si el foco esta en un control con comportamiento
  // propio de Espacio, descarta pulsaciones repetidas al mantener la
  // tecla, y usa preventDefault para que la pagina no haga scroll.
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

  // Fullscreen real: mismo patron ya probado en Hart/McDonald.
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

  // Vista de PRESENTACION: SIN ningun control de configuracion ni
  // navegacion de Cartas (mismo patron que Hart/McDonald) - la rejilla
  // ocupa TODO el espacio salvo un margen minimo y los dos botones
  // flotantes esenciales. Respeta el MISMO factor de escala de
  // `cellSize` que la vista previa (requisito explicito).
  if (view === "presentation") {
    return (
      <div ref={presentationContainerRef} className="fixed inset-0 z-50 flex flex-col bg-white p-[2vmin]">
        <div ref={measuredRef} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {fittedWidthPx > 0 && (
            <PanalesHexGrid cells={cells} layout={layout} containerWidthPx={fittedWidthPx} containerHeightPx={fittedHeightPx} redHex={config.redHex} blueHex={config.blueHex} />
          )}
        </div>
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

  return (
    <div className="mx-auto flex h-full min-h-[75vh] w-full max-w-[1800px] flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="shrink-0 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-[#1a8f60]">ORION TOOLS · CARTAS</p>
        <h1 className="text-xl font-bold text-orion-navy-900">Panales</h1>
      </div>

      {/* Navegacion horizontal del modulo Cartas - SOLO en la vista de
          configuracion, nunca en la presentacion a pantalla completa. */}
      <div className="shrink-0">
        <CartasNav active="panales" />
      </div>

      {/* 2 columnas: configuracion (ancho FIJO modesto) | vista previa
          (ocupa TODO el resto del espacio) - enfasis INVERTIDO respecto
          a Hart/McDonald, ver cabecera del archivo. En movil/tablet
          (por debajo de lg) se apilan: configuracion arriba, vista
          previa abajo con una altura minima razonable. */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[18rem_1fr]">
        <div className="min-w-0 space-y-2.5 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
          <div className="rounded-xl border border-orion-navy-100 bg-white p-3">
            <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Distribución</h2>
            <div className="flex flex-wrap gap-3">
              <label className="block">
                <p className="mb-1 text-xs text-orion-navy-500">Filas</p>
                <input
                  type="number"
                  min={PANALES_MIN_ROWS}
                  max={PANALES_MAX_ROWS}
                  value={config.rows}
                  onChange={(e) => handleDimensionsChange(Number(e.target.value), config.columns)}
                  className="w-20 rounded-lg border border-orion-navy-200 px-2 py-1 text-sm"
                />
              </label>
              <label className="block">
                <p className="mb-1 text-xs text-orion-navy-500">Columnas</p>
                <input
                  type="number"
                  min={PANALES_MIN_COLUMNS}
                  max={PANALES_MAX_COLUMNS}
                  value={config.columns}
                  onChange={(e) => handleDimensionsChange(config.rows, Number(e.target.value))}
                  className="w-20 rounded-lg border border-orion-navy-200 px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-orion-navy-100 bg-white p-3">
            <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Tamaño de las celdas</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PANALES_CELL_SIZE_LABELS) as PanalesCellSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleCosmeticChange({ ...config, cellSize: size })}
                  className={toggleButtonClass(config.cellSize === size)}
                >
                  {PANALES_CELL_SIZE_LABELS[size]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-orion-navy-100 bg-white p-3">
            <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Color</h2>
            <PanalesColorFields config={config} onChange={handleCosmeticChange} />
          </div>

          <div className="flex flex-wrap gap-2">
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

        {/* Vista previa - ocupa TODO el espacio restante. */}
        <div
          ref={measuredRef}
          className="flex min-h-[50vh] items-center justify-center overflow-hidden rounded-xl border border-orion-navy-100 bg-white p-2 lg:min-h-0"
        >
          {fittedWidthPx > 0 && (
            <PanalesHexGrid cells={cells} layout={layout} containerWidthPx={fittedWidthPx} containerHeightPx={fittedHeightPx} redHex={config.redHex} blueHex={config.blueHex} />
          )}
        </div>
      </div>
    </div>
  );
}
