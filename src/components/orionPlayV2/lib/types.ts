/**
 * Exercise metrics types for Milestone 2 — contract between exercises and ExerciseRunner/ResultSummary.
 */

export interface ReactionTimeMetrics {
  reactionTimes: number[]
  correctResponses: number
  falseAlarms: number
  misses: number
  totalTrials: number
  accuracyPercent: number
}

export interface ClickTargetMetrics {
  /** Tiempo de respuesta de CADA ensayo (acierto o fallo) - antes solo
   * incluia aciertos, porque un fallo no terminaba el ensayo. Desde el
   * cambio a "un clic = un ensayo" (ClickTargetsExercise.tsx), cada
   * posicion corresponde exactamente a un ensayo, en orden. */
  timesPerTarget: number[]
  totalTimeMs: number
  /** Total de ensayos respondidos (aciertos + fallos) - antes solo
   * contaba aciertos, porque un target fallado no se contaba como
   * "clicado" hasta acertarlo. Sigue siendo literalmente "numero de
   * clics registrados": ahora cada clic resuelve un ensayo completo. */
  totalClicks: number
  /** Ensayos fallados (clic fuera del target) - antes contaba CUALQUIER
   * clic fuera, incluidos reintentos sobre el mismo target. Ahora, al no
   * poder reintentarse, equivale exactamente a "fallos". */
  errors: number
  /** Campos añadidos de forma aditiva (no rompen isClickTargetMetrics,
   * que solo exige los 4 campos de arriba): aciertos y precision, ambos
   * derivables de totalClicks/errors pero expuestos explicitamente para
   * no recalcularlos en cada consumidor. */
  hits: number
  accuracyPercent: number
}

export interface VisualMemoryMetrics {
  /** Agregados de TODAS las rondas completadas de la ejecucion (antes,
   * cuando solo habia una ronda por ejecucion, estos 4 campos ya
   * representaban esa unica ronda - ahora son la suma de cada ronda
   * resuelta via "Comprobar". Una ronda incompleta al terminar el tiempo o
   * al detener el ejercicio nunca se suma aqui). */
  correctSelections: number
  incorrectSelections: number
  missedTiles: number
  /** correctSelections / (suma de pattern.size de cada ronda) * 100 */
  accuracyPercent: number
  /** Campo añadido de forma aditiva (no rompe isVisualMemoryMetrics, que
   * solo exige los 4 campos de arriba): numero de rondas completadas. */
  roundsCompleted: number
}

export interface SpatialMemoryMetrics {
  responseTimeMs: number
  distanceErrorPx: number
  accuracyPercent: number
  targetPositions: Array<{ x: number; y: number }>
  clickPositions: Array<{ x: number; y: number }>
  config: {
    memorizeTimeSec: number
    distractorTimeSec: number
    stimulusSizePx: number
    redCirclesCount: number
    blueCirclesCount: number
  }
}

export interface MOTMetrics {
  correctSelections: number
  incorrectSelections: number
  missedTargets: number
  totalTargets: number
  accuracyPercent: number
  config: {
    totalBalls: number
    targetBalls: number
    speed: number
    trackingDurationSec: number
  }
}

export interface StroopMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  congruentAvgMs: number
  incongruentAvgMs: number
  stroopEffectMs: number
  reactionTimes: number[]
  config: {
    colors: string[]
    keys: string[]
    congruentRatio: number
    trialCount: number
  }
}

export interface FlankerMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  congruentAvgMs: number
  incongruentAvgMs: number
  neutralAvgMs: number
  flankerEffectMs: number
  reactionTimes: number[]
  config: {
    trialCount: number
    congruentRatio: number
    neutralRatio: number
    flankerCount: number
  }
}

export interface SimpleReactionMetrics {
  /** Ensayos configurados/resueltos en la ejecucion (siempre GO, usado
   * por SimpleReactionExercise.tsx para el modo "Solo GO" - sin
   * dimension de inhibicion). Invariante: totalTrials === validTrials +
   * omissions - falseStarts se cuenta aparte, NUNCA sustituye el
   * desenlace valido/omision de un ensayo (ver SimpleReactionExercise.tsx
   * para el motivo completo). */
  totalTrials: number
  /** Ensayos con respuesta dentro de la ventana tras el estimulo. */
  validTrials: number
  /** Ensayos sin respuesta dentro de la ventana (timeout) - campo
   * añadido de forma aditiva (no rompe isSimpleReactionMetrics anterior,
   * que no lo exigia). */
  omissions: number
  /** Respuestas ANTES de que aparezca el estimulo ("salida en falso",
   * terminologia estandar) - nunca se cuentan como validTrials ni alteran
   * el desenlace valido/omision del ensayo en el que ocurren. */
  falseStarts: number
  reactionTimes: number[]
  avgReactionTimeMs: number
  minReactionTimeMs: number
  maxReactionTimeMs: number
  medianReactionTimeMs: number
  config: {
    trialCount: number
    minDelayMs: number
    maxDelayMs: number
    stimulusType: 'color' | 'shape'
  }
}

export interface AnticipatoryMetrics {
  totalTrials: number
  avgTimingErrorMs: number
  avgAbsTimingErrorMs: number
  earlyResponses: number
  lateResponses: number
  perfectResponses: number
  timingErrors: number[]
  config: {
    trialCount: number
    objectSpeed: number
    occlusionDurationMs: number
    targetZoneMs: number
  }
}

export interface SequenceMemoryMetrics {
  totalRounds: number
  maxSequenceLength: number
  correctSequences: number
  avgResponseTimeMs: number
  responseTimes: number[]
  config: {
    startingLength: number
    gridSize: number
    displayTimeMs: number
  }
}

export interface VisualSearchMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  missedResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  config: {
    trialCount: number
    distractorCount: number
    targetPresenceRatio: number
    timeoutMs: number
  }
}

export interface PeripheralDetectionMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  missedResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  reactionTimesByZone: Record<string, number>
  reactionTimes: number[]
  config: {
    trialCount: number
    eccentricityDeg: number
    stimulusDurationMs: number
    timeoutMs: number
  }
}

export interface ComplexSearchMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  missedResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  targetPresentAvgMs: number
  targetAbsentAvgMs: number
  reactionTimes: number[]
  config: {
    trialCount: number
    distractorCount: number
    targetPresenceRatio: number
    timeoutMs: number
  }
}

export interface DualTaskMetrics {
  totalTrials: number
  centralCorrect: number
  centralIncorrect: number
  peripheralCorrect: number
  peripheralIncorrect: number
  peripheralMissed: number
  centralAccuracyPercent: number
  peripheralAccuracyPercent: number
  avgCentralReactionMs: number
  avgPeripheralReactionMs: number
  config: {
    trialCount: number
    peripheralProbability: number
    centralTimeoutMs: number
  }
}

export interface RuleSwitchMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  switchTrialAccuracy: number
  repeatTrialAccuracy: number
  switchCostMs: number
  reactionTimes: number[]
  config: {
    trialCount: number
    switchProbability: number
    timeoutMs: number
  }
}

export interface ContrastSensitivityMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  lowestContrastDetected: number
  avgReactionTimeMs: number
  contrastThreshold: number
  reactionTimes: number[]
  config: {
    trialCount: number
    startingContrast: number
    adaptiveStep: number
  }
}

export interface PopoutInverseMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  missedResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  config: {
    trialCount: number
    distractorCount: number
    targetPresenceRatio: number
    timeoutMs: number
  }
}

export interface PeripheralDecisionMetrics {
  totalTrials: number
  detectionCorrect: number
  decisionCorrect: number
  missed: number
  detectionAccuracyPercent: number
  decisionAccuracyPercent: number
  avgDetectionTimeMs: number
  avgDecisionTimeMs: number
  reactionTimes: number[]
  config: {
    trialCount: number
    eccentricityDeg: number
    stimulusDurationMs: number
  }
}

export interface VisualAcuityMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  smallestSizeCorrect: number
  avgReactionTimeMs: number
  acuityThreshold: number
  reactionTimes: number[]
  config: {
    trialCount: number
    startingSize: number
    adaptiveStep: number
    testType: string
  }
}

export interface CrowdingMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  crowdedAccuracy: number
  uncrowdedAccuracy: number
  crowdingEffect: number
  reactionTimes: number[]
  config: {
    trialCount: number
    crowdingRatio: number
    spacing: number
  }
}

export interface VerticalLaunchMetrics {
  totalTrials: number
  hits: number
  misses: number
  accuracyPercent: number
  avgTimingErrorMs: number
  timingErrors: number[]
  config: {
    trialCount: number
    minSpeed: number
    maxSpeed: number
    zoneHeight: number
  }
}

export interface HHTrackingMetrics {
  totalTargets: number
  hits: number
  misses: number
  falsePositives: number
  accuracyPercent: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  config: {
    pattern: string
    speed: number
    targetCount: number
    practiceMode: boolean
  }
}

export type ExerciseMetrics =
  | ReactionTimeMetrics
  | ClickTargetMetrics
  | VisualMemoryMetrics
  | SpatialMemoryMetrics
  | MOTMetrics
  | StroopMetrics
  | FlankerMetrics
  | SimpleReactionMetrics
  | AnticipatoryMetrics
  | SequenceMemoryMetrics
  | VisualSearchMetrics
  | PeripheralDetectionMetrics
  | ComplexSearchMetrics
  | DualTaskMetrics
  | RuleSwitchMetrics
  | ContrastSensitivityMetrics
  | PopoutInverseMetrics
  | PeripheralDecisionMetrics
  | VisualAcuityMetrics
  | CrowdingMetrics
  | VerticalLaunchMetrics
  | HHTrackingMetrics
  | DynamicAcuityMetrics
  | AnaglyphBinocularMetrics
  | AnaglyphCalibrationMetrics
  | SaccadesMetrics
  | VergenceMetrics
  | GoalkeeperMetrics
  | NBackMetrics
  | UFOVMetrics
  | PatternRecognitionMetrics
  | PeripheralRadarMetrics

export interface SaccadesMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  prosaccadeAccuracy: number
  antisaccadeAccuracy: number
  prosaccadeAvgMs: number
  antisaccadeAvgMs: number
  reactionTimes: number[]
  config: {
    trialCount: number
    antisaccadeRatio: number
    displayTimeMs: number
  }
}

export function isSaccadesMetrics(m: unknown): m is SaccadesMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.prosaccadeAccuracy === 'number' &&
    typeof o.antisaccadeAccuracy === 'number'
  )
}

export interface VergenceMetrics {
  totalCycles: number
  completedCycles: number
  convergenceHoldTime: number
  divergenceHoldTime: number
  avgCycleTimeMs: number
  config: {
    cycleCount: number
    speed: number
    minSeparation: number
    maxSeparation: number
    useAnaglyph: boolean
  }
}

export function isVergenceMetrics(m: unknown): m is VergenceMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalCycles === 'number' &&
    typeof o.completedCycles === 'number' &&
    typeof o.convergenceHoldTime === 'number'
  )
}

export interface GoalkeeperMetrics {
  totalShots: number
  saved: number
  missed: number
  savePercent: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  byDirection: Record<string, { saved: number; total: number }>
  config: {
    shotCount: number
    speed: number
    anticipationTimeMs: number
  }
}

export function isGoalkeeperMetrics(m: unknown): m is GoalkeeperMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalShots === 'number' &&
    typeof o.saved === 'number' &&
    typeof o.savePercent === 'number'
  )
}

export interface NBackMetrics {
  totalTrials: number
  hits: number
  misses: number
  falseAlarms: number
  correctRejections: number
  accuracyPercent: number
  dPrime: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  config: {
    nLevel: number
    trialCount: number
    stimulusDurationMs: number
    matchRatio: number
  }
}

export function isNBackMetrics(m: unknown): m is NBackMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.dPrime === 'number' &&
    typeof o.correctRejections === 'number' &&
    typeof o.config === 'object' &&
    o.config !== null &&
    typeof (o.config as Record<string, unknown>).nLevel === 'number'
  )
}

export interface UFOVMetrics {
  totalTrials: number
  centralCorrect: number
  peripheralCorrect: number
  bothCorrect: number
  centralAccuracyPercent: number
  peripheralAccuracyPercent: number
  combinedAccuracyPercent: number
  avgReactionTimeMs: number
  peripheralByEccentricity: Record<string, { correct: number; total: number }>
  config: {
    trialCount: number
    displayTimeMs: number
    eccentricities: number[]
  }
}

export function isUFOVMetrics(m: unknown): m is UFOVMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.centralAccuracyPercent === 'number' &&
    typeof o.peripheralAccuracyPercent === 'number' &&
    typeof o.combinedAccuracyPercent === 'number'
  )
}

export interface PatternRecognitionMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  byPatternType: Record<string, { correct: number; total: number }>
  config: {
    trialCount: number
    displayTimeMs: number
    patternTypes: string[]
  }
}

export function isPatternRecognitionMetrics(m: unknown): m is PatternRecognitionMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.byPatternType === 'object' &&
    o.byPatternType !== null &&
    typeof o.config === 'object' &&
    o.config !== null &&
    Array.isArray((o.config as Record<string, unknown>).patternTypes)
  )
}

export interface PeripheralRadarMetrics {
  totalTargets: number
  detected: number
  missed: number
  falseAlarms: number
  accuracyPercent: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  byZone: Record<string, { detected: number; total: number }>
  config: {
    duration: number
    targetFrequency: number
    displayTimeMs: number
  }
}

export function isPeripheralRadarMetrics(m: unknown): m is PeripheralRadarMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.detected === 'number' &&
    typeof o.byZone === 'object' &&
    o.byZone !== null &&
    typeof o.config === 'object' &&
    o.config !== null &&
    typeof (o.config as Record<string, unknown>).targetFrequency === 'number'
  )
}

export function isReactionTimeMetrics(m: unknown): m is ReactionTimeMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    Array.isArray(o.reactionTimes) &&
    typeof o.correctResponses === 'number' &&
    typeof o.falseAlarms === 'number' &&
    typeof o.misses === 'number' &&
    typeof o.totalTrials === 'number' &&
    typeof o.accuracyPercent === 'number'
  )
}

export function isClickTargetMetrics(m: unknown): m is ClickTargetMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    Array.isArray(o.timesPerTarget) &&
    typeof o.totalTimeMs === 'number' &&
    typeof o.totalClicks === 'number' &&
    typeof o.errors === 'number'
  )
}

export function isVisualMemoryMetrics(m: unknown): m is VisualMemoryMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.correctSelections === 'number' &&
    typeof o.incorrectSelections === 'number' &&
    typeof o.missedTiles === 'number' &&
    typeof o.accuracyPercent === 'number'
  )
}

export function isSpatialMemoryMetrics(m: unknown): m is SpatialMemoryMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.responseTimeMs === 'number' &&
    typeof o.distanceErrorPx === 'number' &&
    typeof o.accuracyPercent === 'number' &&
    Array.isArray(o.targetPositions) &&
    Array.isArray(o.clickPositions)
  )
}

export function isMOTMetrics(m: unknown): m is MOTMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.correctSelections === 'number' &&
    typeof o.incorrectSelections === 'number' &&
    typeof o.missedTargets === 'number' &&
    typeof o.totalTargets === 'number' &&
    typeof o.accuracyPercent === 'number'
  )
}

export function isStroopMetrics(m: unknown): m is StroopMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.stroopEffectMs === 'number' &&
    typeof o.congruentAvgMs === 'number' &&
    typeof o.incongruentAvgMs === 'number'
  )
}

export function isFlankerMetrics(m: unknown): m is FlankerMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.flankerEffectMs === 'number' &&
    typeof o.neutralAvgMs === 'number' &&
    typeof o.congruentAvgMs === 'number' &&
    typeof o.incongruentAvgMs === 'number'
  )
}

/** Reforzado (añadido omissions/avgReactionTimeMs/maxReactionTimeMs/
 * reactionTimes a la comprobacion, antes mas laxa) porque esta es la
 * puerta de entrada real a persistencia (actions.ts) para Solo GO -
 * a diferencia de otros tipos de este catalogo, que hoy no tienen ningun
 * consumidor en Server Actions. */
export function isSimpleReactionMetrics(m: unknown): m is SimpleReactionMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.validTrials === 'number' &&
    typeof o.omissions === 'number' &&
    typeof o.falseStarts === 'number' &&
    Array.isArray(o.reactionTimes) &&
    typeof o.avgReactionTimeMs === 'number' &&
    typeof o.minReactionTimeMs === 'number' &&
    typeof o.maxReactionTimeMs === 'number' &&
    typeof o.medianReactionTimeMs === 'number'
  )
}

export function isAnticipatoryMetrics(m: unknown): m is AnticipatoryMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.avgTimingErrorMs === 'number' &&
    typeof o.avgAbsTimingErrorMs === 'number' &&
    typeof o.earlyResponses === 'number' &&
    typeof o.perfectResponses === 'number'
  )
}


export function isSequenceMemoryMetrics(m: unknown): m is SequenceMemoryMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalRounds === 'number' &&
    typeof o.maxSequenceLength === 'number' &&
    typeof o.correctSequences === 'number' &&
    typeof o.avgResponseTimeMs === 'number'
  )
}

export function isVisualSearchMetrics(m: unknown): m is VisualSearchMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.missedResponses === 'number' &&
    typeof o.distractorCount !== 'undefined' ||
    (typeof o.config === 'object' && o.config !== null &&
     typeof (o.config as Record<string, unknown>).distractorCount === 'number')
  )
}

export function isPeripheralDetectionMetrics(m: unknown): m is PeripheralDetectionMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.reactionTimesByZone === 'object' &&
    o.reactionTimesByZone !== null
  )
}


export function isComplexSearchMetrics(m: unknown): m is ComplexSearchMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.targetPresentAvgMs === 'number' &&
    typeof o.targetAbsentAvgMs === 'number'
  )
}

export function isDualTaskMetrics(m: unknown): m is DualTaskMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.centralCorrect === 'number' &&
    typeof o.peripheralCorrect === 'number' &&
    typeof o.centralAccuracyPercent === 'number' &&
    typeof o.peripheralAccuracyPercent === 'number'
  )
}

export function isRuleSwitchMetrics(m: unknown): m is RuleSwitchMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.switchTrialAccuracy === 'number' &&
    typeof o.repeatTrialAccuracy === 'number' &&
    typeof o.switchCostMs === 'number'
  )
}

export function isContrastSensitivityMetrics(m: unknown): m is ContrastSensitivityMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.contrastThreshold === 'number' &&
    typeof o.lowestContrastDetected === 'number'
  )
}

export function isPopoutInverseMetrics(m: unknown): m is PopoutInverseMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTrials === 'number' &&
    typeof o.missedResponses === 'number' &&
    typeof o.config === 'object' &&
    o.config !== null &&
    typeof (o.config as Record<string, unknown>).targetPresenceRatio === 'number'
  )
}

export function isPeripheralDecisionMetrics(m: unknown): m is PeripheralDecisionMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.detectionCorrect === 'number' &&
    typeof o.decisionCorrect === 'number' &&
    typeof o.detectionAccuracyPercent === 'number' &&
    typeof o.decisionAccuracyPercent === 'number'
  )
}

export function isVisualAcuityMetrics(m: unknown): m is VisualAcuityMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.acuityThreshold === 'number' &&
    typeof o.smallestSizeCorrect === 'number'
  )
}

export function isCrowdingMetrics(m: unknown): m is CrowdingMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.crowdedAccuracy === 'number' &&
    typeof o.uncrowdedAccuracy === 'number' &&
    typeof o.crowdingEffect === 'number'
  )
}


export function isVerticalLaunchMetrics(m: unknown): m is VerticalLaunchMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.hits === 'number' &&
    typeof o.misses === 'number' &&
    Array.isArray(o.timingErrors)
  )
}

export function isHHTrackingMetrics(m: unknown): m is HHTrackingMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.totalTargets === 'number' &&
    typeof o.hits === 'number' &&
    typeof o.falsePositives === 'number' &&
    typeof o.config === 'object' &&
    o.config !== null &&
    typeof (o.config as Record<string, unknown>).pattern === 'string'
  )
}

export interface DynamicAcuityMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  smallestSizeCorrect: number
  avgReactionTimeMs: number
  acuityThreshold: number
  reactionTimes: number[]
  config: {
    trialCount: number
    startingSize: number
    speed: number
    movementType: string
  }
}

export function isDynamicAcuityMetrics(m: unknown): m is DynamicAcuityMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.acuityThreshold === 'number' &&
    typeof o.smallestSizeCorrect === 'number' &&
    typeof o.config === 'object' &&
    o.config !== null &&
    typeof (o.config as Record<string, unknown>).movementType === 'string'
  )
}

export interface AnaglyphBinocularMetrics {
  totalTrials: number
  correctResponses: number
  incorrectResponses: number
  accuracyPercent: number
  avgReactionTimeMs: number
  reactionTimes: number[]
  modeResults: {
    math: { correct: number; total: number }
    words: { correct: number; total: number }
    shapes: { correct: number; total: number }
  }
  config: {
    trialCount: number
    mode: string
    colorPair: string
  }
}

export function isAnaglyphBinocularMetrics(m: unknown): m is AnaglyphBinocularMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.modeResults === 'object' &&
    o.modeResults !== null &&
    typeof o.config === 'object' &&
    o.config !== null &&
    typeof (o.config as Record<string, unknown>).colorPair === 'string'
  )
}

export interface AnaglyphCalibrationMetrics {
  calibrationsCompleted: number
  totalChannels: number
  results: Array<{
    channel: string
    selectedTone: string
    hueVariation: number
    saturationVariation: number
    brightnessVariation: number
  }>
  config: {
    gridSize: number
    cellSize: number
    hueRange: number
    saturationRange: number
    brightnessRange: number
  }
}

export function isAnaglyphCalibrationMetrics(m: unknown): m is AnaglyphCalibrationMetrics {
  if (typeof m !== 'object' || m === null) return false
  const o = m as Record<string, unknown>
  return (
    typeof o.calibrationsCompleted === 'number' &&
    Array.isArray(o.results)
  )
}
