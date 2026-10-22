/**
 * Logica PURA del Generador de estimulos (ORION Tools) - tipos,
 * configuracion por defecto, validacion y generacion del siguiente
 * estimulo/intervalo. Sin ningun import de React/Next.js/Supabase, mismo
 * patron ya establecido en visual-lab/play/reactionTimeStimulus.ts, para
 * poder probarla con node --test.
 *
 * Alcance de este primer incremento (deliberadamente simple, ver informe
 * de planificacion): solo tipo de estimulo + intervalo fijo/aleatorio.
 * Reglas de inhibicion/interferencia quedan para un incremento futuro -
 * no se finge que existan aqui.
 */

export type StimulusType = "colors" | "numbers" | "letters" | "shapes";
export type IntervalMode = "fixed" | "random";

export interface StimulusGeneratorConfig {
  stimulusType: StimulusType;
  intervalMode: IntervalMode;
  /** Usado solo si intervalMode === 'fixed'. */
  intervalMs: number;
  /** Usados solo si intervalMode === 'random'. */
  intervalMinMs: number;
  intervalMaxMs: number;
}

export const DEFAULT_STIMULUS_CONFIG: StimulusGeneratorConfig = {
  stimulusType: "colors",
  intervalMode: "fixed",
  intervalMs: 2000,
  intervalMinMs: 1000,
  intervalMaxMs: 3000,
};

export const STIMULUS_GENERATOR_STORAGE_KEY = "tools_stimulusGenerator_defaults";

const STIMULUS_TYPES: readonly StimulusType[] = ["colors", "numbers", "letters", "shapes"];
const INTERVAL_MODES: readonly IntervalMode[] = ["fixed", "random"];

/**
 * Validacion MINIMA de la configuracion recuperada de localStorage (mismo
 * criterio que validateConfig en useExerciseFlow: si falla, se descarta
 * y se usa DEFAULT_STIMULUS_CONFIG en su lugar - nunca se confia en un
 * valor sin comprobar su forma real).
 */
export function isValidStimulusGeneratorConfig(value: unknown): value is StimulusGeneratorConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.stimulusType !== "string" || !STIMULUS_TYPES.includes(v.stimulusType as StimulusType)) return false;
  if (typeof v.intervalMode !== "string" || !INTERVAL_MODES.includes(v.intervalMode as IntervalMode)) return false;
  if (typeof v.intervalMs !== "number" || !Number.isFinite(v.intervalMs) || v.intervalMs <= 0) return false;
  if (typeof v.intervalMinMs !== "number" || !Number.isFinite(v.intervalMinMs) || v.intervalMinMs <= 0) return false;
  if (typeof v.intervalMaxMs !== "number" || !Number.isFinite(v.intervalMaxMs) || v.intervalMaxMs <= 0) return false;
  return true;
}

/** Un valor por tipo de estimulo, deliberadamente pocos y claros para
 * este primer incremento (se puede ampliar despues sin romper nada,
 * ninguna fila persistida depende del tamaño de este array). */
const STIMULUS_POOLS: Record<StimulusType, readonly string[]> = {
  colors: ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
  numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  letters: ["A", "B", "C", "D", "E", "F", "H", "L", "O", "P", "T", "U", "X"],
  shapes: ["circle", "square", "triangle", "star"],
};

/**
 * Sortea el siguiente estimulo dentro del pool del tipo configurado -
 * independiente del anterior (sin memoria), mismo criterio ya establecido
 * en decideRandomIsGo/reactionTimeStimulus.ts para este proyecto:
 * `randomFn` inyectable solo para pruebas deterministas, nunca en
 * produccion.
 */
export function pickRandomStimulus(stimulusType: StimulusType, randomFn: () => number = Math.random): string {
  const pool = STIMULUS_POOLS[stimulusType];
  const idx = Math.floor(randomFn() * pool.length);
  // Math.floor(randomFn() * pool.length) con randomFn()=1 exacto (nunca
  // ocurre con Math.random() real, pero si con una randomFn inyectada
  // para pruebas) daria pool.length, fuera de rango - se protege con
  // Math.min, no con un `?? pool[0]` que ocultaria el caso real.
  return pool[Math.min(idx, pool.length - 1)];
}

/**
 * Calcula el intervalo ANTES del siguiente estimulo - fijo, o sorteado
 * uniformemente entre intervalMinMs/intervalMaxMs (mismo patron que el
 * intervalo entre estimulos de Go/No Go, sin reutilizar ese codigo: es
 * una herramienta distinta, con su propia configuracion).
 */
export function computeNextIntervalMs(
  config: Pick<StimulusGeneratorConfig, "intervalMode" | "intervalMs" | "intervalMinMs" | "intervalMaxMs">,
  randomFn: () => number = Math.random
): number {
  if (config.intervalMode === "fixed") return config.intervalMs;
  const lo = Math.min(config.intervalMinMs, config.intervalMaxMs);
  const hi = Math.max(config.intervalMinMs, config.intervalMaxMs);
  return lo + randomFn() * (hi - lo);
}
