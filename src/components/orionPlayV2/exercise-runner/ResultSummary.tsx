'use client'

/**
 * Copia literal de components/exercise-runner/ResultSummary.tsx de ORION
 * Play V.2 (907 lineas, 24 renderers). Logica de calculo/formato intacta,
 * cero ejercicios corregidos ni completados. Unicos cambios respecto al
 * original:
 * - rutas de import ('../lib/types', '../ui/Card' en vez de '@/lib/types',
 *   '@/components/ui/Card')
 * - ChartBarIcon de @heroicons/react sustituido por un SVG inline
 *   equivalente (el Portal no tiene esa libreria instalada) y su color
 *   text-primary-600 (tema propio de V.2, inexistente aqui) sustituido
 *   por text-orion-navy-700. El resto de clases de color (purple-700,
 *   green-700, amber-700, etc.) son paleta estandar de Tailwind y no
 *   necesitan cambio.
 *
 * Los 8 renderers que faltan respecto a los 32 type guards de lib/types.ts
 * (Saccades, Vergence, Goalkeeper, NBack, UFOV, PatternRecognition,
 * PeripheralRadar) y los ejercicios sin interfaz en absoluto
 * (axis-alignment, binocular-suppression, arrow-directions, color-screen,
 * macdonald-chart) NO se completan aqui — quedan exactamente como en V.2,
 * cayendo al fallback de JSON crudo. Eso se revisa en la fase de revision
 * individual de ejercicios, no en esta capa de motor.
 */

import {
  isReactionTimeMetrics,
  isClickTargetMetrics,
  isVisualMemoryMetrics,
  isSpatialMemoryMetrics,
  isMOTMetrics,
  isStroopMetrics,
  isFlankerMetrics,
  isSimpleReactionMetrics,
  isAnticipatoryMetrics,
  isSequenceMemoryMetrics,
  isVisualSearchMetrics,
  isPeripheralDetectionMetrics,
  isComplexSearchMetrics,
  isDualTaskMetrics,
  isRuleSwitchMetrics,
  isContrastSensitivityMetrics,
  isPopoutInverseMetrics,
  isPeripheralDecisionMetrics,
  isVisualAcuityMetrics,
  isCrowdingMetrics,
  isDynamicAcuityMetrics,
  isAnaglyphBinocularMetrics,
  isAnaglyphCalibrationMetrics,
  isHHTrackingMetrics,
  type ReactionTimeMetrics,
  type ClickTargetMetrics,
  type VisualMemoryMetrics,
  type SpatialMemoryMetrics,
  type MOTMetrics,
  type StroopMetrics,
  type FlankerMetrics,
  type SimpleReactionMetrics,
  type AnticipatoryMetrics,
  type SequenceMemoryMetrics,
  type VisualSearchMetrics,
  type PeripheralDetectionMetrics,
  type ComplexSearchMetrics,
  type DualTaskMetrics,
  type RuleSwitchMetrics,
  type ContrastSensitivityMetrics,
  type PopoutInverseMetrics,
  type PeripheralDecisionMetrics,
  type VisualAcuityMetrics,
  type CrowdingMetrics,
  type DynamicAcuityMetrics,
  type AnaglyphBinocularMetrics,
  type AnaglyphCalibrationMetrics,
  type HHTrackingMetrics,
} from '../lib/types'
import Card from '../ui/Card'

interface ResultSummaryProps {
  exerciseId: string
  metrics: Record<string, unknown>
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M20 20H4" />
    </svg>
  )
}

function ReactionTimeSummary({ metrics }: { metrics: ReactionTimeMetrics }) {
  const avg =
    metrics.reactionTimes.length > 0
      ? Math.round(
          metrics.reactionTimes.reduce((a, b) => a + b, 0) /
            metrics.reactionTimes.length
        )
      : 0
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Accuracy:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correct (Go):</span>{' '}
        {metrics.correctResponses} / {metrics.totalTrials}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">False alarms (No-Go):</span>{' '}
        {metrics.falseAlarms}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Misses:</span> {metrics.misses}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Avg reaction time:</span>{' '}
        {avg} ms
      </p>
    </div>
  )
}

function ClickTargetSummary({ metrics }: { metrics: ClickTargetMetrics }) {
  const avg =
    metrics.timesPerTarget.length > 0
      ? Math.round(
          metrics.timesPerTarget.reduce((a, b) => a + b, 0) /
            metrics.timesPerTarget.length
        )
      : 0
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Total time:</span>{' '}
        {(metrics.totalTimeMs / 1000).toFixed(2)} s
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Targets clicked:</span>{' '}
        {metrics.totalClicks}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Errors (missed target):</span>{' '}
        {metrics.errors}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Avg time per target:</span>{' '}
        {avg} ms
      </p>
    </div>
  )
}

function VisualMemorySummary({ metrics }: { metrics: VisualMemoryMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Accuracy:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correct:</span>{' '}
        {metrics.correctSelections}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Incorrect:</span>{' '}
        {metrics.incorrectSelections}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Missed tiles:</span>{' '}
        {metrics.missedTiles}
      </p>
    </div>
  )
}

function SpatialMemorySummary({ metrics }: { metrics: SpatialMemoryMetrics }) {
  const avgDistance = metrics.distanceErrorPx
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Response time:</span>{' '}
        {(metrics.responseTimeMs / 1000).toFixed(2)}s
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Avg distance error:</span>{' '}
        {avgDistance.toFixed(1)} px
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Spatial accuracy:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Targets:</span>{' '}
        {metrics.clickPositions.length} / {metrics.targetPositions.length} recalled
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Timing:</span>{' '}
        {metrics.config.memorizeTimeSec.toFixed(1)}s memorize / {metrics.config.distractorTimeSec.toFixed(1)}s distractor
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Setup:</span>{' '}
        {metrics.config.redCirclesCount} red, {metrics.config.blueCirclesCount} blue, {metrics.config.stimulusSizePx}px size
      </p>
    </div>
  )
}

function MOTSummary({ metrics }: { metrics: MOTMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Accuracy:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correct:</span>{' '}
        {metrics.correctSelections} / {metrics.totalTargets}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Missed:</span>{' '}
        {metrics.missedTargets}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Wrong selections:</span>{' '}
        {metrics.incorrectSelections}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Setup:</span>{' '}
        {metrics.config.targetBalls} targets / {metrics.config.totalBalls} balls
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Speed:</span>{' '}
        {metrics.config.speed} | <span className="font-medium text-gray-900">Duration:</span>{' '}
        {metrics.config.trackingDurationSec}s
      </p>
    </div>
  )
}

function StroopSummary({ metrics }: { metrics: StroopMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Precisión:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Congruentes:</span>{' '}
        {metrics.congruentAvgMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Incongruentes:</span>{' '}
        {metrics.incongruentAvgMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Efecto Stroop:</span>{' '}
        <span className="font-bold text-purple-600">{metrics.stroopEffectMs} ms</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Trials:</span>{' '}
        {metrics.correctResponses} correctos / {metrics.totalTrials} total
      </p>
    </div>
  )
}

function FlankerSummary({ metrics }: { metrics: FlankerMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Precisión:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Congruentes:</span>{' '}
        {metrics.congruentAvgMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-red-700">Incongruentes:</span>{' '}
        {metrics.incongruentAvgMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Neutrales:</span>{' '}
        {metrics.neutralAvgMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Efecto Flanker:</span>{' '}
        <span className="font-bold text-purple-600">{metrics.flankerEffectMs} ms</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Trials:</span>{' '}
        {metrics.correctResponses} correctos / {metrics.totalTrials} total
      </p>
    </div>
  )
}

function SimpleReactionSummary({ metrics }: { metrics: SimpleReactionMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Intentos válidos:</span>{' '}
        {metrics.validTrials} / {metrics.totalTrials}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Tiempo medio:</span>{' '}
        <span className="font-bold text-green-600">{metrics.avgReactionTimeMs} ms</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Mejor tiempo:</span>{' '}
        {metrics.minReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Mediana:</span>{' '}
        {metrics.medianReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Peor tiempo:</span>{' '}
        {metrics.maxReactionTimeMs} ms
      </p>
      {metrics.falseStarts > 0 && (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-red-700">Falsos inicios:</span>{' '}
          {metrics.falseStarts}
        </p>
      )}
    </div>
  )
}

function AnticipatorySummary({ metrics }: { metrics: AnticipatoryMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Error medio absoluto:</span>{' '}
        <span className="font-bold text-blue-600">{metrics.avgAbsTimingErrorMs} ms</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Error medio (con signo):</span>{' '}
        {metrics.avgTimingErrorMs > 0 ? '+' : ''}{metrics.avgTimingErrorMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Perfectos:</span>{' '}
        {metrics.perfectResponses} / {metrics.totalTrials}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Tempranos:</span>{' '}
        {metrics.earlyResponses}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-orange-700">Tardíos:</span>{' '}
        {metrics.lateResponses}
      </p>
    </div>
  )
}

function SequenceMemorySummary({ metrics }: { metrics: SequenceMemoryMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Secuencia máxima:</span>{' '}
        <span className="font-bold text-yellow-600">{metrics.maxSequenceLength}</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Rondas completadas:</span>{' '}
        {metrics.correctSequences} / {metrics.totalRounds}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgResponseTimeMs} ms
      </p>
    </div>
  )
}

function VisualSearchSummary({ metrics }: { metrics: VisualSearchMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Precisión:</span>{' '}
        <span className="font-bold text-green-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correctos:</span>{' '}
        {metrics.correctResponses} / {metrics.totalTrials}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-red-700">Errores:</span>{' '}
        {metrics.incorrectResponses}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Timeout:</span>{' '}
        {metrics.missedResponses}
      </p>
    </div>
  )
}

function PeripheralDetectionSummary({ metrics }: { metrics: PeripheralDetectionMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Precisión:</span>{' '}
        <span className="font-bold text-green-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correctos:</span>{' '}
        {metrics.correctResponses} / {metrics.totalTrials}
      </p>
      {metrics.reactionTimesByZone && (
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">Por zona:</span>
          <div className="grid grid-cols-2 gap-1 mt-1 ml-2">
            <span>← Izq: {metrics.reactionTimesByZone.left || '-'} ms</span>
            <span>Der →: {metrics.reactionTimesByZone.right || '-'} ms</span>
            <span>↑ Arriba: {metrics.reactionTimesByZone.up || '-'} ms</span>
            <span>↓ Abajo: {metrics.reactionTimesByZone.down || '-'} ms</span>
          </div>
        </div>
      )}
    </div>
  )
}

function ComplexSearchSummary({ metrics }: { metrics: ComplexSearchMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Precisión:</span>{' '}
        <span className="font-bold text-green-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Presente (tiempo):</span>{' '}
        {metrics.targetPresentAvgMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-orange-700">Ausente (tiempo):</span>{' '}
        {metrics.targetAbsentAvgMs} ms
      </p>
    </div>
  )
}

function DualTaskSummary({ metrics }: { metrics: DualTaskMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Central (precisión):</span>{' '}
        <span className="font-bold text-blue-600">{metrics.centralAccuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Central (tiempo):</span>{' '}
        {metrics.avgCentralReactionMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Periférico (precisión):</span>{' '}
        <span className="font-bold text-purple-600">{metrics.peripheralAccuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Periférico (tiempo):</span>{' '}
        {metrics.avgPeripheralReactionMs} ms
      </p>
    </div>
  )
}

function RuleSwitchSummary({ metrics }: { metrics: RuleSwitchMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Precisión total:</span>{' '}
        <span className="font-bold text-green-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-orange-700">Precisión (cambio):</span>{' '}
        {metrics.switchTrialAccuracy.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Precisión (repetir):</span>{' '}
        {metrics.repeatTrialAccuracy.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Coste de cambio:</span>{' '}
        <span className="font-bold text-yellow-600">{metrics.switchCostMs} ms</span>
      </p>
    </div>
  )
}

function ContrastSensitivitySummary({ metrics }: { metrics: ContrastSensitivityMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Umbral de contraste:</span>{' '}
        <span className="font-bold text-yellow-600">{metrics.contrastThreshold}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Mínimo detectado:</span>{' '}
        {metrics.lowestContrastDetected}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Precisión:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
    </div>
  )
}

function PopoutInverseSummary({ metrics }: { metrics: PopoutInverseMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Precisión:</span>{' '}
        <span className="font-bold text-green-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correctos:</span>{' '}
        {metrics.correctResponses} / {metrics.totalTrials}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-red-700">Errores:</span>{' '}
        {metrics.incorrectResponses}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Timeout:</span>{' '}
        {metrics.missedResponses}
      </p>
    </div>
  )
}

function PeripheralDecisionSummary({ metrics }: { metrics: PeripheralDecisionMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Detección (precisión):</span>{' '}
        <span className="font-bold text-green-600">{metrics.detectionAccuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Decisión (precisión):</span>{' '}
        <span className="font-bold text-blue-600">{metrics.decisionAccuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Tiempo detección:</span>{' '}
        {metrics.avgDetectionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-orange-700">Tiempo decisión:</span>{' '}
        {metrics.avgDecisionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Perdidos:</span>{' '}
        {metrics.missed}
      </p>
    </div>
  )
}

function VisualAcuitySummary({ metrics }: { metrics: VisualAcuityMetrics }) {
  const getTestTypeLabel = (type: string) => {
    switch (type) {
      case 'landolt': return 'Anillo de Landolt'
      case 'snellen-e': return 'E de Snellen'
      case 'letters': return 'Letras (Optometrista)'
      default: return type
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Umbral de agudeza:</span>{' '}
        <span className="font-bold text-yellow-600">{metrics.acuityThreshold}px</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Mínimo detectado:</span>{' '}
        {metrics.smallestSizeCorrect}px
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Precisión:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      {metrics.config.testType && (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">Tipo de test:</span>{' '}
          {getTestTypeLabel(metrics.config.testType)}
        </p>
      )}
    </div>
  )
}

function CrowdingSummary({ metrics }: { metrics: CrowdingMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Precisión total:</span>{' '}
        <span className="font-bold text-blue-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Sin distractores:</span>{' '}
        {metrics.uncrowdedAccuracy.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-orange-700">Con distractores:</span>{' '}
        {metrics.crowdedAccuracy.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Efecto crowding:</span>{' '}
        <span className="font-bold text-yellow-600">{metrics.crowdingEffect.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
    </div>
  )
}

function DynamicAcuitySummary({ metrics }: { metrics: DynamicAcuityMetrics }) {
  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'horizontal': return 'Horizontal'
      case 'vertical': return 'Vertical'
      case 'diagonal': return 'Diagonal'
      case 'circular': return 'Circular'
      case 'random': return 'Aleatorio'
      default: return type
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-cyan-700">Umbral dinámico:</span>{' '}
        <span className="font-bold text-cyan-600">{metrics.acuityThreshold}px</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Mínimo detectado:</span>{' '}
        {metrics.smallestSizeCorrect}px
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Precisión:</span>{' '}
        {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-purple-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Movimiento:</span>{' '}
        {getMovementLabel(metrics.config.movementType)}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Velocidad:</span>{' '}
        {metrics.config.speed}
      </p>
    </div>
  )
}

function AnaglyphBinocularSummary({ metrics }: { metrics: AnaglyphBinocularMetrics }) {
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'math': return 'Matemáticas'
      case 'words': return 'Palabras'
      case 'shapes': return 'Figuras'
      case 'mixed': return 'Mixto'
      default: return mode
    }
  }

  const getColorPairLabel = (pair: string) => {
    switch (pair) {
      case 'red-cyan': return 'Rojo/Cian'
      case 'red-green': return 'Rojo/Verde'
      case 'red-blue': return 'Rojo/Azul'
      default: return pair
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-violet-700">Precisión global:</span>{' '}
        <span className="font-bold text-violet-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      {metrics.modeResults.math.total > 0 && (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-amber-700">Matemáticas:</span>{' '}
          {metrics.modeResults.math.correct}/{metrics.modeResults.math.total}{' '}
          ({((metrics.modeResults.math.correct / metrics.modeResults.math.total) * 100).toFixed(0)}%)
        </p>
      )}
      {metrics.modeResults.words.total > 0 && (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-green-700">Palabras:</span>{' '}
          {metrics.modeResults.words.correct}/{metrics.modeResults.words.total}{' '}
          ({((metrics.modeResults.words.correct / metrics.modeResults.words.total) * 100).toFixed(0)}%)
        </p>
      )}
      {metrics.modeResults.shapes.total > 0 && (
        <p className="text-sm text-gray-600">
          <span className="font-medium text-pink-700">Figuras:</span>{' '}
          {metrics.modeResults.shapes.correct}/{metrics.modeResults.shapes.total}{' '}
          ({((metrics.modeResults.shapes.correct / metrics.modeResults.shapes.total) * 100).toFixed(0)}%)
        </p>
      )}
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Modo:</span>{' '}
        {getModeLabel(metrics.config.mode)}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Colores:</span>{' '}
        {getColorPairLabel(metrics.config.colorPair)}
      </p>
    </div>
  )
}

function AnaglyphCalibrationSummary({ metrics }: { metrics: AnaglyphCalibrationMetrics }) {
  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'red': return 'Rojo'
      case 'green': return 'Verde'
      case 'blue': return 'Azul'
      default: return channel
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-violet-700">Calibraciones:</span>{' '}
        <span className="font-bold text-violet-600">{metrics.calibrationsCompleted}/{metrics.totalChannels}</span>
      </p>
      {metrics.results.map((result, idx) => (
        <div key={idx} className="text-sm text-gray-600 border-l-2 border-gray-200 pl-3">
          <span className="font-medium" style={{ color: result.channel === 'red' ? '#dc2626' : result.channel === 'green' ? '#16a34a' : '#2563eb' }}>
            {getChannelLabel(result.channel)}:
          </span>{' '}
          H: {result.hueVariation > 0 ? '+' : ''}{result.hueVariation.toFixed(0)}° |
          S: {result.saturationVariation > 0 ? '+' : ''}{result.saturationVariation.toFixed(0)}%
        </div>
      ))}
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Cuadrícula:</span>{' '}
        {metrics.config.gridSize}×{metrics.config.gridSize}
      </p>
    </div>
  )
}

function HHTrackingSummary({ metrics }: { metrics: HHTrackingMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-red-700">Precisión:</span>{' '}
        <span className="font-bold text-red-600">{metrics.accuracyPercent.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-green-700">Aciertos:</span>{' '}
        {metrics.hits} / {metrics.totalTargets}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-blue-700">Tiempo medio:</span>{' '}
        {metrics.avgReactionTimeMs} ms
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-orange-700">Fallos:</span>{' '}
        {metrics.misses}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-yellow-700">Falsos positivos:</span>{' '}
        {metrics.falsePositives}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Patrón:</span>{' '}
        {metrics.config.pattern} ({metrics.config.speed}ms/seg)
      </p>
    </div>
  )
}

/** exerciseId no se usa dentro del componente (igual que en el original de
 * V.2 — el despacho es estructural por type-guard) — se mantiene en la
 * interfaz porque forma parte del contrato publico, simplemente no se
 * desestructura, para no generar una variable sin usar. */
export default function ResultSummary({ metrics }: ResultSummaryProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className="h-5 w-5 text-orion-navy-700" />
        <h3 className="text-lg font-semibold text-gray-900">Results</h3>
      </div>
      {isReactionTimeMetrics(metrics) && (
        <ReactionTimeSummary metrics={metrics} />
      )}
      {isClickTargetMetrics(metrics) && (
        <ClickTargetSummary metrics={metrics} />
      )}
      {isVisualMemoryMetrics(metrics) && (
        <VisualMemorySummary metrics={metrics} />
      )}
      {isSpatialMemoryMetrics(metrics) && (
        <SpatialMemorySummary metrics={metrics} />
      )}
      {isMOTMetrics(metrics) && (
        <MOTSummary metrics={metrics} />
      )}
      {isStroopMetrics(metrics) && (
        <StroopSummary metrics={metrics} />
      )}
      {isFlankerMetrics(metrics) && (
        <FlankerSummary metrics={metrics} />
      )}
      {isSimpleReactionMetrics(metrics) && (
        <SimpleReactionSummary metrics={metrics} />
      )}
      {isAnticipatoryMetrics(metrics) && (
        <AnticipatorySummary metrics={metrics} />
      )}
      {isSequenceMemoryMetrics(metrics) && (
        <SequenceMemorySummary metrics={metrics} />
      )}
      {isVisualSearchMetrics(metrics) && (
        <VisualSearchSummary metrics={metrics} />
      )}
      {isPeripheralDetectionMetrics(metrics) && (
        <PeripheralDetectionSummary metrics={metrics} />
      )}
      {isComplexSearchMetrics(metrics) && (
        <ComplexSearchSummary metrics={metrics} />
      )}
      {isDualTaskMetrics(metrics) && (
        <DualTaskSummary metrics={metrics} />
      )}
      {isRuleSwitchMetrics(metrics) && (
        <RuleSwitchSummary metrics={metrics} />
      )}
      {isContrastSensitivityMetrics(metrics) && (
        <ContrastSensitivitySummary metrics={metrics} />
      )}
      {isPopoutInverseMetrics(metrics) && (
        <PopoutInverseSummary metrics={metrics} />
      )}
      {isPeripheralDecisionMetrics(metrics) && (
        <PeripheralDecisionSummary metrics={metrics} />
      )}
      {isVisualAcuityMetrics(metrics) && (
        <VisualAcuitySummary metrics={metrics} />
      )}
      {isCrowdingMetrics(metrics) && (
        <CrowdingSummary metrics={metrics} />
      )}
      {isDynamicAcuityMetrics(metrics) && (
        <DynamicAcuitySummary metrics={metrics} />
      )}
      {isAnaglyphBinocularMetrics(metrics) && (
        <AnaglyphBinocularSummary metrics={metrics} />
      )}
      {isAnaglyphCalibrationMetrics(metrics) && (
        <AnaglyphCalibrationSummary metrics={metrics} />
      )}
      {isHHTrackingMetrics(metrics) && (
        <HHTrackingSummary metrics={metrics} />
      )}
      {!isReactionTimeMetrics(metrics) &&
        !isClickTargetMetrics(metrics) &&
        !isVisualMemoryMetrics(metrics) &&
        !isSpatialMemoryMetrics(metrics) &&
        !isMOTMetrics(metrics) &&
        !isStroopMetrics(metrics) &&
        !isFlankerMetrics(metrics) &&
        !isSimpleReactionMetrics(metrics) &&
        !isAnticipatoryMetrics(metrics) &&
        !isSequenceMemoryMetrics(metrics) &&
        !isVisualSearchMetrics(metrics) &&
        !isPeripheralDetectionMetrics(metrics) &&
        !isComplexSearchMetrics(metrics) &&
        !isDualTaskMetrics(metrics) &&
        !isRuleSwitchMetrics(metrics) &&
        !isContrastSensitivityMetrics(metrics) &&
        !isPopoutInverseMetrics(metrics) &&
        !isPeripheralDecisionMetrics(metrics) &&
        !isVisualAcuityMetrics(metrics) &&
        !isCrowdingMetrics(metrics) &&
        !isDynamicAcuityMetrics(metrics) &&
        !isAnaglyphBinocularMetrics(metrics) &&
        !isAnaglyphCalibrationMetrics(metrics) &&
        !isHHTrackingMetrics(metrics) && (
          <pre className="text-sm text-gray-600 overflow-auto">
            {JSON.stringify(metrics, null, 2)}
          </pre>
        )}
    </Card>
  )
}
