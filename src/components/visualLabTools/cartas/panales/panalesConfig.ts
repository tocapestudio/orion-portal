/**
 * Logica PURA de ORION Tools · Cartas · Panales - mismo patron ya
 * establecido en hartConfig.ts/mcdonaldConfig.ts: tipos, config por
 * defecto, generacion de contenido/color/geometria y
 * validacion/migracion de la configuracion serializada. Sin ningun
 * import de React/Next/Supabase ni de otro modulo de herramienta: cada
 * herramienta de Cartas es privada (ni siquiera el catalogo de numeros
 * se comparte aqui - ver PANALES_NUMBER_POOL mas abajo, 1-9 SIN el 0,
 * distinto del BASE_NUMBERS de stimulusGenerator/stimulusConfig.ts que
 * SI incluye el 0 - por eso no se reutiliza ese catalogo).
 *
 * GEOMETRIA: panal de hexagonos "punta arriba" (pointy-top: vertice
 * arriba/abajo, lados verticales planos izquierda/derecha) en filas
 * alternas desplazadas horizontalmente media anchura de hexagono - el
 * patron de "offset rows" estandar para este tipo de hexagono (al
 * reves que los hexagonos "flat-top", que se desplazan en columnas).
 * `computeHexGridLayout(rows, columns)` es PURA: no conoce pixeles,
 * devuelve unicamente PORCENTAJES relativos a un contenedor cuya propia
 * proporcion (`containerAspectRatio`) tambien calcula - la UI es quien
 * decide el tamaño en pixeles real del contenedor (ajustandolo para
 * ocupar el maximo espacio disponible sin deformar los hexagonos,
 * manteniendo siempre esa proporcion exacta).
 *
 * Unidades: radio de hexagono R=1 (centro a vertice). Con esa unidad:
 *   anchura de un hexagono = R*sqrt(3)
 *   altura de un hexagono   = 2R
 *   separacion horizontal entre centros de la MISMA fila = anchura
 *   separacion vertical entre centros de filas consecutivas = 1.5R
 *     (las filas se "entrelazan": cada fila deja solo 3/4 de la altura
 *     del hexagono hasta la siguiente, el patron de panal clasico)
 *   filas impares (indice 1, 3, 5...) desplazadas media anchura a la
 *     derecha
 * anchura total del panal = (columns + 0.5) * anchura_hexagono (el +0.5
 *   dejal sitio exacto para el desplazamiento de las filas impares sin
 *   que su ultimo hexagono se salga del contenedor)
 * altura total del panal = altura_hexagono + (rows-1) * 1.5R
 *
 * SEPARACION VISIBLE entre hexagonos (requisito explicito: "no deben
 * compartir bordes ni formar una malla continua"): esta funcion calcula
 * la posicion/tamaño de la REJILLA (los huecos "a tope"); el hexagono
 * VISIBLE que dibuja la UI se renderiza mas pequeño que su celda
 * asignada (un factor de encogimiento, ver PANALES_HEX_FILL_RATIO en
 * PanalesClient.tsx) - la geometria pura no necesita saber nada de esto,
 * es una decision de presentacion (mismo criterio que "colores NUNCA
 * presentados como calibrados" en Hart/McDonald: la geometria define
 * SOLO la retícula, la UI decide el relleno visual).
 */

/** Controla a la vez el tamaño GEOMETRICO de los hexagonos (ver
 * PANALES_CELL_SCALE en PanalesClient.tsx) y el de los numeros - antes
 * solo afectaba a la tipografia, ampliado a peticion explicita para que
 * tambien escale la celda. */
export type PanalesCellSize = "sm" | "md" | "lg";
export const PANALES_CELL_SIZE_VALUES: readonly PanalesCellSize[] = ["sm", "md", "lg"];

/** Numeros 1-9 (SIN el 0) - requisito explicito "números del 1 al 9". */
export const PANALES_NUMBER_POOL: readonly string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Mismos hex que BASE_COLOR_PALETTE (stimulusConfig.ts) para "rojo"/
 * "azul" - reimplementados aqui, no importados, mismo criterio ya
 * documentado en hartConfig.ts/mcdonaldConfig.ts. Valores de partida
 * (configurables por el profesional, ver redHex/blueHex mas abajo) -
 * NUNCA presentados como colores clinicamente calibrados. */
export const PANALES_DEFAULT_RED = "#ef4444";
export const PANALES_DEFAULT_BLUE = "#3b82f6";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

/** Limites de filas/columnas - evitan una carta degenerada o
 * excesivamente densa. 8x8 por defecto, tomando como referencia la
 * densidad visual de la plantilla proporcionada (8 filas x 8 columnas en
 * todas las paginas de ejemplo). No son un estandar clinico, son un
 * limite de seguridad/usabilidad de esta herramienta. */
export const PANALES_MIN_ROWS = 3;
export const PANALES_MAX_ROWS = 12;
export const PANALES_MIN_COLUMNS = 3;
export const PANALES_MAX_COLUMNS = 14;
export const PANALES_DEFAULT_ROWS = 8;
export const PANALES_DEFAULT_COLUMNS = 8;

export function clampPanalesRows(value: number): number {
  if (!Number.isFinite(value)) return PANALES_DEFAULT_ROWS;
  return Math.min(PANALES_MAX_ROWS, Math.max(PANALES_MIN_ROWS, Math.round(value)));
}

export function clampPanalesColumns(value: number): number {
  if (!Number.isFinite(value)) return PANALES_DEFAULT_COLUMNS;
  return Math.min(PANALES_MAX_COLUMNS, Math.max(PANALES_MIN_COLUMNS, Math.round(value)));
}

export function isValidPanalesDimensions(rows: number, columns: number): boolean {
  return (
    Number.isInteger(rows) &&
    rows >= PANALES_MIN_ROWS &&
    rows <= PANALES_MAX_ROWS &&
    Number.isInteger(columns) &&
    columns >= PANALES_MIN_COLUMNS &&
    columns <= PANALES_MAX_COLUMNS
  );
}

export const PANALES_SCHEMA_VERSION = 1;

export interface PanalesCardConfig {
  schemaVersion: typeof PANALES_SCHEMA_VERSION;
  rows: number;
  columns: number;
  /** Tamaño de CELDA (hexagono + numero juntos, ver cabecera del tipo
   * PanalesCellSize). */
  cellSize: PanalesCellSize;
  /** Tono usado en las celdas marcadas como rojas. */
  redHex: string;
  /** Tono usado en las celdas marcadas como azules. */
  blueHex: string;
}

export const DEFAULT_PANALES_CONFIG: PanalesCardConfig = {
  schemaVersion: PANALES_SCHEMA_VERSION,
  rows: PANALES_DEFAULT_ROWS,
  columns: PANALES_DEFAULT_COLUMNS,
  cellSize: "md",
  redHex: PANALES_DEFAULT_RED,
  blueHex: PANALES_DEFAULT_BLUE,
};

export interface PanalesHexCell {
  row: number;
  col: number;
  /** Posicion del CENTRO del hexagono, en % del contenedor (0-100). */
  xPercent: number;
  yPercent: number;
}

export interface PanalesHexGridLayout {
  /** Proporcion ancho/alto EXACTA que debe tener el contenedor para que
   * los hexagonos no se deformen - la UI dimensiona el contenedor con
   * esta proporcion (p.ej. CSS aspect-ratio) y ajusta su tamaño para
   * maximizar el espacio disponible sin desbordar. */
  containerAspectRatio: number;
  /** Anchura/altura de CADA hexagono, en % del ANCHO del contenedor
   * (iguales para los dos ejes salvo por containerAspectRatio: la UI
   * multiplica hexWidthPercent por el ancho real en pixeles, y
   * hexHeightPercent por el alto real en pixeles, del contenedor ya
   * dimensionado). */
  hexWidthPercent: number;
  hexHeightPercent: number;
  cells: PanalesHexCell[];
}

/** Calcula la rejilla de hexagonos "punta arriba" en filas alternas
 * desplazadas (ver cabecera del archivo) - PURA, sin pixeles. `rows`/
 * `columns` se clampan primero (nunca lanza con valores fuera de
 * rango). */
export function computeHexGridLayout(rows: number, columns: number): PanalesHexGridLayout {
  const r = clampPanalesRows(rows);
  const c = clampPanalesColumns(columns);

  const hexWidthUnits = Math.sqrt(3); // R=1
  const hexHeightUnits = 2;
  const rowSpacingUnits = 1.5; // 0.75 * hexHeightUnits

  const totalWidthUnits = (c + 0.5) * hexWidthUnits;
  const totalHeightUnits = hexHeightUnits + (r - 1) * rowSpacingUnits;

  const cells: PanalesHexCell[] = [];
  for (let row = 0; row < r; row += 1) {
    const rowOffsetUnits = row % 2 === 1 ? hexWidthUnits / 2 : 0;
    const yCenterUnits = 1 + row * rowSpacingUnits; // R=1: primer centro a 1 unidad del borde superior
    for (let col = 0; col < c; col += 1) {
      const xCenterUnits = rowOffsetUnits + (col + 0.5) * hexWidthUnits;
      cells.push({
        row,
        col,
        xPercent: (xCenterUnits / totalWidthUnits) * 100,
        yPercent: (yCenterUnits / totalHeightUnits) * 100,
      });
    }
  }

  return {
    containerAspectRatio: totalWidthUnits / totalHeightUnits,
    hexWidthPercent: (hexWidthUnits / totalWidthUnits) * 100,
    hexHeightPercent: (hexHeightUnits / totalHeightUnits) * 100,
    cells,
  };
}

function pickPanalesNumber(randomFn: () => number): string {
  const index = Math.min(Math.floor(randomFn() * PANALES_NUMBER_POOL.length), PANALES_NUMBER_POOL.length - 1);
  return PANALES_NUMBER_POOL[index];
}

/** Contenido (numeros 1-9) de TODAS las celdas, en el mismo orden que
 * computeHexGridLayout (fila por fila) - longitud exacta rows*columns. */
export function generatePanalesContent(rows: number, columns: number, randomFn: () => number = Math.random): string[] {
  const r = clampPanalesRows(rows);
  const c = clampPanalesColumns(columns);
  const content: string[] = [];
  for (let i = 0; i < r * c; i += 1) content.push(pickPanalesNumber(randomFn));
  return content;
}

/** Distribucion rojo-azul EQUILIBRADA - MISMO algoritmo y mismo criterio
 * que generateBalancedRedGreenFlags de hartConfig.ts (reimplementado, no
 * importado, por la razon ya documentada: ningun modulo de herramienta
 * depende de otro). Para N celdas, exactamente ceil(N/2) true (rojo) y
 * floor(N/2) false (azul), barajadas - mismo criterio "el sobrante va a
 * rojo" que Hart/McDonald. */
export function generateBalancedRedBlueFlags(n: number, randomFn: () => number = Math.random): boolean[] {
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

export interface PanalesCell extends PanalesHexCell {
  content: string;
  /** Marca booleana (rojo/azul), NUNCA un hex resuelto - el color REAL
   * se calcula en el momento de dibujar (ver resolvePanalesCellColor)
   * usando los tonos ACTUALES de la configuracion. Por diseño: elegir un
   * tono distinto de rojo/azul (redHex/blueHex) nunca debe alterar que
   * celdas son rojas o azules ni sus numeros - solo repinta las celdas
   * ya existentes con el nuevo tono. Esto garantiza por construccion que
   * "la regeneración... no debe sobrescribir los tonos elegidos" y que
   * cambiar de tono nunca mezcla contenido nuevo con el antiguo. */
  isRed: boolean;
}

/** Resuelve el color REAL (hex) de una celda a partir de su marca
 * booleana y los tonos actuales de la configuracion - pura, sin
 * dependencia de randomFn (nunca se "sortea" aqui, solo se traduce). */
export function resolvePanalesCellColor(isRed: boolean, redHex: string, blueHex: string): string {
  return isRed ? redHex : blueHex;
}

/** Genera la carta COMPLETA (contenido + marca roja/azul + posicion por
 * celda) a partir de la configuracion - la unica funcion que la UI
 * necesita llamar, tanto al cambiar filas/columnas como al pulsar
 * "Regenerar" (mismos parametros, nuevo sorteo). La POSICION de cada
 * celda depende SOLO de rows/columns (computeHexGridLayout), nunca de
 * randomFn - y el COLOR resuelto (ver resolvePanalesCellColor) depende
 * SOLO de redHex/blueHex, nunca de randomFn tampoco: regenerar cambia el
 * CONTENIDO y que celdas son rojas/azules, pero conserva siempre los
 * tonos elegidos. */
export function generatePanalesCells(config: PanalesCardConfig, randomFn: () => number = Math.random): PanalesCell[] {
  const layout = computeHexGridLayout(config.rows, config.columns);
  const content = generatePanalesContent(config.rows, config.columns, randomFn);
  const redFlags = generateBalancedRedBlueFlags(layout.cells.length, randomFn);
  return layout.cells.map((cell, i) => ({ ...cell, content: content[i], isRed: redFlags[i] }));
}

/** Sin version anterior que migrar todavia (esta ES la v1) - mismo
 * criterio y mismo punto de extension documentado que
 * migrateHartCardConfig/migrateMcDonaldCardConfig. */
export function migratePanalesCardConfig(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion === PANALES_SCHEMA_VERSION) return value;
  // Punto de extension: aqui irian las transformaciones incrementales de
  // una v0 (inexistente hoy) u otra version anterior hacia PANALES_SCHEMA_VERSION.
  return value;
}

export function isValidPanalesCardConfig(value: unknown): value is PanalesCardConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== PANALES_SCHEMA_VERSION) return false;
  if (typeof v.rows !== "number" || typeof v.columns !== "number" || !isValidPanalesDimensions(v.rows, v.columns)) return false;
  if (typeof v.cellSize !== "string" || !PANALES_CELL_SIZE_VALUES.includes(v.cellSize as PanalesCellSize)) return false;
  if (!isValidHexColor(v.redHex)) return false;
  if (!isValidHexColor(v.blueHex)) return false;
  return true;
}

/** Compone migrate+isValid - mismo patron que resolveHartCardConfig/
 * resolveMcDonaldCardConfig, ya definido desde ahora para una futura
 * fase de guardado de presets, sin consumidor todavia en esta fase (sin
 * persistencia). */
export function resolvePanalesCardConfig(raw: unknown): PanalesCardConfig | null {
  const migrated = migratePanalesCardConfig(raw);
  return isValidPanalesCardConfig(migrated) ? (migrated as PanalesCardConfig) : null;
}
