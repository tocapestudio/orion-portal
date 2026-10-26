/**
 * Logica PURA de ORION Tools · Cartas · McDonald (version ESTATICA, fase
 * 1) - mismo patron ya establecido en hartConfig.ts: tipos, config por
 * defecto, generacion de estimulos/color/posicion y
 * validacion/migracion de la configuracion serializada. Sin ningun
 * import de React/Next/Supabase ni de otro modulo de herramienta (ni
 * siquiera de hartConfig.ts): cada herramienta de Cartas es privada,
 * solo los CATALOGOS compartidos (BASE_LETTERS/BASE_NUMBERS) se
 * reutilizan, y eso lo hace McDonaldClient.tsx, igual que HartClient.tsx.
 *
 * GEOMETRIA: entre 1 y 5 anillos CONCENTRICOS, configurables
 * (`ringCount`, por defecto 3 - ver MCDONALD_MIN/MAX/DEFAULT_RINGS).
 * `computeRingDefinitions(ringCount)` calcula, para un numero de anillos
 * dado, el radio (% del radio del contenedor cuadrado, 50% = borde) y la
 * cantidad de estimulos de cada uno:
 *   - RADIOS: repartidos UNIFORMEMENTE entre MCDONALD_RING_RADIUS_MIN
 *     (15%) y MCDONALD_RING_RADIUS_MAX (43%, deja margen hasta el borde
 *     del contenedor para el propio tamaño del caracter, evitando
 *     recortes) - salvo con 1 anillo, que usa el punto medio (29%): un
 *     unico anillo no necesita "repartirse", pero debe quedar a un radio
 *     claro, ni pegado al centro ni al borde.
 *   - CANTIDAD: progresion aritmetica `MCDONALD_RING_BASE_COUNT +
 *     i*MCDONALD_RING_COUNT_STEP` (6, 10, 14, 18, 22 para i=0..4) - la
 *     MISMA formula que ya definia implicitamente los 3 anillos
 *     originales (6/10/14), elegida para que `ringCount=3` (el valor por
 *     defecto) reproduzca EXACTAMENTE la geometria previa a esta
 *     ampliacion (mismos radios 15/29/43, mismas cantidades 6/10/14) -
 *     "conservar el comportamiento actual" tal y como pide la
 *     especificacion de esta ampliacion.
 * Densidad angular similar entre anillos para cualquier `ringCount`
 * (arco por estimulo entre ~12% y ~16% del radio del contenedor, ver
 * mcdonaldConfig.test.ts). Esta distribucion NO representa ningun
 * estandar clinico del McDonald chart - es una eleccion visual de esta
 * herramienta, documentada aqui en vez de presentada como un valor de
 * referencia.
 *
 * COMPROMISO DOCUMENTADO: al repartir SIEMPRE el mismo rango fijo de
 * radios (15%-43%) entre `ringCount` anillos, el hueco RADIAL entre
 * anillos consecutivos se reduce al aumentar `ringCount` (14 puntos
 * porcentuales con 3 anillos, hasta 7 puntos con 5). Una alternativa mas
 * "perfecta" seria encoger automaticamente el tamaño de caracter segun
 * `ringCount`, pero eso acoplaria geometria y tamaño (dos conceptos que
 * la especificacion pide mantener independientes) sin que se haya
 * pedido explicitamente - se prioriza esta implementacion mas simple y
 * predecible; con 5 anillos y caracteres grandes en modo progresivo el
 * margen visual es mas ajustado, y el control `charSize` ya existente
 * permite al profesional compensarlo manualmente si lo necesita.
 *
 * REGENERAR AL CAMBIAR `ringCount`: cambiar el numero de anillos SIEMPRE
 * regenera el contenido/color (igual que cambiar `content`/`colorMode`),
 * en vez de intentar "preservar" el contenido de los anillos que
 * pudieran coincidir por indice - decision deliberada: como los RADIOS
 * de TODOS los anillos se recalculan para el nuevo `ringCount` (ver
 * arriba), el "anillo 1" de una configuracion de 3 anillos y el "anillo
 * 1" de una de 4 ya no comparten radio ni cantidad de estimulos, asi que
 * no hay una nocion clara de que contenido "preservar" sin introducir
 * heuristicas complejas y de dudoso beneficio practico (pedido explicito
 * de priorizar una implementacion correcta y documentada antes que una
 * complejidad injustificada).
 *
 * Los caracteres NUNCA rotan: `computeRingPosition` solo calcula la
 * posicion (x%, y%) del CENTRO de cada estimulo, nunca un angulo de
 * rotacion para aplicar al caracter (requisito explicito: "deben
 * permanecer siempre en posicion vertical, sin rotarse"). Esto sigue
 * siendo cierto en el MODO DINAMICO (ver mas abajo): la rotacion se
 * consigue recalculando la POSICION (x%, y%) de cada estimulo con un
 * angulo extra `extraAngleRad`, nunca aplicando un `rotate(...)` CSS al
 * caracter - por construccion, nunca hay nada que "compensar": el
 * caracter jamas se rota, solo se traslada a una posicion distinta en
 * cada fotograma. Es una solucion EQUIVALENTE a "rotar el contenedor del
 * anillo y contrarrotar cada caracter" (ambas garantizan verticalidad),
 * mas simple de razonar y de probar porque toda la geometria pasa por
 * una unica funcion pura (`computeRingPosition`).
 *
 * MODO DINAMICO (fase 2): la velocidad se expresa en rpm (revoluciones
 * por minuto) y se convierte a radianes/ms con `rpmToRadiansPerMs`. El
 * angulo ACUMULADO de rotacion se calcula en la UI sumando, fotograma a
 * fotograma, el incremento que devuelve `computeRotationAngleRad(rpm,
 * deltaMs, direction)` - nunca recalculando desde un tiempo absoluto
 * fijo, precisamente para poder cambiar `rpm`/`direction` en caliente
 * sin que el angulo "salte" (el incremento de UN fotograma con los
 * parametros NUEVOS es pequeño, se suma sobre el angulo ya acumulado).
 */

export type McDonaldContent = "letters" | "numbers" | "mixed";
export type McDonaldColorMode = "neutral" | "monochromeRed" | "monochromeGreen" | "redGreen";
/** 5 niveles (ampliado desde los 3 originales "sm"/"md"/"lg"): "xs"
 * (nuevo minimo, mas pequeño que "sm") y "xl" (nuevo maximo, notablemente
 * mas grande que "lg") - ver los valores concretos en rem/vmin en
 * McDonaldClient.tsx. "xs" existe en particular para poder mantener
 * legibles y separados los estimulos con 5 anillos en modo progresivo
 * (el anillo exterior, el mas critico, queda mas pequeño que el "sm"
 * original incluso con el factor de escala progresivo MAX aplicado). */
export type McDonaldCharSize = "xs" | "sm" | "md" | "lg" | "xl";
export type McDonaldCardSize = "sm" | "md" | "lg";
/** 'uniform' = mismo tamaño en todos los anillos (el de McDonaldCharSize);
 * 'progressive' = el tamaño depende del anillo (ver
 * resolveRingSizeScale) - exterior mas grande, interior mas pequeño. */
export type McDonaldCharSizeMode = "uniform" | "progressive";
export type McDonaldMotionMode = "static" | "dynamic";
export type McDonaldRotationDirection = "clockwise" | "counterclockwise";

export const MCDONALD_CONTENT_VALUES: readonly McDonaldContent[] = ["letters", "numbers", "mixed"];
export const MCDONALD_COLOR_MODE_VALUES: readonly McDonaldColorMode[] = ["neutral", "monochromeRed", "monochromeGreen", "redGreen"];
export const MCDONALD_CHAR_SIZE_VALUES: readonly McDonaldCharSize[] = ["xs", "sm", "md", "lg", "xl"];
export const MCDONALD_CARD_SIZE_VALUES: readonly McDonaldCardSize[] = ["sm", "md", "lg"];
export const MCDONALD_CHAR_SIZE_MODE_VALUES: readonly McDonaldCharSizeMode[] = ["uniform", "progressive"];
export const MCDONALD_MOTION_MODE_VALUES: readonly McDonaldMotionMode[] = ["static", "dynamic"];
export const MCDONALD_ROTATION_DIRECTION_VALUES: readonly McDonaldRotationDirection[] = ["clockwise", "counterclockwise"];

/** Mismos hex que hartConfig.ts (y que BASE_COLOR_PALETTE) por
 * coherencia visual entre herramientas de Cartas - reimplementados aqui,
 * no importados, mismo criterio ya documentado arriba. */
export const MCDONALD_NEUTRAL_COLOR = "#10203f";
export const MCDONALD_DEFAULT_RED = "#ef4444";
export const MCDONALD_DEFAULT_GREEN = "#22c55e";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

/** Rango practico de velocidad de giro (revoluciones por minuto) para
 * entrenamiento visual - limites de seguridad/usabilidad de ESTA
 * herramienta, NUNCA presentados como un estandar clinico. */
export const MCDONALD_MIN_ROTATION_RPM = 0.5;
export const MCDONALD_MAX_ROTATION_RPM = 6;
export const MCDONALD_DEFAULT_ROTATION_RPM = 2;

export function clampRotationRpm(value: number): number {
  if (!Number.isFinite(value)) return MCDONALD_DEFAULT_ROTATION_RPM;
  return Math.min(MCDONALD_MAX_ROTATION_RPM, Math.max(MCDONALD_MIN_ROTATION_RPM, value));
}

/** rpm -> radianes por milisegundo (1 revolucion = 2*PI radianes; rpm =
 * revoluciones/minuto = revoluciones/60000ms). */
export function rpmToRadiansPerMs(rpm: number): number {
  return (rpm * 2 * Math.PI) / 60000;
}

/** Incremento de angulo (radianes) tras `elapsedMs` de giro continuo a
 * `rpm`, en el sentido `direction` - PURA, no depende de ningun reloj
 * real (facil de probar con valores de elapsedMs sinteticos). Sirve
 * tanto para un angulo ABSOLUTO (elapsedMs = tiempo total desde el
 * reposo) como para un INCREMENTO por fotograma (elapsedMs = deltaMs de
 * ese fotograma) - es lineal en elapsedMs, ambos usos son validos y la
 * UI usa el segundo (acumulando incrementos fotograma a fotograma, ver
 * cabecera del archivo sobre por que NUNCA se recalcula desde un tiempo
 * absoluto fijo). */
export function computeRotationAngleRad(rpm: number, elapsedMs: number, direction: McDonaldRotationDirection): number {
  const sign = direction === "clockwise" ? 1 : -1;
  return sign * rpmToRadiansPerMs(rpm) * elapsedMs;
}

/** Limites de escala en modo 'progressive' (interior -> exterior) - UNICO
 * lugar donde se definen, para poder ajustarlos facilmente despues.
 * Exterior notablemente mas grande que interior (proporcion
 * perceptible: 2x). NUNCA presentado como un estandar clinico, es una
 * eleccion visual inicial. Generalizados a cualquier `ringCount` (ver
 * resolveRingSizeScale) en vez de una tabla fija de 3 valores - con
 * ringCount=3 (el valor por defecto) el anillo intermedio queda en 1.05
 * en vez del 1.0 exacto de la version anterior (diferencia
 * imperceptible), a cambio de una formula CONSISTENTE para cualquier
 * cantidad de anillos en vez de una tabla que solo cubria 3. */
export const MCDONALD_PROGRESSIVE_SCALE_MIN = 0.7;
export const MCDONALD_PROGRESSIVE_SCALE_MAX = 1.4;

/** Factor de escala del tamaño de caracter para un anillo dado, segun el
 * modo elegido y el numero TOTAL de anillos - 'uniform' siempre 1 (mismo
 * tamaño en todos los anillos, igual al charSize global); 'progressive'
 * interpola linealmente entre MCDONALD_PROGRESSIVE_SCALE_MIN (anillo
 * interior) y MCDONALD_PROGRESSIVE_SCALE_MAX (anillo exterior). Con
 * `ringCount<=1` siempre devuelve 1 aunque el modo sea 'progressive'
 * (requisito explicito: "con un solo anillo, ambos modos seran
 * equivalentes" - no hay "interior" ni "exterior" que distinguir). No
 * depende de los radios - el tamaño del caracter y la distribucion
 * geometrica son conceptos independientes (requisito explicito). */
export function resolveRingSizeScale(mode: McDonaldCharSizeMode, ringIndex: number, ringCount: number): number {
  if (mode === "uniform" || ringCount <= 1) return 1;
  return MCDONALD_PROGRESSIVE_SCALE_MIN + (ringIndex * (MCDONALD_PROGRESSIVE_SCALE_MAX - MCDONALD_PROGRESSIVE_SCALE_MIN)) / (ringCount - 1);
}

/** Limites del numero de anillos configurables - ver razonamiento
 * completo (radios/cantidades/compromiso de separacion radial) en el
 * comentario de cabecera de este archivo. 3 como valor por defecto para
 * conservar exactamente el comportamiento previo a esta ampliacion. */
export const MCDONALD_MIN_RINGS = 1;
export const MCDONALD_MAX_RINGS = 5;
export const MCDONALD_DEFAULT_RINGS = 3;

export function clampRingCount(value: number): number {
  if (!Number.isFinite(value)) return MCDONALD_DEFAULT_RINGS;
  return Math.min(MCDONALD_MAX_RINGS, Math.max(MCDONALD_MIN_RINGS, Math.round(value)));
}

export const MCDONALD_SCHEMA_VERSION = 1;

export interface McDonaldCardConfig {
  schemaVersion: typeof MCDONALD_SCHEMA_VERSION;
  /** Numero de anillos concentricos, entre MCDONALD_MIN_RINGS y
   * MCDONALD_MAX_RINGS (ver computeRingDefinitions para como afecta a
   * los radios/cantidades resultantes). */
  ringCount: number;
  content: McDonaldContent;
  colorMode: McDonaldColorMode;
  /** Usado si colorMode es 'monochromeRed' o 'redGreen'. */
  redHex: string;
  /** Usado si colorMode es 'monochromeGreen' o 'redGreen'. */
  greenHex: string;
  /** Tamaño de CADA caracter - independiente del tamaño global de la
   * carta (requisito explicito: controles separados). */
  charSize: McDonaldCharSize;
  /** Tamaño GLOBAL de la carta (diametro del area circular) - al usar
   * porcentajes para los radios de los anillos, escalar este valor
   * mantiene las proporciones circulares automaticamente, sin tocar
   * computeRingDefinitions. */
  cardSize: McDonaldCardSize;
  /** 'uniform' = charSize se aplica igual a todos los anillos;
   * 'progressive' (por defecto) = charSize es la referencia, y cada
   * anillo aplica su propio factor (ver resolveRingSizeScale). */
  charSizeMode: McDonaldCharSizeMode;
  /** 'static' (por defecto) = comportamiento identico a la fase 1, sin
   * movimiento. 'dynamic' = los anillos giran (ver rotationDirection/
   * rotationSpeedRpm) - el numero de estimulos, sus posiciones BASE y el
   * tamaño de los caracteres son conceptos independientes del modo de
   * movimiento, nunca se recalculan por cambiar este campo. */
  motionMode: McDonaldMotionMode;
  rotationDirection: McDonaldRotationDirection;
  /** Revoluciones por minuto - solo tiene efecto si motionMode es
   * 'dynamic'. Rango practico, NUNCA presentado como un estandar
   * clinico (ver MCDONALD_MIN_ROTATION_RPM/MCDONALD_MAX_ROTATION_RPM). */
  rotationSpeedRpm: number;
}

export const DEFAULT_MCDONALD_CONFIG: McDonaldCardConfig = {
  schemaVersion: MCDONALD_SCHEMA_VERSION,
  ringCount: MCDONALD_DEFAULT_RINGS,
  content: "letters",
  colorMode: "neutral",
  redHex: MCDONALD_DEFAULT_RED,
  greenHex: MCDONALD_DEFAULT_GREEN,
  charSize: "md",
  cardSize: "md",
  charSizeMode: "progressive",
  motionMode: "static",
  rotationDirection: "clockwise",
  rotationSpeedRpm: MCDONALD_DEFAULT_ROTATION_RPM,
};

export interface McDonaldRingDefinition {
  radiusPercent: number;
  count: number;
}

/** Limites del rango de radios y de la progresion de cantidades - ver
 * computeRingDefinitions y el comentario de cabecera del archivo. */
export const MCDONALD_RING_RADIUS_MIN = 15;
export const MCDONALD_RING_RADIUS_MAX = 43;
export const MCDONALD_RING_BASE_COUNT = 6;
export const MCDONALD_RING_COUNT_STEP = 4;

/** Calcula los `ringCount` anillos concentricos (radio + cantidad) -
 * GENERALIZACION del conjunto fijo de 3 anillos de la fase anterior. Ver
 * razonamiento completo (radios/cantidades/compromiso de separacion
 * radial) en el comentario de cabecera de este archivo. `ringCount` se
 * clampa primero (nunca lanza con valores fuera de rango). */
export function computeRingDefinitions(ringCount: number): McDonaldRingDefinition[] {
  const n = clampRingCount(ringCount);
  const definitions: McDonaldRingDefinition[] = [];
  for (let i = 0; i < n; i += 1) {
    const radiusPercent =
      n === 1
        ? (MCDONALD_RING_RADIUS_MIN + MCDONALD_RING_RADIUS_MAX) / 2
        : MCDONALD_RING_RADIUS_MIN + (i * (MCDONALD_RING_RADIUS_MAX - MCDONALD_RING_RADIUS_MIN)) / (n - 1);
    definitions.push({ radiusPercent, count: MCDONALD_RING_BASE_COUNT + i * MCDONALD_RING_COUNT_STEP });
  }
  return definitions;
}

/** Numero total de estimulos de la carta para un `ringCount` dado - suma
 * de `count` de todos sus anillos. */
export function computeTotalStimuli(ringCount: number): number {
  return computeRingDefinitions(ringCount).reduce((sum, ring) => sum + ring.count, 0);
}

export interface McDonaldStimulus {
  /** Indice del anillo (0 = interior) - permite a la UI aplicar estilos
   * por anillo en el futuro sin recalcular geometria. */
  ring: number;
  content: string;
  color: string;
  /** Posicion del CENTRO del caracter, en % del contenedor cuadrado
   * (0-100). El renderizado SOLO debe trasladar (translate), nunca
   * rotar, un elemento a esta posicion. */
  xPercent: number;
  yPercent: number;
}

/** Posicion (x%, y%) del estimulo `index` (0-based) de un anillo con
 * `count` estimulos y radio `radiusPercent` - angulo de partida en las
 * 12 (arriba), reparto uniforme en sentido horario, mas un
 * `extraAngleRad` opcional (0 por defecto, modo estatico/fase 1 sin
 * cambios de comportamiento) que desplaza TODO el anillo como un bloque
 * - usado por el modo dinamico para la rotacion continua (ver cabecera
 * del archivo). Geometria PURA de posicion unicamente: nunca calcula ni
 * devuelve ningun angulo de ROTACION DEL CARACTER (ver nota de "los
 * caracteres nunca rotan" en la cabecera del archivo) - `extraAngleRad`
 * mueve el PUNTO, nunca orienta el caracter que se dibuje en el. */
export function computeRingPosition(radiusPercent: number, index: number, count: number, extraAngleRad: number = 0): { xPercent: number; yPercent: number } {
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2 + extraAngleRad;
  return {
    xPercent: 50 + radiusPercent * Math.cos(angle),
    yPercent: 50 + radiusPercent * Math.sin(angle),
  };
}

export interface McDonaldStimulusGeometry {
  radiusPercent: number;
  indexInRing: number;
  countInRing: number;
}

/** Geometria (radio/indice-en-su-anillo/cuenta-del-anillo) de CADA
 * estimulo para un `ringCount` dado, en el MISMO orden que genera
 * generateMcDonaldStimuli (anillo por anillo, interior primero) -
 * depende solo de computeRingDefinitions(ringCount), nunca del
 * contenido/color, que cambian en cada regeneracion. La UI la usa para
 * recalcular la posicion de cada estimulo en vivo durante la rotacion
 * dinamica (via computeRingPosition con un extraAngleRad variable) sin
 * tener que rehacer el agrupamiento por anillo en cada fotograma. */
export function computeStimulusRingGeometry(ringCount: number): McDonaldStimulusGeometry[] {
  return computeRingDefinitions(ringCount).flatMap((ring) =>
    Array.from({ length: ring.count }, (_, indexInRing) => ({ radiusPercent: ring.radiusPercent, indexInRing, countInRing: ring.count }))
  );
}

function pickStimulusContent(pool: readonly string[], randomFn: () => number): string {
  if (pool.length === 0) return "";
  const index = Math.min(Math.floor(randomFn() * pool.length), pool.length - 1);
  return pool[index];
}

/** Contenido (sin color) de TODOS los estimulos, anillo por anillo, en
 * el mismo orden que `ringDefinitions` (interior primero) - longitud
 * exacta igual a la suma de `count` de `ringDefinitions`. `pool` ya
 * viene resuelto por el llamador segun el McDonaldContent elegido
 * ('mixed' = letras+numeros combinados), igual que en generateHartGrid. */
export function generateMcDonaldContent(ringDefinitions: readonly McDonaldRingDefinition[], pool: readonly string[], randomFn: () => number = Math.random): string[] {
  const content: string[] = [];
  for (const ring of ringDefinitions) {
    for (let i = 0; i < ring.count; i += 1) content.push(pickStimulusContent(pool, randomFn));
  }
  return content;
}

/** Distribucion rojo-verde EQUILIBRADA - MISMO algoritmo y mismo
 * criterio que generateBalancedRedGreenFlags de hartConfig.ts
 * (reimplementado, no importado, por la razon ya documentada: ningun
 * modulo de herramienta depende de otro), adaptado aqui al numero total
 * de estimulos de la carta (ver computeTotalStimuli) en vez de
 * rows*columns. */
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

export function resolveMcDonaldColors(colorMode: McDonaldColorMode, redHex: string, greenHex: string, n: number, randomFn: () => number = Math.random): string[] {
  if (colorMode === "neutral") return Array(n).fill(MCDONALD_NEUTRAL_COLOR);
  if (colorMode === "monochromeRed") return Array(n).fill(redHex);
  if (colorMode === "monochromeGreen") return Array(n).fill(greenHex);
  return generateBalancedRedGreenFlags(n, randomFn).map((isRed) => (isRed ? redHex : greenHex));
}

/** Genera la carta COMPLETA (contenido + color + posicion por estimulo)
 * a partir de la configuracion - la unica funcion que la UI necesita
 * llamar, tanto al cambiar contenido/color/ringCount como al pulsar
 * "Regenerar" (mismos parametros, nuevo sorteo; la POSICION BASE de cada
 * estimulo nunca cambia entre regeneraciones con el MISMO ringCount,
 * solo su contenido/color, porque depende solo de
 * computeRingDefinitions(config.ringCount)). `pool` = catalogo ya
 * resuelto por el llamador segun config.content. */
export function generateMcDonaldStimuli(config: McDonaldCardConfig, pool: readonly string[], randomFn: () => number = Math.random): McDonaldStimulus[] {
  const ringDefinitions = computeRingDefinitions(config.ringCount);
  const content = generateMcDonaldContent(ringDefinitions, pool, randomFn);
  const colors = resolveMcDonaldColors(config.colorMode, config.redHex, config.greenHex, content.length, randomFn);
  const stimuli: McDonaldStimulus[] = [];
  let i = 0;
  ringDefinitions.forEach((ring, ringIndex) => {
    for (let j = 0; j < ring.count; j += 1) {
      const { xPercent, yPercent } = computeRingPosition(ring.radiusPercent, j, ring.count);
      stimuli.push({ ring: ringIndex, content: content[i], color: colors[i], xPercent, yPercent });
      i += 1;
    }
  });
  return stimuli;
}

/** Sin version anterior que migrar todavia (esta ES la v1) - mismo
 * criterio y mismo punto de extension documentado que
 * migrateHartCardConfig. */
export function migrateMcDonaldCardConfig(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion === MCDONALD_SCHEMA_VERSION) return value;
  // Punto de extension: aqui irian las transformaciones incrementales de
  // una v0 (inexistente hoy) u otra version anterior hacia MCDONALD_SCHEMA_VERSION.
  return value;
}

export function isValidMcDonaldCardConfig(value: unknown): value is McDonaldCardConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== MCDONALD_SCHEMA_VERSION) return false;
  if (
    typeof v.ringCount !== "number" ||
    !Number.isInteger(v.ringCount) ||
    v.ringCount < MCDONALD_MIN_RINGS ||
    v.ringCount > MCDONALD_MAX_RINGS
  ) {
    return false;
  }
  if (typeof v.content !== "string" || !MCDONALD_CONTENT_VALUES.includes(v.content as McDonaldContent)) return false;
  if (typeof v.colorMode !== "string" || !MCDONALD_COLOR_MODE_VALUES.includes(v.colorMode as McDonaldColorMode)) return false;
  if (!isValidHexColor(v.redHex)) return false;
  if (!isValidHexColor(v.greenHex)) return false;
  if (typeof v.charSize !== "string" || !MCDONALD_CHAR_SIZE_VALUES.includes(v.charSize as McDonaldCharSize)) return false;
  if (typeof v.cardSize !== "string" || !MCDONALD_CARD_SIZE_VALUES.includes(v.cardSize as McDonaldCardSize)) return false;
  if (typeof v.charSizeMode !== "string" || !MCDONALD_CHAR_SIZE_MODE_VALUES.includes(v.charSizeMode as McDonaldCharSizeMode)) return false;
  if (typeof v.motionMode !== "string" || !MCDONALD_MOTION_MODE_VALUES.includes(v.motionMode as McDonaldMotionMode)) return false;
  if (typeof v.rotationDirection !== "string" || !MCDONALD_ROTATION_DIRECTION_VALUES.includes(v.rotationDirection as McDonaldRotationDirection)) return false;
  if (
    typeof v.rotationSpeedRpm !== "number" ||
    !Number.isFinite(v.rotationSpeedRpm) ||
    v.rotationSpeedRpm < MCDONALD_MIN_ROTATION_RPM ||
    v.rotationSpeedRpm > MCDONALD_MAX_ROTATION_RPM
  ) {
    return false;
  }
  return true;
}

/** Compone migrate+isValid - mismo patron que resolveHartCardConfig, ya
 * definido desde ahora para una futura fase de guardado de presets, sin
 * consumidor todavia en esta fase (sin persistencia). */
export function resolveMcDonaldCardConfig(raw: unknown): McDonaldCardConfig | null {
  const migrated = migrateMcDonaldCardConfig(raw);
  return isValidMcDonaldCardConfig(migrated) ? (migrated as McDonaldCardConfig) : null;
}
