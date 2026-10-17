/**
 * Logica PURA para construir el radar de Rendimiento Visual (pestaña
 * General) a partir del historial COMPLETO de ORION Play de un
 * deportista - SIN import de Next.js/Supabase (solo `import type` de
 * AthletePlayResult, que se borra en tiempo de ejecucion), comprobable
 * con el test runner nativo de Node (node --test). Mismo patron ya
 * establecido en playConfigLabels.ts/playResultsMapping.ts.
 *
 * A diferencia de una primera version anterior (que promediaba
 * precision/tiempo/errores mezclando TODOS los ejercicios en un unico
 * indicador generico), aqui cada eje esta atado EXPLICITAMENTE a un
 * unico ejercicio y una unica metrica - ver RADAR_AXIS_DEFINITIONS, la
 * lista central (facil de ampliar/cambiar sin tocar el resto del
 * archivo). Nunca se combinan resultados de ejercicios distintos para
 * formar un eje.
 *
 * Dos responsabilidades, las dos puras:
 *   1. computePlayRadarAxes: para cada definicion de eje, promedia
 *      EXCLUSIVAMENTE los resultados de su propio exerciseId, usando su
 *      metrica asignada (accuracyPercent o reactionTimeMs), y normaliza
 *      el promedio a una escala 0-100 "mayor es mejor" segun su
 *      `direction` (accuracyPercent ya viene en esa escala; reactionTimeMs
 *      se invierte). Si un ejercicio no tiene ningun resultado con esa
 *      metrica, el eje se OMITE del array devuelto - nunca se rellena
 *      con 0 (que se leeria como "mal resultado" de algo que no se
 *      midio).
 *   2. computeRadarPolygonPoints: geometria pura (angulos/trigonometria)
 *      para situar los vertices del poligono de datos y la posicion de
 *      cada etiqueta alrededor del radar, sin ningun dato de dominio.
 */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Espejo local minimo de AthletePlayResult (solo los campos que este
 * modulo necesita) - evita depender en tiempo de ejecucion de ningun
 * import `@/...` por valor; el import de tipo real de abajo se borra al
 * compilar, asi que no rompe `node --test`. `configUsed` es necesario
 * para el eje de Click Targets (agrupa por tamaño/contraste real del
 * objetivo antes de promediar - ver computeClickTargetsSpeedScore). */
export interface PlayRadarResultInput {
  exerciseId: string | null;
  accuracyPercent: number | null;
  totalTrials: number | null;
  reactionTimeMs: number | null;
  errorsCount: number | null;
  configUsed: Record<string, unknown> | null;
}

export interface RadarAxis {
  key: string;
  /** Nombre breve para el grafico (p.ej. "Reacción", "Go / No Go") -
   * nunca la etiqueta tecnica completa del ejercicio. */
  label: string;
  /** 0-100, SIEMPRE orientado a "mas alto es mejor" tras invertir donde
   * corresponda - nunca mezcla escalas sin normalizar. */
  score: number;
}

/** Referencia real: GO_STIMULUS_TIMEOUT_MS = 1000 ms, la misma constante
 * que usan ReactionTimeExercise.tsx/SimpleReactionExercise.tsx como
 * limite de espera del estimulo - un tiempo de reaccion en ese limite se
 * trata como "lo peor esperable" (score 0), nunca como invalido.
 * REACTION_MS_FASTEST=150 es una referencia de "lo mejor esperable"
 * (decision de diseño, no una constante del codigo de ejecucion) para
 * fijar el otro extremo de la escala. Usada SOLO para "Reacción"
 * (simple-reaction) - Click Targets tiene su propia escala, ver
 * CLICK_TARGETS_MS_BEST/WORST mas abajo (nunca comparten rango: un
 * tiempo de apuntar+clicar es sistematicamente mas lento que una
 * reaccion motriz simple, reutilizar este rango saturaba a 0 cualquier
 * tiempo normal de Click Targets). */
const REACTION_MS_FASTEST = 150;
const REACTION_MS_SLOWEST = 1000;

/**
 * Escala ESPECIFICA y fija de Click Targets - 0 ms (mejor) a 2000 ms
 * (peor), lineal entre ambos. Independiente del rango de Reacción:
 * Click Targets no tiene en el codigo ninguna constante de timeout
 * propia (un objetivo espera el clic indefinidamente, sin deadline), asi
 * que no hay ningun valor "grounded" en el codigo de ejecucion del que
 * derivar este rango.
 *
 * 0-2000 ms es EXPLICITAMENTE una decision de diseño para la
 * VISUALIZACION del radar, no un baremo clinico ni una referencia
 * validada empiricamente. Es una escala ABSOLUTA e igual para cualquier
 * deportista - nunca se normaliza contra el historial individual: dos
 * deportistas con la misma media y la misma configuracion (mismo grupo
 * comparable, ver scoreClickTargetsSpeed) obtienen EXACTAMENTE el mismo
 * score. Tiempos >=2000ms reciben score 0 (el peor, nunca invalido);
 * tiempos negativos/no finitos/ausentes se filtran como invalidos antes
 * de promediar (ver isValidClickTargetsTime), no participan del promedio.
 */
const CLICK_TARGETS_MS_BEST = 0;
const CLICK_TARGETS_MS_WORST = 2000;

function isValidClickTargetsTime(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function normalizeLowerIsBetter(avg: number, best: number, worst: number): number {
  const clamped = clamp(avg, best, worst);
  const ratio = (clamped - best) / (worst - best);
  return 100 - ratio * 100;
}

function scoreAccuracy(results: PlayRadarResultInput[]): number | null {
  const values = results.map((r) => r.accuracyPercent).filter((v): v is number => isFiniteNumber(v));
  const avg = average(values);
  return avg === null ? null : clamp(avg, 0, 100);
}

function scoreReactionTimeMs(results: PlayRadarResultInput[]): number | null {
  const values = results.map((r) => r.reactionTimeMs).filter((v): v is number => isFiniteNumber(v));
  const avg = average(values);
  return avg === null ? null : clamp(normalizeLowerIsBetter(avg, REACTION_MS_FASTEST, REACTION_MS_SLOWEST), 0, 100);
}

/** Clave de comparabilidad de una sesion de Click Targets: tamaño y
 * contraste REALES del objetivo (config_used.targetSize/contrastPercent
 * - ver ClickTargetsExercise.tsx, donde ambos son ajustables por el
 * profesional con sliders de 16-64px/10-100%, y effectiveConfig.ts/
 * buildConfigUsed, que los persiste tal cual en session_activities.
 * config_used cuando la captura es valida). A diferencia del color en
 * Go/No Go (que no afecta al tiempo de respuesta), un objetivo mas
 * pequeño o de menor contraste es objetivamente mas lento de alcanzar -
 * promediar sesiones con tamaños/contrastes muy distintos produciria una
 * media sin sentido. Si config_used no trae estos campos (captura
 * invalida -> fallback fijo, o resultado historico anterior a esta
 * captura), se agrupan juntas como "unknown" - comparables entre si
 * (mismo config, aunque desconocido), nunca con sesiones de config
 * real conocido. */
function clickTargetsComparabilityKey(configUsed: Record<string, unknown> | null): string {
  const targetSize = configUsed?.targetSize;
  const contrastPercent = configUsed?.contrastPercent;
  const sizeKey = isFiniteNumber(targetSize) ? String(targetSize) : "unknown";
  const contrastKey = isFiniteNumber(contrastPercent) ? String(contrastPercent) : "unknown";
  return `${sizeKey}|${contrastKey}`;
}

/**
 * Tiempo MEDIO POR OBJETIVO de Click Targets (reaction_time_ms canonico,
 * que ya es exactamente ese promedio - ver avgTimeMs en
 * buildClickTargetsResultRow/resultRowMapping.ts: promedio de
 * timesPerTarget[], cada uno el intervalo real desde que el objetivo
 * aparece (`appearedAt`) hasta el clic que lo resuelve, acierto o fallo
 * - ver handleContainerClick/ClickTargetsExercise.tsx). Se prefiere la
 * media por objetivo (no el tiempo total) precisamente porque el total
 * depende tambien de cuantos objetivos haya que completar - la media
 * permite comparar sesiones con distinto targetCount/duracion.
 *
 * Antes de promediar, se agrupan las sesiones por tamaño/contraste real
 * del objetivo (clickTargetsComparabilityKey) y se usa SOLO el grupo mas
 * grande (la configuracion mas habitual de este deportista) - mismo
 * criterio de "mayor grupo comparable" ya usado en
 * getExerciseRecordBreakdown/breakdownClickTargets (playResultsMapping.ts)
 * para su indicador de "mejor tiempo total". Nunca se mezclan sesiones
 * con tamaños/contrastes distintos entre si.
 *
 * La normalizacion final usa la escala ABSOLUTA y fija de Click Targets
 * (CLICK_TARGETS_MS_BEST/WORST), nunca el historial individual del
 * deportista - el resultado depende solo de la media y la escala fija,
 * asi que dos deportistas con la misma media en el mismo grupo
 * comparable obtienen el mismo score.
 */
function scoreClickTargetsSpeed(results: PlayRadarResultInput[]): number | null {
  const withTime = results.filter((r) => isValidClickTargetsTime(r.reactionTimeMs));
  if (withTime.length === 0) return null;

  const groups = new Map<string, PlayRadarResultInput[]>();
  for (const r of withTime) {
    const key = clickTargetsComparabilityKey(r.configUsed);
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  let largestGroup: PlayRadarResultInput[] | null = null;
  for (const group of groups.values()) {
    if (!largestGroup || group.length > largestGroup.length) largestGroup = group;
  }
  if (!largestGroup) return null;

  const values = largestGroup
    .map((r) => r.reactionTimeMs)
    .filter((v): v is number => isValidClickTargetsTime(v));
  const avg = average(values);
  if (avg === null) return null;

  return clamp(normalizeLowerIsBetter(avg, CLICK_TARGETS_MS_BEST, CLICK_TARGETS_MS_WORST), 0, 100);
}

interface AxisSpec {
  key: string;
  /** Nombre breve para el grafico (p.ej. "Reacción", "Go / No Go") -
   * nunca la etiqueta tecnica completa del ejercicio. */
  label: string;
  /** El UNICO exerciseId cuyos resultados alimentan este eje - nunca se
   * mezcla con otro ejercicio. */
  exerciseId: string;
  /** Recibe SOLO los resultados ya filtrados por exerciseId - cada
   * funcion decide su propia metrica/normalizacion/comparabilidad. */
  score: (ownResults: PlayRadarResultInput[]) => number | null;
}

/**
 * Lista central y explicita de variables representadas en el radar -
 * unico sitio a tocar si mas adelante se quiere añadir/quitar/cambiar un
 * eje. Cada entrada se inspeccionó contra los datos reales disponibles
 * en AthletePlayResult antes de incluirla:
 *   - "Reacción" (simple-reaction): reactionTimeMs medio de la sesion -
 *     menor es mejor. simple-reaction es el unico ejercicio con
 *     reaccion motriz simple (sin discriminacion go/no-go), de ahi el
 *     nombre breve "Reacción" para distinguirlo del siguiente eje.
 *   - "Go / No Go" (reaction-time - este exerciseId identifica el
 *     ejercicio de reaccion discriminativa Go/No-Go, ver groupResultsByExercise/
 *     playResultsMapping.ts): accuracyPercent medio - mayor es mejor.
 *     Se usa precision (no tiempo) porque lo que distingue a Go/No-Go es
 *     la capacidad de discriminar estimulo-respuesta (evitar falsas
 *     alarmas), no la velocidad motriz pura.
 *   - "Memoria visual" (visual-memory-precision): accuracyPercent medio
 *     - mayor es mejor. Este ejercicio no mide ningun tiempo de reaccion
 *     (reaction_time_ms siempre null, ver resultRowMapping.ts), por eso
 *     su unica metrica representativa disponible es precision.
 *   - "Click Targets" (click-targets): tiempo MEDIO POR OBJETIVO
 *     (reactionTimeMs) - menor es mejor. Antes usaba precision; se
 *     cambio a tiempo porque reaction_time_ms de Click Targets YA es el
 *     promedio real de tiempo-hasta-el-clic por objetivo (ver
 *     scoreClickTargetsSpeed para el detalle/comparabilidad).
 */
const AXIS_SPECS: AxisSpec[] = [
  { key: "simple-reaction-speed", label: "Reacción", exerciseId: "simple-reaction", score: scoreReactionTimeMs },
  { key: "go-no-go-accuracy", label: "Go / No Go", exerciseId: "reaction-time", score: scoreAccuracy },
  {
    key: "visual-memory-accuracy",
    label: "Memoria visual",
    exerciseId: "visual-memory-precision",
    score: scoreAccuracy,
  },
  { key: "click-targets-speed", label: "Click Targets", exerciseId: "click-targets", score: scoreClickTargetsSpeed },
];

function runAxis(spec: AxisSpec, results: PlayRadarResultInput[]): RadarAxis | null {
  const ownResults = results.filter((r) => r.exerciseId === spec.exerciseId);
  const score = spec.score(ownResults);
  if (score === null) return null;
  return { key: spec.key, label: spec.label, score };
}

export function computePlayRadarAxes(results: PlayRadarResultInput[]): RadarAxis[] {
  return AXIS_SPECS.map((spec) => runAxis(spec, results)).filter((axis): axis is RadarAxis => axis !== null);
}

/** Minimo de ejes con datos validos para que el poligono del radar sea
 * interpretable (3 es el minimo geometrico real de un poligono - 2
 * puntos degeneran en una linea) - unica fuente de verdad de este
 * umbral, para que el componente que decide "dibujar radar o estado
 * vacio" y el que describe "cuantos ejes faltan" nunca se desincronicen. */
export const REQUIRED_RADAR_AXES = 3;

export interface RadarAxisAvailability {
  key: string;
  label: string;
  /** Ejercicio real del que depende este eje (id tecnico, ver
   * getPlayExercise en components/orionPlay/catalog.ts para su nombre
   * legible) - permite señalar exactamente que ejercicio le falta
   * completar al deportista cuando `available` es false. */
  exerciseId: string;
  available: boolean;
}

/**
 * Diagnostico completo de los 4 ejes definidos (disponible o no, y de
 * que ejercicio depende cada uno) - a diferencia de computePlayRadarAxes
 * (que solo devuelve los disponibles, con su score), esta funcion
 * conserva TAMBIEN los que faltan, para que la UI pueda explicar
 * exactamente que ejercicios le faltan al deportista en vez de mostrar
 * un radar vacio sin explicacion.
 */
export function describePlayRadarAxes(results: PlayRadarResultInput[]): RadarAxisAvailability[] {
  return AXIS_SPECS.map((spec) => ({
    key: spec.key,
    label: spec.label,
    exerciseId: spec.exerciseId,
    available: runAxis(spec, results) !== null,
  }));
}

export interface RadarPoint {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
}

/**
 * Geometria pura: N ejes repartidos uniformemente alrededor del centro,
 * empezando arriba (-90°) y avanzando en sentido horario - igual que
 * cualquier radar/spider chart convencional. `scores` (0-100, uno por
 * eje, mismo orden/longitud que los ejes) decide el radio de cada
 * vertice del polígono de datos; `labelRadius` (normalmente mayor que
 * `radius`) sitúa las etiquetas fuera del polígono, nunca encima.
 */
export function computeRadarPolygonPoints(
  scores: number[],
  centerX: number,
  centerY: number,
  radius: number,
  labelRadius: number = radius
): RadarPoint[] {
  const n = scores.length;
  return scores.map((score, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = (clamp(score, 0, 100) / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      labelX: centerX + labelRadius * Math.cos(angle),
      labelY: centerY + labelRadius * Math.sin(angle),
    };
  });
}
