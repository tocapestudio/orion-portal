/**
 * Copia literal de lib/types.ts de ORION Play (orion-lab-fe) — contrato de
 * metricas entre los ejercicios y ExerciseRunner/ResultSummary. Sin
 * cambios respecto al original: el proyecto original de ORION Play no se
 * modifica, esto es una copia dentro del Portal. Solo se usa
 * ReactionTimeMetrics/isReactionTimeMetrics en el piloto; los tipos de
 * Click Targets/Visual Memory se incluyen tal cual porque ResultSummary
 * los referencia, aunque esos dos ejercicios no esten conectados todavia.
 */

export interface ReactionTimeMetrics {
  reactionTimes: number[];
  correctResponses: number;
  falseAlarms: number;
  misses: number;
  totalTrials: number;
  accuracyPercent: number;
}

export interface ClickTargetMetrics {
  timesPerTarget: number[];
  totalTimeMs: number;
  totalClicks: number;
  errors: number;
}

export interface VisualMemoryMetrics {
  correctSelections: number;
  incorrectSelections: number;
  missedTiles: number;
  accuracyPercent: number;
}

/**
 * Añadido para Solo GO (modo independiente de tiempo de reaccion simple,
 * sin dimension de inhibicion) - espejo literal de SimpleReactionMetrics
 * en orionPlayV2/lib/types.ts, duplicado aqui a proposito por el mismo
 * motivo que el resto de este archivo (contrato propio de persistencia,
 * desacoplado del tipo que usa la UI V2). Invariante: totalTrials ===
 * validTrials + omissions - falseStarts ("salida en falso", respuesta
 * antes de que aparezca el estimulo) se cuenta aparte y nunca sustituye
 * el desenlace valido/omision de un ensayo.
 */
export interface SimpleReactionMetrics {
  totalTrials: number;
  validTrials: number;
  omissions: number;
  falseStarts: number;
  reactionTimes: number[];
  avgReactionTimeMs: number;
  minReactionTimeMs: number;
  maxReactionTimeMs: number;
  medianReactionTimeMs: number;
  config: {
    trialCount: number;
    minDelayMs: number;
    maxDelayMs: number;
    stimulusType: "color" | "shape";
  };
}

export type ExerciseMetrics = ReactionTimeMetrics | ClickTargetMetrics | VisualMemoryMetrics | SimpleReactionMetrics;

/**
 * Numero realmente utilizable (nunca NaN/Infinity/-Infinity): confirmado
 * por inspeccion de los 4 ejercicios de orionPlayV2 que ningun campo
 * numerico de metrics (ni en finalizacion normal ni interrumpida) puede
 * producir hoy un valor no finito - todos se calculan con contadores
 * enteros o divisiones protegidas contra denominador cero. Mismo criterio
 * ya aplicado en effectiveConfig.ts (isValidEffectiveConfig).
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** reactionTimes/timesPerTarget: arrays de numeros simples (nunca de
 * objetos, a diferencia de targetLog/roundLog) - cada elemento es un
 * tiempo de reaccion real en ms, nunca NaN/Infinity por el mismo motivo
 * que isFiniteNumber. Un array vacio sigue siendo valido (ejecucion
 * interrumpida sin ninguna respuesta/clic resuelto). */
function isFiniteNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

export function isReactionTimeMetrics(m: unknown): m is ReactionTimeMetrics {
  if (typeof m !== "object" || m === null) return false;
  const o = m as Record<string, unknown>;
  return (
    isFiniteNumberArray(o.reactionTimes) &&
    isFiniteNumber(o.correctResponses) &&
    isFiniteNumber(o.falseAlarms) &&
    isFiniteNumber(o.misses) &&
    isFiniteNumber(o.totalTrials) &&
    isFiniteNumber(o.accuracyPercent)
  );
}

export function isClickTargetMetrics(m: unknown): m is ClickTargetMetrics {
  if (typeof m !== "object" || m === null) return false;
  const o = m as Record<string, unknown>;
  return (
    isFiniteNumberArray(o.timesPerTarget) &&
    isFiniteNumber(o.totalTimeMs) &&
    isFiniteNumber(o.totalClicks) &&
    isFiniteNumber(o.errors)
  );
}

export function isVisualMemoryMetrics(m: unknown): m is VisualMemoryMetrics {
  if (typeof m !== "object" || m === null) return false;
  const o = m as Record<string, unknown>;
  return (
    isFiniteNumber(o.correctSelections) &&
    isFiniteNumber(o.incorrectSelections) &&
    isFiniteNumber(o.missedTiles) &&
    isFiniteNumber(o.accuracyPercent)
  );
}

/**
 * `config` ahora exigido (antes se aceptaba su ausencia pese a que
 * SimpleReactionMetrics la declara obligatoria - confirmado por analisis
 * estatico que el unico productor real, SimpleReactionExercise.tsx, SIEMPRE
 * la envia, tanto en finalizacion normal como interrumpida). Estructura
 * comprobada segun el tipo existente: trialCount/minDelayMs/maxDelayMs
 * numericos finitos, stimulusType en 'color'|'shape' - sin exigir rangos
 * ni relaciones entre campos que el contrato actual no respalda.
 */
export function isSimpleReactionMetrics(m: unknown): m is SimpleReactionMetrics {
  if (typeof m !== "object" || m === null) return false;
  const o = m as Record<string, unknown>;
  if (
    !isFiniteNumber(o.totalTrials) ||
    !isFiniteNumber(o.validTrials) ||
    !isFiniteNumber(o.omissions) ||
    !isFiniteNumber(o.falseStarts) ||
    !isFiniteNumberArray(o.reactionTimes) ||
    !isFiniteNumber(o.avgReactionTimeMs) ||
    !isFiniteNumber(o.minReactionTimeMs) ||
    !isFiniteNumber(o.maxReactionTimeMs) ||
    !isFiniteNumber(o.medianReactionTimeMs)
  ) {
    return false;
  }

  const config = o.config;
  if (typeof config !== "object" || config === null || Array.isArray(config)) return false;
  const c = config as Record<string, unknown>;
  return (
    isFiniteNumber(c.trialCount) &&
    isFiniteNumber(c.minDelayMs) &&
    isFiniteNumber(c.maxDelayMs) &&
    (c.stimulusType === "color" || c.stimulusType === "shape")
  );
}
