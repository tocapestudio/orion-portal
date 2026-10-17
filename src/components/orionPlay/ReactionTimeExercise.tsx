"use client";

/**
 * Copia de components/exercises/ReactionTimeExercise.tsx de ORION Play
 * (orion-lab-fe). El proyecto original NO se modifica — esta es una copia
 * dentro del Portal. Logica interna (timings, maquina de estados, calculo
 * de metricas) intacta y sin tocar. Unicos cambios respecto al original:
 * - rutas de import (./types, ./ui/Card en vez de @/lib/types, @/components/ui/Card)
 * - clases de color del tema propio de ORION Play que no existen en el
 *   tema Tailwind del Portal (primary, success, error, shadow-large)
 *   sustituidas por sus equivalentes ya usados en el Portal (orion-navy,
 *   emerald, red, shadow-lg). Puramente visual — ningun valor,
 *   temporizador ni calculo cambia.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactionTimeMetrics } from "./types";
import Card from "./ui/Card";

const MAX_TRIALS = 20;
const WAIT_MIN_MS = 1500;
const WAIT_MAX_MS = 3000;
const GO_STIMULUS_TIMEOUT_MS = 1000;
const NO_GO_DISPLAY_MS = 2000;

type State = "waiting" | "go" | "no-go" | "finished";

interface ReactionTimeExerciseProps {
  onComplete: (metrics: ReactionTimeMetrics) => void;
}

export default function ReactionTimeExercise({ onComplete }: ReactionTimeExerciseProps) {
  const [state, setState] = useState<State>("waiting");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [trialsDone, setTrialsDone] = useState(0);
  const stimulusStartRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimesRef = useRef<number[]>([]);
  const correctResponsesRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const missesRef = useRef(0);
  const noGoTrialsRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (timeoutRef2.current) {
      clearTimeout(timeoutRef2.current);
      timeoutRef2.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const emitComplete = useCallback(() => {
    const total = MAX_TRIALS;
    const correctNoGo = noGoTrialsRef.current - falseAlarmsRef.current;
    const accuracyPercent =
      total > 0 ? ((correctResponsesRef.current + correctNoGo) / total) * 100 : 0;
    onComplete({
      reactionTimes: [...reactionTimesRef.current],
      correctResponses: correctResponsesRef.current,
      falseAlarms: falseAlarmsRef.current,
      misses: missesRef.current,
      totalTrials: total,
      accuracyPercent,
    });
  }, [onComplete]);

  const startTrial = useCallback(() => {
    setState("waiting");
    setReactionTime(null);
    const delay = WAIT_MIN_MS + Math.random() * (WAIT_MAX_MS - WAIT_MIN_MS);
    const isGo = Math.random() < 0.7;

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (isGo) {
        setState("go");
        stimulusStartRef.current = performance.now();
        timeoutRef2.current = setTimeout(() => {
          timeoutRef2.current = null;
          missesRef.current += 1;
          setState("finished");
          setTrialsDone((t) => {
            const next = t + 1;
            if (next >= MAX_TRIALS) {
              emitComplete();
              return next;
            }
            // eslint-disable-next-line react-hooks/immutability -- startTrial se autollama por diseño (idem original de ORION Play); el setTimeout se ejecuta despues de que la const ya esta asignada
            setTimeout(() => startTrial(), 400);
            return next;
          });
        }, GO_STIMULUS_TIMEOUT_MS);
      } else {
        noGoTrialsRef.current += 1;
        setState("no-go");
        timeoutRef2.current = setTimeout(() => {
          timeoutRef2.current = null;
          setState("finished");
          setTrialsDone((t) => {
            const next = t + 1;
            if (next >= MAX_TRIALS) {
              emitComplete();
              return next;
            }
            setTimeout(() => startTrial(), 400);
            return next;
          });
        }, NO_GO_DISPLAY_MS);
      }
    }, delay);
  }, [emitComplete]);

  const handleClick = useCallback(() => {
    if (state === "go") {
      clearTimers();
      const elapsed = Math.round(performance.now() - stimulusStartRef.current);
      setReactionTime(elapsed);
      reactionTimesRef.current.push(elapsed);
      correctResponsesRef.current += 1;
      setState("finished");
      setTrialsDone((t) => {
        const next = t + 1;
        if (next >= MAX_TRIALS) {
          emitComplete();
          return next;
        }
        setTimeout(() => startTrial(), 400);
        return next;
      });
    } else if (state === "no-go") {
      clearTimers();
      falseAlarmsRef.current += 1;
      setState("finished");
      setTrialsDone((t) => {
        const next = t + 1;
        if (next >= MAX_TRIALS) {
          emitComplete();
          return next;
        }
        setTimeout(() => startTrial(), 400);
        return next;
      });
    }
  }, [state, clearTimers, emitComplete, startTrial]);

  useEffect(() => {
    if (trialsDone === 0) startTrial();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only once on mount
  }, []);

  const currentTrial = trialsDone + 1;
  const showTrial = state !== "waiting" || currentTrial <= MAX_TRIALS;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Reaction Time</h1>
        <p className="text-gray-600">
          Go / No-Go — click when you see{" "}green, don&apos;t click when you see{" "}red
        </p>
      </div>
      <Card className="p-8 mb-6">
        {/* Fixed-height feedback area to prevent layout shift */}
        <div className="h-[7rem] flex flex-col items-center justify-center mb-6">
          {showTrial && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-orion-navy-100 text-orion-navy-700 text-sm font-semibold mb-2 shrink-0">
              Trial {Math.min(currentTrial, MAX_TRIALS)} of {MAX_TRIALS}
            </div>
          )}
          <div className="h-[4rem] flex flex-col items-center justify-center w-full">
            {reactionTime !== null ? (
              <>
                <p className="text-sm text-gray-600 mb-1">Reaction time</p>
                <p className="text-3xl font-bold text-emerald-600">{reactionTime} ms</p>
              </>
            ) : (
              <span className="invisible" aria-hidden>
                0 ms
              </span>
            )}
          </div>
        </div>

        <div
          className={`w-full h-80 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg ${
            state === "waiting"
              ? "bg-gray-200 hover:bg-gray-300"
              : state === "go"
                ? "bg-emerald-500 hover:bg-emerald-600 animate-pulse"
                : state === "no-go"
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gray-300"
          }`}
          onClick={handleClick}
        >
          {state === "waiting" && (
            <div className="text-center">
              <p className="text-gray-700 text-xl font-semibold mb-2">Wait for the signal...</p>
              <p className="text-gray-500 text-sm">Get ready to react</p>
            </div>
          )}
          {state === "go" && (
            <div className="text-center">
              <p className="text-white text-4xl font-bold mb-2">CLICK NOW!</p>
              <p className="text-white text-lg opacity-90">GO Signal</p>
            </div>
          )}
          {state === "no-go" && (
            <div className="text-center">
              <p className="text-white text-4xl font-bold mb-2">DON&apos;T CLICK</p>
              <p className="text-white text-lg opacity-90">NO-GO Signal</p>
            </div>
          )}
          {state === "finished" && (
            <div className="text-center">
              <p className="text-gray-700 text-xl font-semibold">Trial complete</p>
              {reactionTime !== null && <p className="text-gray-600 text-sm mt-2">Next trial...</p>}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-900 mb-2">Instructions:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-start">
              <span className="text-emerald-600 mr-2">✓</span>
              Click when you see <span className="font-semibold text-emerald-600">green</span> (GO)
            </li>
            <li className="flex items-start">
              <span className="text-red-600 mr-2">✗</span>
              Don&apos;t click when you see <span className="font-semibold text-red-600">red</span>{" "}
              (NO-GO)
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
