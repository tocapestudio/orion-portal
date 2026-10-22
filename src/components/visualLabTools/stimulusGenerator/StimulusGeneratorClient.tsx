"use client";

/**
 * Generador de estimulos (ORION Tools) - primer incremento: solo modo
 * individual, configuracion temporal (localStorage, mismo criterio que
 * useExerciseFlow en Play, sin reutilizar ese hook - esta herramienta no
 * tiene metricas/onComplete, forzar la misma forma habria sido mas
 * complejo que escribir el equivalente minimo que de verdad hace falta
 * aqui), ejecucion visual sin registrar ningun resultado cuantitativo, y
 * guardado OPCIONAL de una observacion via el RPC core.create_tool_activity
 * (Server Action createToolActivity).
 *
 * Seleccion de persona: reutiliza tal cual VisualLabAthleteCard.tsx +
 * useVerifiedSelectedAthlete.ts (ya compartidos por Visual Lab/Play) -
 * ningun codigo de seleccion nuevo en este archivo.
 *
 * Modo compartido, favoritas, integracion en la ficha del atleta y
 * Optotipos: fuera de alcance de este incremento, no implementados aqui.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useVerifiedSelectedAthlete } from "@/lib/useVerifiedSelectedAthlete";
import VisualLabAthleteCard from "@/components/visualLab/VisualLabAthleteCard";
import { createToolActivity } from "@/app/(portal)/visual-lab/tools/actions";
import {
  DEFAULT_STIMULUS_CONFIG,
  STIMULUS_GENERATOR_STORAGE_KEY,
  isValidStimulusGeneratorConfig,
  pickRandomStimulus,
  computeNextIntervalMs,
  type StimulusGeneratorConfig,
  type StimulusType,
  type IntervalMode,
} from "./stimulusConfig";

type Stage = "config" | "running" | "finished";
type SaveState = "idle" | "saving" | "saved" | "error";

const STIMULUS_TYPE_LABELS: Record<StimulusType, string> = {
  colors: "Colores",
  numbers: "Números",
  letters: "Letras",
  shapes: "Formas",
};

function loadStoredConfig(): StimulusGeneratorConfig {
  if (typeof window === "undefined") return DEFAULT_STIMULUS_CONFIG;
  try {
    const raw = window.localStorage.getItem(STIMULUS_GENERATOR_STORAGE_KEY);
    if (!raw) return DEFAULT_STIMULUS_CONFIG;
    const parsed = JSON.parse(raw);
    return isValidStimulusGeneratorConfig(parsed) ? parsed : DEFAULT_STIMULUS_CONFIG;
  } catch {
    return DEFAULT_STIMULUS_CONFIG;
  }
}

function ShapeGlyph({ shape, className }: { shape: string; className?: string }) {
  if (shape === "circle") return <div className={`rounded-full bg-orion-navy-800 ${className}`} />;
  if (shape === "square") return <div className={`bg-orion-navy-800 ${className}`} />;
  if (shape === "star") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={`text-orion-navy-800 ${className}`}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  // triangle
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`text-orion-navy-800 ${className}`}>
      <path d="M12 3l9 18H3L12 3z" />
    </svg>
  );
}

function StimulusDisplay({ stimulusType, value }: { stimulusType: StimulusType; value: string }) {
  if (stimulusType === "colors") {
    return <div className="h-40 w-40 rounded-2xl shadow-inner" style={{ backgroundColor: value }} />;
  }
  if (stimulusType === "numbers" || stimulusType === "letters") {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-orion-navy-100 bg-white text-7xl font-bold text-orion-navy-900">
        {value}
      </div>
    );
  }
  return (
    <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-orion-navy-100 bg-white">
      <ShapeGlyph shape={value} className="h-20 w-20" />
    </div>
  );
}

export default function StimulusGeneratorClient() {
  const { verified } = useVerifiedSelectedAthlete();
  const [stage, setStage] = useState<Stage>("config");
  const [config, setConfig] = useState<StimulusGeneratorConfig>(DEFAULT_STIMULUS_CONFIG);
  const [currentStimulus, setCurrentStimulus] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const stopRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Configuracion temporal: se carga una vez al montar (nunca se vuelve
  // a leer localStorage despues, igual que useExerciseFlow) y se guarda
  // en cada cambio - "configurar sin guardar permanentemente" significa
  // aqui lo mismo que en Play: un unico slot de ultimos valores usados,
  // sin nombre, sin favoritas (eso es un incremento futuro, tool_presets).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(loadStoredConfig());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STIMULUS_GENERATOR_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const runLoop = useCallback((cfg: StimulusGeneratorConfig) => {
    stopRef.current = false;
    const tick = () => {
      if (stopRef.current) return;
      setCurrentStimulus(pickRandomStimulus(cfg.stimulusType));
      const delay = computeNextIntervalMs(cfg);
      timeoutRef.current = setTimeout(tick, delay);
    };
    tick();
  }, []);

  const handleStart = useCallback(() => {
    setStage("running");
    runLoop(config);
  }, [config, runLoop]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentStimulus(null);
    setObservation("");
    setSaveState("idle");
    setSaveError(null);
    setStage("finished");
  }, []);

  const handleExitWithoutSaving = useCallback(() => {
    setStage("config");
  }, []);

  const handleSave = useCallback(async () => {
    if (!verified) {
      setSaveState("error");
      setSaveError("No hay ninguna persona seleccionada.");
      return;
    }
    setSaveState("saving");
    setSaveError(null);
    const result = await createToolActivity(
      "stimulus_generator",
      "individual",
      { ...config },
      null,
      [{ athleteId: verified.athleteId, individualObservation: observation }]
    );
    if (result.error) {
      setSaveState("error");
      setSaveError(result.error);
      return;
    }
    setSaveState("saved");
  }, [config, observation, verified]);

  if (stage === "finished") {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-semibold text-orion-navy-900">Generador de estímulos — resultado</h1>
        {verified && (
          <p className="text-sm text-orion-navy-500">
            Persona: <span className="font-medium text-orion-navy-800">{verified.fullName}</span> (ORION ID #{verified.shortId})
          </p>
        )}

        {saveState === "saved" ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Observación guardada correctamente.
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-orion-navy-700">
              Observación (opcional)
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-orion-navy-100 bg-white px-3 py-2 text-sm text-orion-navy-900 focus:border-orion-accent focus:outline-none"
                placeholder="Ej.: respuesta mediante ratón USB…"
              />
            </label>
            {saveState === "error" && saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="rounded-xl bg-orion-navy-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900 disabled:opacity-50"
              >
                {saveState === "saving" ? "Guardando…" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={handleExitWithoutSaving}
                className="rounded-xl border border-orion-navy-200 px-4 py-2.5 text-sm font-medium text-orion-navy-700 hover:bg-orion-navy-50"
              >
                Salir sin guardar
              </button>
            </div>
          </>
        )}

        {saveState === "saved" && (
          <button
            type="button"
            onClick={handleExitWithoutSaving}
            className="rounded-xl border border-orion-navy-200 px-4 py-2.5 text-sm font-medium text-orion-navy-700 hover:bg-orion-navy-50"
          >
            Nueva configuración
          </button>
        )}
      </div>
    );
  }

  if (stage === "running") {
    return (
      <div className="flex flex-col items-center gap-8 py-8">
        {verified && (
          <p className="text-sm text-orion-navy-500">
            {verified.fullName} · ORION ID #{verified.shortId}
          </p>
        )}
        {currentStimulus && <StimulusDisplay stimulusType={config.stimulusType} value={currentStimulus} />}
        <button
          type="button"
          onClick={handleStop}
          className="rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900"
        >
          Detener
        </button>
      </div>
    );
  }

  // stage === 'config'
  const canStart = Boolean(verified);
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-orion-navy-900">Generador de estímulos</h1>

      <VisualLabAthleteCard />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Tipo de estímulo</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STIMULUS_TYPE_LABELS) as StimulusType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setConfig((c) => ({ ...c, stimulusType: type }))}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                config.stimulusType === type
                  ? "border-orion-navy-900 bg-orion-navy-900 text-white"
                  : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
              }`}
            >
              {STIMULUS_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Intervalo entre estímulos</p>
        <div className="mb-2 flex gap-2">
          {(["fixed", "random"] as IntervalMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setConfig((c) => ({ ...c, intervalMode: mode }))}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                config.intervalMode === mode
                  ? "border-orion-navy-900 bg-orion-navy-900 text-white"
                  : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
              }`}
            >
              {mode === "fixed" ? "Fijo" : "Aleatorio"}
            </button>
          ))}
        </div>
        {config.intervalMode === "fixed" ? (
          <label className="flex items-center gap-3 text-sm text-orion-navy-700">
            Duración
            <input
              type="number"
              min={200}
              step={100}
              value={config.intervalMs}
              onChange={(e) => setConfig((c) => ({ ...c, intervalMs: Math.max(200, parseInt(e.target.value) || 200) }))}
              className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
            />
            ms
          </label>
        ) : (
          <div className="flex items-center gap-4 text-sm text-orion-navy-700">
            <label className="flex items-center gap-2">
              Mínimo
              <input
                type="number"
                min={200}
                step={100}
                value={config.intervalMinMs}
                onChange={(e) => setConfig((c) => ({ ...c, intervalMinMs: Math.max(200, parseInt(e.target.value) || 200) }))}
                className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
              />
              ms
            </label>
            <label className="flex items-center gap-2">
              Máximo
              <input
                type="number"
                min={200}
                step={100}
                value={config.intervalMaxMs}
                onChange={(e) => setConfig((c) => ({ ...c, intervalMaxMs: Math.max(200, parseInt(e.target.value) || 200) }))}
                className="w-24 rounded-lg border border-orion-navy-200 px-2 py-1"
              />
              ms
            </label>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={!canStart}
        className="rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Iniciar
      </button>
      {!canStart && (
        <p className="text-xs text-orion-navy-400">Selecciona una persona arriba para poder iniciar.</p>
      )}
    </div>
  );
}
