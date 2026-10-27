"use client";

/**
 * ORION Tools · Optotipos - pantalla de exploracion visual con 5 pruebas
 * seleccionables desde una misma interfaz (agudeza visual decimal -con
 * un modo rojo-verde integrado-, circulo horario/abanico astigmatico,
 * punto de fijacion, test de Worth de 4 luces, alineamiento binocular).
 * Mismos patrones ya probados en Hart/McDonald/PanalesClient.tsx:
 * pantalla completa (CSS fija + Fullscreen API como mejora progresiva),
 * primera generacion REAL en un unico efecto de montaje, cambios de
 * contenido SINCRONOS (nunca via efecto reactivo aparte, leccion
 * aprendida tras un bug real en McDonaldClient.tsx), medicion en
 * pixeles con ResizeObserver + ref callback (bug real detectado y
 * corregido en PanalesClient.tsx: un objeto ref fijo no se reengancha
 * al cambiar de nodo DOM).
 *
 * DIFERENCIA ARQUITECTONICA respecto a Hart/McDonald/Panales (requisito
 * explicito de esta herramienta): alli la vista de PRESENTACION no
 * tiene ningun control. Aqui la presentacion SI conserva un menu lateral
 * de controles, contraible, que NUNCA saca de pantalla completa. El
 * MISMO componente `OptotiposControls` se usa en la vista de
 * configuracion (inline) y en la de presentacion (menu lateral).
 *
 * TERCERA ITERACION - cambios respecto a la segunda version:
 * - Rojo-verde deja de ser una prueba del selector: ahora es un
 *   interruptor ("Modo rojo-verde") dentro de Agudeza visual
 *   (AgudezaConfig.rojoVerdeEnabled). Reutiliza EXACTAMENTE el mismo
 *   estado (`agudezaRows`, bloque, tipo de optotipo, tamaño,
 *   calibracion) - nunca genera ni selecciona contenido propio. Los
 *   optotipos se pintan en NEGRO (no blanco, corregido tras indicacion
 *   explicita) sobre cada mitad de color.
 * - Nueva prueba "Alineamiento binocular": cruz de 4 segmentos
 *   independientes (rojo arriba/izquierda, verde abajo/derecha) con un
 *   punto de fijacion blanco central, fondo negro de borde a borde - ver
 *   justificacion del nombre en optotiposConfig.ts.
 * - Menu lateral simplificado: "Tipo de optotipo" y "Distancia de
 *   exploracion" pasan de botones a un <select>; los ajustes avanzados
 *   (tonos de rojo-verde, numero de lineas/tamaño de Circulo horario,
 *   calibracion de pantalla) se agrupan en desplegables <details>
 *   cerrados por defecto - el selector de pruebas permanece siempre
 *   visible arriba, sin verse afectado por ningun desplegable. Anchura
 *   del menu reducida de 272px a 240px.
 * - Investigacion del "tamaño excesivamente pequeño a 40cm": la formula
 *   fisica (ver optotiposConfig.ts) se verifico correcta (6m/V=1.0 da
 *   8.73mm, el valor clinico real de una letra Snellen 6/6); a 40cm, los
 *   optotipos de agudeza buena (V=1.0, V=1.3) requieren fisicamente
 *   menos de 3mm - una vez calibrados y convertidos a pixeles, caen por
 *   debajo de lo que una pantalla puede renderizar con nitidez. NO se
 *   modifico la formula (seria falsear la fisica); se añadio un aviso
 *   honesto cuando el tamaño calculado cae por debajo de un piso
 *   practico de legibilidad (ver isBelowLegibleFloor).
 *
 * CUARTA ITERACION - limpieza visual puntual, SIN tocar logica clinica:
 * - Menu lateral reducido de 240px a 200px (SIDEBAR_WIDTH_PX, unica
 *   fuente de verdad compartida entre la vista de configuracion y la de
 *   pantalla completa).
 * - Navegacion de bloque: los botones "↑ Anterior"/"Siguiente ↓" se
 *   sustituyen por dos botones cuadrados compactos (↑/↓) en una fila
 *   junto al indicador de bloque - mismo comportamiento, mismo
 *   deshabilitado en los extremos, mismos atajos de teclado.
 * - Textos explicativos recortados en toda la columna (la herramienta es
 *   de uso profesional, no un manual) - se conservan UNICAMENTE los
 *   avisos tecnicos no obvios: que el tamaño calibrado no cabe, que cae
 *   por debajo del piso de legibilidad, y la limitacion del zoom del
 *   navegador en la calibracion.
 * - "Calibración de pantalla" se reduce a un estado corto ("Calibrada"/
 *   "Sin calibrar") + las acciones de calibrar/recalibrar/quitar -
 *   evita que el desplegable provoque scroll en la columna.
 * - Worth: eliminado el resplandor (box-shadow) de las 4 luces - ahora
 *   son circulos de color solidos, sin halo.
 *
 * SEPTIMA ITERACION - dos pruebas nuevas, reduccion progresiva de
 * simbolos, simplificacion de distancias, flujo de pantalla completa y
 * previsualizacion desacoplada de la presentacion:
 * - Nuevas pruebas "Contraste" (cartilla de C de Landolt, contraste de
 *   WEBER vs. fondo blanco - ver optotiposConfig.ts) y "Rejilla
 *   sinusoidal" (circulo de diametro constante con una rejilla interior,
 *   contraste de MICHELSON, secuencia DISCRETA de niveles de frecuencia
 *   y 3 orientaciones - ver SinusoidalGratingView). Ninguna de las dos
 *   afirma una unidad clinica calibrada salvo que haya calibracion real.
 * - Agudeza visual: si el bloque calibrado no cabe, antes de mostrar un
 *   aviso se reduce progresivamente el numero de simbolos por fila
 *   (5->3->2, ver AGUDEZA_SYMBOL_COUNT_FALLBACKS) - el tamaño fisico
 *   NUNCA se encoge. Misma logica en el modo rojo-verde, con una UNICA
 *   decision de simbolos/tamaño aplicada a ambas mitades.
 * - Progresion de bloques de Agudeza/Contraste: 5 bloques (antes 4),
 *   algunos solapados a proposito (ver AGUDEZA_BLOCK_START_INDEX en
 *   optotiposConfig.ts) - una linea compartida entre bloques vecinos es
 *   SIEMPRE la misma fila ya generada.
 * - Letras/numeros/E de Snellen: sin repetir ningun simbolo dentro de
 *   una misma fila (ver pickUniqueFromPool en optotiposConfig.ts); C de
 *   Landolt mantiene el comportamiento original (con reemplazo), a
 *   proposito.
 * - Distancias de exploracion: lista CERRADA de 8 valores (25cm-6m),
 *   sin campo de distancia personalizada (eliminado).
 * - Previsualizacion (vista de configuracion) DESACOPLADA de la
 *   presentacion: usa SIEMPRE un bloque de referencia fijo
 *   (PREVIEW_AGUDEZA_BLOCK_INDEX) y el modo "sin calibrar" de
 *   computeAgudezaLayout (tamaño proporcional estable, nunca el fisico/
 *   clinico), sin botones de navegacion de bloque. La navegacion real
 *   (botones + flechas de teclado) solo tiene efecto en pantalla
 *   completa.
 * - Teclado en presentacion: Agudeza (arriba/abajo/izq/der = bloque),
 *   Contraste (arriba/abajo = bloque/agudeza, izq/der = contraste),
 *   Rejilla sinusoidal (abajo/arriba = nivel de frecuencia, der/izq =
 *   contraste - mismo sentido abajo/derecha=avanzar que las otras dos
 *   pruebas; la orientacion de cada circulo ya NO se controla a mano,
 *   se sortea de nuevo en cada cambio de nivel/contraste) - nunca
 *   intercepta Esc.
 * - Pantalla completa: un UNICO boton de salida, siempre visible,
 *   esquina inferior derecha (mismo patron que ExerciseStopButton.tsx
 *   en ORION Play) - sustituye los dos botones distintos (en el menu/
 *   al contraerlo) de iteraciones previas. Aviso de "fullscreen no
 *   disponible" ahora transitorio (4s), nunca persistente.
 * - Calibracion de pantalla: ya no es un desplegable - estado
 *   ("Calibrada"/"Sin calibrar") y boton "Calibrar pantalla"/
 *   "Recalibrar" siempre visibles en la columna.
 * - "Regenerar" e "Iniciar en pantalla completa" se movieron de la
 *   columna izquierda al cuadro de previsualizacion (esquina inferior
 *   derecha, misma fila) - libera espacio vertical para evitar scroll.
 *
 * `activeTest` (que prueba se muestra) es independiente de `view`
 * (config/presentation) - cambiar de prueba DENTRO de presentacion es
 * solo un cambio de estado que intercambia que renderer se dibuja en el
 * MISMO contenedor ya medido, nunca un cambio de vista ni un remontaje
 * del contenedor de pantalla completa.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_OPTOTIPOS_CONFIG,
  generateAgudezaRows,
  computeClockDialAngles,
  clampCirculoHorarioLines,
  clampSizePercent,
  clampAgudezaBlockIndex,
  getAgudezaBlockDecimals,
  clampViewingDistanceCm,
  computeCalibratedOptotypeSizePx,
  computeCalibratedPxPerMm,
  isValidCalibrationMeasuredMm,
  isBelowLegibleFloor,
  MIN_LEGIBLE_OPTOTYPE_PX,
  AGUDEZA_SYMBOLS_PER_ROW,
  AGUDEZA_BLOCK_SIZE,
  AGUDEZA_BLOCK_COUNT,
  AGUDEZA_BLOCK_START_INDEX,
  VIEWING_DISTANCE_PRESETS,
  CALIBRATION_REFERENCE_LINE_PX,
  MIN_CALIBRATION_MEASURED_MM,
  MAX_CALIBRATION_MEASURED_MM,
  WORTH_DOTS,
  CIRCULO_HORARIO_MIN_LINES,
  CIRCULO_HORARIO_MAX_LINES,
  OPTOTIPO_LETTER_POOL,
  OPTOTIPO_NUMBER_POOL,
  CONTRASTE_MIN_PERCENT,
  CONTRASTE_MAX_PERCENT,
  CONTRASTE_STEP_PERCENT,
  snapContrastPercentToStep,
  computeContrastGrayLevel,
  REJILLA_FREQUENCY_LEVELS,
  clampRejillaFrequencyLevelIndex,
  getRejillaOrientationAngleDeg,
  generateRejillaOrientations,
  computeGratingLuminanceRange,
  computeCircleAngularDiameterDegrees,
  MICHELSON_MEAN_GRAY,
  type OptotiposCardConfig,
  type OptotipoTestId,
  type OptotipoSymbolType,
  type OptotipoSymbol,
  type AgudezaConfig,
  type AgudezaRow,
  type CirculoHorarioConfig,
  type RojoVerdeConfig,
  type FijacionConfig,
  type WorthConfig,
  type AlineamientoBinocularConfig,
  type ContrasteConfig,
  type RejillaConfig,
  type RejillaOrientation,
  type MonitorCalibration,
} from "./optotiposConfig";

type ViewMode = "config" | "presentation";
/** Mismo tri-estado y mismo razonamiento que en Hart/McDonald/Panales. */
type FullscreenStatus = "pending" | "active" | "unavailable";

/** Orden pedido explicitamente para el selector - ya NO incluye
 * "Rojo-verde" (ahora es un modo dentro de Agudeza visual). */
const OPTOTIPO_TEST_LABELS: Record<OptotipoTestId, string> = {
  agudeza: "Agudeza visual",
  circuloHorario: "Círculo horario",
  fijacion: "Punto de fijación",
  worth: "Worth",
  alineamientoBinocular: "Alineamiento binocular",
  contraste: "Contraste",
  rejillaSinusoidal: "Rejilla sinusoidal",
};

const OPTOTIPO_SYMBOL_TYPE_LABELS: Record<OptotipoSymbolType, string> = {
  letters: "Letras",
  numbers: "Números",
  snellenE: "E de Snellen",
  landoltC: "C de Landolt",
};

/** Misma tipografia que el resto de ORION Tools (Geist Sans, ya cargada
 * globalmente) - identidad visual coherente. */
const OPTOTIPO_FONT_FAMILY = "var(--font-geist-sans), system-ui, sans-serif";

/** Anchura FIJA del menu lateral - requisito explicito: "no debe
 * cambiar de tamaño al cambiar de prueba". Reducida progresivamente en
 * cada iteracion (272px -> 240px -> 200px) tras indicacion explicita de
 * que resultaba demasiado ancha. UNICA fuente de verdad: se usa tanto
 * en pantalla completa como en la vista de configuracion (ver
 * `gridTemplateColumns` mas abajo), para que ambas vistas compartan
 * siempre la misma anchura. */
const SIDEBAR_WIDTH_PX = 200;
const SIDEBAR_COLLAPSED_WIDTH_PX = 44;

/** Bloque de referencia FIJO usado SOLO en la previsualizacion (vista de
 * configuracion) de Agudeza visual/Contraste - requisito explicito:
 * "la previsualizacion no debe permitir navegar entre bloques... usar
 * un bloque de referencia fijo, independiente del bloque que se vaya a
 * usar despues en pantalla completa". La navegacion real (botones +
 * flechas de teclado) sigue operando sobre `config.agudeza.blockIndex`/
 * `config.contraste.blockIndex`, pero la previsualizacion SIEMPRE
 * ignora ese valor y usa este indice intermedio en su lugar, para
 * nunca invertir ni cambiar de tamaño de forma inesperada al navegar
 * entre bloques mientras aun se esta configurando. */
const PREVIEW_AGUDEZA_BLOCK_INDEX = 2;

/** Incremento (puntos porcentuales) que aplican las flechas izquierda/
 * derecha de la prueba de Contraste en cada pulsacion - un paso
 * discreto razonable sobre la escala 1-100 (ver CONTRASTE_MIN_PERCENT/
 * CONTRASTE_MAX_PERCENT en optotiposConfig.ts). */
const CONTRASTE_KEYBOARD_STEP_PERCENT = 10;

const selectClass = "w-full rounded-lg border border-orion-navy-200 bg-white px-2 py-1.5 text-xs text-orion-navy-900";
const toggleButtonClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold ${
    active ? "border-orion-navy-900 bg-orion-navy-900 text-white" : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
  }`;

/** Desplegable generico (nativo `<details>`, sin estado React) para
 * agrupar ajustes secundarios - requisito explicito "recogidos en un
 * desplegable... cerrado por defecto". `defaultOpen` controla solo el
 * estado INICIAL (atributo `open` nativo), la persona usuaria puede
 * abrirlo/cerrarlo libremente despues sin que React lo fuerce a cerrar
 * en cada render. */
function Disclosure({ summary, children, defaultOpen }: { summary: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-lg border border-orion-navy-100" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-2 py-1.5 text-xs font-semibold text-orion-navy-700 [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span className="text-orion-navy-400 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-orion-navy-100 p-2">{children}</div>
    </details>
  );
}

/** Mide con ResizeObserver el tamaño REAL en pixeles del contenedor
 * referenciado - REF CALLBACK (no un objeto ref fijo), mismo patron ya
 * corregido en PanalesClient.tsx tras un bug real: un `useRef` fijo
 * solo observa el PRIMER nodo montado y deja de medir si ese nodo se
 * desmonta y otro distinto ocupa su lugar. */
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

/**
 * CORRECCION DE TAMAÑO FISICO (auditoria previa): `font-size` de CSS
 * define la caja EM de la fuente, NO la altura real de una letra
 * mayuscula - medido empiricamente con Geist Sans Bold, la altura de
 * TINTA real de una letra es solo ~82-87% del `font-size` asignado (una
 * letra "mas pequeña de lo que deberia", exactamente el sintoma
 * reportado). La C de Landolt NO tiene este problema (es un trazo
 * vectorial SVG sobre un viewBox fijo, no depende de metricas de
 * fuente) - por eso la correccion de abajo NUNCA se aplica a landoltC.
 *
 * La compensacion se MIDE, nunca se asume con una constante fija: se
 * usa `canvas.measureText()` con `actualBoundingBoxAscent/Descent`
 * (extension real de tinta del glifo, a diferencia de medir la caja CSS
 * del elemento - esa caja refleja `line-height`, no el glifo) sobre
 * TODA la muestra real de caracteres que la herramienta puede mostrar
 * (OPTOTIPO_LETTER_POOL/OPTOTIPO_NUMBER_POOL, no una sola letra: las
 * formas redondas como C/S suelen tener algo mas de tinta que las
 * planas como E/H - el promedio de la muestra completa es la mejor
 * aproximacion UNICA posible sin corregir cada letra por separado, una
 * limitacion residual documentada y verificada en la auditoria).
 *
 * Se mide a un tamaño de referencia GRANDE (200px) para evitar el
 * redondeo a pixeles enteros que domina el error a tamaños pequeños
 * (ver auditoria: a <10px, `measureText()` ya no es fiable) - el ratio
 * ink/font-size es invariante de escala para el contorno vectorial real
 * de una fuente TrueType/OpenType (no cambia con el tamaño), verificado
 * en la auditoria original con 3 tamaños distintos (12-83px) y
 * reverificado tras esta correccion.
 *
 * NUNCA depende de que la fuente ya haya cargado: se mide tras
 * `document.fonts.ready` (API de carga de fuentes del navegador) y, si
 * Geist Sans no llegase a cargar, `canvas.font` resuelve exactamente la
 * MISMA cadena de fuentes de respaldo que el DOM (OPTOTIPO_FONT_FAMILY
 * se usa tal cual, nunca un nombre de fuente fijo) - la medicion se
 * adapta sola a lo que el navegador acabe renderizando realmente.
 */
const GLYPH_MEASURE_REFERENCE_PX = 200;

interface GlyphHeightRatios {
  letters: number;
  numbers: number;
}

/** Sin compensar (ratio=1) - estado SEGURO antes de medir la fuente
 * real (durante el montaje, o si `canvas`/`document.fonts` no estan
 * disponibles) - nunca agranda nada hasta confirmar la metrica real. */
const DEFAULT_GLYPH_HEIGHT_RATIOS: GlyphHeightRatios = { letters: 1, numbers: 1 };

/** `ctx.font` de Canvas 2D NO entiende `var(--custom-property)` (a
 * diferencia de una propiedad CSS real en el DOM, donde el navegador SI
 * resuelve variables CSS) - al intentarlo, el navegador descarta la
 * cadena completa en silencio y `ctx.font` vuelve a su valor por
 * defecto ("10px sans-serif"), invalidando la medicion sin ningun error
 * visible (bug real detectado durante la validacion de esta correccion:
 * `OPTOTIPO_FONT_FAMILY` contiene literalmente `var(--font-geist-sans)`,
 * valido en CSS de verdad pero no en Canvas). La solucion es leer el
 * valor YA RESUELTO de la variable con `getComputedStyle` sobre un
 * elemento real del DOM (asi se obtiene la MISMA fuente que el
 * navegador aplicaria de verdad, incluida cualquier fuente de
 * respaldo si Geist Sans no cargase) y construir con eso la cadena de
 * `ctx.font`. */
function resolveCanvasFontFamily(): string {
  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") return "sans-serif";
  const resolvedVar = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim();
  return resolvedVar ? `${resolvedVar}, system-ui, sans-serif` : "system-ui, sans-serif";
}

function measureGlyphHeightRatios(): GlyphHeightRatios {
  if (typeof document === "undefined") return DEFAULT_GLYPH_HEIGHT_RATIOS;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return DEFAULT_GLYPH_HEIGHT_RATIOS;
  ctx.font = `700 ${GLYPH_MEASURE_REFERENCE_PX}px ${resolveCanvasFontFamily()}`;
  if (!ctx.font.includes(`${GLYPH_MEASURE_REFERENCE_PX}px`)) return DEFAULT_GLYPH_HEIGHT_RATIOS; // el navegador rechazo la cadena - no medir con un tamaño erroneo
  const measurePoolRatio = (pool: readonly string[]): number => {
    const ratios = pool.map((ch) => {
      const m = ctx.measureText(ch);
      const inkHeight = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0);
      return inkHeight / GLYPH_MEASURE_REFERENCE_PX;
    });
    const sum = ratios.reduce((s, r) => s + r, 0);
    return ratios.length > 0 ? sum / ratios.length : 1;
  };
  return {
    letters: measurePoolRatio(OPTOTIPO_LETTER_POOL),
    numbers: measurePoolRatio(OPTOTIPO_NUMBER_POOL),
  };
}

/** `snellenE` siempre dibuja el caracter "E" (ya incluido en
 * OPTOTIPO_LETTER_POOL) - reutiliza el ratio de letras. `landoltC` NUNCA
 * se compensa (requisito explicito: no tocar su geometria vectorial, ya
 * verificada correcta). */
function getGlyphHeightRatio(symbolType: OptotipoSymbolType, ratios: GlyphHeightRatios): number {
  if (symbolType === "letters" || symbolType === "snellenE") return ratios.letters;
  if (symbolType === "numbers") return ratios.numbers;
  return 1;
}

/** Dibuja UN optotipo (letra/numero/E de Snellen/C de Landolt) de un
 * tamaño en pixeles concreto - compartido entre la cartilla de agudeza
 * y el modo rojo-verde. La "E de Snellen" es literalmente una E rotada
 * (CSS transform). La "C de Landolt" es un anillo SVG con un hueco
 * (stroke-dasharray) rotado a la orientacion pedida, en un viewBox FIJO
 * (el `width`/`height` del <svg> acepta cualquier unidad CSS y el
 * navegador escala el contenido vectorial proporcionalmente). */
function OptotipoGlyph({ symbol, symbolType, size, color }: { symbol: OptotipoSymbol; symbolType: OptotipoSymbolType; size: string; color: string }) {
  if (symbolType === "letters" || symbolType === "numbers") {
    return (
      <span className="inline-block font-bold leading-none" style={{ fontSize: size, color, fontFamily: OPTOTIPO_FONT_FAMILY }}>
        {symbol.char}
      </span>
    );
  }
  if (symbolType === "snellenE") {
    return (
      <span
        className="inline-block font-bold leading-none"
        style={{ fontSize: size, color, fontFamily: OPTOTIPO_FONT_FAMILY, transform: `rotate(${symbol.rotationDeg}deg)` }}
      >
        E
      </span>
    );
  }
  const strokeWidth = 100 / 5; // 1/5 del "diametro" en el sistema fijo - proporcion clasica del optotipo
  const radius = 50 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const gapLength = circumference * 0.2;
  const dashLength = circumference - gapLength;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${symbol.rotationDeg}deg)` }}>
      <circle
        cx={50}
        cy={50}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dashLength} ${gapLength}`}
        strokeDashoffset={gapLength / 2}
      />
    </svg>
  );
}

interface SizedAgudezaRow extends AgudezaRow {
  /** Tamaño FISICO FIJO (en `font-size` de CSS, ya compensado por
   * `glyphHeightRatio` cuando corresponde) de ESTA fila concreta -
   * depende EXCLUSIVAMENTE de `row.decimal`, la distancia de
   * exploracion y la calibracion (ver computeCalibratedOptotypeSizePx
   * en optotiposConfig.ts). El area disponible, el espaciado entre
   * filas o cualquier otro factor visual NUNCA puede modificar este
   * valor (requisito explicito de la 5a iteracion) - como mucho pueden
   * decidir que esta cartilla no quepa (ver AgudezaLayout.sizedRows =
   * null), nunca encogerla. */
  symbolSizePx: number;
}

interface AgudezaLayout {
  /** `null` SOLO cuando esta calibrado y el bloque NO CABE ni siquiera
   * con el espaciado minimo - en ese caso NO se debe renderizar la
   * cartilla a un tamaño reducido/incorrecto, solo mostrar el aviso de
   * `statusNote` (requisito explicito: "no reducir silenciosamente las
   * letras... mostrar un aviso"). Sin calibrar, SIEMPRE tiene un valor
   * (el maximo que cabe, ver computeUncalibratedLayout). */
  sizedRows: SizedAgudezaRow[] | null;
  /** Separacion vertical entre filas (px) - UNICO valor que el ajuste al
   * contenedor puede decidir libremente; nunca afecta a `symbolSizePx`. */
  rowGapPx: number;
  isCalibrated: boolean;
  /** Simbolos por fila REALMENTE mostrados (ver
   * AGUDEZA_SYMBOL_COUNT_FALLBACKS) - menor que AGUDEZA_SYMBOLS_PER_ROW
   * solo cuando ni con el gap minimo caben los 5, en cuyo caso se
   * reducen progresivamente conservando los simbolos iniciales de cada
   * fila (nunca se regenera contenido ni se encoge `symbolSizePx`). */
  symbolsPerRow: number;
  /** Mensaje breve para el panel lateral - null cuando esta calibrado y
   * cabe sin problema (el caso "todo correcto" no necesita aviso). */
  statusNote: string | null;
}

const SYMBOL_GAP_RATIO = 0.3;
/** Orden de intento para "reduccion progresiva de simbolos por fila"
 * (requisito explicito: "si no cabe, reducir progresivamente 5->3->2
 * manteniendo los simbolos/tamaños correspondientes, nunca encoger el
 * tamaño fisico") - se prueba cada valor, en este orden, DESPUES de que
 * la compresion de espaciado (ver fitSizedRows) ya haya fallado con 5. */
const AGUDEZA_SYMBOL_COUNT_FALLBACKS: readonly number[] = [AGUDEZA_SYMBOLS_PER_ROW, 3, 2];
/** Gap "comodo" por defecto entre filas, proporcional a la altura media
 * de fila - mismo criterio de proporcionalidad que ya se usaba, pero
 * ahora con un PISO absoluto (ROW_GAP_MIN_PX) para "evitar que la
 * cartilla quede demasiado compacta o que las filas se solapen" incluso
 * cuando los optotipos son muy pequeños (agudezas altas/distancias
 * cortas). */
const ROW_GAP_RATIO = 0.5;
const ROW_GAP_MIN_PX = 6;

/** Ancho maximo (px) que ocupa la fila MAS ANCHA del bloque dado un
 * tamaño de fila fijo - util tanto para comprobar si cabe como para
 * calcular el gap horizontal entre simbolos (sin cambios respecto a
 * iteraciones previas). */
function computeMaxRowWidthPx(sizedRows: { symbolSizePx: number }[], symbolsPerRow: number): number {
  return Math.max(...sizedRows.map((r) => r.symbolSizePx * (symbolsPerRow + (symbolsPerRow - 1) * SYMBOL_GAP_RATIO)));
}

/** Dados unos tamaños de fila YA FIJOS (nunca se recalculan aqui),
 * decide si `symbolsPerRow` simbolos por fila caben en
 * `containerWidthPx` x `containerHeightPx` y, si caben, que separacion
 * vertical usar: primero intenta el gap "comodo" (ROW_GAP_RATIO); si no
 * cabe con ese gap, lo comprime hasta el minimo absoluto
 * (ROW_GAP_MIN_PX); si ni siquiera asi cabe, `fits=false` - en NINGUN
 * caso se modifica `symbolSizePx`, solo el espaciado o el veredicto de
 * si cabe. */
function fitSizedRows(sizedRows: SizedAgudezaRow[], containerWidthPx: number, containerHeightPx: number, symbolsPerRow: number): { fits: boolean; rowGapPx: number } {
  const totalRowsHeightPx = sizedRows.reduce((sum, r) => sum + r.symbolSizePx, 0);
  const avgRowHeightPx = totalRowsHeightPx / sizedRows.length;
  const gapCount = sizedRows.length - 1;
  const maxRowWidthPx = computeMaxRowWidthPx(sizedRows, symbolsPerRow);
  const fitsHorizontally = containerWidthPx > 0 && maxRowWidthPx <= containerWidthPx;
  if (!fitsHorizontally) return { fits: false, rowGapPx: 0 };

  const comfortableGapPx = Math.max(ROW_GAP_MIN_PX, avgRowHeightPx * ROW_GAP_RATIO);
  if (totalRowsHeightPx + gapCount * comfortableGapPx <= containerHeightPx) {
    return { fits: true, rowGapPx: comfortableGapPx };
  }
  if (totalRowsHeightPx + gapCount * ROW_GAP_MIN_PX <= containerHeightPx) {
    return { fits: true, rowGapPx: ROW_GAP_MIN_PX };
  }
  return { fits: false, rowGapPx: 0 };
}

/** Envuelve `fitSizedRows` probando AGUDEZA_SYMBOL_COUNT_FALLBACKS en
 * orden (5 -> 3 -> 2): para cada numero de simbolos por fila, reintenta
 * primero el gap comodo y luego el minimo (ya dentro de `fitSizedRows`)
 * antes de pasar al siguiente numero menor - solo si NINGUNO cabe
 * devuelve `fits=false` (paso 4: mostrar aviso). Nunca toca
 * `symbolSizePx`. */
function fitSizedRowsWithFallback(sizedRows: SizedAgudezaRow[], containerWidthPx: number, containerHeightPx: number): { fits: boolean; rowGapPx: number; symbolsPerRow: number } {
  for (const symbolsPerRow of AGUDEZA_SYMBOL_COUNT_FALLBACKS) {
    const fit = fitSizedRows(sizedRows, containerWidthPx, containerHeightPx, symbolsPerRow);
    if (fit.fits) return { fits: true, rowGapPx: fit.rowGapPx, symbolsPerRow };
  }
  return { fits: false, rowGapPx: 0, symbolsPerRow: AGUDEZA_SYMBOLS_PER_ROW };
}

/** Modo SIN CALIBRAR (o sin monitor calibrado aun): no hay ninguna
 * altura fisica "nominal" que perseguir, asi que se usa el tamaño
 * MAXIMO que cabe en el contenedor preservando las proporciones
 * relativas reales entre filas (`row.sizeRatio`) - sin ningun
 * multiplicador manual (el control "Tamaño del bloque" se elimino,
 * requisito explicito de esta iteracion: ya no existe forma de
 * encoger la cartilla a mano, siempre se usa el maximo disponible). */
function computeUncalibratedLayout(rows: AgudezaRow[], containerWidthPx: number, containerHeightPx: number): { sizedRows: SizedAgudezaRow[]; rowGapPx: number } {
  const totalHeightUnits = rows.reduce((sum, r) => sum + r.sizeRatio, 0) + (rows.length - 1) * ROW_GAP_RATIO;
  const maxRowWidthUnits = Math.max(...rows.map((r) => r.sizeRatio * (AGUDEZA_SYMBOLS_PER_ROW + (AGUDEZA_SYMBOLS_PER_ROW - 1) * SYMBOL_GAP_RATIO)));
  const maxUnitSizeFromHeight = containerHeightPx > 0 ? containerHeightPx / totalHeightUnits : 0;
  const maxUnitSizeFromWidth = containerWidthPx > 0 ? containerWidthPx / maxRowWidthUnits : 0;
  const unitSizePx = Math.min(maxUnitSizeFromHeight, maxUnitSizeFromWidth);
  return {
    sizedRows: rows.map((r) => ({ ...r, symbolSizePx: r.sizeRatio * unitSizePx })),
    rowGapPx: ROW_GAP_RATIO * unitSizePx,
  };
}

/** Calcula el layout completo (tamaños fijos por fila + espaciado) para
 * las filas visibles de agudeza - COMPARTIDA entre AgudezaView y
 * RojoVerdeView. Dos modos:
 * 1. CALIBRADO: cada fila usa `computeCalibratedOptotypeSizePx(row.decimal,
 *    distancia, pxPerMm, glyphHeightRatio)` - un tamaño FIJO, que NO
 *    depende del contenedor en absoluto. El contenedor solo decide el
 *    espaciado (`fitSizedRows`) y, si ni con el espaciado minimo cabe,
 *    `sizedRows=null` (nunca se encoge el tamaño para que quepa).
 * 2. SIN CALIBRAR: ver computeUncalibratedLayout - siempre cabe por
 *    construccion (es, por definicion, el maximo que cabe). */
function computeAgudezaLayout(
  rows: AgudezaRow[],
  config: AgudezaConfig,
  calibration: MonitorCalibration | null,
  glyphHeightRatio: number,
  containerWidthPx: number,
  containerHeightPx: number
): AgudezaLayout {
  if (calibration) {
    const sizedRows = rows.map((r) => ({
      ...r,
      symbolSizePx: computeCalibratedOptotypeSizePx(r.decimal, config.viewingDistanceCm, calibration.pxPerMm, glyphHeightRatio),
    }));
    const fit = fitSizedRowsWithFallback(sizedRows, containerWidthPx, containerHeightPx);
    if (!fit.fits) {
      return {
        sizedRows: null,
        rowGapPx: 0,
        isCalibrated: true,
        symbolsPerRow: AGUDEZA_SYMBOLS_PER_ROW,
        statusNote: "El tamaño físico calculado para este bloque no cabe en el área disponible a esta distancia, ni reduciendo los símbolos por fila.",
      };
    }
    return {
      sizedRows,
      rowGapPx: fit.rowGapPx,
      isCalibrated: true,
      symbolsPerRow: fit.symbolsPerRow,
      statusNote:
        fit.symbolsPerRow < AGUDEZA_SYMBOLS_PER_ROW
          ? `Espacio insuficiente para ${AGUDEZA_SYMBOLS_PER_ROW} símbolos por fila a este tamaño físico: se muestran ${fit.symbolsPerRow}, mismo tamaño.`
          : null,
    };
  }
  const { sizedRows, rowGapPx } = computeUncalibratedLayout(rows, containerWidthPx, containerHeightPx);
  return {
    sizedRows,
    rowGapPx,
    isCalibrated: false,
    symbolsPerRow: AGUDEZA_SYMBOLS_PER_ROW,
    statusNote: "Pantalla sin calibrar: proporciones correctas, tamaño absoluto no calibrado.",
  };
}

/** Mensaje breve mostrado EN EL AREA DE ESTIMULO (no solo en el panel
 * lateral, que puede estar contraido en pantalla completa) cuando una
 * cartilla calibrada no cabe - nunca se sustituye por una cartilla
 * encogida. */
function AgudezaFitWarning({ message }: { message: string }) {
  return <p className="max-w-sm px-4 text-center text-sm text-amber-700">{message}</p>;
}

/** Cartilla de agudeza visual decimal - presentacion PROGRESIVA: `rows`
 * trae SOLO las 3 lineas del bloque activo. El tamaño de cada fila es
 * FIJO (ver computeAgudezaLayout) - el contenedor solo decide el
 * espaciado o, si no cabe, muestra un aviso en vez de la cartilla. */
function AgudezaView({
  rows,
  config,
  calibration,
  glyphHeightRatios,
  containerWidthPx,
  containerHeightPx,
}: {
  rows: AgudezaRow[];
  config: AgudezaConfig;
  calibration: MonitorCalibration | null;
  glyphHeightRatios: GlyphHeightRatios;
  containerWidthPx: number;
  containerHeightPx: number;
}) {
  const layout = computeAgudezaLayout(
    rows,
    config,
    calibration,
    getGlyphHeightRatio(config.symbolType, glyphHeightRatios),
    containerWidthPx,
    containerHeightPx
  );
  if (!layout.sizedRows) return <AgudezaFitWarning message={layout.statusNote ?? "El tamaño físico calculado no cabe en el área disponible."} />;

  return (
    <div className="flex flex-col items-center" style={{ gap: `${layout.rowGapPx}px` }}>
      {layout.sizedRows.map((row, i) => (
        <div key={i} className="flex items-center" style={{ gap: `${row.symbolSizePx * SYMBOL_GAP_RATIO}px`, height: row.symbolSizePx }}>
          {row.symbols.slice(0, layout.symbolsPerRow).map((symbol, j) => (
            <OptotipoGlyph key={j} symbol={symbol} symbolType={config.symbolType} size={`${row.symbolSizePx}px`} color="#10203f" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Las 12 referencias horarias (12 arriba, 3 derecha, 6 abajo, 9
 * izquierda, mas las 8 intermedias) - requisito explicito:
 * "independientemente del numero de lineas configurado", por eso es
 * una tabla FIJA (angulo = hora*30°), nunca derivada de
 * `computeClockDialAngles(config.lineCount)` como las lineas. `cardinal`
 * marca las 4 principales (12/3/6/9) para distinguirlas visualmente de
 * las 8 intermedias (mas pequeñas), manteniendo la composicion limpia. */
const CLOCK_NUMBER_POSITIONS: readonly { hour: number; angleDeg: number; cardinal: boolean }[] = [
  { hour: 12, angleDeg: 0, cardinal: true },
  { hour: 1, angleDeg: 30, cardinal: false },
  { hour: 2, angleDeg: 60, cardinal: false },
  { hour: 3, angleDeg: 90, cardinal: true },
  { hour: 4, angleDeg: 120, cardinal: false },
  { hour: 5, angleDeg: 150, cardinal: false },
  { hour: 6, angleDeg: 180, cardinal: true },
  { hour: 7, angleDeg: 210, cardinal: false },
  { hour: 8, angleDeg: 240, cardinal: false },
  { hour: 9, angleDeg: 270, cardinal: true },
  { hour: 10, angleDeg: 300, cardinal: false },
  { hour: 11, angleDeg: 330, cardinal: false },
];
/** Radio (unidades de viewBox) de las etiquetas numericas - DELIBERADAMENTE
 * mayor que `radius` (46, el de las lineas, sin tocar) para que nunca se
 * superpongan con los extremos de las lineas. */
const CLOCK_NUMBER_RADIUS = 58;

/** Circulo horario / abanico astigmatico - geometria/longitud/grosor de
 * las LINEAS sin cambios (requisito explicito de esta iteracion); unico
 * añadido son las referencias numericas de reloj (ver
 * CLOCK_NUMBER_POSITIONS). El `viewBox` se amplia (de 100x100 a 148x148,
 * centrado igual) SOLO para dejar sitio a los numeros fuera del radio de
 * las lineas - las coordenadas de las lineas (x1/y1/x2/y2, radius=46)
 * son exactamente las mismas de siempre. `sizePercent` sigue siendo un
 * porcentaje del lado MAS PEQUEÑO del contenedor REAL medido (nunca del
 * viewport entero). */
function CirculoHorarioView({ config, containerWidthPx, containerHeightPx }: { config: CirculoHorarioConfig; containerWidthPx: number; containerHeightPx: number }) {
  const angles = computeClockDialAngles(config.lineCount);
  const maxFitPx = Math.min(containerWidthPx, containerHeightPx);
  const sizePx = maxFitPx * (clampSizePercent(config.sizePercent, 70) / 100);
  const radius = 46;
  if (sizePx <= 0) return null;
  return (
    <svg width={sizePx} height={sizePx} viewBox="-24 -24 148 148">
      {angles.map((angleDeg, i) => {
        const rad = (angleDeg * Math.PI) / 180;
        const x2 = 50 + radius * Math.sin(rad);
        const y2 = 50 - radius * Math.cos(rad);
        return <line key={i} x1={50} y1={50} x2={x2} y2={y2} stroke="#10203f" strokeWidth={1.4} strokeLinecap="round" />;
      })}
      {CLOCK_NUMBER_POSITIONS.map(({ hour, angleDeg, cardinal }) => {
        const rad = (angleDeg * Math.PI) / 180;
        const x = 50 + CLOCK_NUMBER_RADIUS * Math.sin(rad);
        const y = 50 - CLOCK_NUMBER_RADIUS * Math.cos(rad);
        return (
          <text key={hour} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={cardinal ? 10 : 7} fontWeight={cardinal ? 700 : 500} fill="#10203f">
            {hour}
          </text>
        );
      })}
    </svg>
  );
}

/** Modo rojo-verde de Agudeza visual (3a iteracion: ya NO es una prueba
 * independiente ni siquiera en el selector) - divide el area en dos
 * mitades verticales (rojo/verde) y dibuja en AMBAS el MISMO contenido
 * que Agudeza visual, con los MISMOS tamaños fisicos (requisito
 * explicito de la 5a iteracion: "no introducir una escala
 * independiente"). El layout (tamaños por fila) se calcula UNA VEZ con
 * el ancho COMPLETO del contenedor - exactamente como lo haria
 * AgudezaView - y esos tamaños, ya fijos, NUNCA se recalculan para
 * encajar en la mitad: solo se comprueba si caben (`fitSizedRows` con
 * `containerWidthPx/2`); si no caben, se avisa en vez de encogerlos
 * (antes esta vista SI recalculaba un tamaño menor para la mitad - ese
 * comportamiento quedo explicitamente prohibido en esta iteracion).
 * Optotipos en NEGRO (la version anterior los pintaba en blanco). */
function RojoVerdeView({
  rows,
  agudezaConfig,
  calibration,
  glyphHeightRatios,
  rojoVerdeConfig,
  containerWidthPx,
  containerHeightPx,
}: {
  rows: AgudezaRow[];
  agudezaConfig: AgudezaConfig;
  calibration: MonitorCalibration | null;
  glyphHeightRatios: GlyphHeightRatios;
  rojoVerdeConfig: RojoVerdeConfig;
  containerWidthPx: number;
  containerHeightPx: number;
}) {
  const glyphHeightRatio = getGlyphHeightRatio(agudezaConfig.symbolType, glyphHeightRatios);
  const layout = computeAgudezaLayout(rows, agudezaConfig, calibration, glyphHeightRatio, containerWidthPx, containerHeightPx);
  if (!layout.sizedRows) return <AgudezaFitWarning message={layout.statusNote ?? "El tamaño físico calculado no cabe en el área disponible."} />;

  const halfFit = fitSizedRowsWithFallback(layout.sizedRows, containerWidthPx / 2, containerHeightPx);
  if (!halfFit.fits) {
    return <AgudezaFitWarning message="El tamaño físico de este bloque no cabe en cada mitad del modo rojo-verde, ni reduciendo los símbolos por fila. Contrae el menú, amplía la ventana o cambia de bloque." />;
  }

  const renderHalf = () => (
    <div className="flex flex-col items-center" style={{ gap: `${halfFit.rowGapPx}px` }}>
      {layout.sizedRows!.map((row, i) => (
        <div key={i} className="flex items-center" style={{ gap: `${row.symbolSizePx * SYMBOL_GAP_RATIO}px`, height: row.symbolSizePx }}>
          {row.symbols.slice(0, halfFit.symbolsPerRow).map((symbol, j) => (
            <OptotipoGlyph key={j} symbol={symbol} symbolType={agudezaConfig.symbolType} size={`${row.symbolSizePx}px`} color="#000000" />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full w-full">
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: rojoVerdeConfig.redHex }}>
        {renderHalf()}
      </div>
      <div className="flex flex-1 items-center justify-center" style={{ backgroundColor: rojoVerdeConfig.greenHex }}>
        {renderHalf()}
      </div>
    </div>
  );
}

/** Construye un AgudezaConfig SINTETICO para reutilizar
 * computeAgudezaLayout/generateAgudezaRows en la cartilla de contraste
 * (requisito explicito: "reutilizar la logica de tamaño fisico/
 * calibracion existente"). `symbolType` SIEMPRE "landoltC" (requisito
 * explicito: la prueba de contraste usa exclusivamente C de Landolt) y
 * `targetDecimal` fijo en 1 (solo afecta al modo SIN CALIBRAR, ver
 * comentario en AgudezaConfig.targetDecimal - cualquier ancla fija da
 * las mismas proporciones relativas). */
function contrasteAgudezaConfig(contraste: ContrasteConfig): AgudezaConfig {
  return {
    targetDecimal: 1,
    symbolType: "landoltC",
    blockIndex: contraste.blockIndex,
    viewingDistanceCm: contraste.viewingDistanceCm,
    rojoVerdeEnabled: false,
  };
}

/** Cartilla de contraste (C de Landolt) - SIEMPRE fondo blanco, SIEMPRE
 * C de Landolt (requisitos explicitos). Reutiliza EXACTAMENTE el mismo
 * motor de tamaño fisico que Agudeza visual (computeAgudezaLayout, con
 * `glyphHeightRatio=1` porque landoltC nunca se compensa, ver
 * getGlyphHeightRatio) - cambiar el contraste NUNCA cambia el bloque,
 * el tamaño ni la distancia representados (requisito explicito), solo
 * el nivel de gris del trazo (contraste de WEBER frente al fondo
 * blanco, ver computeContrastGrayLevel en optotiposConfig.ts - un
 * proxy sRGB, nunca una medicion fotometrica real). */
function ContrasteView({
  rows,
  config,
  calibration,
  containerWidthPx,
  containerHeightPx,
}: {
  rows: AgudezaRow[];
  config: ContrasteConfig;
  calibration: MonitorCalibration | null;
  containerWidthPx: number;
  containerHeightPx: number;
}) {
  const agudezaConfig = contrasteAgudezaConfig(config);
  const layout = computeAgudezaLayout(rows, agudezaConfig, calibration, 1, containerWidthPx, containerHeightPx);
  if (!layout.sizedRows) return <AgudezaFitWarning message={layout.statusNote ?? "El tamaño físico calculado no cabe en el área disponible."} />;

  const grayLevel = computeContrastGrayLevel(config.contrastPercent);
  const color = `rgb(${grayLevel}, ${grayLevel}, ${grayLevel})`;

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center" style={{ gap: `${layout.rowGapPx}px` }}>
        {layout.sizedRows.map((row, i) => (
          <div key={i} className="flex items-center" style={{ gap: `${row.symbolSizePx * SYMBOL_GAP_RATIO}px`, height: row.symbolSizePx }}>
            {row.symbols.slice(0, layout.symbolsPerRow).map((symbol, j) => (
              <OptotipoGlyph key={j} symbol={symbol} symbolType="landoltC" size={`${row.symbolSizePx}px`} color={color} />
            ))}
          </div>
        ))}
      </div>
      {layout.statusNote && (
        <p className="absolute bottom-2 left-1/2 max-w-sm -translate-x-1/2 text-center text-[0.65rem] text-amber-700">{layout.statusNote}</p>
      )}
    </div>
  );
}

/** Rejilla sinusoidal - sensibilidad al contraste por DISCRIMINACION DE
 * FRECUENCIA ESPACIAL dentro de VARIOS CIRCULOS de diametro EXTERIOR
 * constante mostrados a la vez (requisito explicito: "no confundir
 * aumentar la frecuencia con aumentar el tamaño del circulo" - el
 * diametro depende SOLO del contenedor y de cuantos circulos se
 * muestren, NUNCA del nivel de frecuencia ni de la orientacion).
 *
 * Luminancia REAL por pixel (no un degradado CSS, que no puede producir
 * una sinusoide exacta), via Canvas ImageData/putImageData - se dibujan
 * SIEMPRE bandas VERTICALES (fase a lo largo de `x`) en un canvas
 * cuadrado recortado a circulo (`borderRadius: "50%"`); las orientaciones
 * diagonales se consiguen girando ese circulo ya dibujado con
 * `transform: rotate(...)` (un circulo es rotacionalmente simetrico -
 * girarlo no cambia su diametro aparente ni introduce ninguna
 * distorsion, mucho mas simple y igual de exacto que recalcular la
 * sinusoide con coordenadas rotadas).
 *
 * Contraste de MICHELSON (ver computeGratingLuminanceRange) alrededor
 * del gris medio fijo (MICHELSON_MEAN_GRAY) - independiente del nivel
 * de frecuencia (requisito explicito: cambiar uno nunca cambia el otro).
 *
 * VARIOS CIRCULOS A LA VEZ, MISMO NIVEL/CONTRASTE, ORIENTACION SORTEADA
 * (requisito explicito, 2a revision de esta prueba): los 3 o 4 circulos
 * mostrados comparten EXACTAMENTE el mismo `frequencyLevelIndex` y el
 * mismo `contrastPercent` (nunca una progresion de niveles distintos
 * como en la version anterior) - lo UNICO que varia entre ellos es la
 * orientacion, sorteada de forma independiente por circulo (con
 * reemplazo, ver generateRejillaOrientations en optotiposConfig.ts) y
 * RENOVADA cada vez que cambia el nivel o el contraste (ver
 * `rejillaOrientations`/`regenerateRejillaOrientations` en el componente
 * principal) - nunca al redimensionar la ventana o contraer el menu
 * (eso solo cambia cuantos circulos caben, no que orientacion tiene
 * cada uno). Como ya no hay "el nivel seleccionado" distinguible entre
 * varios, NINGUN circulo se resalta (séría enganoso sugerir que uno es
 * "el" estimulo correcto) - el indicador de nivel/contraste se muestra
 * UNA sola vez, compartido, bajo el conjunto. Prefiere 3 circulos bien
 * dimensionados a 4 apretados (requisito explicito) - ver
 * REJILLA_CIRCLE_MIN_COMFORTABLE_DIAMETER_PX.
 *
 * Frecuencia espacial: SIEMPRE se dibuja como
 * `diameterPx / REJILLA_FREQUENCY_LEVELS[frequencyLevelIndex]` pixeles
 * por ciclo - nunca depende de la calibracion (eso es lo que garantiza
 * que el diametro exterior nunca cambie). SOLO cuando hay calibracion
 * real Y distancia conocida se traduce ADEMAS a ciclos/grado REALES
 * (ver computeCircleAngularDiameterDegrees), mostrado como texto bajo
 * el conjunto - nunca en caso contrario (ver disclaimer en el panel de
 * controles si no hay calibracion). Esta prueba NO reproduce ningun
 * protocolo clinico normalizado (p.ej. Pelli-Robson/CSF completa) -
 * exploracion perceptual cualitativa unicamente. */

/** Numero de circulos a intentar, en orden de preferencia (4 primero,
 * 3 como respaldo) - requisito explicito: "preferible mostrar tres
 * circulos bien dimensionados antes que cuatro apretados". */
const REJILLA_CIRCLE_COUNT_FALLBACKS: readonly number[] = [4, 3];
/** Maximo de la lista anterior - cuantas orientaciones aleatorias hay
 * que tener siempre disponibles (se usan solo las primeras `count`). */
const REJILLA_MAX_CIRCLE_COUNT = Math.max(...REJILLA_CIRCLE_COUNT_FALLBACKS);
const REJILLA_CIRCLE_MIN_COMFORTABLE_DIAMETER_PX = 90;
const REJILLA_CIRCLE_ROW_MARGIN_RATIO = 0.06;
const REJILLA_CIRCLE_GAP_TO_DIAMETER_RATIO = 0.16;

/** Diametro (px) que le tocaria a cada circulo si se muestran `count`
 * en una sola fila horizontal, centrada, con margenes laterales y un
 * hueco entre circulos proporcional al propio diametro - limitado
 * tambien por la altura disponible (deja sitio para la etiqueta de
 * nivel bajo cada circulo). */
function computeRejillaCircleDiameterPx(containerWidthPx: number, containerHeightPx: number, count: number): number {
  const usableWidthPx = containerWidthPx * (1 - 2 * REJILLA_CIRCLE_ROW_MARGIN_RATIO);
  const diameterFromWidthPx = usableWidthPx / (count + (count - 1) * REJILLA_CIRCLE_GAP_TO_DIAMETER_RATIO);
  const diameterFromHeightPx = containerHeightPx * 0.6;
  return Math.max(0, Math.min(diameterFromWidthPx, diameterFromHeightPx));
}

/** Elige cuantos circulos mostrar (ver REJILLA_CIRCLE_COUNT_FALLBACKS) -
 * el primero que de un diametro comodo; si ninguno lo hace, se queda
 * con la ultima opcion de la lista (nunca deja de mostrar nada). */
function pickRejillaCircleLayout(containerWidthPx: number, containerHeightPx: number): { count: number; diameterPx: number } {
  for (let i = 0; i < REJILLA_CIRCLE_COUNT_FALLBACKS.length; i += 1) {
    const count = REJILLA_CIRCLE_COUNT_FALLBACKS[i];
    const diameterPx = computeRejillaCircleDiameterPx(containerWidthPx, containerHeightPx, count);
    const isLastOption = i === REJILLA_CIRCLE_COUNT_FALLBACKS.length - 1;
    if (diameterPx >= REJILLA_CIRCLE_MIN_COMFORTABLE_DIAMETER_PX || isLastOption) return { count, diameterPx };
  }
  return { count: 3, diameterPx: computeRejillaCircleDiameterPx(containerWidthPx, containerHeightPx, 3) };
}

/** UN circulo con su propia rejilla sinusoidal - extraido para poder
 * repetirlo (cada uno con su propio <canvas>) dentro de la fila de
 * SinusoidalGratingView. `cycleCount`/`contrastPercent` son siempre los
 * MISMOS valores compartidos en los 4 circulos; solo `angleDeg` (la
 * orientacion sorteada) varia entre ellos. */
function RejillaCircle({
  diameterPx,
  cycleCount,
  contrastPercent,
  angleDeg,
}: {
  diameterPx: number;
  cycleCount: number;
  contrastPercent: number;
  angleDeg: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizePx = Math.max(0, Math.floor(diameterPx));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sizePx <= 0) return;
    canvas.width = sizePx;
    canvas.height = sizePx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { lMax, lMin } = computeGratingLuminanceRange(contrastPercent);
    const mean = (lMax + lMin) / 2;
    const amplitude = (lMax - lMin) / 2;
    const pixelsPerCycle = sizePx / cycleCount;

    const columnGray = new Uint8ClampedArray(sizePx);
    for (let x = 0; x < sizePx; x += 1) {
      const phase = (2 * Math.PI * x) / pixelsPerCycle;
      columnGray[x] = Math.round(mean + amplitude * Math.sin(phase));
    }
    const imageData = ctx.createImageData(sizePx, sizePx);
    for (let y = 0; y < sizePx; y += 1) {
      for (let x = 0; x < sizePx; x += 1) {
        const idx = (y * sizePx + x) * 4;
        const gray = columnGray[x];
        imageData.data[idx] = gray;
        imageData.data[idx + 1] = gray;
        imageData.data[idx + 2] = gray;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }, [contrastPercent, cycleCount, sizePx]);

  if (sizePx <= 0) return null;
  return <canvas ref={canvasRef} style={{ width: sizePx, height: sizePx, borderRadius: "50%", transform: `rotate(${angleDeg}deg)` }} />;
}

function SinusoidalGratingView({
  config,
  orientations,
  calibration,
  containerWidthPx,
  containerHeightPx,
  previewMode,
}: {
  config: RejillaConfig;
  /** Una orientacion por circulo, sorteada e independiente (ver
   * generateRejillaOrientations) - gestionada como estado en el
   * componente principal, renovada solo cuando cambia el nivel o el
   * contraste (nunca al redimensionar). Debe tener al menos
   * REJILLA_MAX_CIRCLE_COUNT elementos; se usan los primeros `count`. */
  orientations: RejillaOrientation[];
  calibration: MonitorCalibration | null;
  containerWidthPx: number;
  containerHeightPx: number;
  /** Vista de configuracion: nunca afirmar ciclos/grado (requisito
   * general de esta iteracion - la previsualizacion nunca representa
   * una magnitud fisica real), aunque haya calibracion real. */
  previewMode?: boolean;
}) {
  const totalLevels = REJILLA_FREQUENCY_LEVELS.length;
  const selectedIndex = clampRejillaFrequencyLevelIndex(config.frequencyLevelIndex);
  const cycleCount = REJILLA_FREQUENCY_LEVELS[selectedIndex];

  const { count, diameterPx } = pickRejillaCircleLayout(containerWidthPx, containerHeightPx);
  if (diameterPx <= 0) return null;

  // Lectura fisica (ciclos/grado), nunca en vista previa aunque haya
  // calibracion real.
  const circleDiameterMm = !previewMode && calibration ? diameterPx / calibration.pxPerMm : null;
  const angularDiameterDeg = circleDiameterMm !== null ? computeCircleAngularDiameterDegrees(circleDiameterMm, config.viewingDistanceCm) : null;
  const cyclesPerDegree = angularDiameterDeg && angularDiameterDeg > 0 ? cycleCount / angularDiameterDeg : null;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-4"
      style={{ backgroundColor: `rgb(${MICHELSON_MEAN_GRAY}, ${MICHELSON_MEAN_GRAY}, ${MICHELSON_MEAN_GRAY})` }}
    >
      <div className="flex items-center justify-center" style={{ gap: diameterPx * REJILLA_CIRCLE_GAP_TO_DIAMETER_RATIO }}>
        {Array.from({ length: count }, (_, i) => (
          <RejillaCircle
            key={i}
            diameterPx={diameterPx}
            cycleCount={cycleCount}
            contrastPercent={config.contrastPercent}
            angleDeg={getRejillaOrientationAngleDeg(orientations[i % orientations.length])}
          />
        ))}
      </div>
      <p className="text-center text-[0.7rem] text-orion-navy-500">
        Nivel {selectedIndex + 1}/{totalLevels} · Contraste {config.contrastPercent}%
        {previewMode ? " · vista previa" : cyclesPerDegree !== null ? ` · ≈ ${cyclesPerDegree.toFixed(2)} ciclos/grado` : " · sin calibrar (nivel relativo)"}
      </p>
    </div>
  );
}

/** Punto de fijacion: fondo negro en TODA el area de presentacion,
 * punto blanco centrado respecto a esa area, tamaño configurable
 * respecto al contenedor REAL medido - SIN CAMBIOS en esta iteracion. */
function FijacionView({ config, containerWidthPx, containerHeightPx }: { config: FijacionConfig; containerWidthPx: number; containerHeightPx: number }) {
  const maxFitPx = Math.min(containerWidthPx, containerHeightPx);
  const sizePx = maxFitPx * (clampSizePercent(config.dotSizePercent, 3) / 100);
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="rounded-full bg-white" style={{ width: sizePx, height: sizePx }} />
    </div>
  );
}

/** Test de Worth (4 luces): fondo negro en TODA el area de presentacion
 * (nunca un cuadrado negro sobre blanco), disposicion FIJA en rombo.
 * Circulos de color SIMPLES, sin resplandor/halo (eliminado tras
 * indicacion explicita: "circulos... con un borde limpio y un relleno
 * uniforme", nunca un box-shadow difuminado alrededor). */
function WorthView({ config, containerWidthPx, containerHeightPx }: { config: WorthConfig; containerWidthPx: number; containerHeightPx: number }) {
  const maxFitPx = Math.min(containerWidthPx, containerHeightPx);
  const sizePx = maxFitPx * (clampSizePercent(config.sizePercent, 55) / 100);
  const dotSizePx = sizePx * 0.22;
  const colorMap: Record<string, string> = { red: "#ef4444", green: "#22c55e", white: "#ffffff" };
  return (
    <div className="relative h-full w-full bg-black">
      <div className="absolute left-1/2 top-1/2" style={{ width: sizePx, height: sizePx, transform: "translate(-50%, -50%)" }}>
        {WORTH_DOTS.map((dot) => (
          <div
            key={dot.id}
            className="absolute rounded-full"
            style={{
              left: `${dot.xPercent}%`,
              top: `${dot.yPercent}%`,
              width: dotSizePx,
              height: dotSizePx,
              transform: "translate(-50%, -50%)",
              backgroundColor: colorMap[dot.color],
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Alineamiento binocular (nombre provisional, ver justificacion en
 * optotiposConfig.ts): fondo negro de borde a borde, cruz de 4
 * SEGMENTOS INDEPENDIENTES equidistantes del centro (nunca una cruz
 * continua) con una separacion visible respecto al punto de fijacion
 * blanco central - arriba e izquierda en rojo, abajo y derecha en
 * verde, exactamente como se especifico. SVG con viewBox fijo 0-100
 * (mismo patron que CirculoHorarioView/WorthView) para que el tamaño
 * final escale sin deformar nunca la disposicion. */
function AlineamientoBinocularView({ config, containerWidthPx, containerHeightPx }: { config: AlineamientoBinocularConfig; containerWidthPx: number; containerHeightPx: number }) {
  const maxFitPx = Math.min(containerWidthPx, containerHeightPx);
  const sizePx = maxFitPx * (clampSizePercent(config.crossSizePercent, 55) / 100);
  const dotSizePx = sizePx * (clampSizePercent(config.dotSizePercent, 4) / 100) * 2;
  if (sizePx <= 0) return null;
  const armEnd = 42;
  const gapFromCenter = 10;
  const strokeWidth = 3.5;
  return (
    <div className="relative h-full w-full bg-black">
      <svg width={sizePx} height={sizePx} viewBox="0 0 100 100" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <line x1={50} y1={50 - gapFromCenter} x2={50} y2={50 - armEnd} stroke="#ef4444" strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1={50 - gapFromCenter} y1={50} x2={50 - armEnd} y2={50} stroke="#ef4444" strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1={50} y1={50 + gapFromCenter} x2={50} y2={50 + armEnd} stroke="#22c55e" strokeWidth={strokeWidth} strokeLinecap="round" />
        <line x1={50 + gapFromCenter} y1={50} x2={50 + armEnd} y2={50} stroke="#22c55e" strokeWidth={strokeWidth} strokeLinecap="round" />
      </svg>
      <div className="absolute left-1/2 top-1/2 rounded-full bg-white" style={{ width: dotSizePx, height: dotSizePx, transform: "translate(-50%, -50%)" }} />
    </div>
  );
}

/** Barra de referencia para calibrar la pantalla: un ancho EXACTO y
 * conocido en pixeles CSS con marcas en los extremos, para que la
 * persona usuaria la mida con una regla fisica. Se muestra en el AREA
 * DE ESTIMULO (no en el menu) para medirse directamente sobre la
 * pantalla que se esta calibrando. */
function CalibrationRulerView() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 text-center">
      <div className="relative" style={{ width: CALIBRATION_REFERENCE_LINE_PX }}>
        <div className="h-2 bg-orion-navy-900" />
        <div className="absolute left-0 top-0 h-4 w-[2px] -translate-y-1 bg-orion-navy-900" />
        <div className="absolute right-0 top-0 h-4 w-[2px] -translate-y-1 bg-orion-navy-900" />
      </div>
      <p className="max-w-xs text-sm text-orion-navy-700">Mide esta línea con una regla y escribe la medida (mm) en el panel.</p>
    </div>
  );
}

/** Panel de controles - UNICO componente reutilizado tanto inline (vista
 * de configuracion) como en el menu lateral de pantalla completa.
 * Estructura pedida explicitamente: 1) selector de prueba SIEMPRE
 * visible, 2) controles especificos de la prueba activa, 3) calibracion
 * de pantalla en un desplegable al final, SIEMPRE presente
 * (independiente de la prueba activa - es una propiedad del monitor, no
 * de una prueba concreta). `compact` ajusta el estilo visual pero no la
 * logica. */
function OptotiposControls({
  config,
  agudezaLayout,
  belowLegibleFloor,
  onSelectTest,
  onAgudezaChange,
  onCirculoHorarioChange,
  onRojoVerdeChange,
  onFijacionChange,
  onWorthChange,
  onAlineamientoBinocularChange,
  onContrasteChange,
  onRejillaChange,
  onRejillaRegenerate,
  onRegenerate,
  onStartCalibration,
  onClearCalibration,
  compact,
  showRegenerateButton = true,
  showBlockNavigation = true,
}: {
  config: OptotiposCardConfig;
  agudezaLayout: AgudezaLayout;
  belowLegibleFloor: boolean;
  onSelectTest: (test: OptotipoTestId) => void;
  onAgudezaChange: (next: AgudezaConfig) => void;
  onCirculoHorarioChange: (next: CirculoHorarioConfig) => void;
  onRojoVerdeChange: (next: RojoVerdeConfig) => void;
  onFijacionChange: (next: FijacionConfig) => void;
  onWorthChange: (next: WorthConfig) => void;
  onAlineamientoBinocularChange: (next: AlineamientoBinocularConfig) => void;
  onContrasteChange: (next: ContrasteConfig) => void;
  onRejillaChange: (next: RejillaConfig) => void;
  /** Sortea de nuevo la orientacion de cada circulo - se llama SIEMPRE
   * que cambie el nivel o el contraste (requisito explicito), nunca al
   * cambiar la distancia de exploracion. */
  onRejillaRegenerate: () => void;
  onRegenerate: () => void;
  onStartCalibration: () => void;
  onClearCalibration: () => void;
  compact?: boolean;
  /** El boton "Regenerar" se muestra DENTRO del panel solo cuando este
   * se usa en el menu lateral de presentacion - en la vista de
   * configuracion se muestra aparte, dentro del cuadro de
   * previsualizacion (junto a "Iniciar en pantalla completa"), para
   * liberar espacio vertical en la columna izquierda (requisito
   * explicito). Mismo manejador `onRegenerate` en ambos sitios. */
  showRegenerateButton?: boolean;
  /** Los botones (y el indicador) de navegacion de bloque de Agudeza/
   * Contraste solo se muestran en el menu lateral de PRESENTACION -
   * requisito explicito: "la previsualizacion no debe permitir navegar
   * entre bloques". En la vista de configuracion la previsualizacion
   * usa siempre un bloque de referencia fijo (ver
   * PREVIEW_AGUDEZA_BLOCK_INDEX en OptotiposClient.tsx), por lo que
   * mostrar aqui un indicador de bloque seria contradictorio. */
  showBlockNavigation?: boolean;
}) {
  const canRegenerate = config.activeTest === "agudeza" || config.activeTest === "contraste";
  return (
    <div className={compact ? "space-y-2.5" : "space-y-3"}>
      <div>
        <p className="mb-1 text-xs font-semibold text-orion-navy-500">Prueba</p>
        <div className="flex flex-col gap-1.5">
          {(Object.keys(OPTOTIPO_TEST_LABELS) as OptotipoTestId[]).map((test) => (
            <button key={test} type="button" onClick={() => onSelectTest(test)} className={`${toggleButtonClass(config.activeTest === test)} w-full text-left`}>
              {OPTOTIPO_TEST_LABELS[test]}
            </button>
          ))}
        </div>
      </div>

      {config.activeTest === "agudeza" && (
        <div className="space-y-2 border-t border-orion-navy-100 pt-2">
          {showBlockNavigation && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-orion-navy-500">
                  Bloque {config.agudeza.blockIndex + 1}/{AGUDEZA_BLOCK_COUNT}
                </p>
                <p className="truncate text-sm font-semibold text-orion-navy-900">
                  {getAgudezaBlockDecimals(config.agudeza.blockIndex)
                    .map((d: number) => d.toFixed(1))
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Bloque anterior"
                  title="Bloque anterior (↑)"
                  onClick={() => onAgudezaChange({ ...config.agudeza, blockIndex: clampAgudezaBlockIndex(config.agudeza.blockIndex - 1) })}
                  disabled={config.agudeza.blockIndex === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-orion-navy-200 text-sm font-bold text-orion-navy-700 hover:border-orion-navy-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-orion-navy-200"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Bloque siguiente"
                  title="Bloque siguiente (↓)"
                  onClick={() => onAgudezaChange({ ...config.agudeza, blockIndex: clampAgudezaBlockIndex(config.agudeza.blockIndex + 1) })}
                  disabled={config.agudeza.blockIndex === AGUDEZA_BLOCK_COUNT - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-orion-navy-200 text-sm font-bold text-orion-navy-700 hover:border-orion-navy-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-orion-navy-200"
                >
                  ↓
                </button>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-semibold text-orion-navy-700">
            <input
              type="checkbox"
              checked={config.agudeza.rojoVerdeEnabled}
              onChange={(e) => onAgudezaChange({ ...config.agudeza, rojoVerdeEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-orion-navy-300"
            />
            Modo rojo-verde
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-orion-navy-500">Tipo de optotipo</span>
            <select
              value={config.agudeza.symbolType}
              onChange={(e) => onAgudezaChange({ ...config.agudeza, symbolType: e.target.value as OptotipoSymbolType })}
              className={selectClass}
            >
              {(Object.keys(OPTOTIPO_SYMBOL_TYPE_LABELS) as OptotipoSymbolType[]).map((type) => (
                <option key={type} value={type}>
                  {OPTOTIPO_SYMBOL_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-orion-navy-500">Distancia de exploración</span>
            <select
              value={config.agudeza.viewingDistanceCm}
              onChange={(e) => onAgudezaChange({ ...config.agudeza, viewingDistanceCm: clampViewingDistanceCm(Number(e.target.value)) })}
              className={selectClass}
            >
              {VIEWING_DISTANCE_PRESETS.map((preset: { label: string; cm: number }) => (
                <option key={preset.cm} value={preset.cm}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          {config.agudeza.rojoVerdeEnabled && (
            <Disclosure summary="Ajustes avanzados (tonos)">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs text-orion-navy-500">
                  Rojo
                  <input
                    type="color"
                    value={config.rojoVerde.redHex}
                    onChange={(e) => onRojoVerdeChange({ ...config.rojoVerde, redHex: e.target.value })}
                    className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-orion-navy-500">
                  Verde
                  <input
                    type="color"
                    value={config.rojoVerde.greenHex}
                    onChange={(e) => onRojoVerdeChange({ ...config.rojoVerde, greenHex: e.target.value })}
                    className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
                  />
                </label>
              </div>
              <p className="text-[0.7rem] text-orion-navy-400">No constituye un diagnóstico automático.</p>
            </Disclosure>
          )}

          {agudezaLayout.statusNote && <p className="text-[0.7rem] text-amber-700">{agudezaLayout.statusNote}</p>}
          {belowLegibleFloor && (
            <p className="text-[0.7rem] text-amber-700">Aviso: menos de {MIN_LEGIBLE_OPTOTYPE_PX}px en pantalla, puede no ser perceptible.</p>
          )}
        </div>
      )}

      {config.activeTest === "circuloHorario" && (
        <div className="border-t border-orion-navy-100 pt-2">
          <Disclosure summary="Ajustes" defaultOpen>
            <label className="block">
              <p className="mb-1 text-xs text-orion-navy-500">Número de líneas ({config.circuloHorario.lineCount})</p>
              <input
                type="range"
                min={CIRCULO_HORARIO_MIN_LINES}
                max={CIRCULO_HORARIO_MAX_LINES}
                step={1}
                value={config.circuloHorario.lineCount}
                onChange={(e) => onCirculoHorarioChange({ ...config.circuloHorario, lineCount: clampCirculoHorarioLines(Number(e.target.value)) })}
                className="w-full"
              />
            </label>
            <label className="block">
              <p className="mb-1 text-xs text-orion-navy-500">Tamaño</p>
              <input
                type="range"
                min={20}
                max={90}
                step={1}
                value={config.circuloHorario.sizePercent}
                onChange={(e) => onCirculoHorarioChange({ ...config.circuloHorario, sizePercent: clampSizePercent(Number(e.target.value), 70) })}
                className="w-full"
              />
            </label>
          </Disclosure>
        </div>
      )}

      {config.activeTest === "fijacion" && (
        <label className="block border-t border-orion-navy-100 pt-2">
          <p className="mb-1 text-xs text-orion-navy-500">Tamaño del punto</p>
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={config.fijacion.dotSizePercent}
            onChange={(e) => onFijacionChange({ dotSizePercent: clampSizePercent(Number(e.target.value), 3) })}
            className="w-full"
          />
        </label>
      )}

      {config.activeTest === "worth" && (
        <label className="block border-t border-orion-navy-100 pt-2">
          <p className="mb-1 text-xs text-orion-navy-500">Tamaño</p>
          <input
            type="range"
            min={25}
            max={90}
            step={1}
            value={config.worth.sizePercent}
            onChange={(e) => onWorthChange({ sizePercent: clampSizePercent(Number(e.target.value), 55) })}
            className="w-full"
          />
        </label>
      )}

      {config.activeTest === "alineamientoBinocular" && (
        <div className="space-y-2 border-t border-orion-navy-100 pt-2">
          <label className="block">
            <p className="mb-1 text-xs text-orion-navy-500">Tamaño de la cruz</p>
            <input
              type="range"
              min={20}
              max={90}
              step={1}
              value={config.alineamientoBinocular.crossSizePercent}
              onChange={(e) => onAlineamientoBinocularChange({ ...config.alineamientoBinocular, crossSizePercent: clampSizePercent(Number(e.target.value), 55) })}
              className="w-full"
            />
          </label>
          <label className="block">
            <p className="mb-1 text-xs text-orion-navy-500">Tamaño del punto central</p>
            <input
              type="range"
              min={1}
              max={15}
              step={0.5}
              value={config.alineamientoBinocular.dotSizePercent}
              onChange={(e) => onAlineamientoBinocularChange({ ...config.alineamientoBinocular, dotSizePercent: clampSizePercent(Number(e.target.value), 4) })}
              className="w-full"
            />
          </label>
          <p className="text-[0.7rem] text-orion-navy-400">No constituye un diagnóstico por sí sola.</p>
        </div>
      )}

      {config.activeTest === "contraste" && (
        <div className="space-y-2 border-t border-orion-navy-100 pt-2">
          {showBlockNavigation && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-orion-navy-500">
                  Bloque {config.contraste.blockIndex + 1}/{AGUDEZA_BLOCK_COUNT} (↑ / ↓)
                </p>
                <p className="truncate text-sm font-semibold text-orion-navy-900">
                  {getAgudezaBlockDecimals(config.contraste.blockIndex)
                    .map((d: number) => d.toFixed(1))
                    .join(" / ")}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Bloque anterior"
                  onClick={() => onContrasteChange({ ...config.contraste, blockIndex: clampAgudezaBlockIndex(config.contraste.blockIndex - 1) })}
                  disabled={config.contraste.blockIndex === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-orion-navy-200 text-sm font-bold text-orion-navy-700 hover:border-orion-navy-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-orion-navy-200"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Bloque siguiente"
                  onClick={() => onContrasteChange({ ...config.contraste, blockIndex: clampAgudezaBlockIndex(config.contraste.blockIndex + 1) })}
                  disabled={config.contraste.blockIndex === AGUDEZA_BLOCK_COUNT - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-orion-navy-200 text-sm font-bold text-orion-navy-700 hover:border-orion-navy-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-orion-navy-200"
                >
                  ↓
                </button>
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs text-orion-navy-500">Distancia de exploración</span>
            <select
              value={config.contraste.viewingDistanceCm}
              onChange={(e) => onContrasteChange({ ...config.contraste, viewingDistanceCm: clampViewingDistanceCm(Number(e.target.value)) })}
              className={selectClass}
            >
              {VIEWING_DISTANCE_PRESETS.map((preset: { label: string; cm: number }) => (
                <option key={preset.cm} value={preset.cm}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs text-orion-navy-500">
              <span>Contraste (← / →)</span>
              <span className="font-semibold text-orion-navy-700">{config.contraste.contrastPercent}%</span>
            </span>
            <input
              type="range"
              min={CONTRASTE_MIN_PERCENT}
              max={CONTRASTE_MAX_PERCENT}
              step={CONTRASTE_STEP_PERCENT}
              value={config.contraste.contrastPercent}
              onChange={(e) => onContrasteChange({ ...config.contraste, contrastPercent: snapContrastPercentToStep(Number(e.target.value)) })}
              className="w-full"
            />
          </label>
          <p className="text-[0.7rem] text-orion-navy-400">
            Nivel relativo (gris 0-255 como proxy de contraste de Weber), no un porcentaje clínico calibrado fotométricamente. Cambiar el
            contraste nunca cambia el bloque ni el tamaño representado.
          </p>
        </div>
      )}

      {config.activeTest === "rejillaSinusoidal" && (
        <div className="space-y-2 border-t border-orion-navy-100 pt-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-orion-navy-500">
              Nivel{" "}
              <span className="font-semibold text-orion-navy-700">
                {config.rejillaSinusoidal.frequencyLevelIndex + 1}/{REJILLA_FREQUENCY_LEVELS.length}
              </span>{" "}
              (↓ sube / ↑ baja)
            </p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label="Bajar frecuencia"
                title="Bajar frecuencia (↑)"
                onClick={() => {
                  onRejillaChange({ ...config.rejillaSinusoidal, frequencyLevelIndex: clampRejillaFrequencyLevelIndex(config.rejillaSinusoidal.frequencyLevelIndex - 1) });
                  onRejillaRegenerate();
                }}
                disabled={config.rejillaSinusoidal.frequencyLevelIndex === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-orion-navy-200 text-sm font-bold text-orion-navy-700 hover:border-orion-navy-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-orion-navy-200"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Subir frecuencia"
                title="Subir frecuencia (↓)"
                onClick={() => {
                  onRejillaChange({ ...config.rejillaSinusoidal, frequencyLevelIndex: clampRejillaFrequencyLevelIndex(config.rejillaSinusoidal.frequencyLevelIndex + 1) });
                  onRejillaRegenerate();
                }}
                disabled={config.rejillaSinusoidal.frequencyLevelIndex === REJILLA_FREQUENCY_LEVELS.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-orion-navy-200 text-sm font-bold text-orion-navy-700 hover:border-orion-navy-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-orion-navy-200"
              >
                ↓
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-xs text-orion-navy-500">
              <span>Contraste (→ sube / ← baja)</span>
              <span className="font-semibold text-orion-navy-700">{config.rejillaSinusoidal.contrastPercent}%</span>
            </span>
            <input
              type="range"
              min={CONTRASTE_MIN_PERCENT}
              max={CONTRASTE_MAX_PERCENT}
              step={CONTRASTE_STEP_PERCENT}
              value={config.rejillaSinusoidal.contrastPercent}
              onChange={(e) => {
                onRejillaChange({ ...config.rejillaSinusoidal, contrastPercent: snapContrastPercentToStep(Number(e.target.value)) });
                onRejillaRegenerate();
              }}
              className="w-full"
            />
          </label>
          <p className="text-[0.7rem] text-orion-navy-400">
            Los 4 círculos comparten el mismo nivel y el mismo contraste; solo la orientación de cada uno se sortea al cambiar cualquiera de
            los dos valores.
          </p>

          <label className="block">
            <span className="mb-1 block text-xs text-orion-navy-500">Distancia de exploración</span>
            <select
              value={config.rejillaSinusoidal.viewingDistanceCm}
              onChange={(e) => onRejillaChange({ ...config.rejillaSinusoidal, viewingDistanceCm: clampViewingDistanceCm(Number(e.target.value)) })}
              className={selectClass}
            >
              {VIEWING_DISTANCE_PRESETS.map((preset: { label: string; cm: number }) => (
                <option key={preset.cm} value={preset.cm}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[0.7rem] text-orion-navy-400">
            {config.calibration
              ? "Con la pantalla calibrada, la frecuencia se expresa en ciclos/grado reales a la distancia elegida."
              : "Sin calibrar: la frecuencia es solo el número de ciclos dibujados en el parche, no una frecuencia espacial calibrada."}{" "}
            No reproduce ningún protocolo clínico normalizado de sensibilidad al contraste.
          </p>
        </div>
      )}

      {canRegenerate && showRegenerateButton && (
        <button
          type="button"
          onClick={onRegenerate}
          className="w-full rounded-xl border border-orion-navy-200 px-4 py-2 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50"
        >
          Regenerar
        </button>
      )}

      {/* Sin desplegable (requisito explicito: "sin tener que abrir ningun
          menu ni desplazarse hacia abajo") - estado y boton SIEMPRE
          visibles directamente en la columna. */}
      <div className="flex items-center justify-between gap-2 border-t border-orion-navy-100 pt-2">
        <p className={`text-xs font-semibold ${config.calibration ? "text-emerald-700" : "text-orion-navy-500"}`}>
          {config.calibration ? "Calibrada" : "Sin calibrar"}
        </p>
        <div className="flex shrink-0 gap-1.5">
          {config.calibration && (
            <button type="button" onClick={onClearCalibration} className="rounded-lg border border-orion-navy-200 px-2 py-1 text-xs font-semibold text-orion-navy-700 hover:border-orion-navy-400">
              Quitar
            </button>
          )}
          <button type="button" onClick={onStartCalibration} className="rounded-lg border border-orion-navy-200 px-2 py-1 text-xs font-semibold text-orion-navy-700 hover:border-orion-navy-400">
            {config.calibration ? "Recalibrar" : "Calibrar pantalla"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Formulario de calibracion - SUSTITUYE a `OptotiposControls` en el
 * menu lateral mientras `calibrating` esta activo (la barra de
 * referencia se mide en el area de estimulo, ver CalibrationRulerView,
 * mientras este formulario recoge la medicion). */
function CalibrationForm({
  measuredMmInput,
  onMeasuredMmInputChange,
  onSave,
  onCancel,
}: {
  measuredMmInput: string;
  onMeasuredMmInputChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const parsed = Number(measuredMmInput);
  const canSave = isValidCalibrationMeasuredMm(parsed);
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-orion-navy-500">Calibrar pantalla</p>
      <label className="block">
        <span className="mb-1 block text-[0.7rem] text-orion-navy-500">Mide la línea de la derecha con una regla (mm)</span>
        <input
          type="number"
          min={MIN_CALIBRATION_MEASURED_MM}
          max={MAX_CALIBRATION_MEASURED_MM}
          value={measuredMmInput}
          onChange={(e) => onMeasuredMmInputChange(e.target.value)}
          placeholder="ej. 79"
          className="w-full rounded-lg border border-orion-navy-200 px-2 py-1 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 rounded-lg bg-orion-navy-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orion-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Guardar
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:border-orion-navy-400">
          Cancelar
        </button>
      </div>
      <p className="text-[0.65rem] text-orion-navy-400">No válida si cambias el zoom del navegador después.</p>
    </div>
  );
}

export default function OptotiposClient() {
  const [config, setConfig] = useState<OptotiposCardConfig>(DEFAULT_OPTOTIPOS_CONFIG);
  // randomFn fijo (nunca Math.random) en el estado inicial - mismo motivo
  // ya documentado (y corregido tras bugs reales) en McDonaldClient.tsx/
  // PanalesClient.tsx: evita el "Hydration failed". El useEffect de mas
  // abajo sustituye este placeholder por contenido REAL una sola vez,
  // justo tras montar.
  const [agudezaRows, setAgudezaRows] = useState<AgudezaRow[]>(() => generateAgudezaRows(DEFAULT_OPTOTIPOS_CONFIG.agudeza, () => 0));
  // Filas de la cartilla de CONTRASTE - independientes de `agudezaRows`
  // (es una prueba aparte en el selector, no un modo de Agudeza visual
  // como rojo-verde): mismo patron placeholder-seguro -> contenido real
  // tras montar, misma forma (generateAgudezaRows + un AgudezaConfig
  // sintetico fijo en landoltC, ver contrasteAgudezaConfig).
  const [contrasteRows, setContrasteRows] = useState<AgudezaRow[]>(() =>
    generateAgudezaRows(contrasteAgudezaConfig(DEFAULT_OPTOTIPOS_CONFIG.contraste), () => 0)
  );
  // Una orientacion sorteada POR CIRCULO de la rejilla sinusoidal (ver
  // generateRejillaOrientations) - mismo patron placeholder-seguro ->
  // valor real tras montar. Se renueva solo cuando cambia el nivel o el
  // contraste (ver regenerateRejillaOrientations), nunca al
  // redimensionar ni al contraer el menu.
  const [rejillaOrientations, setRejillaOrientations] = useState<RejillaOrientation[]>(() => generateRejillaOrientations(REJILLA_MAX_CIRCLE_COUNT, () => 0));
  const [view, setView] = useState<ViewMode>("config");
  const [fullscreenStatus, setFullscreenStatus] = useState<FullscreenStatus>("pending");
  // Aviso BREVE (no persistente, requisito explicito) de que el
  // fullscreen real no esta disponible - se autoculta a los 4s y nunca
  // se re-muestra salvo que se vuelva a entrar en presentacion.
  const [showFullscreenNotice, setShowFullscreenNotice] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [measuredMmInput, setMeasuredMmInput] = useState("");
  // Sin compensar (ratio=1) hasta medir la fuente REAL tras montar -
  // mismo criterio "placeholder seguro -> valor real tras el montaje"
  // que `agudezaRows`/`randomFn` mas abajo, nunca una constante fija
  // asumida (ver cabecera de measureGlyphHeightRatios).
  const [glyphHeightRatios, setGlyphHeightRatios] = useState<GlyphHeightRatios>(DEFAULT_GLYPH_HEIGHT_RATIOS);
  const presentationContainerRef = useRef<HTMLDivElement | null>(null);
  const [measuredRef, measuredSize] = useMeasuredSize();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAgudezaRows(generateAgudezaRows(DEFAULT_OPTOTIPOS_CONFIG.agudeza, Math.random));
    setContrasteRows(generateAgudezaRows(contrasteAgudezaConfig(DEFAULT_OPTOTIPOS_CONFIG.contraste), Math.random));
    setRejillaOrientations(generateRejillaOrientations(REJILLA_MAX_CIRCLE_COUNT, Math.random));
  }, []);

  // Mide la compensacion de altura de glifo REAL tras confirmar que las
  // fuentes solicitadas por CSS ya terminaron de cargar
  // (`document.fonts.ready`) - nunca antes, para no medir una fuente de
  // respaldo temporal y quedarse con un valor incorrecto. Si la API no
  // existe (navegador antiguo) o no hay fuentes que esperar, se mide de
  // inmediato (document.fonts.ready tambien se resuelve igualmente en
  // ese caso, pero el guard cubre entornos sin la API por completo).
  useEffect(() => {
    let cancelled = false;
    const applyMeasurement = () => {
      if (cancelled) return;
      setGlyphHeightRatios(measureGlyphHeightRatios());
    };
    if (typeof document !== "undefined" && document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(applyMeasurement).catch(applyMeasurement);
    } else {
      applyMeasurement();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Cambiar symbolType regenera de forma SINCRONA (mismo manejador,
  // nunca un efecto reactivo aparte - leccion aprendida en
  // McDonaldClient.tsx/PanalesClient.tsx); cambiar SOLO blockIndex,
  // viewingDistanceCm o rojoVerdeEnabled (navegar/calibrar/activar el
  // modo rojo-verde NUNCA debe generar contenido nuevo, solo cambia que
  // tamaño/como se pinta el mismo contenido) no regenera nada.
  const handleAgudezaChange = useCallback(
    (next: AgudezaConfig) => {
      const prev = config.agudeza;
      setConfig((p) => ({ ...p, agudeza: next }));
      if (next.symbolType !== prev.symbolType) {
        setAgudezaRows(generateAgudezaRows(next, Math.random));
      }
    },
    [config.agudeza]
  );

  // Rojo-verde ya no tiene contenido propio - cambiar sus tonos nunca
  // regenera nada.
  const handleRojoVerdeChange = useCallback((next: RojoVerdeConfig) => setConfig((p) => ({ ...p, rojoVerde: next })), []);

  // circuloHorario/fijacion/worth/alineamientoBinocular no tienen ningun
  // componente aleatorio - todos sus campos son puramente cosmeticos.
  const handleCirculoHorarioChange = useCallback((next: CirculoHorarioConfig) => setConfig((p) => ({ ...p, circuloHorario: next })), []);
  const handleFijacionChange = useCallback((next: FijacionConfig) => setConfig((p) => ({ ...p, fijacion: next })), []);
  const handleWorthChange = useCallback((next: WorthConfig) => setConfig((p) => ({ ...p, worth: next })), []);
  const handleAlineamientoBinocularChange = useCallback((next: AlineamientoBinocularConfig) => setConfig((p) => ({ ...p, alineamientoBinocular: next })), []);

  // Contraste: cambiar blockIndex/viewingDistanceCm NUNCA regenera
  // contenido (mismo criterio que Agudeza: solo navegar/cambiar
  // distancia no debe alterar que optotipos se muestran). El unico
  // campo que NO existe aqui, a proposito, es symbolType: la prueba de
  // contraste SIEMPRE usa C de Landolt, nunca hay nada que regenerar
  // por un cambio de tipo de simbolo.
  const handleContrasteChange = useCallback((next: ContrasteConfig) => setConfig((p) => ({ ...p, contraste: next })), []);
  // Distancia de exploracion NUNCA regenera las orientaciones (no cambia
  // ni el nivel ni el contraste) - por eso esta funcion esta separada de
  // regenerateRejillaOrientations en vez de llamarla siempre: cada sitio
  // que SI cambia nivel/contraste (botones, slider, teclado) la invoca
  // explicitamente a continuacion (ver OptotiposControls mas abajo).
  const handleRejillaChange = useCallback((next: RejillaConfig) => setConfig((p) => ({ ...p, rejillaSinusoidal: next })), []);
  const regenerateRejillaOrientations = useCallback(() => {
    setRejillaOrientations(generateRejillaOrientations(REJILLA_MAX_CIRCLE_COUNT, Math.random));
  }, []);

  const handleSelectTest = useCallback((test: OptotipoTestId) => setConfig((p) => ({ ...p, activeTest: test })), []);

  // Regenerar se ofrece en Agudeza visual (el modo rojo-verde lee el
  // MISMO `agudezaRows`, por lo que tambien se regenera si esta activo)
  // y en Contraste (su propia `contrasteRows`, independiente) - nunca
  // cambia la agudeza/tamaño fisico/distancia/calibracion, solo el
  // contenido aleatorio (requisito explicito).
  const handleRegenerate = useCallback(() => {
    if (config.activeTest === "agudeza") setAgudezaRows(generateAgudezaRows(config.agudeza, Math.random));
    else if (config.activeTest === "contraste") setContrasteRows(generateAgudezaRows(contrasteAgudezaConfig(config.contraste), Math.random));
  }, [config]);

  // Navegacion con el teclado - SOLO durante la presentacion a pantalla
  // completa (requisito explicito: "la previsualizacion no debe
  // permitir navegar entre bloques... los botones y las flechas se
  // utilizaran durante la presentacion"). Se ignora si el foco esta en
  // un control de formulario (inputs de la propia vista de
  // configuracion, aunque en la practica ya no es visible ahi).
  //
  // - Agudeza visual (y su modo rojo-verde, mismo contenido
  //   subyacente): flecha abajo/derecha = siguiente bloque (optotipos
  //   mas pequeños, mayor agudeza); arriba/izquierda = bloque anterior.
  // - Contraste: arriba/abajo cambian la AGUDEZA (bloque, mismo sistema
  //   que Agudeza visual - mismo tamaño fisico segun distancia y
  //   calibracion); izquierda/derecha cambian el CONTRASTE, sin tocar
  //   el tamaño ni la agudeza (parametros independientes, requisito
  //   explicito).
  // - Rejilla sinusoidal: abajo/arriba avanzan/retroceden en la
  //   secuencia discreta de niveles de frecuencia (limites claros, nunca
  //   avanza indefinidamente - mismo sentido abajo=avanzar que Agudeza/
  //   Contraste); derecha/izquierda cambian el contraste en pasos de 5
  //   puntos (mismo sentido derecha=sube que Contraste). Los 4 circulos
  //   comparten nivel y contraste; la orientacion de cada uno se sortea
  //   de nuevo en cada cambio (ver regenerateRejillaOrientations), ya no
  //   se controla a mano.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (view !== "presentation") return;
      const isArrow = event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight";
      if (!isArrow) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;

      if (config.activeTest === "agudeza") {
        const isNext = event.key === "ArrowDown" || event.key === "ArrowRight";
        event.preventDefault();
        const delta = isNext ? 1 : -1;
        setConfig((p) => ({ ...p, agudeza: { ...p.agudeza, blockIndex: clampAgudezaBlockIndex(p.agudeza.blockIndex + delta) } }));
        return;
      }

      if (config.activeTest === "contraste") {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          const delta = event.key === "ArrowDown" ? 1 : -1;
          setConfig((p) => ({ ...p, contraste: { ...p.contraste, blockIndex: clampAgudezaBlockIndex(p.contraste.blockIndex + delta) } }));
        } else {
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? CONTRASTE_KEYBOARD_STEP_PERCENT : -CONTRASTE_KEYBOARD_STEP_PERCENT;
          setConfig((p) => ({ ...p, contraste: { ...p.contraste, contrastPercent: snapContrastPercentToStep(p.contraste.contrastPercent + delta) } }));
        }
        return;
      }

      if (config.activeTest === "rejillaSinusoidal") {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          // Abajo = siguiente nivel (mas frecuencia, bandas mas finas),
          // arriba = nivel anterior (menos frecuencia) - mismo sentido
          // abajo/derecha=avanzar que Agudeza visual y Contraste.
          event.preventDefault();
          const delta = event.key === "ArrowDown" ? 1 : -1;
          setConfig((p) => ({
            ...p,
            rejillaSinusoidal: { ...p.rejillaSinusoidal, frequencyLevelIndex: clampRejillaFrequencyLevelIndex(p.rejillaSinusoidal.frequencyLevelIndex + delta) },
          }));
        } else {
          // Derecha = mas contraste, izquierda = menos - mismo sentido
          // que la prueba de Contraste (C de Landolt).
          event.preventDefault();
          const delta = event.key === "ArrowRight" ? CONTRASTE_STEP_PERCENT : -CONTRASTE_STEP_PERCENT;
          setConfig((p) => ({
            ...p,
            rejillaSinusoidal: { ...p.rejillaSinusoidal, contrastPercent: snapContrastPercentToStep(p.rejillaSinusoidal.contrastPercent + delta) },
          }));
        }
        // Nivel/contraste compartidos por los 4 circulos; la orientacion
        // de cada uno se vuelve a sortear en CADA cambio (requisito
        // explicito), nunca se queda fija.
        regenerateRejillaOrientations();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config.activeTest, view, regenerateRejillaOrientations]);

  // Fullscreen real: mismo patron ya probado en Hart/McDonald/Panales.
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

  // Muestra el aviso de "fullscreen real no disponible" solo un
  // instante (nunca permanente, requisito explicito) y en una esquina
  // que nunca tapa el estimulo centrado.
  useEffect(() => {
    if (fullscreenStatus !== "unavailable") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowFullscreenNotice(true);
    const timer = setTimeout(() => setShowFullscreenNotice(false), 4000);
    return () => clearTimeout(timer);
  }, [fullscreenStatus]);

  // Limpieza al desmontar - nunca deja la pagina atascada en fullscreen
  // real tras salir de la herramienta.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const handleEnterPresentation = useCallback(() => {
    // En movil, el menu de anchura fija dejaria un area de estimulo
    // minuscula en una pantalla estrecha - arranca contraido (el boton
    // "» Controles" lo reabre igualmente).
    setSidebarCollapsed(window.innerWidth < 640);
    setCalibrating(false);
    setView("presentation");
  }, []);
  const handleExitPresentation = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setFullscreenStatus("pending");
    setCalibrating(false);
    setView("config");
  }, []);

  const handleStartCalibration = useCallback(() => {
    setMeasuredMmInput("");
    setCalibrating(true);
  }, []);
  const handleCancelCalibration = useCallback(() => setCalibrating(false), []);
  const handleSaveCalibration = useCallback(() => {
    const measuredMm = Number(measuredMmInput);
    if (!isValidCalibrationMeasuredMm(measuredMm)) return;
    setConfig((p) => ({ ...p, calibration: { pxPerMm: computeCalibratedPxPerMm(measuredMm) } }));
    setCalibrating(false);
  }, [measuredMmInput]);
  const handleClearCalibration = useCallback(() => setConfig((p) => ({ ...p, calibration: null })), []);

  const blockStart = AGUDEZA_BLOCK_START_INDEX[clampAgudezaBlockIndex(config.agudeza.blockIndex)];
  const visibleAgudezaRows = agudezaRows.slice(blockStart, blockStart + AGUDEZA_BLOCK_SIZE);
  const contrasteBlockStart = AGUDEZA_BLOCK_START_INDEX[clampAgudezaBlockIndex(config.contraste.blockIndex)];
  const visibleContrasteRows = contrasteRows.slice(contrasteBlockStart, contrasteBlockStart + AGUDEZA_BLOCK_SIZE);
  // Previsualizacion (vista de configuracion): SIEMPRE el bloque de
  // referencia fijo, nunca `config.agudeza.blockIndex`/
  // `config.contraste.blockIndex` (requisito explicito - ver
  // PREVIEW_AGUDEZA_BLOCK_INDEX). La navegacion real de bloques solo
  // tiene efecto en pantalla completa.
  const previewBlockStart = AGUDEZA_BLOCK_START_INDEX[PREVIEW_AGUDEZA_BLOCK_INDEX];
  const visiblePreviewAgudezaRows = agudezaRows.slice(previewBlockStart, previewBlockStart + AGUDEZA_BLOCK_SIZE);
  const visiblePreviewContrasteRows = contrasteRows.slice(previewBlockStart, previewBlockStart + AGUDEZA_BLOCK_SIZE);
  // Estado de calibracion mostrado en el panel lateral - SIEMPRE
  // calculado contra el area COMPLETA medida, independiente de si el
  // modo rojo-verde esta activo: es la señal util de "esta
  // configuracion de distancia/calibracion es fisicamente valida", no
  // una medida de lo que ocupa cada mitad en modo rojo-verde.
  const activeGlyphHeightRatio = getGlyphHeightRatio(config.agudeza.symbolType, glyphHeightRatios);
  const agudezaLayout = computeAgudezaLayout(visibleAgudezaRows, config.agudeza, config.calibration, activeGlyphHeightRatio, measuredSize.width, measuredSize.height);
  // Aviso de legibilidad: compara el tamaño EFECTIVO (tinta real
  // dibujada, `symbolSizePx * glyphHeightRatio`), no el `symbolSizePx`
  // en si - tras la correccion de altura de glifo, `symbolSizePx` es un
  // `font-size` ya agrandado para compensar, asi que ya NO coincide con
  // la altura de tinta real. El optotipo MAS PEQUEÑO del bloque visible
  // es el que primero cae por debajo del piso - solo tiene sentido
  // avisar cuando el tamaño mostrado SI es el fisicamente calibrado y
  // SI cabe (si no cabe, ya existe el aviso correspondiente y no hay
  // nada que renderizar de todos modos).
  const smallestVisibleEffectiveSymbolPx = agudezaLayout.sizedRows ? Math.min(...agudezaLayout.sizedRows.map((r) => r.symbolSizePx)) * activeGlyphHeightRatio : 0;
  const belowLegibleFloor = agudezaLayout.isCalibrated && isBelowLegibleFloor(smallestVisibleEffectiveSymbolPx);

  // Previsualizacion (view==="config"): tamaño ESTANDAR y estable,
  // nunca el fisico/clinico (requisito explicito) - se logra
  // reutilizando el modo YA EXISTENTE "sin calibrar" de
  // computeAgudezaLayout (proporciones correctas, maximo que cabe de
  // forma limpia en el contenedor, independiente de distancia/
  // calibracion/bloque) simplemente forzando `calibration={null}` y el
  // bloque de referencia fijo, SOLO para la previsualizacion - la
  // presentacion a pantalla completa sigue usando `config.calibration`
  // y el bloque real sin ningun cambio.
  const isPreview = view === "config";
  // Las letras de la previsualizacion resultaban "agobiantes" (requisito
  // explicito) al ocupar casi todo el cuadro con el modo "sin calibrar"
  // (que maximiza el tamaño por diseño, pensado para la PRESENTACION sin
  // calibrar, no para una vista previa). Se le pasa a
  // computeAgudezaLayout un contenedor VIRTUALMENTE mas pequeño
  // (PREVIEW_SIZE_SCALE) solo para este calculo - el <div> real que lo
  // envuelve sigue ocupando el cuadro completo y centra su contenido
  // (`items-center justify-center`), asi que el resultado visual es
  // "letras mas pequeñas, mismo centrado, margenes generados
  // automaticamente alrededor" sin tocar NINGUN calculo de tamaño fisico
  // (ese sigue dependiendo solo de `calibration`, que aqui se fuerza a
  // `null`, nunca de este factor). Misma logica para el modo rojo-verde
  // y para Contraste.
  const PREVIEW_SIZE_SCALE = 0.6;
  const previewWidthPx = (w: number) => (isPreview ? w * PREVIEW_SIZE_SCALE : w);
  const previewHeightPx = (h: number) => (isPreview ? h * PREVIEW_SIZE_SCALE : h);
  const renderActiveTest = (containerWidthPx: number, containerHeightPx: number) => {
    switch (config.activeTest) {
      case "agudeza":
        return config.agudeza.rojoVerdeEnabled ? (
          <RojoVerdeView
            rows={isPreview ? visiblePreviewAgudezaRows : visibleAgudezaRows}
            agudezaConfig={config.agudeza}
            calibration={isPreview ? null : config.calibration}
            glyphHeightRatios={glyphHeightRatios}
            rojoVerdeConfig={config.rojoVerde}
            containerWidthPx={previewWidthPx(containerWidthPx)}
            containerHeightPx={previewHeightPx(containerHeightPx)}
          />
        ) : (
          <AgudezaView
            rows={isPreview ? visiblePreviewAgudezaRows : visibleAgudezaRows}
            config={config.agudeza}
            calibration={isPreview ? null : config.calibration}
            glyphHeightRatios={glyphHeightRatios}
            containerWidthPx={previewWidthPx(containerWidthPx)}
            containerHeightPx={previewHeightPx(containerHeightPx)}
          />
        );
      case "circuloHorario":
        return <CirculoHorarioView config={config.circuloHorario} containerWidthPx={containerWidthPx} containerHeightPx={containerHeightPx} />;
      case "fijacion":
        return <FijacionView config={config.fijacion} containerWidthPx={containerWidthPx} containerHeightPx={containerHeightPx} />;
      case "worth":
        return <WorthView config={config.worth} containerWidthPx={containerWidthPx} containerHeightPx={containerHeightPx} />;
      case "alineamientoBinocular":
        return <AlineamientoBinocularView config={config.alineamientoBinocular} containerWidthPx={containerWidthPx} containerHeightPx={containerHeightPx} />;
      case "contraste":
        return (
          <ContrasteView
            rows={isPreview ? visiblePreviewContrasteRows : visibleContrasteRows}
            config={config.contraste}
            calibration={isPreview ? null : config.calibration}
            containerWidthPx={previewWidthPx(containerWidthPx)}
            containerHeightPx={previewHeightPx(containerHeightPx)}
          />
        );
      case "rejillaSinusoidal":
        return (
          <SinusoidalGratingView
            config={config.rejillaSinusoidal}
            orientations={rejillaOrientations}
            calibration={config.calibration}
            containerWidthPx={containerWidthPx}
            containerHeightPx={containerHeightPx}
            previewMode={isPreview}
          />
        );
      default:
        return null;
    }
  };

  const needsFullBleed =
    (config.activeTest === "agudeza" && config.agudeza.rojoVerdeEnabled) ||
    config.activeTest === "fijacion" ||
    config.activeTest === "worth" ||
    config.activeTest === "alineamientoBinocular" ||
    config.activeTest === "rejillaSinusoidal";
  const needsBlackWrapper = config.activeTest === "fijacion" || config.activeTest === "worth" || config.activeTest === "alineamientoBinocular";

  const controlsPanel = calibrating ? (
    <CalibrationForm measuredMmInput={measuredMmInput} onMeasuredMmInputChange={setMeasuredMmInput} onSave={handleSaveCalibration} onCancel={handleCancelCalibration} />
  ) : (
    <OptotiposControls
      config={config}
      agudezaLayout={agudezaLayout}
      belowLegibleFloor={belowLegibleFloor}
      onSelectTest={handleSelectTest}
      onAgudezaChange={handleAgudezaChange}
      onCirculoHorarioChange={handleCirculoHorarioChange}
      onRojoVerdeChange={handleRojoVerdeChange}
      onFijacionChange={handleFijacionChange}
      onWorthChange={handleWorthChange}
      onAlineamientoBinocularChange={handleAlineamientoBinocularChange}
      onContrasteChange={handleContrasteChange}
      onRejillaChange={handleRejillaChange}
      onRejillaRegenerate={regenerateRejillaOrientations}
      onRegenerate={handleRegenerate}
      onStartCalibration={handleStartCalibration}
      onClearCalibration={handleClearCalibration}
      compact
      showRegenerateButton={view !== "config"}
      showBlockNavigation={view !== "config"}
    />
  );

  // Vista de PRESENTACION: menu lateral IZQUIERDO de anchura FIJA
  // (nunca cambia entre pruebas), contraible sin salir de pantalla
  // completa; el resto de la pantalla es el area de estimulo - un flex
  // sibling real, centrado en SU PROPIA area (nunca respecto a toda la
  // pantalla incluido el menu).
  if (view === "presentation") {
    return (
      <div ref={presentationContainerRef} className="fixed inset-0 z-50 flex bg-white">
        <div
          className="flex h-full shrink-0 flex-col overflow-hidden border-r border-orion-navy-100 bg-white transition-[width] duration-150"
          style={{ width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH_PX : `min(${SIDEBAR_WIDTH_PX}px, 85vw)` }}
        >
          <div className="flex items-center justify-between border-b border-orion-navy-100 p-2">
            {!sidebarCollapsed && <span className="truncate text-xs font-bold uppercase tracking-wide text-[#1a8f60]">Optotipos</span>}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="shrink-0 rounded-lg border border-orion-navy-200 px-2 py-1 text-xs font-semibold text-orion-navy-700 hover:border-orion-navy-400"
              title={sidebarCollapsed ? "Mostrar controles" : "Contraer controles"}
            >
              {sidebarCollapsed ? "»" : "«"}
            </button>
          </div>
          {!sidebarCollapsed && <div className="min-h-0 flex-1 overflow-y-auto p-2.5">{controlsPanel}</div>}
        </div>

        <div
          ref={measuredRef}
          className={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden ${needsBlackWrapper ? "bg-black" : "bg-white"} ${needsFullBleed ? "" : "p-[3vmin]"}`}
        >
          {measuredSize.width > 0 && (calibrating ? <CalibrationRulerView /> : renderActiveTest(measuredSize.width, measuredSize.height))}
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="absolute left-3 top-3 rounded-xl border border-orion-navy-200 bg-white/95 px-3 py-2 text-xs font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
            >
              » Controles
            </button>
          )}
          {showFullscreenNotice && (
            <p className="absolute right-3 top-3 max-w-[220px] rounded-md bg-white/90 px-2 py-1 text-[0.7rem] text-orion-navy-700 shadow-sm">
              Pantalla completa real no disponible: la presentación sigue funcionando con normalidad.
            </p>
          )}
        </div>

        {/* Boton de salida UNICO, SIEMPRE visible (independiente de si el
            menu lateral esta contraido) - mismo patron ya establecido en
            ORION Play (ver ExerciseStopButton.tsx: esquina inferior
            DERECHA, circular, discreto) en vez de inventar una posicion
            nueva. Hermano directo de las dos columnas, dentro del MISMO
            elemento que entra en fullscreen real (presentationContainerRef)
            - nunca tapa el estimulo, que esta centrado en el resto del
            area. */}
        <button
          type="button"
          onClick={handleExitPresentation}
          aria-label="Salir de pantalla completa"
          title="Salir de pantalla completa"
          className="fixed bottom-6 right-6 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-orion-navy-200 bg-white/95 text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
        >
          ✕
        </button>
      </div>
    );
  }

  const canRegenerateHere = config.activeTest === "agudeza" || config.activeTest === "contraste";

  return (
    <div className="mx-auto flex h-full min-h-[60vh] w-full max-w-[1800px] flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="shrink-0 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-[#1a8f60]">ORION TOOLS</p>
        <h1 className="text-lg font-bold text-orion-navy-900">Optotipos</h1>
      </div>

      {/* 200px debe coincidir con SIDEBAR_WIDTH_PX - Tailwind no permite
          interpolar la constante JS en una clase arbitraria (se resuelve
          en build time, no en runtime). */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[200px_1fr]">
        <div className="min-w-0 space-y-2.5 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
          <div className="rounded-xl border border-orion-navy-100 bg-white p-3">{controlsPanel}</div>
        </div>

        {/* "Regenerar" e "Iniciar en pantalla completa" viven AQUI (no en
            la columna izquierda, requisito explicito) - esquina inferior
            derecha del cuadro de previsualizacion, en la MISMA fila, sin
            tapar ni desplazar el estimulo (que sigue centrado en el resto
            del area). "Regenerar" NUNCA cambia la agudeza/tamaño
            fisico/distancia/calibracion, solo el contenido aleatorio. */}
        <div
          ref={measuredRef}
          className={`relative flex min-h-[40vh] items-center justify-center overflow-hidden rounded-xl border border-orion-navy-100 lg:min-h-0 ${needsBlackWrapper ? "bg-black" : "bg-white"}`}
        >
          {measuredSize.width > 0 && (calibrating ? <CalibrationRulerView /> : renderActiveTest(measuredSize.width, measuredSize.height))}
          {!calibrating && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              {canRegenerateHere && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="rounded-lg border border-orion-navy-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 shadow hover:bg-orion-navy-50"
                >
                  Regenerar
                </button>
              )}
              <button
                type="button"
                onClick={handleEnterPresentation}
                className="rounded-lg bg-orion-navy-950 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-orion-navy-900"
              >
                Iniciar en pantalla completa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
