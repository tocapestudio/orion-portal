/**
 * Logica PURA de transformacion/agregacion de resultados de ORION Play
 * para la pestaña Rendimiento Visual - SIN import de Next.js/Supabase,
 * comprobable con el test runner nativo de Node (node --test). Mismo
 * patron ya establecido en effectiveConfig.ts/resultRowMapping.ts
 * (visual-lab/play/).
 *
 * Tres responsabilidades, las tres puras:
 *   1. mapPlayResultRow: una fila de core.results (+ su config_used) a
 *      la forma que consume la UI, incluyendo el detalle real por
 *      ensayo/ronda (targetLog/roundLog) cuando existe.
 *   2. groupResultsByExercise: agrupa por `exerciseId` (NUNCA por
 *      activity_catalog_id - Simple Reaction y Go/No Go comparten esa
 *      columna, no sirve para distinguirlos), una entrada por ejercicio
 *      REALMENTE utilizado, ordenadas por su ejecucion mas reciente.
 *   3. getExerciseRecord: calcula el "mejor resultado" de un ejercicio
 *      a partir EXCLUSIVAMENTE de sus propios resultados ya cargados -
 *      nunca persiste nada, nunca inventa una cifra si no hay datos
 *      suficientes o comparables (devuelve `null`).
 */

// ============ 1. Mapeo de una fila ============

/** Espejo local (no importado por VALOR de resultRowMapping.ts - ese
 * import rompería la ejecución de este módulo bajo `node --test` fuera
 * de un bundler, mismo motivo ya documentado en resultRowMapping.ts
 * para sus propias constantes copiadas de effectiveConfig.ts) de
 * ClickTargetRecordForPersistence. */
export interface PlayTargetLogEntry {
  targetNumber: number;
  reactionTimeMs: number;
  outcome: "hit" | "miss";
}

/** Espejo local de VisualMemoryRoundRecordForPersistence - mismo motivo. */
export interface PlayRoundLogEntry {
  roundNumber: number;
  rows: number;
  cols: number;
  patternCount: number;
  correctSelections: number;
  incorrectSelections: number;
  missedTiles: number;
  accuracyPercent: number;
  succeeded: boolean;
}

export interface AthletePlayResult {
  id: string;
  generatedAt: string;
  /** Identificador tecnico real del ejercicio (reaction-time/
   * simple-reaction/click-targets/visual-memory-precision), leido de
   * metrics.exerciseId - NUNCA de activity_catalog_id (Simple Reaction
   * reutiliza el de Reaction Time, no sirve para distinguirlos). `null`
   * si metrics no es un objeto o no lleva ese campo (defensivo, no
   * deberia ocurrir con los 4 builders actuales). */
  exerciseId: string | null;
  accuracyPercent: number | null;
  totalTrials: number | null;
  reactionTimeMs: number | null;
  errorsCount: number | null;
  /** Objeto completo de metrics (agregados - incluye reactionTimes[]
   * para Reaction Time/Simple Reaction, ya que esos DOS ejercicios
   * guardan el detalle por intento DENTRO de metrics, no en raw_data). */
  metrics: Record<string, unknown>;
  /** session_activities.config_used de esta ejecucion - `null` si no se
   * pudo resolver (no deberia ocurrir: config_used no es nullable en el
   * esquema, pero la fila de session_activities en si podria no
   * encontrarse si los datos estan inconsistentes). */
  configUsed: Record<string, unknown> | null;
  /** Detalle real por objetivo (Click Targets) - `null` si raw_data no
   * tiene un targetLog con la forma esperada (ausente, o de otro
   * ejercicio). Un array VACIO es un dato real distinto de `null`: la
   * ejecucion sí guardó detalle, simplemente no hubo ningún clic. */
  targetLog: PlayTargetLogEntry[] | null;
  /** Detalle real por ronda (Visual Memory Precision) - mismo criterio
   * que targetLog. */
  roundLog: PlayRoundLogEntry[] | null;
}

/** Forma minima de una fila real de core.results, tal como la devuelve
 * supabase-js (metrics/raw_data llegan tipados como `Json`, de ahi
 * `unknown` aqui - esta funcion es quien los acota). */
export interface PlayResultRow {
  id: string;
  generated_at: string;
  accuracy_percent: number | null;
  total_trials: number | null;
  reaction_time_ms: number | null;
  errors_count: number | null;
  metrics: unknown;
  raw_data: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Valida la forma real de targetLog antes de confiar en el - mismo
 * criterio que isValidTargetLog en resultRowMapping.ts (no importado por
 * el mismo motivo que los dos tipos de arriba), aplicado aqui en LECTURA
 * en vez de en escritura: un raw_data corrupto o con otra forma nunca se
 * muestra como si fuera un targetLog real, se trata como "no disponible". */
function parseTargetLog(value: unknown): PlayTargetLogEntry[] | null {
  if (!Array.isArray(value)) return null;
  const ok = value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const o = item as Record<string, unknown>;
    return isFiniteNumber(o.targetNumber) && isFiniteNumber(o.reactionTimeMs) && (o.outcome === "hit" || o.outcome === "miss");
  });
  return ok ? (value as PlayTargetLogEntry[]) : null;
}

/** Analogo a parseTargetLog, para roundLog. */
function parseRoundLog(value: unknown): PlayRoundLogEntry[] | null {
  if (!Array.isArray(value)) return null;
  const ok = value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const o = item as Record<string, unknown>;
    return (
      isFiniteNumber(o.roundNumber) &&
      isFiniteNumber(o.rows) &&
      isFiniteNumber(o.cols) &&
      isFiniteNumber(o.patternCount) &&
      isFiniteNumber(o.correctSelections) &&
      isFiniteNumber(o.incorrectSelections) &&
      isFiniteNumber(o.missedTiles) &&
      isFiniteNumber(o.accuracyPercent) &&
      typeof o.succeeded === "boolean"
    );
  });
  return ok ? (value as PlayRoundLogEntry[]) : null;
}

export function mapPlayResultRow(
  row: PlayResultRow,
  configUsed: Record<string, unknown> | null
): AthletePlayResult {
  const metrics = asRecord(row.metrics) ?? {};
  const rawData = asRecord(row.raw_data);

  return {
    id: row.id,
    generatedAt: row.generated_at,
    exerciseId: typeof metrics.exerciseId === "string" ? metrics.exerciseId : null,
    accuracyPercent: row.accuracy_percent,
    totalTrials: row.total_trials,
    reactionTimeMs: row.reaction_time_ms,
    errorsCount: row.errors_count,
    metrics,
    configUsed,
    targetLog: rawData ? parseTargetLog(rawData.targetLog) : null,
    roundLog: rawData ? parseRoundLog(rawData.roundLog) : null,
  };
}

// ============ 2. Agrupacion por ejercicio realmente utilizado ============

export interface ExerciseResultGroup {
  exerciseId: string;
  /** Ordenados del mas reciente al mas antiguo. */
  results: AthletePlayResult[];
}

/** Agrupa por metrics.exerciseId (ya resuelto en exerciseId por
 * mapPlayResultRow) - un resultado sin exerciseId identificable
 * (defensivo, no deberia ocurrir) se EXCLUYE por completo: no se inventa
 * un grupo "desconocido" para no fingir que es un ejercicio real.
 *
 * Solo aparecen aqui los ejercicios con AL MENOS un resultado real - no
 * se rellenan los 4 ejercicios del catalogo por defecto (ver
 * RendimientoVisualTab). Los grupos se ordenan por la fecha de su propia
 * ejecucion mas reciente, de mas a menos reciente, para que los
 * ejercicios que el deportista usa habitualmente queden arriba.
 */
export function groupResultsByExercise(results: AthletePlayResult[]): ExerciseResultGroup[] {
  const byExercise = new Map<string, AthletePlayResult[]>();
  for (const result of results) {
    if (!result.exerciseId) continue;
    const existing = byExercise.get(result.exerciseId);
    if (existing) {
      existing.push(result);
    } else {
      byExercise.set(result.exerciseId, [result]);
    }
  }

  const groups: ExerciseResultGroup[] = [...byExercise.entries()].map(([exerciseId, list]) => ({
    exerciseId,
    results: [...list].sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt)),
  }));

  groups.sort((a, b) => Date.parse(b.results[0].generatedAt) - Date.parse(a.results[0].generatedAt));
  return groups;
}

// ============ 3. Calculo del mejor resultado (record) ============

export interface PlayExerciseRecord {
  result: AthletePlayResult;
  /** Resumen legible breve de por que este es el mejor (lo que se
   * muestra en la tarjeta) - p.ej. "92% de precisión" o "335 ms de
   * media". Nunca una cifra sin unidad/contexto. */
  headline: string;
}

/** Umbral minimo de intentos VALIDOS para que una sesion de Tiempo de
 * reaccion (Simple Reaction) pueda optar a record por media de reaccion.
 * Valor elegido a criterio (no especificado por el producto): evita que
 * una sesion de 1-2 respuestas validas gane por simple azar a una sesion
 * completa de 20 - no hay una cifra "correcta" unica, esta es revisable. */
const MIN_VALID_TRIALS_FOR_RECORD = 5;

function bestByLowestReactionTime(
  eligible: AthletePlayResult[]
): AthletePlayResult {
  return eligible.reduce((best, candidate) =>
    (candidate.reactionTimeMs as number) < (best.reactionTimeMs as number) ? candidate : best
  );
}

/** Tiempo de reaccion / Simple Reaction (`simple-reaction`): menor media
 * de reaccion valida, exigiendo un minimo de intentos validos para que
 * la sesion sea "comparable" (ver MIN_VALID_TRIALS_FOR_RECORD). */
function bestSimpleReaction(results: AthletePlayResult[]): PlayExerciseRecord | null {
  const eligible = results.filter((r) => {
    const validTrials = r.metrics.validTrials;
    return r.reactionTimeMs !== null && isFiniteNumber(validTrials) && validTrials >= MIN_VALID_TRIALS_FOR_RECORD;
  });
  if (eligible.length === 0) return null;
  const best = bestByLowestReactionTime(eligible);
  return { result: best, headline: `${best.reactionTimeMs} ms de media` };
}

/** Go/No Go (`reaction-time`): prioriza precision; el tiempo de reaccion
 * SOLO desempata entre sesiones de igual precision maxima - nunca puede
 * hacer ganar a una sesion mas rapida pero menos precisa. */
function bestReactionTime(results: AthletePlayResult[]): PlayExerciseRecord | null {
  const eligible = results.filter((r) => r.accuracyPercent !== null);
  if (eligible.length === 0) return null;

  const maxAccuracy = Math.max(...eligible.map((r) => r.accuracyPercent as number));
  const topTier = eligible.filter((r) => r.accuracyPercent === maxAccuracy);
  const withTime = topTier.filter((r) => r.reactionTimeMs !== null);
  const best = withTime.length > 0 ? bestByLowestReactionTime(withTime) : topTier[0];

  return { result: best, headline: `${Math.round(maxAccuracy)}% de precisión` };
}

/** Click Targets: prioriza precision; el tiempo total SOLO se usa como
 * desempate cuando las sesiones empatadas en precision tienen el MISMO
 * total_trials (si no, el tiempo total de una sesion con menos clics no
 * es comparable con el de una con mas, y no se usa). */
function bestClickTargets(results: AthletePlayResult[]): PlayExerciseRecord | null {
  const eligible = results.filter((r) => r.accuracyPercent !== null);
  if (eligible.length === 0) return null;

  const maxAccuracy = Math.max(...eligible.map((r) => r.accuracyPercent as number));
  const topTier = eligible.filter((r) => r.accuracyPercent === maxAccuracy);
  if (topTier.length === 1) {
    return { result: topTier[0], headline: `${Math.round(maxAccuracy)}% de precisión` };
  }

  const referenceTrials = topTier[0].totalTrials;
  const comparable =
    referenceTrials !== null && topTier.every((r) => r.totalTrials === referenceTrials);
  if (comparable) {
    const withTime = topTier.filter((r) => isFiniteNumber(r.metrics.totalTimeMs));
    if (withTime.length > 0) {
      const best = withTime.reduce((a, b) =>
        (b.metrics.totalTimeMs as number) < (a.metrics.totalTimeMs as number) ? b : a
      );
      return { result: best, headline: `${Math.round(maxAccuracy)}% de precisión` };
    }
  }

  return { result: topTier[0], headline: `${Math.round(maxAccuracy)}% de precisión` };
}

/** Visual Memory Precision: prioriza precision; desempata por numero de
 * rondas completadas (total_trials aqui = roundsCompleted, ver
 * buildVisualMemoryResultRow) - a igual precision, completar mas rondas
 * es un resultado mas solido. No se intenta inferir una "dificultad"
 * numerica a partir de config_used (su forma varia y no hay un criterio
 * fiable unico para compararla entre sesiones - ver instrucciones). */
function bestVisualMemory(results: AthletePlayResult[]): PlayExerciseRecord | null {
  const eligible = results.filter((r) => r.accuracyPercent !== null);
  if (eligible.length === 0) return null;

  const maxAccuracy = Math.max(...eligible.map((r) => r.accuracyPercent as number));
  const topTier = eligible.filter((r) => r.accuracyPercent === maxAccuracy);
  const best = topTier.reduce((a, b) => ((b.totalTrials ?? 0) > (a.totalTrials ?? 0) ? b : a));

  return { result: best, headline: `${Math.round(maxAccuracy)}% de precisión` };
}

/**
 * Calcula el mejor resultado de UN ejercicio a partir exclusivamente de
 * sus propios resultados ya cargados (nunca consulta nada, nunca
 * persiste nada). Devuelve `null` ("Sin récord disponible" en la UI)
 * cuando ningun resultado tiene datos suficientes/comparables, en vez de
 * inventar una cifra.
 */
export function getExerciseRecord(
  exerciseId: string,
  results: AthletePlayResult[]
): PlayExerciseRecord | null {
  switch (exerciseId) {
    case "simple-reaction":
      return bestSimpleReaction(results);
    case "reaction-time":
      return bestReactionTime(results);
    case "click-targets":
      return bestClickTargets(results);
    case "visual-memory-precision":
      return bestVisualMemory(results);
    default:
      return null;
  }
}

// ============ 4. Varios récords por ejercicio (tarjeta ampliada) ============

/**
 * A diferencia de getExerciseRecord() (que elige UN registro "principal"
 * y no se toca en esta tarea), esto devuelve VARIOS indicadores
 * independientes para la misma tarjeta - cada uno con su propia
 * elegibilidad, nunca mezclados entre si. Si un indicador no tiene datos
 * suficientes, simplemente no aparece en la lista (nunca se rellena con
 * un 0 o un valor inventado).
 */
export interface PlayRecordEntry {
  /** Etiqueta legible de que mide exactamente este indicador - nunca se
   * reutiliza la misma etiqueta para dos conceptos distintos (p.ej.
   * "media de sesión" y "intento más rápido" son indicadores
   * DIFERENTES, con etiquetas diferentes, aunque compartan unidad ms). */
  label: string;
  /** Valor ya formateado CON unidad/contexto - nunca una cifra suelta. */
  value: string;
  /** Fecha de la sesión de origen de este indicador - por construccion
   * todos los indicadores de esta funcion provienen de una sesion
   * concreta, nunca de un agregado sin dueño. */
  generatedAt: string;
}

/**
 * Tiempo de reaccion/Simple Reaction (reaction-time/simple-reaction):
 * 3 indicadores independientes, nunca mezclados:
 *   1. "Mejor media de sesión" - igual criterio de elegibilidad que
 *      bestSimpleReaction (MIN_VALID_TRIALS_FOR_RECORD) aplicado aqui
 *      TAMBIEN a Go/No Go, para no declarar "mejor media" a una sesion
 *      de 1 intento.
 *   2. "Intento más rápido" - escanea metrics.reactionTimes[] (el
 *      detalle POR ENSAYO, que para estos dos ejercicios vive dentro de
 *      metrics, no en raw_data - ver mapPlayResultRow) de TODO el
 *      historial, no solo de la sesion con mejor media - un intento
 *      aislado rapido en una sesion por lo demas mediocre sigue siendo
 *      un dato real. SIN el umbral de intentos minimos: un unico intento
 *      valido real no es menos real por venir de una sesion corta.
 *   3. "Mejor precisión" - igual que en getExerciseRecord, pero como
 *      indicador independiente (no decide "el principal").
 */
function breakdownReactionLike(results: AthletePlayResult[]): PlayRecordEntry[] {
  const entries: PlayRecordEntry[] = [];

  const eligibleAvg = results.filter((r) => {
    const validTrials = r.metrics.validTrials;
    return r.reactionTimeMs !== null && isFiniteNumber(validTrials) && validTrials >= MIN_VALID_TRIALS_FOR_RECORD;
  });
  if (eligibleAvg.length > 0) {
    const best = bestByLowestReactionTime(eligibleAvg);
    entries.push({ label: "Mejor media de sesión", value: `${best.reactionTimeMs} ms`, generatedAt: best.generatedAt });
  }

  let fastestTrial: { time: number; generatedAt: string } | null = null;
  for (const r of results) {
    const times = r.metrics.reactionTimes;
    if (!Array.isArray(times)) continue;
    for (const t of times) {
      if (isFiniteNumber(t) && (fastestTrial === null || t < fastestTrial.time)) {
        fastestTrial = { time: t, generatedAt: r.generatedAt };
      }
    }
  }
  if (fastestTrial) {
    entries.push({ label: "Intento más rápido", value: `${fastestTrial.time} ms`, generatedAt: fastestTrial.generatedAt });
  }

  const eligibleAcc = results.filter((r) => r.accuracyPercent !== null);
  if (eligibleAcc.length > 0) {
    const best = eligibleAcc.reduce((a, b) => ((b.accuracyPercent as number) > (a.accuracyPercent as number) ? b : a));
    entries.push({
      label: "Mejor precisión",
      value: `${Math.round(best.accuracyPercent as number)}% de precisión`,
      generatedAt: best.generatedAt,
    });
  }

  return entries;
}

/**
 * Click Targets: 3 indicadores independientes:
 *   1. "Mejor precisión".
 *   2. "Mejor tiempo total" - SOLO entre sesiones realmente comparables:
 *      se agrupan las sesiones por total_trials (numero de objetivos),
 *      y se exige que el grupo elegido tenga AL MENOS 2 sesiones (una
 *      sola sesion no establece una base de comparacion, aunque sea un
 *      dato real) - se usa el grupo MAS NUMEROSO (la configuracion mas
 *      habitual de este deportista), nunca se mezcla tiempo total entre
 *      sesiones de distinto numero de objetivos.
 *   3. "Acierto más rápido" - escanea targetLog (raw_data, el detalle
 *      real por clic) de TODO el historial, SOLO entre aciertos
 *      (outcome==='hit') - un fallo rapido no demuestra precision ni
 *      velocidad util, se descarta a proposito para no premiar clics al
 *      azar.
 */
function breakdownClickTargets(results: AthletePlayResult[]): PlayRecordEntry[] {
  const entries: PlayRecordEntry[] = [];

  const eligibleAcc = results.filter((r) => r.accuracyPercent !== null);
  if (eligibleAcc.length > 0) {
    const best = eligibleAcc.reduce((a, b) => ((b.accuracyPercent as number) > (a.accuracyPercent as number) ? b : a));
    entries.push({
      label: "Mejor precisión",
      value: `${Math.round(best.accuracyPercent as number)}% de precisión`,
      generatedAt: best.generatedAt,
    });
  }

  const byTrialCount = new Map<number, AthletePlayResult[]>();
  for (const r of results) {
    if (r.totalTrials === null || !isFiniteNumber(r.metrics.totalTimeMs)) continue;
    const list = byTrialCount.get(r.totalTrials) ?? [];
    list.push(r);
    byTrialCount.set(r.totalTrials, list);
  }
  let comparableGroup: AthletePlayResult[] | null = null;
  for (const group of byTrialCount.values()) {
    if (group.length < 2) continue;
    if (!comparableGroup || group.length > comparableGroup.length) comparableGroup = group;
  }
  if (comparableGroup) {
    const best = comparableGroup.reduce((a, b) =>
      (b.metrics.totalTimeMs as number) < (a.metrics.totalTimeMs as number) ? b : a
    );
    entries.push({
      label: `Mejor tiempo total (${comparableGroup[0].totalTrials} objetivos)`,
      value: `${Math.round(best.metrics.totalTimeMs as number)} ms`,
      generatedAt: best.generatedAt,
    });
  }

  let fastestHit: { time: number; generatedAt: string } | null = null;
  for (const r of results) {
    if (!r.targetLog) continue;
    for (const entry of r.targetLog) {
      if (entry.outcome === "hit" && (fastestHit === null || entry.reactionTimeMs < fastestHit.time)) {
        fastestHit = { time: entry.reactionTimeMs, generatedAt: r.generatedAt };
      }
    }
  }
  if (fastestHit) {
    entries.push({ label: "Acierto más rápido", value: `${fastestHit.time} ms`, generatedAt: fastestHit.generatedAt });
  }

  return entries;
}

/**
 * Visual Memory Precision: HASTA 3 indicadores (nunca un tiempo -
 * este ejercicio no mide ninguno, no se inventa):
 *   1. "Mejor precisión".
 *   2. "Mayor complejidad superada" - patternCount (numero de elementos
 *      a memorizar, campo real de roundLog) de la ronda con mayor
 *      patternCount ENTRE LAS QUE TERMINARON CON ÉXITO (succeeded===true,
 *      campo real de roundLog) - "superada", no solo "intentada". Si
 *      roundLog es null para TODOS los resultados (nunca se guardo
 *      detalle por ronda), este indicador no aparece.
 *   3. "Más rondas en una sesión" - total_trials maximo (= roundsCompleted).
 */
function breakdownVisualMemory(results: AthletePlayResult[]): PlayRecordEntry[] {
  const entries: PlayRecordEntry[] = [];

  const eligibleAcc = results.filter((r) => r.accuracyPercent !== null);
  if (eligibleAcc.length > 0) {
    const best = eligibleAcc.reduce((a, b) => ((b.accuracyPercent as number) > (a.accuracyPercent as number) ? b : a));
    entries.push({
      label: "Mejor precisión",
      value: `${Math.round(best.accuracyPercent as number)}% de precisión`,
      generatedAt: best.generatedAt,
    });
  }

  let hardest: { patternCount: number; generatedAt: string } | null = null;
  for (const r of results) {
    if (!r.roundLog) continue;
    for (const round of r.roundLog) {
      if (round.succeeded && (hardest === null || round.patternCount > hardest.patternCount)) {
        hardest = { patternCount: round.patternCount, generatedAt: r.generatedAt };
      }
    }
  }
  if (hardest) {
    entries.push({
      label: "Mayor complejidad superada",
      value: `${hardest.patternCount} elementos`,
      generatedAt: hardest.generatedAt,
    });
  }

  const eligibleRounds = results.filter((r) => r.totalTrials !== null);
  if (eligibleRounds.length > 0) {
    const best = eligibleRounds.reduce((a, b) => ((b.totalTrials as number) > (a.totalTrials as number) ? b : a));
    entries.push({
      label: "Más rondas en una sesión",
      value: `${best.totalTrials} rondas`,
      generatedAt: best.generatedAt,
    });
  }

  return entries;
}

/**
 * Calcula VARIOS indicadores de récord (no uno solo) para la tarjeta
 * ampliada - reutiliza exactamente los mismos resultados ya cargados que
 * getExerciseRecord(), nunca una consulta nueva. No sustituye ni cambia
 * getExerciseRecord(): ambas funciones coexisten, con responsabilidades
 * distintas (una elige "el principal" para marcar el registro actual,
 * esta devuelve "todos los que tengan datos suficientes").
 */
export function getExerciseRecordBreakdown(
  exerciseId: string,
  results: AthletePlayResult[]
): PlayRecordEntry[] {
  switch (exerciseId) {
    case "simple-reaction":
    case "reaction-time":
      return breakdownReactionLike(results);
    case "click-targets":
      return breakdownClickTargets(results);
    case "visual-memory-precision":
      return breakdownVisualMemory(results);
    default:
      return [];
  }
}
