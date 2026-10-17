/**
 * Logica PURA de mapeo de metricas de los 4 ejercicios de ORION Play a la
 * forma exacta de fila que se inserta en core.results - extraida de
 * actions.ts (donde vivian como funciones privadas no exportadas) para que
 * sea comprobable con el test runner nativo de Node (node --test) sin
 * arrastrar `next/cache`/`@/lib/supabase/server` (que si importa
 * `next/headers`), que actions.ts si necesita para el resto de
 * submitPlayAttempt. Mismo patron exacto que effectiveConfig.ts.
 *
 * Deliberadamente SIN "use server" y SIN ningun import de Next.js o
 * Supabase - cualquier import de ese tipo aqui reintroduciria exactamente
 * el problema que esta extraccion resuelve. Los dos imports de tipos de
 * abajo (@/components/orionPlay/types, @/components/orionPlayV2/lib/types)
 * son seguros: ninguno de los dos modulos importa nada (confirmado), son
 * solo interfaces/type guards.
 *
 * actions.ts importa todo lo de aqui en vez de redefinirlo - unica fuente
 * de verdad para estas 4 funciones y los 2 tipos de registro por
 * ensayo/ronda, sin duplicados entre los dos archivos. Comportamiento
 * IDENTICO al que tenian estas funciones en actions.ts antes de esta
 * extraccion - ningun contrato, metrica, nombre de columna ni regla de
 * persistencia/idempotencia cambia aqui.
 */

import type { ReactionTimeMetrics, SimpleReactionMetrics } from "@/components/orionPlay/types";
// ClickTargetMetrics/VisualMemoryMetrics de orionPlayV2 (no de
// @/components/orionPlay/types, de donde ya vienen sus propios
// isClickTargetMetrics/isVisualMemoryMetrics): ese modulo V1 todavia no
// incluye los campos aditivos hits/accuracyPercent/roundsCompleted que
// orionPlayV2/lib/types.ts si tiene (ver ClickTargetsExercise.tsx/
// VisualMemoryExercise.tsx) - se usa el tipo completo de aqui para el
// mapeo a core.results, sin tocar el modulo V1 compartido.
import type { ClickTargetMetrics, VisualMemoryMetrics } from "@/components/orionPlayV2/lib/types";

/**
 * Copias literales (NUNCA importadas en runtime) de las mismas 4
 * constantes de effectiveConfig.ts. Un import de VALOR (no `import type`)
 * de ese archivo aqui rompe la ejecucion de este modulo con el test
 * runner nativo de Node fuera de un bundler: effectiveConfig.ts se
 * referencia con un specifier SIN extension (".ts" omitida, resolucion
 * valida para tsc/Next.js con moduleResolution "bundler"), que el
 * resolutor ESM nativo de Node no sabe completar a "effectiveConfig.ts" -
 * un `import type` si se tolera (se borra por completo al no generar
 * ningun codigo en tiempo de ejecucion), pero un import de valor como
 * este no. Si alguna de las 4 constantes cambia en effectiveConfig.ts,
 * hay que actualizar esta copia tambien.
 */
const REACTION_TIME_ACTIVITY_NAME = "reaction-time";
const SIMPLE_REACTION_EXERCISE_ID = "simple-reaction";
const CLICK_TARGETS_ACTIVITY_NAME = "click-targets";
const VISUAL_MEMORY_ACTIVITY_NAME = "visual-memory-precision";

/**
 * Copia local (no exportada desde types.ts, que no se toca aqui) del
 * mismo criterio ya aplicado a los 4 guards de metrics en
 * @/components/orionPlay/types.ts: un numero nunca es "valido" si es
 * NaN/Infinity/-Infinity, aunque typeof lo considere "number".
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Valida la forma real de targetLog (vease ClickTargetRecordForPersistence
 * mas abajo) ANTES de que buildClickTargetsResultRow lo escriba en
 * raw_data - hueco detectado en el analisis estatico previo: ni
 * isClickTargetMetrics (types.ts, no mira esta propiedad de transporte) ni
 * el cast `as unknown as` de actions.ts comprueban nunca el contenido real
 * de este array. Permisivo con campos adicionales desconocidos en cada
 * elemento (mismo criterio que los 4 guards de types.ts) - solo exige la
 * presencia y el tipo correcto de los 3 campos que targetNumber/
 * reactionTimeMs/outcome siempre tienen en el productor real
 * (ClickTargetsExercise.tsx).
 */
export function isValidTargetLog(value: unknown): value is ClickTargetRecordForPersistence[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (typeof item !== "object" || item === null) return false;
    const o = item as Record<string, unknown>;
    return (
      isFiniteNumber(o.targetNumber) &&
      isFiniteNumber(o.reactionTimeMs) &&
      (o.outcome === "hit" || o.outcome === "miss")
    );
  });
}

/**
 * Analogo a isValidTargetLog, para roundLog (vease
 * VisualMemoryRoundRecordForPersistence mas abajo) - mismo motivo exacto,
 * mismo criterio de permisividad ante campos adicionales.
 */
export function isValidRoundLog(value: unknown): value is VisualMemoryRoundRecordForPersistence[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
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
}

/**
 * Mapeo de ReactionTimeMetrics a core.results — columnas canonicas
 * cuando existe equivalente semantico directo, y SIEMPRE el objeto
 * completo sin tocar en metrics (jsonb) para que nada se pierda aunque
 * la columna canonica simplifique (p.ej. reaction_time_ms es una media,
 * no sustituye a reactionTimes[] completo).
 */
export function buildReactionTimeResultRow(
  sessionActivityId: string,
  metrics: ReactionTimeMetrics,
  userId: string
) {
  const avgReactionMs =
    metrics.reactionTimes.length > 0
      ? Math.round(metrics.reactionTimes.reduce((a, b) => a + b, 0) / metrics.reactionTimes.length)
      : null;

  return {
    session_activity_id: sessionActivityId,
    source: "manual" as const,
    accuracy_percent: metrics.accuracyPercent,
    total_trials: metrics.totalTrials,
    reaction_time_ms: avgReactionMs,
    errors_count: metrics.falseAlarms + metrics.misses,
    metrics: { ...metrics, exerciseId: REACTION_TIME_ACTIVITY_NAME },
    created_by: userId,
  };
}

/**
 * Mapeo de SimpleReactionMetrics (Solo GO) a core.results - mismas
 * columnas canonicas que buildReactionTimeResultRow, interpretadas para
 * una tarea SIN dimension de inhibicion.
 */
export function buildSimpleReactionResultRow(
  sessionActivityId: string,
  metrics: SimpleReactionMetrics,
  userId: string
) {
  const reactionTimeMs = metrics.reactionTimes.length > 0 ? metrics.avgReactionTimeMs : null;
  const accuracyPercent = metrics.totalTrials > 0 ? (metrics.validTrials / metrics.totalTrials) * 100 : 0;

  return {
    session_activity_id: sessionActivityId,
    source: "manual" as const,
    accuracy_percent: accuracyPercent,
    total_trials: metrics.totalTrials,
    reaction_time_ms: reactionTimeMs,
    errors_count: metrics.omissions + metrics.falseStarts,
    metrics: { ...metrics, exerciseId: SIMPLE_REACTION_EXERCISE_ID },
    created_by: userId,
  };
}

/**
 * Espejo exacto (solo los campos primitivos, para que el objeto sea
 * JSON-compatible sin ningun cast inseguro) de la interfaz privada
 * `TargetRecord` de ClickTargetsExercise.tsx - no se importa de alli (es
 * local a ese componente, no exportada) - si esa interfaz cambia, hay que
 * actualizar esta tambien.
 */
export type ClickTargetRecordForPersistence = {
  targetNumber: number;
  reactionTimeMs: number;
  outcome: "hit" | "miss";
};

/**
 * Mapeo de ClickTargetMetrics a core.results.
 *
 * `targetLog` llega DENTRO de `metrics` como propiedad de transporte
 * adicional, nunca declarada en ClickTargetMetrics en si - se separa aqui
 * explicitamente de las agregadas antes de construir la columna `metrics`:
 * nunca se duplica alli, se guarda tal cual, sin reconstruir ni inferir
 * nada, en `raw_data`.
 *
 * Si `targetLog` esta presente pero no tiene la forma esperada (ver
 * isValidTargetLog), se lanza un error explicito ANTES de construir nada
 * de la fila - un log malformado nunca se degrada en silencio a
 * `raw_data: null` (eso ocultaria datos corruptos como si fueran
 * simplemente "ausentes"). Si `targetLog` es `undefined`, el
 * comportamiento sigue siendo el mismo de siempre (`raw_data: null`) - no
 * se cambia ese contrato aqui.
 */
export function buildClickTargetsResultRow(
  sessionActivityId: string,
  metrics: ClickTargetMetrics & { hits: number; accuracyPercent: number; targetLog?: ClickTargetRecordForPersistence[] },
  userId: string
) {
  if (metrics.targetLog !== undefined && !isValidTargetLog(metrics.targetLog)) {
    throw new Error(
      "targetLog invalido: se esperaba un array de { targetNumber: number, reactionTimeMs: number, outcome: 'hit' | 'miss' }."
    );
  }

  const { targetLog, ...aggregated } = metrics;
  const avgTimeMs =
    aggregated.timesPerTarget.length > 0
      ? Math.round(aggregated.timesPerTarget.reduce((a, b) => a + b, 0) / aggregated.timesPerTarget.length)
      : null;

  return {
    session_activity_id: sessionActivityId,
    source: "manual" as const,
    accuracy_percent: aggregated.accuracyPercent,
    total_trials: aggregated.totalClicks,
    reaction_time_ms: avgTimeMs,
    errors_count: aggregated.errors,
    metrics: { ...aggregated, exerciseId: CLICK_TARGETS_ACTIVITY_NAME },
    raw_data: targetLog !== undefined ? { targetLog } : null,
    created_by: userId,
  };
}

/**
 * Espejo exacto (solo campos primitivos, JSON-compatible) de la interfaz
 * privada `RoundRecord` de VisualMemoryExercise.tsx - mismo criterio que
 * ClickTargetRecordForPersistence arriba.
 */
export type VisualMemoryRoundRecordForPersistence = {
  roundNumber: number;
  rows: number;
  cols: number;
  patternCount: number;
  correctSelections: number;
  incorrectSelections: number;
  missedTiles: number;
  accuracyPercent: number;
  succeeded: boolean;
};

/**
 * Mapeo de VisualMemoryMetrics a core.results.
 *
 * total_trials = roundsCompleted. reaction_time_ms queda SIEMPRE null:
 * este ejercicio no mide ningun tiempo de respuesta en absoluto.
 * errors_count = incorrectSelections + missedTiles.
 *
 * Mismo criterio exacto que buildClickTargetsResultRow para `roundLog`:
 * si esta presente pero mal formado (ver isValidRoundLog), se lanza un
 * error explicito antes de construir la fila, en vez de degradarlo en
 * silencio a `raw_data: null`. Si es `undefined`, se conserva el
 * comportamiento de siempre.
 */
export function buildVisualMemoryResultRow(
  sessionActivityId: string,
  metrics: VisualMemoryMetrics & { roundsCompleted: number; roundLog?: VisualMemoryRoundRecordForPersistence[] },
  userId: string
) {
  if (metrics.roundLog !== undefined && !isValidRoundLog(metrics.roundLog)) {
    throw new Error(
      "roundLog invalido: se esperaba un array de { roundNumber, rows, cols, patternCount, correctSelections, incorrectSelections, missedTiles, accuracyPercent: number, succeeded: boolean }."
    );
  }

  const { roundLog, ...aggregated } = metrics;

  return {
    session_activity_id: sessionActivityId,
    source: "manual" as const,
    accuracy_percent: aggregated.accuracyPercent,
    total_trials: aggregated.roundsCompleted,
    reaction_time_ms: null,
    errors_count: aggregated.incorrectSelections + aggregated.missedTiles,
    metrics: { ...aggregated, exerciseId: VISUAL_MEMORY_ACTIVITY_NAME },
    raw_data: roundLog !== undefined ? { roundLog } : null,
    created_by: userId,
  };
}
