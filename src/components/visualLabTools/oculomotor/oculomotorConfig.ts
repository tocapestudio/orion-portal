/**
 * Logica PURA de ORION Tools · Oculomotricidad - tipos, configuracion por
 * defecto, generacion de trayectorias/posiciones y resolucion de
 * temporizacion. Sin ningun import de React/Next.js/Supabase, mismo
 * patron ya establecido en stimulusGenerator/stimulusConfig.ts, para
 * poder probarla con node --test.
 *
 * Dos modalidades INDEPENDIENTES:
 * - "pursuit" (seguimiento visual): el estimulo se desplaza de forma
 *   CONTINUA por una trayectoria - `computePursuitPoint` es una funcion
 *   del tiempo (fase 0..1 dentro de un ciclo que se repite en bucle).
 * - "saccades" (movimientos sacadicos): el estimulo SALTA entre
 *   posiciones discretas - `computeNextSaccadePosition` devuelve la
 *   SIGUIENTE posicion a partir de la anterior, sin interpolacion.
 *
 * Geometria compartida: los patrones "h"/"cruzado" (pursuit) y "h"/"x"
 * (saccades) reutilizan los MISMOS vertices (hWaypoints/xWaypoints) -
 * pursuit los recorre interpolando con continuidad entre ellos,
 * saccades salta de uno a otro - mismo patron geometrico, dos formas de
 * recorrerlo, en vez de dos implementaciones independientes.
 *
 * Sin persistencia: esta herramienta NO guarda ninguna configuracion
 * predeterminada ni actividad (ver limites explicitos del diseño
 * aprobado) - por eso este modulo no incluye ningun
 * isValid.../migrate... como stimulusConfig.ts: no hay ningun valor
 * externo/no confiable que validar, la configuracion vive solo en
 * memoria mientras dura la sesion.
 */

export type OculomotorModality = "pursuit" | "saccades";

export type PursuitPattern = "horizontal" | "vertical" | "h" | "cross" | "circular" | "curved" | "random";
export type SaccadePattern = "horizontal" | "vertical" | "diagonal" | "h" | "x" | "random";

export type TimingMode = "adjustable" | "preset" | "random";
export type TimingPreset = "slow" | "medium" | "fast";

export interface TimingConfig {
  mode: TimingMode;
  /** Usado si mode==='adjustable'. */
  valueMs: number;
  /** Usado si mode==='preset'. */
  preset: TimingPreset;
  /** Usados si mode==='random' (limite inferior/superior del sorteo). */
  minMs: number;
  maxMs: number;
}

/** Duracion de UN CICLO COMPLETO de la trayectoria (seguimiento) -
 * valores mas altos = movimiento mas lento. */
export const PURSUIT_SPEED_PRESETS_MS: Record<TimingPreset, number> = { slow: 8000, medium: 4000, fast: 2000 };
/** Intervalo ENTRE posiciones (sacadicos) - deliberadamente una tabla
 * DISTINTA a la de pursuit (no se comparte el mismo valor numerico): un
 * "ciclo completo" de seguimiento y un "intervalo entre saltos" son
 * magnitudes fisicamente distintas: aplicar la tabla de pursuit aqui
 * daria intervalos absurdamente largos entre saltos. */
export const SACCADE_INTERVAL_PRESETS_MS: Record<TimingPreset, number> = { slow: 2000, medium: 1000, fast: 500 };

/** Resuelve una TimingConfig a un numero de milisegundos concreto - una
 * unica funcion reutilizada por pursuit.speed Y saccade.interval (misma
 * forma: adjustable/preset/random), parametrizada por la tabla de
 * presets correspondiente (ver comentario de las 2 constantes de
 * arriba). */
export function resolveTimingMs(
  config: TimingConfig,
  presetTable: Record<TimingPreset, number>,
  randomFn: () => number = Math.random
): number {
  if (config.mode === "preset") return presetTable[config.preset];
  if (config.mode === "adjustable") return config.valueMs;
  const lo = Math.min(config.minMs, config.maxMs);
  const hi = Math.max(config.minMs, config.maxMs);
  return lo + randomFn() * (hi - lo);
}

export type WorkAreaMode = "fullscreen" | "reduced" | "random";

/** Limite inferior FIJO para el sorteo en modo 'random' - "el porcentaje
 * configurado" (amplitudePercent) actua como limite MAXIMO del sorteo
 * (pedido explicitamente); como limite minimo, un valor bajo pero no
 * nulo para que la amplitud aleatoria nunca colapse a un punto fijo
 * (eso dejaria de ser un "recorrido"). Documentado aqui por ser una
 * decision de interpretacion geometrica no explicitada en el pedido. */
export const RANDOM_AMPLITUDE_MIN_PERCENT = 10;

export interface WorkAreaConfig {
  mode: WorkAreaMode;
  /** Rango valido 25-75 (pedido explicitamente como rango inicial del
   * control). Usado tal cual si mode==='reduced'; usado como limite
   * MAXIMO del sorteo si mode==='random' (ver resolveAmplitudePercent).
   * Ignorado si mode==='fullscreen' (se usa 100 siempre). */
  amplitudePercent: number;
}

/**
 * Resuelve el % de amplitud a usar - en 'fullscreen' siempre 100
 * (pantalla completa); en 'reduced' el valor configurado tal cual; en
 * 'random' un sorteo entre RANDOM_AMPLITUDE_MIN_PERCENT y
 * `amplitudePercent` (interpretado como techo del sorteo, segun lo
 * pedido). Se llama UNA VEZ por cada recorrido/ciclo nuevo (el llamador
 * decide cuando - ver StimulusGeneratorClient-equivalente en
 * OculomotorClient.tsx), nunca en cada frame, para que la amplitud de
 * un recorrido en curso no cambie a media trayectoria.
 */
export function resolveAmplitudePercent(workArea: WorkAreaConfig, randomFn: () => number = Math.random): number {
  if (workArea.mode === "fullscreen") return 100;
  if (workArea.mode === "reduced") return workArea.amplitudePercent;
  const max = Math.max(workArea.amplitudePercent, RANDOM_AMPLITUDE_MIN_PERCENT);
  const min = Math.min(RANDOM_AMPLITUDE_MIN_PERCENT, max);
  return min + randomFn() * (max - min);
}

export interface NormalizedPoint {
  /** 0..1 - 0=borde izquierdo/superior del area de trabajo, 1=borde
   * derecho/inferior, 0.5=centro. La conversion a pixeles reales
   * (incluido el margen de seguridad segun el tamaño del estimulo, para
   * que nunca se recorte en el borde) vive en OculomotorClient.tsx, no
   * aqui - esta funcion solo describe la geometria LOGICA/abstracta. */
  x: number;
  y: number;
}

function clampUnit(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function clampPoint(p: NormalizedPoint): NormalizedPoint {
  return { x: clampUnit(p.x), y: clampUnit(p.y) };
}

/** Vertices de una "H" (6 puntos) - reutilizados TANTO por el patron
 * "h" de pursuit (interpolado) COMO por el patron "h" de saccades
 * (saltado), para que el patron geometrico sea el mismo en ambas
 * modalidades. */
function hWaypoints(r: number): NormalizedPoint[] {
  return [
    { x: 0.5 - r, y: 0.5 - r },
    { x: 0.5 - r, y: 0.5 + r },
    { x: 0.5 - r, y: 0.5 },
    { x: 0.5 + r, y: 0.5 },
    { x: 0.5 + r, y: 0.5 - r },
    { x: 0.5 + r, y: 0.5 + r },
  ];
}

/** Vertices de una "X" (4 puntos, las 2 diagonales completas) -
 * reutilizados por el patron "cross"/"x" de ambas modalidades. */
function xWaypoints(r: number): NormalizedPoint[] {
  return [
    { x: 0.5 - r, y: 0.5 - r },
    { x: 0.5 + r, y: 0.5 + r },
    { x: 0.5 + r, y: 0.5 - r },
    { x: 0.5 - r, y: 0.5 + r },
  ];
}

/** UNA sola diagonal (2 puntos) - distinto de "x" (que usa las 2
 * diagonales): "diagonal" en sacadicos es deliberadamente mas simple
 * que "x". */
function diagonalWaypoints(r: number): NormalizedPoint[] {
  return [
    { x: 0.5 - r, y: 0.5 - r },
    { x: 0.5 + r, y: 0.5 + r },
  ];
}

function horizontalWaypoints(r: number): NormalizedPoint[] {
  return [
    { x: 0.5 - r, y: 0.5 },
    { x: 0.5 + r, y: 0.5 },
  ];
}

function verticalWaypoints(r: number): NormalizedPoint[] {
  return [
    { x: 0.5, y: 0.5 - r },
    { x: 0.5, y: 0.5 + r },
  ];
}

/** Interpola CONTINUAMENTE a traves de una lista de vertices (bucle
 * cerrado: el ultimo conecta de vuelta al primero) - usado por los
 * patrones de pursuit que son una "figura" (h, cross) en vez de una
 * formula trigonometrica continua. Los saltos de direccion en los
 * vertices son inevitables para estas figuras (pedido explicitamente:
 * "evitar saltos bruscos siempre que el patron lo permita" - h/cross no
 * lo permiten sin dejar de ser esas figuras). */
function pointAlongWaypoints(waypoints: NormalizedPoint[], phase: number): NormalizedPoint {
  const n = waypoints.length;
  const p = ((phase % 1) + 1) % 1;
  const scaled = p * n;
  const segmentIndex = Math.min(Math.floor(scaled), n - 1);
  const segmentPhase = scaled - segmentIndex;
  const start = waypoints[segmentIndex];
  const end = waypoints[(segmentIndex + 1) % n];
  return clampPoint({
    x: start.x + (end.x - start.x) * segmentPhase,
    y: start.y + (end.y - start.y) * segmentPhase,
  });
}

/**
 * Posicion del estimulo en SEGUIMIENTO VISUAL para una fase dada (0..1,
 * se normaliza igualmente fuera de ese rango - un valor creciente sin
 * limite describe un movimiento en bucle continuo). `amplitudeFraction`
 * es 0..1 (amplitudePercent/100). Cubre los 6 patrones DETERMINISTAS
 * (horizontal/vertical/h/cruzado/circular/curvo) - el patron 'random' NO
 * se calcula aqui: usa su propio sistema de paseo aleatorio continuo
 * (ver pickNextRandomWalkWaypoint/catmullRomPoint/
 * resolveRandomWalkSegmentDurationMs mas abajo), porque una funcion de
 * fase 0..1 PERIODICA es exactamente lo que hacia que el patron
 * aleatorio anterior (Lissajous de parametros fijos) se sintiera
 * repetitivo - "parece repetir un recorrido en bucle" (pedido
 * explicitamente corregir). Excluir 'random' del tipo del parametro
 * hace que TypeScript obligue a los llamadores a manejarlo aparte, en
 * vez de poder pasarlo aqui por error.
 */
export function computePursuitPoint(pattern: Exclude<PursuitPattern, "random">, phase: number, amplitudeFraction: number): NormalizedPoint {
  const r = clampUnit(amplitudeFraction) / 2;
  const p = ((phase % 1) + 1) % 1;
  switch (pattern) {
    case "horizontal":
      return clampPoint({ x: 0.5 + r * Math.sin(2 * Math.PI * p), y: 0.5 });
    case "vertical":
      return clampPoint({ x: 0.5, y: 0.5 + r * Math.sin(2 * Math.PI * p) });
    case "circular":
      return clampPoint({ x: 0.5 + r * Math.cos(2 * Math.PI * p), y: 0.5 + r * Math.sin(2 * Math.PI * p) });
    case "curved": {
      // Lissajous 1:2 - "en forma de ocho" horizontal, continuo y sin
      // vertices (nunca necesita un salto de direccion).
      return clampPoint({ x: 0.5 + r * Math.sin(2 * Math.PI * p), y: 0.5 + (r / 2) * Math.sin(4 * Math.PI * p) });
    }
    case "h":
      return pointAlongWaypoints(hWaypoints(r), p);
    case "cross":
      return pointAlongWaypoints(xWaypoints(r), p);
  }
}

/**
 * PASEO ALEATORIO CONTINUO del patron 'random' de seguimiento - sustituye
 * al Lissajous de parametros fijos anterior (periodico, se repetia
 * identico en cada ciclo). En vez de una formula cerrada de fase 0..1,
 * genera una secuencia CRECIENTE de waypoints (nunca se repite: cada
 * nuevo tramo depende del angulo del anterior, sin vuelta a un estado
 * inicial) enlazados con una spline Catmull-Rom (tangente continua en
 * cada union, sin "esquinas" - ver catmullRomPoint). El estado
 * (waypoints generados, angulo de avance, segmento/tiempo actual) vive
 * en refs de OculomotorClient.tsx (el mismo criterio que el resto del
 * motor: logica geometrica PURA aqui, orquestacion con refs/rAF alla).
 *
 * Coordenadas CENTRADAS: origen = centro del area de trabajo, radio 1 =
 * borde del area segun la amplitud configurada (se reescalan a 0..1 con
 * `0.5 + amplitudeFraction/2 * centrado`, igual criterio de `r` que el
 * resto de patrones). Generar en este espacio hace trivial respetar el
 * area de trabajo: basta con acotar el radio a <=1 en cada waypoint.
 */

/** Distancia MINIMA/MAXIMA (fraccion del radio del area, 0..1) entre
 * waypoints consecutivos - varia la escala de cada tramo ("variaciones
 * de... amplitud"). Ni tan corto que tiemble, ni tan largo que cada
 * tramo cruce el area entera de un salto. */
export const RANDOM_WALK_MIN_STEP = 0.25;
export const RANDOM_WALK_MAX_STEP = 0.55;

/** Cambio de angulo MAXIMO (radianes) entre un tramo y el siguiente -
 * ~100°: deja variar la direccion de forma impredecible sin zigzag
 * caotico ("evita... cambios bruscos de direccion"), ni tan poco que el
 * recorrido parezca un ovalo casi fijo ("evita... ovalos repetitivos"). */
export const RANDOM_WALK_MAX_TURN_RAD = (100 * Math.PI) / 180;

/**
 * Siguiente waypoint del paseo: el angulo de avance varia respecto al
 * anterior dentro de +-RANDOM_WALK_MAX_TURN_RAD (nunca un giro
 * completamente libre) y el paso tiene longitud aleatoria dentro de
 * [RANDOM_WALK_MIN_STEP, RANDOM_WALK_MAX_STEP]. Si el candidato se
 * saldria del area (radio > 1), se reescala RADIALMENTE al borde exacto
 * en vez de recortarse/rebotar (eso cambiaria la direccion calculada de
 * forma artificial) - el area de trabajo se respeta SIEMPRE por
 * construccion, nunca por un clamp posterior que distorsione la
 * trayectoria.
 */
export function pickNextRandomWalkWaypoint(
  previous: NormalizedPoint,
  previousAngle: number,
  randomFn: () => number = Math.random
): { point: NormalizedPoint; angle: number } {
  const turn = (randomFn() * 2 - 1) * RANDOM_WALK_MAX_TURN_RAD;
  const angle = previousAngle + turn;
  const step = RANDOM_WALK_MIN_STEP + randomFn() * (RANDOM_WALK_MAX_STEP - RANDOM_WALK_MIN_STEP);
  let x = previous.x + Math.cos(angle) * step;
  let y = previous.y + Math.sin(angle) * step;
  const dist = Math.sqrt(x * x + y * y);
  if (dist > 1) {
    x /= dist;
    y /= dist;
  }
  return { point: { x, y }, angle };
}

/**
 * Punto a lo largo de una spline Catmull-Rom uniforme entre p1 y p2,
 * usando p0/p3 como puntos de control vecinos para que la TANGENTE sea
 * continua en las uniones (sin "esquinas" de direccion al pasar de un
 * tramo al siguiente - "recorridos suaves... sin saltos de posicion al
 * pasar de un segmento al siguiente"). t en [0,1]: t=0 -> exactamente
 * p1, t=1 -> exactamente p2 (propiedad de interpolacion de Catmull-Rom,
 * garantiza continuidad de POSICION entre tramos consecutivos sin mas
 * que compartir el waypoint de union).
 */
export function catmullRomPoint(p0: NormalizedPoint, p1: NormalizedPoint, p2: NormalizedPoint, p3: NormalizedPoint, t: number): NormalizedPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

const RANDOM_WALK_REFERENCE_DISTANCE = 2;
const RANDOM_WALK_MIN_SEGMENT_DURATION_MS = 150;

/**
 * Duracion (ms) de UN TRAMO del paseo, proporcional a su longitud real -
 * para que la velocidad APARENTE (distancia recorrida por segundo) se
 * mantenga coherente con la velocidad configurada, pese a que cada tramo
 * tenga una longitud distinta (pedido explicitamente: "la velocidad
 * configurada debe seguir siendo coherente con la velocidad real del
 * estimulo"). `resolvedCycleMs` se interpreta como "tiempo de
 * referencia para recorrer el diametro completo del area" (2 unidades,
 * de borde a borde) - la MISMA interpretacion de velocidad que ya usan
 * el resto de patrones deterministas (recorren su figura completa en
 * resolvedCycleMs). Nunca por debajo de un minimo, para no dividir por
 * un tramo casi nulo (caso degenerado, protegido igualmente).
 */
export function resolveRandomWalkSegmentDurationMs(segmentLength: number, resolvedCycleMs: number): number {
  const duration = (segmentLength / RANDOM_WALK_REFERENCE_DISTANCE) * resolvedCycleMs;
  return Math.max(RANDOM_WALK_MIN_SEGMENT_DURATION_MS, duration);
}

/** Lista de posiciones FIJAS de un patron de SACADICOS determinista (no
 * aplica a 'random', que sortea sobre la marcha - ver
 * computeNextSaccadePosition). */
export function getSaccadeWaypoints(pattern: Exclude<SaccadePattern, "random">, amplitudeFraction: number): NormalizedPoint[] {
  const r = clampUnit(amplitudeFraction) / 2;
  switch (pattern) {
    case "horizontal":
      return horizontalWaypoints(r);
    case "vertical":
      return verticalWaypoints(r);
    case "diagonal":
      return diagonalWaypoints(r);
    case "h":
      return hWaypoints(r);
    case "x":
      return xWaypoints(r);
  }
}

/**
 * Siguiente posicion de SACADICOS: para patrones deterministas, recorre
 * la lista de vertices FIJA en orden, en bucle (indice = anterior+1 mod
 * N) - secuencia coherente y reproducible, pedido explicitamente. Para
 * 'random', sortea un punto nuevo cada vez, acotado por la amplitud -
 * `index` ahi es solo un contador creciente (no referencia ninguna
 * lista). `previousIndex` = -1 para la primera posicion de la
 * secuencia.
 */
export function computeNextSaccadePosition(
  pattern: SaccadePattern,
  previousIndex: number,
  amplitudeFraction: number,
  randomFn: () => number = Math.random
): { point: NormalizedPoint; index: number } {
  const r = clampUnit(amplitudeFraction) / 2;
  if (pattern === "random") {
    const point = clampPoint({ x: 0.5 + (randomFn() * 2 - 1) * r, y: 0.5 + (randomFn() * 2 - 1) * r });
    return { point, index: previousIndex + 1 };
  }
  const waypoints = getSaccadeWaypoints(pattern, amplitudeFraction);
  const index = (previousIndex + 1) % waypoints.length;
  return { point: waypoints[index], index };
}

export type DurationMode = "manual" | "timed";

export interface DurationConfig {
  mode: DurationMode;
  /** Usado si mode==='timed'. */
  timedMs: number;
}

/** true si una ejecucion con duracion definida (mode==='timed') debe
 * finalizar ya, dado el tiempo transcurrido - en modo 'manual' nunca
 * finaliza por si sola (false siempre, la finaliza el profesional). */
export function isDurationComplete(elapsedMs: number, config: DurationConfig): boolean {
  if (config.mode === "manual") return false;
  return elapsedMs >= config.timedMs;
}

export type OculomotorStimulusType = "colorCircle" | "blackOnWhite" | "whiteOnBlack" | "letter" | "number" | "symbol";

/**
 * Modelo UNIFICADO de seleccion para las 4 categorias con contenido
 * seleccionable (colorCircle/letter/number/symbol) - sustituye al
 * anterior par `color`+`colorMode`+`randomColors` (solo colorCircle) +
 * `character` (solo letter/number/symbol) por un UNICO criterio comun,
 * pedido explicitamente ("aplica esta logica a: colores... letras...
 * numeros... simbolos"):
 *   - 0 elementos seleccionados -> no se puede arrancar (ver
 *     canStartOculomotorExercise).
 *   - 1 elemento seleccionado -> permanece FIJO toda la ejecucion.
 *   - 2+ elementos seleccionados -> el motor alterna aleatoriamente SOLO
 *     entre los seleccionados (ver pickNextRandomElement), sin repetir
 *     el inmediatamente anterior si hay alternativas.
 * Ya NO existe un modo "fijo"/"aleatorio" explicito - el COMPORTAMIENTO
 * se deriva automaticamente del numero de elementos marcados (pedido
 * explicitamente: "el numero de elementos seleccionados determinara
 * automaticamente como se comporta el ejercicio").
 */
export interface OculomotorStimulusConfig {
  type: OculomotorStimulusType;
  /** Subconjunto seleccionado de BASE_COLOR_PALETTE (stimulusConfig.ts) -
   * usado solo si type==='colorCircle'. Paleta y orden reutilizados tal
   * cual, nunca alterados aqui. */
  colorElements: string[];
  /** Subconjunto seleccionado de BASE_LETTERS - usado solo si
   * type==='letter'. */
  letterElements: string[];
  /** Subconjunto seleccionado de BASE_NUMBERS - usado solo si
   * type==='number'. */
  numberElements: string[];
  /** Subconjunto seleccionado de BASE_SHAPES (ids, no etiquetas) - usado
   * solo si type==='symbol'. */
  symbolElements: string[];
  size: "sm" | "md" | "lg";
}

/** Devuelve el subconjunto SELECCIONADO relevante para el `type` actual -
 * un unico punto de "que array mirar segun el tipo", para no repetir ese
 * switch en cada sitio que lo necesite (UI, motor, validacion). Para
 * 'blackOnWhite'/'whiteOnBlack' devuelve [] SIEMPRE: esas 2 modalidades
 * son un punto de contraste fijo sin ningun contenido seleccionable
 * (pedido explicitamente: "mantén intactas las modalidades de contraste
 * negro sobre blanco y blanco sobre negro... no los conviertas en
 * opciones cromaticas aleatorias sin justificacion funcional" - aqui NO
 * hay justificacion funcional para darles seleccion, serian el mismo
 * punto blanco/negro sea cual sea la "seleccion"). */
export function getSelectedStimulusElements(stimulus: OculomotorStimulusConfig): string[] {
  switch (stimulus.type) {
    case "colorCircle":
      return stimulus.colorElements;
    case "letter":
      return stimulus.letterElements;
    case "number":
      return stimulus.numberElements;
    case "symbol":
      return stimulus.symbolElements;
    case "blackOnWhite":
    case "whiteOnBlack":
      return [];
  }
}

/** true si la configuracion actual permite arrancar el ejercicio (en
 * vista previa en linea o en pantalla completa) - el UNICO caso que lo
 * impide es una categoria CON contenido seleccionable (colorCircle/
 * letter/number/symbol) sin ningun elemento marcado (pedido
 * explicitamente: "ningun elemento seleccionado: no se permite iniciar
 * la ejecucion"). blackOnWhite/whiteOnBlack no tienen seleccion que
 * validar, siempre pueden arrancar. */
export function canStartOculomotorExercise(stimulus: OculomotorStimulusConfig): boolean {
  if (stimulus.type === "blackOnWhite" || stimulus.type === "whiteOnBlack") return true;
  return getSelectedStimulusElements(stimulus).length > 0;
}

/** El elemento "de partida"/estado inicial coherente para el tipo actual -
 * el PRIMERO de los seleccionados (deterministico, no un sorteo) - usado
 * en reposo, al arrancar, al detener y al reiniciar (ver
 * OculomotorClient.tsx). null si no hay ninguno seleccionado (entonces
 * tampoco se puede arrancar, ver canStartOculomotorExercise) o si el tipo
 * no tiene contenido seleccionable. */
export function resolveInitialStimulusElement(stimulus: OculomotorStimulusConfig): string | null {
  return getSelectedStimulusElements(stimulus)[0] ?? null;
}

/** Intervalo FIJO (no expuesto como control al profesional - "puntos de
 * cambio... configurables internamente") entre cambios de estimulo
 * durante SEGUIMIENTO continuo, cuando hay 2+ elementos seleccionados.
 * Deliberadamente independiente del patron/velocidad/amplitud/duracion
 * (cambiar el estimulo no debe alterar ninguno de esos parametros) y
 * deliberadamente NO atado a cada frame de rAF (evita parpadeos); 1500ms
 * es lo bastante lento para no distraer del propio seguimiento visual, lo
 * bastante frecuente para que el cambio sea perceptible durante un
 * ejercicio tipico de varios segundos. En sacadicos NO se usa este
 * intervalo - ahi el estimulo cambia junto con cada salto de posicion
 * (ver el llamador en OculomotorClient.tsx), nunca con un temporizador
 * propio. */
export const PURSUIT_ELEMENT_CHANGE_INTERVAL_MS = 1500;

/** true si, dado el tiempo transcurrido desde el ULTIMO cambio de
 * estimulo, ya toca sortear uno nuevo - logica pura y testeada por
 * separado del bucle de rAF que la invoca en cada frame (el propio bucle
 * sigue corriendo a 60fps; el ESTIMULO no cambia en cada frame, solo
 * cuando esta funcion lo indica). */
export function shouldChangePursuitElement(elapsedMsSinceLastChange: number): boolean {
  return elapsedMsSinceLastChange >= PURSUIT_ELEMENT_CHANGE_INTERVAL_MS;
}

/** Elige el SIGUIENTE elemento (color/letra/numero/simbolo) entre los
 * SELECCIONADOS - nunca repite el INMEDIATAMENTE anterior si hay alguna
 * alternativa (pedido explicitamente: "evita repetir consecutivamente el
 * mismo elemento siempre que existan alternativas"), sorteando
 * uniformemente entre el resto. Con 0-1 elementos disponibles no hay
 * alternativa posible y se devuelve el unico disponible (o el propio
 * anterior) - nunca lanza. Generica sobre `string[]`: sirve igual para
 * colores (hex) que para letras/numeros/simbolos (sus propios valores de
 * catalogo), sin duplicar esta logica 4 veces. */
export function pickNextRandomElement(
  selected: readonly string[],
  previousElement: string | null,
  randomFn: () => number = Math.random
): string {
  if (selected.length === 0) return previousElement ?? "";
  const candidates = selected.length > 1 && previousElement != null ? selected.filter((c) => c !== previousElement) : selected;
  const index = Math.min(Math.floor(randomFn() * candidates.length), candidates.length - 1);
  return candidates[index];
}

export interface PursuitConfig {
  pattern: PursuitPattern;
  speed: TimingConfig;
  workArea: WorkAreaConfig;
}

export interface SaccadeConfig {
  pattern: SaccadePattern;
  interval: TimingConfig;
  workArea: WorkAreaConfig;
}

export interface OculomotorConfig {
  modality: OculomotorModality;
  pursuit: PursuitConfig;
  saccade: SaccadeConfig;
  stimulus: OculomotorStimulusConfig;
  duration: DurationConfig;
}

const DEFAULT_WORK_AREA: WorkAreaConfig = { mode: "reduced", amplitudePercent: 50 };

export const DEFAULT_OCULOMOTOR_CONFIG: OculomotorConfig = {
  modality: "pursuit",
  pursuit: {
    pattern: "horizontal",
    speed: { mode: "preset", preset: "medium", valueMs: 4000, minMs: 2000, maxMs: 8000 },
    workArea: { ...DEFAULT_WORK_AREA },
  },
  saccade: {
    pattern: "horizontal",
    interval: { mode: "preset", preset: "medium", valueMs: 1000, minMs: 500, maxMs: 2000 },
    workArea: { ...DEFAULT_WORK_AREA },
  },
  stimulus: {
    type: "colorCircle",
    // UN SOLO elemento seleccionado por defecto en cada categoria -> el
    // comportamiento por defecto es FIJO (criterio nuevo: 1 seleccionado
    // = fijo), igual que el comportamiento original de esta herramienta
    // antes de que existiera ninguna nocion de "aleatorio". El
    // profesional decide activamente marcar un 2o elemento si quiere
    // alternancia aleatoria - nunca se asume por defecto (pedido
    // explicitamente en la tarea anterior, sigue aplicando aqui).
    colorElements: ["#ef4444"],
    letterElements: ["A"],
    numberElements: ["0"],
    symbolElements: ["circle"],
    size: "md",
  },
  duration: { mode: "manual", timedMs: 30000 },
};
