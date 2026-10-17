"use client";

/**
 * Copia de components/exercise-runner/ResultSummary.tsx de ORION Play.
 * Logica/calculo de medias intacta. Unicos cambios: rutas de import,
 * color primary-600 -> orion-navy-700 (tema propio de Play inexistente
 * aqui), y ChartBarIcon de @heroicons/react sustituido por un SVG inline
 * equivalente (el Portal no tiene esa libreria instalada).
 */

import {
  isReactionTimeMetrics,
  isClickTargetMetrics,
  isVisualMemoryMetrics,
  type ReactionTimeMetrics,
  type ClickTargetMetrics,
  type VisualMemoryMetrics,
} from "./types";
import Card from "./ui/Card";

interface ResultSummaryProps {
  exerciseId: string;
  metrics: Record<string, unknown>;
}

function ReactionTimeSummary({ metrics }: { metrics: ReactionTimeMetrics }) {
  const avg =
    metrics.reactionTimes.length > 0
      ? Math.round(metrics.reactionTimes.reduce((a, b) => a + b, 0) / metrics.reactionTimes.length)
      : 0;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Accuracy:</span> {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correct (Go):</span> {metrics.correctResponses} /{" "}
        {metrics.totalTrials}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">False alarms (No-Go):</span> {metrics.falseAlarms}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Misses:</span> {metrics.misses}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Avg reaction time:</span> {avg} ms
      </p>
    </div>
  );
}

function ClickTargetSummary({ metrics }: { metrics: ClickTargetMetrics }) {
  const avg =
    metrics.timesPerTarget.length > 0
      ? Math.round(metrics.timesPerTarget.reduce((a, b) => a + b, 0) / metrics.timesPerTarget.length)
      : 0;
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Total time:</span> {(metrics.totalTimeMs / 1000).toFixed(2)} s
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Targets clicked:</span> {metrics.totalClicks}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Errors (missed target):</span> {metrics.errors}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Avg time per target:</span> {avg} ms
      </p>
    </div>
  );
}

function VisualMemorySummary({ metrics }: { metrics: VisualMemoryMetrics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Accuracy:</span> {metrics.accuracyPercent.toFixed(1)}%
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Correct:</span> {metrics.correctSelections}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Incorrect:</span> {metrics.incorrectSelections}
      </p>
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">Missed tiles:</span> {metrics.missedTiles}
      </p>
    </div>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M20 20H4" />
    </svg>
  );
}

/** exerciseId no se usa dentro del componente (igual que en el original de
 * ORION Play) — se mantiene en la interfaz porque forma parte del
 * contrato publico del componente, simplemente no se desestructura. */
export default function ResultSummary({ metrics }: ResultSummaryProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <ChartBarIcon className="h-5 w-5 text-orion-navy-700" />
        <h3 className="text-lg font-semibold text-gray-900">Results</h3>
      </div>
      {isReactionTimeMetrics(metrics) && <ReactionTimeSummary metrics={metrics} />}
      {isClickTargetMetrics(metrics) && <ClickTargetSummary metrics={metrics} />}
      {isVisualMemoryMetrics(metrics) && <VisualMemorySummary metrics={metrics} />}
      {!isReactionTimeMetrics(metrics) && !isClickTargetMetrics(metrics) && !isVisualMemoryMetrics(metrics) && (
        <pre className="text-sm text-gray-600 overflow-auto">{JSON.stringify(metrics, null, 2)}</pre>
      )}
    </Card>
  );
}
