/**
 * Logica PURA de ORION Tools · Cartas · Hart - tipos, configuracion por
 * defecto, generacion de contenido/color de la rejilla y
 * validacion/migracion de la configuracion serializada. Sin ningun
 * import de React/Next/Supabase, mismo patron ya establecido en
 * stimulusGenerator/stimulusConfig.ts y oculomotor/oculomotorConfig.ts,
 * para poder probarla con node --test.
 *
 * SIN PERSISTENCIA en esta fase (pedido explicitamente: "no crees
 * acciones de persistencia... el guardado con nombre se abordara en una
 * fase posterior") - `schemaVersion`/migrate/isValid/resolve ya se
 * incluyen desde ya para que una futura fase de presets no tenga que
 * reescribir la forma de la configuracion, solo añadir el guardado.
 *
 * SIN IMPORTAR BASE_LETTERS/BASE_NUMBERS aqui a proposito (mismo criterio
 * ya documentado en oculomotorConfig.ts para pickNextRandomColor/
 * pickNextRandomElement): este modulo no tiene NINGUNA dependencia
 * externa, ni siquiera de otro modulo de herramienta - generateHartGrid/
 * generateHartCells reciben el "pool" de contenido como PARAMETRO: es
 * HartClient.tsx quien importa los catalogos compartidos de
 * stimulusConfig.ts y decide que pool corresponde a cada HartContent.
 */

export type HartContent = "letters" | "numbers" | "mixed";
export type HartColorMode = "neutral" | "monochromeRed" | "monochromeGreen" | "redGreen";
export type HartPresentation = "near" | "far";
export type HartSize = "sm" | "md" | "lg";

export const HART_CONTENT_VALUES: readonly HartContent[] = ["letters", "numbers", "mixed"];
export const HART_COLOR_MODE_VALUES: readonly HartColorMode[] = ["neutral", "monochromeRed", "monochromeGreen", "redGreen"];
export const HART_PRESENTATION_VALUES: readonly HartPresentation[] = ["near", "far"];
export const HART_SIZE_VALUES: readonly HartSize[] = ["sm", "md", "lg"];

/** Limites de filas/columnas - evitan tanto una carta degenerada (0
 * celdas) como una excesiva (rejillas enormes, ilegibles en pantalla y
 * costosas de renderizar). No corresponden a ningun estandar clinico del
 * Hart Chart - son un limite de seguridad de la herramienta, pensado
 * para dejar sitio de sobra al 4x8 por defecto en cualquier direccion. */
export const HART_MIN_ROWS = 1;
export const HART_MAX_ROWS = 10;
export const HART_MIN_COLUMNS = 1;
export const HART_MAX_COLUMNS = 12;

export function isValidHartDimensions(rows: number, columns: number): boolean {
  return (
    Number.isInteger(rows) &&
    rows >= HART_MIN_ROWS &&
    rows <= HART_MAX_ROWS &&
    Number.isInteger(columns) &&
    columns >= HART_MIN_COLUMNS &&
    columns <= HART_MAX_COLUMNS
  );
}

export function clampHartRows(value: number): number {
  if (!Number.isFinite(value)) return HART_MIN_ROWS;
  return Math.min(HART_MAX_ROWS, Math.max(HART_MIN_ROWS, Math.round(value)));
}

export function clampHartColumns(value: number): number {
  if (!Number.isFinite(value)) return HART_MIN_COLUMNS;
  return Math.min(HART_MAX_COLUMNS, Math.max(HART_MIN_COLUMNS, Math.round(value)));
}

/** "Negro sobre blanco" del modo 'neutral' - el MISMO hex que ya usa la
 * paleta compartida para "negro" (BASE_COLOR_PALETTE en
 * stimulusConfig.ts), para no inventar un tono nuevo fuera de esa
 * paleta. */
export const HART_NEUTRAL_COLOR = "#10203f";
/** Rojo/verde de partida - deliberadamente los MISMOS hex que ya usa
 * BASE_COLOR_PALETTE para "rojo"/"verde" (consistencia visual con el
 * resto de ORION), pero NUNCA presentados como clinicamente calibrados:
 * son solo el punto de partida de un control de color libre, editable
 * por el profesional (ver HartColorFields en HartClient.tsx). */
export const HART_DEFAULT_RED = "#ef4444";
export const HART_DEFAULT_GREEN = "#22c55e";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

export const HART_SCHEMA_VERSION = 1;

export interface HartCardConfig {
  schemaVersion: typeof HART_SCHEMA_VERSION;
  rows: number;
  columns: number;
  content: HartContent;
  colorMode: HartColorMode;
  /** Usado si colorMode es 'monochromeRed' o 'redGreen'. */
  redHex: string;
  /** Usado si colorMode es 'monochromeGreen' o 'redGreen'. */
  greenHex: string;
  /** Preset de ESCALA/presentacion visual (tarjeta en linea vs pantalla
   * completa) - NUNCA una distancia fisica calibrada: el tamaño
   * percibido real depende del tamaño/resolucion fisicos de la pantalla
   * del profesional, que esta herramienta no puede conocer. */
  presentation: HartPresentation;
  size: HartSize;
}

export const DEFAULT_HART_CONFIG: HartCardConfig = {
  schemaVersion: HART_SCHEMA_VERSION,
  rows: 4,
  columns: 8,
  content: "letters",
  colorMode: "neutral",
  redHex: HART_DEFAULT_RED,
  greenHex: HART_DEFAULT_GREEN,
  presentation: "near",
  size: "md",
};

/** Elige el contenido de UNA celda de la rejilla, evitando que coincida
 * con su vecina INMEDIATA a la izquierda cuando sea posible ("evitar
 * letras identicas en celdas horizontalmente adyacentes... sin entrar en
 * bucles infinitos ni bloquear la generacion con configuraciones
 * pequeñas") - mismo patron ya usado en otras herramientas de ORION
 * (elegir entre los candidatos EXCLUYENDO al vecino si hay alternativa,
 * sin ningun bucle de reintento: con pool.length<=1 no hay alternativa
 * posible y se acepta la repeticion en vez de bloquear la generacion).
 * Reimplementado aqui (no importado de otro modulo de herramienta) por
 * la misma razon que el resto de patrones compartidos de ORION Tools:
 * cada modulo de herramienta es privado, solo los CATALOGOS
 * (BASE_LETTERS/BASE_NUMBERS) se comparten de verdad. */
function pickGridCell(pool: readonly string[], leftNeighbor: string | null, randomFn: () => number): string {
  if (pool.length === 0) return "";
  const candidates = pool.length > 1 && leftNeighbor != null ? pool.filter((c) => c !== leftNeighbor) : pool;
  const index = Math.min(Math.floor(randomFn() * candidates.length), candidates.length - 1);
  return candidates[index];
}

/** Genera el CONTENIDO de la rejilla (sin color), en orden de lectura
 * (fila por fila, izquierda a derecha) - longitud exacta rows*columns.
 * `pool` ya viene resuelto por el llamador segun el HartContent elegido
 * ('mixed' = letras+numeros combinados) - ver el comentario de cabecera
 * de este archivo sobre por que esta funcion no importa los catalogos
 * ella misma. */
export function generateHartGrid(rows: number, columns: number, pool: readonly string[], randomFn: () => number = Math.random): string[] {
  const cells: string[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const leftNeighbor = c === 0 ? null : cells[cells.length - 1];
      cells.push(pickGridCell(pool, leftNeighbor, randomFn));
    }
  }
  return cells;
}

/**
 * Distribucion rojo-verde EQUILIBRADA: para N estimulos, exactamente
 * `Math.ceil(N/2)` marcas "rojo" (true) y `Math.floor(N/2)` "verde"
 * (false), barajadas aleatoriamente (Durstenfeld/Fisher-Yates) - NUNCA
 * un sorteo independiente por celda (eso no garantiza equilibrio exacto,
 * sobre todo con N pequeño). Con N impar, el color con un estimulo mas
 * es SIEMPRE el rojo (ceil reparte el sobrante ahi) - decision arbitraria
 * documentada aqui, no un comportamiento aleatorio adicional.
 */
export function generateBalancedRedGreenFlags(n: number, randomFn: () => number = Math.random): boolean[] {
  const redCount = Math.ceil(n / 2);
  const flags: boolean[] = [];
  for (let i = 0; i < n; i += 1) flags.push(i < redCount);
  for (let i = flags.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    const tmp = flags[i];
    flags[i] = flags[j];
    flags[j] = tmp;
  }
  return flags;
}

export interface HartCell {
  content: string;
  color: string;
}

/** Resuelve el COLOR de cada celda segun `colorMode` - 'neutral'/
 * monocromo: el mismo color para todas; 'redGreen': distribucion
 * equilibrada (ver generateBalancedRedGreenFlags). Separado de
 * generateHartGrid (contenido) para poder re-resolver SOLO el color sin
 * volver a barajar el contenido si algun dia hiciera falta (hoy
 * generateHartCells llama a ambas juntas en cada regeneracion). */
export function resolveHartCellColors(colorMode: HartColorMode, redHex: string, greenHex: string, n: number, randomFn: () => number = Math.random): string[] {
  if (colorMode === "neutral") return Array(n).fill(HART_NEUTRAL_COLOR);
  if (colorMode === "monochromeRed") return Array(n).fill(redHex);
  if (colorMode === "monochromeGreen") return Array(n).fill(greenHex);
  return generateBalancedRedGreenFlags(n, randomFn).map((isRed) => (isRed ? redHex : greenHex));
}

/** Genera una carta COMPLETA (contenido + color por celda) a partir de
 * la configuracion - la unica funcion que la UI necesita llamar, tanto
 * al cambiar filas/columnas/contenido/color como al pulsar "Regenerar"
 * (mismos parametros, nuevo sorteo). `pool` = catalogo ya resuelto por
 * el llamador segun config.content (ver generateHartGrid). */
export function generateHartCells(config: HartCardConfig, pool: readonly string[], randomFn: () => number = Math.random): HartCell[] {
  const content = generateHartGrid(config.rows, config.columns, pool, randomFn);
  const colors = resolveHartCellColors(config.colorMode, config.redHex, config.greenHex, content.length, randomFn);
  return content.map((char, i) => ({ content: char, color: colors[i] }));
}

/** Sin version anterior que migrar todavia (esta ES la v1) - la funcion
 * ya existe desde ahora, con el punto de extension documentado, para que
 * una v2 futura (si cambia la forma de la configuracion) no tenga que
 * introducir esta funcion desde cero ni tocar el codigo que ya la llama
 * (OculomotorClient-equivalente). Nunca lanza con una entrada rara -
 * devuelve el valor tal cual, isValidHartCardConfig decide despues si
 * sirve. */
export function migrateHartCardConfig(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion === HART_SCHEMA_VERSION) return value;
  // Punto de extension: aqui irian las transformaciones incrementales de
  // una v0 (inexistente hoy) u otra version anterior hacia HART_SCHEMA_VERSION.
  return value;
}

export function isValidHartCardConfig(value: unknown): value is HartCardConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== HART_SCHEMA_VERSION) return false;
  if (typeof v.rows !== "number" || typeof v.columns !== "number" || !isValidHartDimensions(v.rows, v.columns)) return false;
  if (typeof v.content !== "string" || !HART_CONTENT_VALUES.includes(v.content as HartContent)) return false;
  if (typeof v.colorMode !== "string" || !HART_COLOR_MODE_VALUES.includes(v.colorMode as HartColorMode)) return false;
  if (!isValidHexColor(v.redHex)) return false;
  if (!isValidHexColor(v.greenHex)) return false;
  if (typeof v.presentation !== "string" || !HART_PRESENTATION_VALUES.includes(v.presentation as HartPresentation)) return false;
  if (typeof v.size !== "string" || !HART_SIZE_VALUES.includes(v.size as HartSize)) return false;
  return true;
}

/** Compone migrate+isValid - usada por una futura carga de preset
 * (fase posterior); ya definida ahora para que esa fase no tenga que
 * decidir de nuevo el criterio "migrado-pero-invalido -> null, nunca
 * lanza". Sin consumidor en ESTA fase (no hay guardado todavia), pero se
 * incluye y se prueba desde ya por la misma razon que schemaVersion. */
export function resolveHartCardConfig(raw: unknown): HartCardConfig | null {
  const migrated = migrateHartCardConfig(raw);
  return isValidHartCardConfig(migrated) ? (migrated as HartCardConfig) : null;
}
