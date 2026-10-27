/**
 * Logica PURA de ORION Tools · Optotipos - mismo patron ya establecido
 * en hartConfig.ts/mcdonaldConfig.ts/panalesConfig.ts: tipos,
 * configuracion por defecto, generacion de contenido/geometria y
 * validacion/migracion de la configuracion serializada. Sin ningun
 * import de React/Next/Supabase ni de otro modulo de herramienta: cada
 * herramienta es privada, ni siquiera el catalogo de letras/numeros se
 * comparte (ver OPTOTIPO_LETTER_POOL/OPTOTIPO_NUMBER_POOL mas abajo).
 *
 * CINCO PRUEBAS en el selector (agudeza, circuloHorario, fijacion,
 * worth, alineamientoBinocular), cada una con su propia configuracion
 * dentro de OptotiposCardConfig - cambiar de prueba (`activeTest`)
 * NUNCA reinicia ni descarta la configuracion de las demas (requisito
 * explicito "cambiar de prueba no debe reiniciar toda la herramienta").
 * Rojo-verde (3a iteracion) YA NO es una de estas cinco pruebas: es un
 * MODO dentro de agudeza (ver AgudezaConfig.rojoVerdeEnabled) que
 * cambia como se pinta el MISMO contenido, nunca una prueba aparte.
 *
 * CALIBRACION CLINICA: ver la seccion "Calibracion fisica" mas abajo
 * para la explicacion completa. Resumen: la cartilla de agudeza visual
 * SIEMPRE respeta las PROPORCIONES relativas correctas entre lineas (el
 * tamaño de una linea de agudeza X es exactamente `targetDecimal/X`
 * veces el tamaño de la linea objetivo - la fisica real de una cartilla
 * decimal). La escala ABSOLUTA, en cambio, solo es fisicamente exacta
 * (minutos de arco reales a la distancia de exploracion elegida) SI la
 * pantalla ha sido calibrada por la persona usuaria (ver
 * MonitorCalibration); sin esa calibracion, la escala absoluta sigue
 * siendo arbitraria/editable, exactamente como antes. Esto se documenta
 * explicitamente en cada sitio relevante para no afirmar nunca una
 * calibracion que no existe.
 */

/** Rojo-verde YA NO es una prueba independiente del selector (requisito
 * explicito de la 3a iteracion): ahora es un MODO dentro de Agudeza
 * visual (ver AgudezaConfig.rojoVerdeEnabled). "contraste" (6a
 * iteracion) y "rejillaSinusoidal" (6a iteracion) son pruebas nuevas de
 * sensibilidad al contraste - ver sus secciones mas abajo. */
export type OptotipoTestId = "agudeza" | "circuloHorario" | "fijacion" | "worth" | "alineamientoBinocular" | "contraste" | "rejillaSinusoidal";
export const OPTOTIPO_TEST_VALUES: readonly OptotipoTestId[] = [
  "agudeza",
  "circuloHorario",
  "fijacion",
  "worth",
  "alineamientoBinocular",
  "contraste",
  "rejillaSinusoidal",
];

export type OptotipoSymbolType = "letters" | "numbers" | "snellenE" | "landoltC";
export const OPTOTIPO_SYMBOL_TYPE_VALUES: readonly OptotipoSymbolType[] = ["letters", "numbers", "snellenE", "landoltC"];

/** Letras tradicionalmente usadas en optotipos por ser poco ambiguas
 * entre si (p.ej. se evitan I/Q, facilmente confundibles con 1/O) - una
 * eleccion razonable propia de ORION, NO el conjunto Sloan exacto ni
 * ningun otro estandar especifico (nunca presentado como tal). */
export const OPTOTIPO_LETTER_POOL: readonly string[] = ["C", "D", "E", "F", "H", "K", "N", "P", "R", "S", "U", "V", "Z"];
export const OPTOTIPO_NUMBER_POOL: readonly string[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** "E de Snellen" (E tumbada/direccional): una E que apunta en una de 4
 * direcciones por caracter - el profesional pide al paciente indicar
 * hacia donde apunta. */
export const SNELLEN_E_ROTATIONS: readonly number[] = [0, 90, 180, 270];
/** "C de Landolt": un anillo con una apertura (hueco) en una de 8
 * orientaciones por caracter. */
export const LANDOLT_C_ROTATIONS: readonly number[] = [0, 45, 90, 135, 180, 225, 270, 315];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

function pickFromPool<T>(pool: readonly T[], randomFn: () => number): T {
  const index = Math.min(Math.floor(randomFn() * pool.length), pool.length - 1);
  return pool[index];
}

/** Baraja una COPIA de `pool` (Fisher-Yates) usando `randomFn` como
 * unica fuente de aleatoriedad - mismo criterio de "randomFn
 * inyectable, nunca Math.random directo" que el resto del modulo, para
 * que la generacion siga siendo determinista en los tests. */
function shufflePool<T>(pool: readonly T[], randomFn: () => number): T[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.min(Math.floor(randomFn() * (i + 1)), i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Elige `count` elementos de `pool` SIN repetir ninguno dentro de la
 * misma llamada (requisito explicito: "dentro de una misma fila no debe
 * repetirse ningun optotipo") - usada por 'letters'/'numbers'/'snellenE'
 * en generateOptotipoSymbols (landoltC queda fuera a proposito, ver
 * comentario alli). Si `count <= pool.length` es un muestreo simple sin
 * reemplazo: nunca hay repetidos. Si `count > pool.length` (caso real:
 * snellenE solo tiene 4 orientaciones, nunca suficientes para una fila
 * de 5) es matematicamente imposible evitar algun repetido - se
 * gestiona EXPLICITAMENTE en vez de repetir sin control: se agota una
 * vuelta COMPLETA barajada del pool antes de permitir que cualquier
 * elemento aparezca una segunda vez, y asi por cada vuelta adicional
 * que haga falta (minimiza la repeticion todo lo que la aritmetica
 * permite, nunca repite un elemento mientras quede otro disponible). */
function pickUniqueFromPool<T>(pool: readonly T[], count: number, randomFn: () => number): T[] {
  const result: T[] = [];
  while (result.length < count) {
    const remaining = count - result.length;
    const shuffled = shufflePool(pool, randomFn);
    result.push(...shuffled.slice(0, Math.min(remaining, shuffled.length)));
  }
  return result;
}

export interface OptotipoSymbol {
  /** Presente para 'letters'/'numbers' - el caracter a mostrar. */
  char?: string;
  /** Presente para 'snellenE'/'landoltC' - orientacion en grados (ver
   * SNELLEN_E_ROTATIONS/LANDOLT_C_ROTATIONS). */
  rotationDeg?: number;
}

/** Genera `count` simbolos del tipo indicado - usada por
 * generateAgudezaRows. Rojo-verde ya NO genera su propio contenido:
 * reutiliza directamente los simbolos de agudeza (ver comentario en
 * RojoVerdeConfig).
 *
 * 'letters'/'numbers'/'snellenE': SIN repetir ningun simbolo dentro de
 * esta misma llamada (requisito explicito: "dentro de una misma fila no
 * debe repetirse ningun optotipo") - ver pickUniqueFromPool. Cada
 * orientacion de la E de Snellen cuenta como un optotipo distinto a
 * este efecto (otro requisito explicito). Filas DIFERENTES pueden
 * compartir caracteres entre si con total normalidad - la restriccion
 * es SOLO dentro de cada fila, nunca global.
 *
 * 'landoltC': SIN esta restriccion, a proposito (requisito explicito:
 * "los tres formatos basados en caracteres" - letras/numeros/E de
 * Snellen - nunca incluyo landoltC) - mantiene el comportamiento
 * original con reemplazo. */
export function generateOptotipoSymbols(count: number, symbolType: OptotipoSymbolType, randomFn: () => number = Math.random): OptotipoSymbol[] {
  if (symbolType === "letters") return pickUniqueFromPool(OPTOTIPO_LETTER_POOL, count, randomFn).map((char) => ({ char }));
  if (symbolType === "numbers") return pickUniqueFromPool(OPTOTIPO_NUMBER_POOL, count, randomFn).map((char) => ({ char }));
  if (symbolType === "snellenE") return pickUniqueFromPool(SNELLEN_E_ROTATIONS, count, randomFn).map((rotationDeg) => ({ rotationDeg }));
  const symbols: OptotipoSymbol[] = [];
  for (let i = 0; i < count; i += 1) symbols.push({ rotationDeg: pickFromPool(LANDOLT_C_ROTATIONS, randomFn) });
  return symbols;
}

/** Limite generico de "tamaño de presentacion" (vmin) reutilizado por
 * varias pruebas - NUNCA una medida clinica, solo un rango practico de
 * la herramienta para evitar un estimulo degenerado (demasiado pequeño
 * para verse) o desbordante. El maximo cubre el rango real que usan los
 * controles de Circulo horario/Worth (slider hasta 90, con cartillas por
 * defecto de 70/55) - un maximo mas bajo aqui dejaba sin efecto visible
 * la mitad superior de esos sliders (bug real detectado en validacion). */
export const OPTOTIPO_MIN_SIZE_PERCENT = 2;
export const OPTOTIPO_MAX_SIZE_PERCENT = 90;

export function clampSizePercent(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(OPTOTIPO_MAX_SIZE_PERCENT, Math.max(OPTOTIPO_MIN_SIZE_PERCENT, value));
}

/* ------------------------------------------------------------------ */
/* Calibracion fisica (distancia de exploracion + pantalla)            */
/* ------------------------------------------------------------------ */

/**
 * Fisica real de un optotipo decimal (ciencia establecida de optotipos,
 * no una invencion de ORION):
 * - MAR (minimo angulo de resolucion, en minutos de arco) = 1 / V, donde
 *   V es el valor decimal de la linea (p.ej. V=0.5 -> MAR=2 arcmin).
 * - Un optotipo de proporcion 5:1 (el estandar Snellen/Sloan, la misma
 *   proporcion ya usada en OptotipoGlyph para la C de Landolt:
 *   strokeWidth = 1/5 del diametro) tiene una altura total que subtiende
 *   5 x MAR minutos de arco en el ojo del paciente cuando se ve justo en
 *   el limite de resolucion a V.
 * - Conocidos el angulo visual y la distancia de observacion, la
 *   trigonometria exacta da el tamaño FISICO real: h = 2 x d x tan(angulo/2).
 *   (Verificacion: a 6 m y V=1.0 esta formula da ≈8.73 mm, el valor de
 *   referencia conocido para una letra de Snellen 6/6 - ver el test
 *   correspondiente en optotiposConfig.test.ts).
 *
 * Esto resuelve el tamaño FISICO (milimetros). Traducirlo a un tamaño en
 * PANTALLA (pixeles CSS) exige ademas conocer la escala real px->mm de
 * ESTE monitor concreto - algo que ningun navegador expone de forma
 * fiable (`devicePixelRatio` NO equivale a "mm por pixel": es una
 * relacion con los pixeles fisicos del panel, pero no revela el tamaño
 * fisico real de esos pixeles, que depende del tamaño y la resolucion
 * reales de la pantalla, una API que no existe en la web). Por eso la
 * UNICA fuente de verdad posible es que la persona usuaria calibre la
 * pantalla manualmente (ver MonitorCalibration/computeCalibratedPxPerMm
 * mas abajo): se muestra una linea de referencia de un ancho EXACTO y
 * conocido en pixeles CSS, se mide con una regla fisica, y de esa
 * medicion se deriva la escala real px/mm. Sin esa calibracion no hay
 * manera honesta de afirmar un tamaño fisico - en ese caso la
 * herramienta debe caer al modo "proporciones correctas, sin calibrar"
 * ya existente y declararlo explicitamente en la interfaz (ver
 * OptotiposClient.tsx, computeAgudezaLayout).
 *
 * LIMITACION CONOCIDA: esta calibracion asume que el nivel de zoom del
 * navegador (Ctrl +/-) no cambia despues de calibrar - el zoom SI altera
 * la relacion real entre pixeles CSS y milimetros fisicos en pantalla.
 * No existe ninguna API web para detectar ese cambio de forma fiable
 * entre navegadores, asi que esta limitacion se documenta aqui y se
 * advierte en la interfaz en vez de ocultarse.
 */

export interface ViewingDistancePreset {
  label: string;
  cm: number;
}

/** Lista CERRADA de distancias (6a iteracion: se elimino el campo de
 * distancia personalizada - requisito explicito "no debe existir otro
 * boton o campo para establecer una distancia personalizada"). Solo
 * estos 8 valores son validos en todo el estado de la herramienta - ver
 * isValidViewingDistanceCm (ya NO acepta un rango continuo). */
export const VIEWING_DISTANCE_PRESETS: readonly ViewingDistancePreset[] = [
  { label: "25 cm", cm: 25 },
  { label: "40 cm", cm: 40 },
  { label: "1 m", cm: 100 },
  { label: "2 m", cm: 200 },
  { label: "3 m", cm: 300 },
  { label: "4 m", cm: 400 },
  { label: "5 m", cm: 500 },
  { label: "6 m", cm: 600 },
];

export const DEFAULT_VIEWING_DISTANCE_CM = 300;

/** Ya no "clampa" a un rango continuo (no existe rango, solo la lista
 * cerrada de arriba) - si el valor no es uno de los presets exactos, lo
 * sustituye por el preset mas cercano (nunca por un valor arbitrario
 * fuera de la lista, para que el estado nunca contenga una distancia
 * "personalizada" residual). */
export function clampViewingDistanceCm(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VIEWING_DISTANCE_CM;
  let closest = VIEWING_DISTANCE_PRESETS[0].cm;
  let closestDiff = Math.abs(value - closest);
  for (const preset of VIEWING_DISTANCE_PRESETS) {
    const diff = Math.abs(value - preset.cm);
    if (diff < closestDiff) {
      closest = preset.cm;
      closestDiff = diff;
    }
  }
  return closest;
}

export function isValidViewingDistanceCm(value: unknown): value is number {
  return typeof value === "number" && VIEWING_DISTANCE_PRESETS.some((p) => p.cm === value);
}

/** Proporcion estandar "5:1" del diseño de optotipos (altura total = 5x
 * el MAR, trazo/hueco = 1x el MAR). */
export const OPTOTYPE_HEIGHT_TO_MAR_RATIO = 5;

/** Minuto de arco minimo resoluble para una linea de agudeza decimal
 * `decimal` - formula estandar MAR = 1/V. */
export function computeMarArcMinutes(decimal: number): number {
  return 1 / decimal;
}

/** Tamaño FISICO real (milimetros) que debe tener un optotipo para
 * subtender el angulo visual correcto en el ojo a `distanceCm` de
 * distancia - geometria EXACTA (tangente, no la aproximacion de angulo
 * pequeño). */
export function computeOptotypeHeightMm(decimal: number, distanceCm: number): number {
  const angleArcMinutes = computeMarArcMinutes(decimal) * OPTOTYPE_HEIGHT_TO_MAR_RATIO;
  const angleRad = (angleArcMinutes / 60) * (Math.PI / 180);
  const distanceMm = distanceCm * 10;
  return 2 * distanceMm * Math.tan(angleRad / 2);
}

/** Calibracion del monitor: cuantos pixeles CSS equivalen a 1 milimetro
 * fisico EN ESTE navegador/pantalla/nivel de zoom concretos. La UNICA
 * fuente de verdad es una medicion real hecha por la persona usuaria con
 * una regla fisica sobre la barra de referencia (CALIBRATION_REFERENCE_LINE_PX),
 * nunca un valor supuesto a partir de una API del navegador. */
export interface MonitorCalibration {
  pxPerMm: number;
}

/** Ancho EXACTO (pixeles CSS) de la barra de referencia que se muestra
 * en pantalla durante la calibracion - el numero en si es arbitrario,
 * solo debe mantenerse FIJO para que la formula de abajo sea correcta. */
export const CALIBRATION_REFERENCE_LINE_PX = 300;
export const MIN_CALIBRATION_MEASURED_MM = 10;
export const MAX_CALIBRATION_MEASURED_MM = 1000;

export function isValidCalibrationMeasuredMm(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= MIN_CALIBRATION_MEASURED_MM && value <= MAX_CALIBRATION_MEASURED_MM;
}

/** A partir de la longitud medida CON UNA REGLA FISICA (mm) de la barra
 * de referencia (que mide exactamente CALIBRATION_REFERENCE_LINE_PX
 * pixeles CSS en pantalla), calcula la escala real px/mm de ESTE
 * monitor. */
export function computeCalibratedPxPerMm(measuredMm: number): number {
  return CALIBRATION_REFERENCE_LINE_PX / measuredMm;
}

export function isValidMonitorCalibration(value: unknown): value is MonitorCalibration {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.pxPerMm === "number" && Number.isFinite(v.pxPerMm) && v.pxPerMm > 0;
}

/** Piso practico de legibilidad en pantalla (pixeles CSS) - NO es una
 * medida clinica ni fisica, es una heuristica de renderizado: por debajo
 * de este tamaño, el antialiasing tipico de una pantalla hace que un
 * caracter deje de ser perceptible aunque el calculo fisico (MAR a la
 * distancia elegida) sea correcto. Existe para que la herramienta avise
 * en vez de mostrar en silencio un optotipo matematicamente "correcto"
 * pero invisible en la practica - mismo criterio que el aviso de "no
 * cabe en el contenedor" (nunca reducir/mostrar algo sin informar). */
export const MIN_LEGIBLE_OPTOTYPE_PX = 8;

export function isBelowLegibleFloor(symbolSizePx: number): boolean {
  return symbolSizePx < MIN_LEGIBLE_OPTOTYPE_PX;
}

/* ------------------------------------------------------------------ */
/* Agudeza visual (cartilla decimal)                                   */
/* ------------------------------------------------------------------ */

/** Progresion decimal estandar de la cartilla - NO es una tabla
 * clinicamente normalizada (p.ej. no es ETDRS ni una cartilla Snellen
 * concreta), es una progresion decimal razonable y habitual en
 * cartillas digitales. Lista PLANA de valores UNICOS (cada decimal se
 * genera/almacena una sola vez, ver generateAgudezaRows) - los bloques
 * (ver AGUDEZA_BLOCK_START_INDEX) pueden SOLAPARSE y comparten la MISMA
 * fila/tamaño fisico para un decimal repetido entre bloques vecinos,
 * nunca una copia independiente. */
export const AGUDEZA_DECIMAL_ROWS: readonly number[] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
export const AGUDEZA_SYMBOLS_PER_ROW = 5;

export function isValidAgudezaDecimal(value: unknown): value is number {
  return typeof value === "number" && AGUDEZA_DECIMAL_ROWS.includes(value);
}

/** Presentacion PROGRESIVA por bloques (requisito explicito: nunca
 * mostrar la cartilla completa a la vez) - exactamente 3 lineas visibles
 * por pantalla. EXACTAMENTE 5 bloques (requisito explicito), con la
 * progresion pedida: [0.1,0.2,0.3], [0.3,0.4,0.5], [0.5,0.6,0.7],
 * [0.7,0.8,0.9], [1.0,1.1,1.2] - bloques VECINOS comparten la linea
 * limite (p.ej. 0.3 aparece en el bloque 1 Y en el 2), salvo entre el
 * bloque 4 y el 5 (0.9 -> 1.0, sin solape, tal como se pidio). Cada
 * valor es un INDICE dentro de AGUDEZA_DECIMAL_ROWS (no un decimal
 * literal) para que una linea compartida entre bloques sea SIEMPRE la
 * MISMA fila ya generada (mismo tamaño fisico Y mismo contenido),
 * nunca una regeneracion independiente. */
export const AGUDEZA_BLOCK_SIZE = 3;
export const AGUDEZA_BLOCK_START_INDEX: readonly number[] = [0, 2, 4, 6, 9];
export const AGUDEZA_BLOCK_COUNT = AGUDEZA_BLOCK_START_INDEX.length;

export function clampAgudezaBlockIndex(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(AGUDEZA_BLOCK_COUNT - 1, Math.max(0, Math.round(value)));
}

/** Los 3 valores decimales (orden ascendente) del bloque indicado -
 * bloques vecinos SI pueden compartir un valor (ver cabecera de
 * AGUDEZA_BLOCK_START_INDEX), nunca es un error. */
export function getAgudezaBlockDecimals(blockIndex: number): number[] {
  const start = AGUDEZA_BLOCK_START_INDEX[clampAgudezaBlockIndex(blockIndex)];
  return AGUDEZA_DECIMAL_ROWS.slice(start, start + AGUDEZA_BLOCK_SIZE) as number[];
}

/** Proporcion de tamaño de una linea de agudeza `rowDecimal` respecto a
 * la linea OBJETIVO `targetDecimal` - formula real de una cartilla
 * decimal (el tamaño crece de forma EXACTAMENTE inversa al decimal: una
 * linea 0.1 mide 10x una linea 1.0). Esto es lo que hace que "la escala
 * decimal corresponda al tamaño mostrado" en vez de ser una etiqueta
 * decorativa - la escala ABSOLUTA (a que tamaño fisico/vmin corresponde
 * el 1x) sigue sin calibrar, ver cabecera del archivo. */
export function computeAgudezaRowSizeRatio(rowDecimal: number, targetDecimal: number): number {
  return targetDecimal / rowDecimal;
}

/**
 * Tamaño FISICO (en `font-size` de CSS, ya compensado por la geometria
 * real de la fuente - ver `glyphHeightRatio`) de un optotipo de agudeza
 * decimal `decimal` a `distanceCm` de distancia, con una pantalla
 * calibrada a `pxPerMm`. Esta es la UNICA formula que determina el
 * tamaño de un optotipo calibrado - depende EXCLUSIVAMENTE de estos
 * tres parametros (requisito explicito de la 5a iteracion: "el tamaño
 * de cada optotipo debe calcularse exclusivamente a partir de la
 * agudeza visual decimal... la distancia... la calibracion"). NUNCA
 * toma el area disponible, el espaciado entre filas ni ningun otro
 * factor visual como entrada - el ajuste al contenedor (ver
 * computeAgudezaLayout en OptotiposClient.tsx) solo puede decidir si
 * ESTE tamaño, ya fijo, cabe o no; nunca puede alterarlo. */
export function computeCalibratedOptotypeSizePx(decimal: number, distanceCm: number, pxPerMm: number, glyphHeightRatio: number): number {
  const nominalHeightMm = computeOptotypeHeightMm(decimal, distanceCm);
  const nominalHeightPx = nominalHeightMm * pxPerMm;
  return nominalHeightPx / glyphHeightRatio;
}

export interface AgudezaConfig {
  /** Ancla de tamaño para computeAgudezaRowSizeRatio (ratio=1 en esta
   * linea) - ya NO es seleccionable por el profesional (sustituida por
   * la navegacion de bloques, ver blockIndex); se mantiene fija porque
   * las proporciones RELATIVAS entre lineas no dependen de que ancla se
   * use (son invariantes de escala), solo se necesita un valor fijo para
   * que la formula siga siendo coherente entre renders. Solo se usa en
   * el modo SIN CALIBRAR (ver computeAgudezaLayout) - calibrado, cada
   * fila calcula su tamaño directamente con computeCalibratedOptotypeSizePx. */
  targetDecimal: number;
  symbolType: OptotipoSymbolType;
  /** Bloque de 3 lineas actualmente visible (0 a AGUDEZA_BLOCK_COUNT-1) -
   * requisito explicito: presentacion progresiva, nunca la cartilla
   * completa a la vez. */
  blockIndex: number;
  /** Distancia de exploracion elegida (cm) - entra en la formula fisica
   * de computeOptotypeHeightMm. Solo tiene efecto REAL en el tamaño
   * mostrado cuando la pantalla esta calibrada (ver MonitorCalibration);
   * sin calibrar, cambiar la distancia no cambia nada visible todavia
   * (no hay forma honesta de traducir angulo visual a pixeles sin saber
   * la escala fisica real de la pantalla). */
  viewingDistanceCm: number;
  /** Modo rojo-verde (3a iteracion: ya NO es una prueba independiente
   * del selector, sino un interruptor dentro de Agudeza visual) -
   * activarlo/desactivarlo NUNCA cambia el bloque, el tipo de optotipo,
   * la distancia ni la calibracion; solo cambia como se PINTA el mismo
   * contenido (ver RojoVerdeView en OptotiposClient.tsx). */
  rojoVerdeEnabled: boolean;
}

export const DEFAULT_AGUDEZA_CONFIG: AgudezaConfig = {
  targetDecimal: 1.0,
  symbolType: "letters",
  blockIndex: 0,
  viewingDistanceCm: DEFAULT_VIEWING_DISTANCE_CM,
  rojoVerdeEnabled: false,
};

export interface AgudezaRow {
  decimal: number;
  sizeRatio: number;
  symbols: OptotipoSymbol[];
}

/** Genera TODAS las lineas de la cartilla (los 4 bloques completos) - la
 * vista solo muestra el bloque activo (ver blockIndex/
 * getAgudezaBlockDecimals en OptotiposClient.tsx), pero generarlas todas
 * de una vez evita tener que regenerar al navegar entre bloques ya
 * vistos. La POSICION/orden de las lineas depende solo de
 * AGUDEZA_DECIMAL_ROWS (nunca de randomFn); el CONTENIDO de cada linea
 * (que letras/numeros/orientaciones) se sortea de nuevo en cada
 * llamada. */
export function generateAgudezaRows(config: AgudezaConfig, randomFn: () => number = Math.random): AgudezaRow[] {
  return AGUDEZA_DECIMAL_ROWS.map((decimal) => ({
    decimal,
    sizeRatio: computeAgudezaRowSizeRatio(decimal, config.targetDecimal),
    symbols: generateOptotipoSymbols(AGUDEZA_SYMBOLS_PER_ROW, config.symbolType, randomFn),
  }));
}

export function isValidAgudezaConfig(value: unknown): value is AgudezaConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!isValidAgudezaDecimal(v.targetDecimal)) return false;
  if (typeof v.symbolType !== "string" || !OPTOTIPO_SYMBOL_TYPE_VALUES.includes(v.symbolType as OptotipoSymbolType)) return false;
  if (typeof v.blockIndex !== "number" || !Number.isInteger(v.blockIndex)) return false;
  if (v.blockIndex < 0 || v.blockIndex >= AGUDEZA_BLOCK_COUNT) return false;
  if (!isValidViewingDistanceCm(v.viewingDistanceCm)) return false;
  if (typeof v.rojoVerdeEnabled !== "boolean") return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Circulo horario (abanico/reloj astigmatico)                         */
/* ------------------------------------------------------------------ */

export const CIRCULO_HORARIO_MIN_LINES = 6;
export const CIRCULO_HORARIO_MAX_LINES = 24;
export const CIRCULO_HORARIO_DEFAULT_LINES = 12;

export function clampCirculoHorarioLines(value: number): number {
  if (!Number.isFinite(value)) return CIRCULO_HORARIO_DEFAULT_LINES;
  return Math.min(CIRCULO_HORARIO_MAX_LINES, Math.max(CIRCULO_HORARIO_MIN_LINES, Math.round(value)));
}

export interface CirculoHorarioConfig {
  lineCount: number;
  sizePercent: number;
}

export const DEFAULT_CIRCULO_HORARIO_CONFIG: CirculoHorarioConfig = {
  lineCount: CIRCULO_HORARIO_DEFAULT_LINES,
  sizePercent: 70,
};

/** Angulos (grados, 0-360 sin llegar a 360) de cada radio del abanico,
 * repartidos UNIFORMEMENTE - PURA, nunca depende de randomFn (el
 * circulo horario no tiene ningun componente aleatorio: su utilidad
 * clinica depende de que las lineas esten SIEMPRE en posiciones fijas y
 * predecibles). */
export function computeClockDialAngles(lineCount: number): number[] {
  const n = clampCirculoHorarioLines(lineCount);
  const angles: number[] = [];
  for (let i = 0; i < n; i += 1) angles.push((360 / n) * i);
  return angles;
}

export function isValidCirculoHorarioConfig(value: unknown): value is CirculoHorarioConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.lineCount !== "number" || !Number.isInteger(v.lineCount)) return false;
  if (v.lineCount < CIRCULO_HORARIO_MIN_LINES || v.lineCount > CIRCULO_HORARIO_MAX_LINES) return false;
  if (typeof v.sizePercent !== "number" || !Number.isFinite(v.sizePercent)) return false;
  if (v.sizePercent < OPTOTIPO_MIN_SIZE_PERCENT || v.sizePercent > 95) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Rojo-verde (duocromatico) - MODO de Agudeza visual                  */
/* ------------------------------------------------------------------ */

export const ROJO_VERDE_DEFAULT_RED = "#ef4444";
export const ROJO_VERDE_DEFAULT_GREEN = "#22c55e";

/** Rojo-verde ya NO es una prueba independiente ni siquiera en el
 * selector (3a iteracion: eliminado el boton "Rojo-verde" del selector
 * principal - ver AgudezaConfig.rojoVerdeEnabled) ni tiene contenido
 * propio: requisito explicito "no quiero una prueba independiente que
 * genere una nueva serie de letras aleatorias con su propia
 * configuracion de agudeza visual". Es una PRESENTACION alternativa del
 * bloque de Agudeza visual actualmente activo (mismas filas, mismo
 * bloque, mismo tipo de optotipo, mismo tamaño) dividida en dos mitades
 * de color - por eso RojoVerdeConfig solo guarda lo que es
 * genuinamente propio de esta presentacion: los dos tonos. */
export interface RojoVerdeConfig {
  redHex: string;
  greenHex: string;
}

export const DEFAULT_ROJO_VERDE_CONFIG: RojoVerdeConfig = {
  redHex: ROJO_VERDE_DEFAULT_RED,
  greenHex: ROJO_VERDE_DEFAULT_GREEN,
};

export function isValidRojoVerdeConfig(value: unknown): value is RojoVerdeConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!isValidHexColor(v.redHex)) return false;
  if (!isValidHexColor(v.greenHex)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Punto de fijacion                                                   */
/* ------------------------------------------------------------------ */

export interface FijacionConfig {
  dotSizePercent: number;
}

export const DEFAULT_FIJACION_CONFIG: FijacionConfig = {
  dotSizePercent: 3,
};

export function isValidFijacionConfig(value: unknown): value is FijacionConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.dotSizePercent !== "number" || !Number.isFinite(v.dotSizePercent)) return false;
  if (v.dotSizePercent < OPTOTIPO_MIN_SIZE_PERCENT || v.dotSizePercent > OPTOTIPO_MAX_SIZE_PERCENT) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Worth (4 luces)                                                     */
/* ------------------------------------------------------------------ */

export interface WorthConfig {
  sizePercent: number;
}

export const DEFAULT_WORTH_CONFIG: WorthConfig = {
  sizePercent: 55,
};

export interface WorthDot {
  id: "top" | "left" | "right" | "bottom";
  /** Posicion del CENTRO, en % del area del test (0-100). */
  xPercent: number;
  yPercent: number;
  color: "red" | "green" | "white";
}

/** Disposicion CLASICA del test de Worth - rombo/diamante: luz roja
 * arriba, dos luces verdes a los lados, luz blanca abajo. Posiciones
 * FIJAS (nunca aleatorias ni configurables en esta fase, la disposicion
 * es parte de la definicion clinica del test). */
export const WORTH_DOTS: readonly WorthDot[] = [
  { id: "top", xPercent: 50, yPercent: 12, color: "red" },
  { id: "left", xPercent: 15, yPercent: 50, color: "green" },
  { id: "right", xPercent: 85, yPercent: 50, color: "green" },
  { id: "bottom", xPercent: 50, yPercent: 88, color: "white" },
];

export function isValidWorthConfig(value: unknown): value is WorthConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.sizePercent !== "number" || !Number.isFinite(v.sizePercent)) return false;
  if (v.sizePercent < OPTOTIPO_MIN_SIZE_PERCENT || v.sizePercent > 95) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Alineamiento binocular (cruz de fijacion rojo-verde)                 */
/* ------------------------------------------------------------------ */

/**
 * Nombre elegido: "Alineamiento binocular" (provisional, ver informe).
 * No se encontro un nombre clinico estandar UNICO y universalmente
 * reconocido para esta disposicion exacta (cruz de 4 segmentos
 * independientes, dos rojos arriba/izquierda y dos verdes abajo/derecha,
 * con un punto de fijacion blanco central) - es conceptualmente afin a
 * la familia de pruebas de disociacion rojo-verde (como Worth, ya
 * presente en esta herramienta) usadas para explorar correspondencia/
 * alineamiento binocular con filtros rojo-verde delante de cada ojo,
 * pero no es una reproduccion de ningun test con nombre propio conocido
 * (no es Worth, no es Bagolini, no es una cruz de Maddox). Por eso se
 * mantiene como nombre descriptivo provisional en vez de atribuirle una
 * denominacion clinica concreta que no le corresponde.
 */
export interface AlineamientoBinocularConfig {
  /** Tamaño global de la cruz (extremo a extremo) respecto al area
   * disponible - mismo patron de "porcentaje del lado mas pequeño del
   * contenedor REAL" que CirculoHorarioView/WorthView. */
  crossSizePercent: number;
  /** Tamaño del punto de fijacion central, independiente del tamaño de
   * la cruz. */
  dotSizePercent: number;
}

export const DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG: AlineamientoBinocularConfig = {
  crossSizePercent: 55,
  dotSizePercent: 4,
};

export function isValidAlineamientoBinocularConfig(value: unknown): value is AlineamientoBinocularConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.crossSizePercent !== "number" || !Number.isFinite(v.crossSizePercent)) return false;
  if (v.crossSizePercent < OPTOTIPO_MIN_SIZE_PERCENT || v.crossSizePercent > OPTOTIPO_MAX_SIZE_PERCENT) return false;
  if (typeof v.dotSizePercent !== "number" || !Number.isFinite(v.dotSizePercent)) return false;
  if (v.dotSizePercent < OPTOTIPO_MIN_SIZE_PERCENT || v.dotSizePercent > OPTOTIPO_MAX_SIZE_PERCENT) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Contraste (cartilla de C de Landolt sobre fondo blanco)             */
/* ------------------------------------------------------------------ */

/**
 * Definicion de contraste elegida: CONTRASTE DE WEBER,
 * C = (Lfondo - Loptotipo) / Lfondo - la definicion estandar para UN
 * estimulo aislado sobre un fondo uniforme (a diferencia de Michelson,
 * pensado para patrones PERIODICOS como una rejilla - ver la seccion
 * "Rejilla sinusoidal" mas abajo, que SI usa Michelson). Se usa el
 * valor sRGB (0-255, escala de grises) como PROXY de luminancia -
 * NUNCA una medicion fotometrica real (eso exigiria un fotometro y una
 * pantalla caracterizada/linealizada con una curva gamma conocida,
 * fuera del alcance de una herramienta web). Por eso esta prueba NUNCA
 * debe presentarse como una medicion de sensibilidad al contraste
 * clinicamente calibrada - solo como una exploracion perceptual
 * cualitativa con un control cuantificable y reproducible del nivel de
 * gris.
 */
export const CONTRASTE_BACKGROUND_GRAY = 255; // fondo SIEMPRE blanco puro
export const CONTRASTE_MIN_PERCENT = 0;
export const CONTRASTE_MAX_PERCENT = 100;
export const CONTRASTE_DEFAULT_PERCENT = 70;
/** Paso del control deslizante de contraste de la cartilla de C de
 * Landolt (requisito explicito: "incrementos exactos de 5 puntos
 * porcentuales: 0, 5, 10, 15... 100"). */
export const CONTRASTE_STEP_PERCENT = 5;

export function clampContrastPercent(value: number, fallback: number = CONTRASTE_DEFAULT_PERCENT): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(CONTRASTE_MAX_PERCENT, Math.max(CONTRASTE_MIN_PERCENT, value));
}

/** Redondea al multiplo de CONTRASTE_STEP_PERCENT mas cercano (siempre
 * dentro de [CONTRASTE_MIN_PERCENT, CONTRASTE_MAX_PERCENT]) - usada
 * SOLO por el control deslizante de la cartilla de contraste (C de
 * Landolt), cuyo valor mostrado debe coincidir siempre EXACTAMENTE con
 * el aplicado al estimulo (requisito explicito). El control de
 * contraste de la rejilla sinusoidal sigue siendo continuo (paso 1), a
 * proposito - no se le pidio este cambio. */
export function snapContrastPercentToStep(value: number, fallback: number = CONTRASTE_DEFAULT_PERCENT): number {
  const clamped = clampContrastPercent(value, fallback);
  const snapped = Math.round(clamped / CONTRASTE_STEP_PERCENT) * CONTRASTE_STEP_PERCENT;
  return Math.min(CONTRASTE_MAX_PERCENT, Math.max(CONTRASTE_MIN_PERCENT, snapped));
}

/** Contraste de Weber REAL entre dos valores de gris sRGB (0-255,
 * proxy de luminancia) - valor absoluto, para que sea comparable
 * independientemente de si el optotipo es mas oscuro o mas claro que
 * el fondo. */
export function computeWeberContrast(targetGray: number, backgroundGray: number): number {
  if (backgroundGray === 0) return 0;
  return Math.abs(backgroundGray - targetGray) / backgroundGray;
}

/** Nivel de gris (0-255) que produce EXACTAMENTE `contrastPercent`% de
 * contraste de Weber frente al fondo blanco - el optotipo siempre sale
 * MAS OSCURO que el fondo (caso habitual de una cartilla de contraste),
 * nunca mas claro. */
export function computeContrastGrayLevel(contrastPercent: number): number {
  const fraction = clampContrastPercent(contrastPercent) / 100;
  return Math.round(CONTRASTE_BACKGROUND_GRAY * (1 - fraction));
}

export interface ContrasteConfig {
  /** Mismo sistema de bloques que Agudeza visual (AGUDEZA_BLOCK_COUNT) -
   * la prueba de contraste SIEMPRE usa C de Landolt (requisito
   * explicito), nunca otro tipo de optotipo, por eso no tiene su propio
   * `symbolType`. */
  blockIndex: number;
  viewingDistanceCm: number;
  /** Porcentaje de contraste de Weber (1-100) - cambiarlo NUNCA cambia
   * el bloque ni el tamaño fisico representado (requisito explicito:
   * "no cambiar la agudeza representada al modificar el contraste"). */
  contrastPercent: number;
}

export const DEFAULT_CONTRASTE_CONFIG: ContrasteConfig = {
  blockIndex: 0,
  viewingDistanceCm: DEFAULT_VIEWING_DISTANCE_CM,
  contrastPercent: CONTRASTE_DEFAULT_PERCENT,
};

export function isValidContrasteConfig(value: unknown): value is ContrasteConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.blockIndex !== "number" || !Number.isInteger(v.blockIndex)) return false;
  if (v.blockIndex < 0 || v.blockIndex >= AGUDEZA_BLOCK_COUNT) return false;
  if (!isValidViewingDistanceCm(v.viewingDistanceCm)) return false;
  if (typeof v.contrastPercent !== "number" || !Number.isFinite(v.contrastPercent)) return false;
  if (v.contrastPercent < CONTRASTE_MIN_PERCENT || v.contrastPercent > CONTRASTE_MAX_PERCENT) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Rejilla sinusoidal (sensibilidad al contraste por frecuencia espacial) */
/* ------------------------------------------------------------------ */

/**
 * Prueba de sensibilidad al contraste por DISCRIMINACION DE FRECUENCIA
 * ESPACIAL: un circulo de diametro EXTERIOR constante (nunca cambia con
 * el nivel ni la orientacion) con una rejilla sinusoidal dentro,
 * progresando por una secuencia ORDENADA y DISCRETA de niveles de
 * frecuencia (REJILLA_FREQUENCY_LEVELS) - nunca continua, con limites
 * claros al principio y al final (ver clampRejillaFrequencyLevelIndex).
 * Subir de nivel SOLO estrecha las bandas (mas ciclos dentro del MISMO
 * diametro); nunca cambia el tamaño exterior.
 *
 * Definicion de contraste elegida: CONTRASTE DE MICHELSON,
 * C = (Lmax - Lmin) / (Lmax + Lmin) - la definicion estandar para un
 * patron PERIODICO como una rejilla (a diferencia de Weber, pensado
 * para un estimulo AISLADO sobre fondo uniforme - ver la seccion
 * "Contraste" arriba). Gris medio FIJO en el centro exacto del rango
 * (127.5) para que el contraste maximo (100%) ocupe el rango completo
 * sin recortar (Lmax=255, Lmin=0). El contraste es un parametro
 * INDEPENDIENTE del nivel de frecuencia y de la orientacion - cambiar
 * uno nunca cambia los otros dos (requisito explicito).
 *
 * FRECUENCIA ESPACIAL: la secuencia de niveles (REJILLA_FREQUENCY_LEVELS)
 * es un numero de ciclos completos dentro del diametro del circulo -
 * siempre un parametro util y reproducible, pero SIN unidad fisica
 * mientras no haya calibracion. SOLO cuando hay calibracion real de la
 * pantalla Y se conoce la distancia de exploracion se puede ademas
 * traducir ese nivel a CICLOS POR GRADO visual reales, usando el
 * diametro fisico REAL del circulo ya renderizado (ver
 * computeCircleAngularDiameterDegres) - la misma geometria exacta
 * (tangente, nunca la aproximacion de angulo pequeño) que el resto del
 * modulo. Sin calibrar, JAMAS se presenta un valor en ciclos/grado.
 *
 * ORIENTACION: 3 orientaciones inequivocas (vertical, diagonal en cada
 * sentido) - ver REJILLA_ORIENTATION_VALUES/getRejillaOrientationAngleDeg.
 *
 * Esta prueba NO reproduce ningun protocolo clinico normalizado de
 * sensibilidad al contraste (como un test de Pelli-Robson o una curva
 * CSF completa) - es una herramienta de exploracion perceptual
 * cualitativa, nunca presentada como un test clinico normalizado.
 */
export const MICHELSON_MEAN_GRAY = 127.5;
export const REJILLA_DEFAULT_CONTRAST_PERCENT = 80;

/** Secuencia ORDENADA y discreta de niveles de frecuencia (numero de
 * ciclos completos dentro del diametro fijo del circulo) - de mas baja
 * (bandas anchas) a mas alta (bandas estrechas). Configurable: ampliar
 * esta lista es el UNICO punto de extension necesario para añadir mas
 * niveles. */
export const REJILLA_FREQUENCY_LEVELS: readonly number[] = [1, 2, 3, 4, 6, 8, 11, 15, 20, 26];
export const REJILLA_DEFAULT_FREQUENCY_LEVEL_INDEX = 0;

/** Limites CLAROS al principio y al final de la escala (requisito
 * explicito: "sin avanzar indefinidamente") - nunca sale de
 * [0, REJILLA_FREQUENCY_LEVELS.length - 1]. */
export function clampRejillaFrequencyLevelIndex(value: number): number {
  if (!Number.isFinite(value)) return REJILLA_DEFAULT_FREQUENCY_LEVEL_INDEX;
  return Math.min(REJILLA_FREQUENCY_LEVELS.length - 1, Math.max(0, Math.round(value)));
}

export type RejillaOrientation = "vertical" | "diagonal1" | "diagonal2";
export const REJILLA_ORIENTATION_VALUES: readonly RejillaOrientation[] = ["vertical", "diagonal1", "diagonal2"];

export function isValidRejillaOrientation(value: unknown): value is RejillaOrientation {
  return typeof value === "string" && REJILLA_ORIENTATION_VALUES.includes(value as RejillaOrientation);
}

/** Angulo de giro (grados) de las bandas para cada orientacion -
 * 'vertical' (bandas que alternan de izquierda a derecha, estrias
 * VERTICALES, angulo 0) y las dos diagonales, en sentidos opuestos e
 * inequivocos (+45/-45). Girar un CIRCULO este angulo no cambia su
 * diametro aparente (es rotacionalmente simetrico) - ver
 * SinusoidalGratingView en OptotiposClient.tsx, que aplica este angulo
 * como una transformacion CSS rigida sobre el circulo ya dibujado. */
export function getRejillaOrientationAngleDeg(orientation: RejillaOrientation): number {
  if (orientation === "diagonal1") return 45;
  if (orientation === "diagonal2") return -45;
  return 0;
}

/** Sortea `count` orientaciones, cada una INDEPENDIENTE y con reemplazo
 * (nunca se fuerza que sean distintas entre si - requisito explicito:
 * "no es necesario forzar una orientacion diferente en cada circulo si
 * eso complica innecesariamente la logica, pero si debe variar
 * realmente entre presentaciones") - usada para asignar una orientacion
 * a cada uno de los circulos simultaneos de la rejilla sinusoidal
 * (ver SinusoidalGratingView en OptotiposClient.tsx), que ahora
 * comparten frecuencia y contraste pero varian en orientacion. */
export function generateRejillaOrientations(count: number, randomFn: () => number = Math.random): RejillaOrientation[] {
  const result: RejillaOrientation[] = [];
  for (let i = 0; i < count; i += 1) result.push(pickFromPool(REJILLA_ORIENTATION_VALUES, randomFn));
  return result;
}

export function computeMichelsonContrast(lMax: number, lMin: number): number {
  const sum = lMax + lMin;
  if (sum === 0) return 0;
  return (lMax - lMin) / sum;
}

export interface GratingLuminanceRange {
  lMax: number;
  lMin: number;
}

/** Rango de luminancia (gris 0-255) que produce EXACTAMENTE
 * `contrastPercent`% de contraste de Michelson alrededor del gris medio
 * fijo. */
export function computeGratingLuminanceRange(contrastPercent: number): GratingLuminanceRange {
  const fraction = clampContrastPercent(contrastPercent, REJILLA_DEFAULT_CONTRAST_PERCENT) / 100;
  return {
    lMax: MICHELSON_MEAN_GRAY * (1 + fraction),
    lMin: MICHELSON_MEAN_GRAY * (1 - fraction),
  };
}

/** Tamaño FISICO (mm) que ocupa 1 grado de angulo visual a `distanceCm`
 * de distancia - MISMA geometria exacta (tangente) que
 * computeOptotypeHeightMm, aplicada a un angulo completo de 1 grado en
 * vez de a 5xMAR arcominutos. Verificacion de referencia: a 6m, 1 grado
 * subtiende ≈10.5cm (la regla practica conocida "distancia/57.3" - ver
 * el test correspondiente). */
export function computeDegreePhysicalSizeMm(distanceCm: number): number {
  const distanceMm = distanceCm * 10;
  const oneDegreeRad = Math.PI / 180;
  return 2 * distanceMm * Math.tan(oneDegreeRad / 2);
}

/** Angulo visual (grados) que subtiende un objeto de `physicalSizeMm` a
 * `distanceCm` de distancia - geometria EXACTA (tangente, nunca la
 * aproximacion de angulo pequeño), funcion INVERSA de
 * computeDegreePhysicalSizeMm (alli: angulo fijo en 1 grado -> tamaño
 * fisico; aqui: tamaño fisico fijo -> angulo). Se usa para expresar el
 * diametro REAL del circulo de la rejilla en grados de angulo visual,
 * SOLO cuando hay calibracion real (ver RejillaConfig/
 * SinusoidalGratingView). */
export function computeCircleAngularDiameterDegrees(physicalSizeMm: number, distanceCm: number): number {
  const distanceMm = distanceCm * 10;
  if (distanceMm <= 0) return 0;
  const angleRad = 2 * Math.atan(physicalSizeMm / 2 / distanceMm);
  return (angleRad * 180) / Math.PI;
}

export interface RejillaConfig {
  /** Indice dentro de REJILLA_FREQUENCY_LEVELS (nunca un valor continuo
   * libre) - avanzar/retroceder es sumar/restar 1 a este indice,
   * siempre con limites claros (ver clampRejillaFrequencyLevelIndex).
   * COMPARTIDO por los 4 circulos mostrados a la vez (requisito
   * explicito: "mismo nivel de frecuencia... mismo contraste" - la
   * orientacion, en cambio, se sortea de forma independiente POR
   * circulo en cada cambio, ver generateRejillaOrientations en
   * OptotiposClient.tsx, por eso NO vive en este objeto de
   * configuracion persistente). */
  frequencyLevelIndex: number;
  /** Independiente del nivel de frecuencia - cambiarlo nunca lo
   * modifica (requisito explicito). COMPARTIDO por los 4 circulos. */
  contrastPercent: number;
  viewingDistanceCm: number;
}

export const DEFAULT_REJILLA_CONFIG: RejillaConfig = {
  frequencyLevelIndex: REJILLA_DEFAULT_FREQUENCY_LEVEL_INDEX,
  contrastPercent: REJILLA_DEFAULT_CONTRAST_PERCENT,
  viewingDistanceCm: DEFAULT_VIEWING_DISTANCE_CM,
};

export function isValidRejillaConfig(value: unknown): value is RejillaConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.frequencyLevelIndex !== "number" || !Number.isInteger(v.frequencyLevelIndex)) return false;
  if (v.frequencyLevelIndex < 0 || v.frequencyLevelIndex >= REJILLA_FREQUENCY_LEVELS.length) return false;
  if (typeof v.contrastPercent !== "number" || !Number.isFinite(v.contrastPercent)) return false;
  if (v.contrastPercent < CONTRASTE_MIN_PERCENT || v.contrastPercent > CONTRASTE_MAX_PERCENT) return false;
  if (!isValidViewingDistanceCm(v.viewingDistanceCm)) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Configuracion combinada                                             */
/* ------------------------------------------------------------------ */

export const OPTOTIPOS_SCHEMA_VERSION = 1;

export interface OptotiposCardConfig {
  schemaVersion: typeof OPTOTIPOS_SCHEMA_VERSION;
  /** Prueba actualmente mostrada - cambiarla NUNCA descarta la
   * configuracion de las demas (cada una vive en su propio campo). */
  activeTest: OptotipoTestId;
  agudeza: AgudezaConfig;
  circuloHorario: CirculoHorarioConfig;
  rojoVerde: RojoVerdeConfig;
  fijacion: FijacionConfig;
  worth: WorthConfig;
  alineamientoBinocular: AlineamientoBinocularConfig;
  contraste: ContrasteConfig;
  rejillaSinusoidal: RejillaConfig;
  /** Calibracion del MONITOR (no de una prueba concreta - es una
   * propiedad de la pantalla fisica que se esta usando en esta sesion).
   * `null` = sin calibrar (estado por defecto). */
  calibration: MonitorCalibration | null;
}

export const DEFAULT_OPTOTIPOS_CONFIG: OptotiposCardConfig = {
  schemaVersion: OPTOTIPOS_SCHEMA_VERSION,
  activeTest: "agudeza",
  agudeza: DEFAULT_AGUDEZA_CONFIG,
  circuloHorario: DEFAULT_CIRCULO_HORARIO_CONFIG,
  rojoVerde: DEFAULT_ROJO_VERDE_CONFIG,
  fijacion: DEFAULT_FIJACION_CONFIG,
  worth: DEFAULT_WORTH_CONFIG,
  alineamientoBinocular: DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG,
  contraste: DEFAULT_CONTRASTE_CONFIG,
  rejillaSinusoidal: DEFAULT_REJILLA_CONFIG,
  calibration: null,
};

/** Sin version anterior que migrar todavia (esta ES la v1) - mismo
 * criterio y mismo punto de extension documentado que
 * migrateHartCardConfig/migrateMcDonaldCardConfig/
 * migratePanalesCardConfig. */
export function migrateOptotiposCardConfig(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion === OPTOTIPOS_SCHEMA_VERSION) return value;
  // Punto de extension: aqui irian las transformaciones incrementales de
  // una v0 (inexistente hoy) u otra version anterior hacia OPTOTIPOS_SCHEMA_VERSION.
  return value;
}

export function isValidOptotiposCardConfig(value: unknown): value is OptotiposCardConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== OPTOTIPOS_SCHEMA_VERSION) return false;
  if (typeof v.activeTest !== "string" || !OPTOTIPO_TEST_VALUES.includes(v.activeTest as OptotipoTestId)) return false;
  if (!isValidAgudezaConfig(v.agudeza)) return false;
  if (!isValidCirculoHorarioConfig(v.circuloHorario)) return false;
  if (!isValidRojoVerdeConfig(v.rojoVerde)) return false;
  if (!isValidFijacionConfig(v.fijacion)) return false;
  if (!isValidWorthConfig(v.worth)) return false;
  if (!isValidAlineamientoBinocularConfig(v.alineamientoBinocular)) return false;
  if (!isValidContrasteConfig(v.contraste)) return false;
  if (!isValidRejillaConfig(v.rejillaSinusoidal)) return false;
  if (v.calibration !== null && !isValidMonitorCalibration(v.calibration)) return false;
  return true;
}

/** Compone migrate+isValid - mismo patron que resolveHartCardConfig/
 * resolveMcDonaldCardConfig/resolvePanalesCardConfig, ya definido desde
 * ahora para una futura fase de guardado de presets, sin consumidor
 * todavia en esta fase (sin persistencia). */
export function resolveOptotiposCardConfig(raw: unknown): OptotiposCardConfig | null {
  const migrated = migrateOptotiposCardConfig(raw);
  return isValidOptotiposCardConfig(migrated) ? (migrated as OptotiposCardConfig) : null;
}
