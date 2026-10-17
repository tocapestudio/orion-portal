"use client";

/**
 * Copia de components/exercise-runner/ExerciseRunner.tsx de ORION Play.
 * Maquina de estados (idle/running/completed) intacta, sin tocar. Unico
 * cambio real: el destino de persistencia.
 *
 * Original: useApiClient().submitExerciseAttempt(...) -> Express+Mongo
 * propio de ORION Play, identificado por Clerk.
 * Aqui: submitPlayAttempt(athleteId, exerciseId, metrics) -> Server
 * Action del Portal que escribe en core.sessions/session_activities/
 * results, identificado por la sesion Supabase del Portal.
 *
 * Por eso gana un prop nuevo, "athleteId": el profesional autenticado
 * ejecuta el ejercicio, pero el resultado pertenece al atleta
 * seleccionado, no al usuario autenticado — ver submitPlayAttempt.
 */

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { submitPlayAttempt } from "@/app/(portal)/visual-lab/play/actions";
import type { ExerciseMetrics } from "./types";
import Card from "./ui/Card";
import Button from "./ui/Button";
import ResultSummary from "./ResultSummary";

const RUNNER_CONTAINER_MIN_HEIGHT = 520;

export type ExerciseRunnerStatus = "idle" | "running" | "completed";

interface ExerciseRunnerProps {
  exerciseId: string;
  exerciseName?: string;
  /** Atleta para el que se ejecuta el ejercicio (ver cabecera del archivo). */
  athleteId: string;
  children: (props: { onComplete: (metrics: ExerciseMetrics | Record<string, unknown>) => void }) => ReactNode;
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.5 8.5v7l6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function RestartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 10a8 8 0 1 1 2.3 5.6M4 10v-4M4 10h4" />
    </svg>
  );
}

export default function ExerciseRunner({ exerciseId, exerciseName, athleteId, children }: ExerciseRunnerProps) {
  const [status, setStatus] = useState<ExerciseRunnerStatus>("idle");
  const [lastMetrics, setLastMetrics] = useState<Record<string, unknown> | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);

  const onComplete = useCallback(
    (metrics: ExerciseMetrics | Record<string, unknown>) => {
      setLastMetrics(metrics as Record<string, unknown>);
      setStatus("completed");
      setPersistError(null);
      const payload = metrics as Record<string, unknown>;
      submitPlayAttempt(athleteId, exerciseId, payload)
        .then((res) => {
          if (res.error) setPersistError(res.error);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "No se pudo guardar el resultado";
          setPersistError(message);
        });
    },
    [athleteId, exerciseId]
  );

  const handleStart = useCallback(() => {
    setLastMetrics(null);
    setPersistError(null);
    setStatus("running");
  }, []);

  const handleRestart = useCallback(() => {
    setLastMetrics(null);
    setPersistError(null);
    setStatus("idle");
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {status === "idle" && (
        <Card className="p-8">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-6 text-lg">Click Start to begin the exercise.</p>
            <Button onClick={handleStart} variant="primary" className="inline-flex items-center gap-2 text-lg px-8 py-3">
              <PlayIcon className="h-5 w-5" />
              Start
            </Button>
          </div>
        </Card>
      )}

      {status === "running" && (
        <div
          className="min-h-[var(--runner-height)]"
          style={{ "--runner-height": `${RUNNER_CONTAINER_MIN_HEIGHT}px` } as React.CSSProperties}
        >
          <div style={{ minHeight: RUNNER_CONTAINER_MIN_HEIGHT }}>{children({ onComplete })}</div>
        </div>
      )}

      {status === "completed" && lastMetrics && (
        <div className="space-y-4">
          <ResultSummary exerciseId={exerciseId} metrics={lastMetrics} />
          {persistError && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{persistError}</p>}
          {!persistError && (
            <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg">
              Resultado guardado{exerciseName ? ` — ${exerciseName}` : ""}.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleRestart} variant="primary" className="inline-flex items-center gap-2">
              <RestartIcon className="h-5 w-5" />
              Restart
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
