/**
 * Logica PURA de etiquetado legible de `session_activities.config_used`
 * para la ficha de detalle de Rendimiento Visual - SIN import de Next.js/
 * Supabase, comprobable con el test runner nativo de Node (node --test).
 *
 * Las claves cubiertas aqui se inspeccionaron directamente en el codigo
 * real de los 4 ejercicios antes de escribir las etiquetas:
 *   - ExerciseConfig de ReactionTimeExercise.tsx/SimpleReactionExercise.tsx/
 *     ClickTargetsExercise.tsx/VisualMemoryExercise.tsx (orionPlayV2/exercises/).
 *   - Los 4 fallbacks fijos (REACTION_TIME_CONFIG_USED/
 *     SIMPLE_REACTION_CONFIG_USED/CLICK_TARGETS_CONFIG_USED/
 *     VISUAL_MEMORY_CONFIG_USED) de visual-lab/play/effectiveConfig.ts -
 *     usan nombres de campo DISTINTOS a la config real capturada (p.ej.
 *     `maxTrials` en vez de `totalTrials`), asi que config_used puede
 *     tener CUALQUIERA de las dos formas segun si effectiveConfig llego
 *     valido o no - se cubren ambas, nunca se asume una sola.
 *   - La paleta de 10 colores (COLOR_PALETTE) es literalmente identica en
 *     los 4 ejercicios - de ahi la tabla COLOR_NAMES.
 *
 * `formatConfigUsed` nunca inventa el significado de una clave que no
 * reconoce: le da una etiqueta tecnica legible (camelCase -> palabras) y
 * muestra su valor en bruto, nunca la oculta silenciosamente salvo que
 * sea una de las 3 claves puramente internas de bookkeeping
 * (exerciseId/configVersion/fallback - ver HIDDEN_KEYS).
 */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value);
}

/** Paleta real compartida por los 4 ejercicios (COLOR_PALETTE en
 * ReactionTimeExercise.tsx/SimpleReactionExercise.tsx/
 * ClickTargetsExercise.tsx/VisualMemoryExercise.tsx) -> nombre en
 * español. Un color fuera de esta lista (p.ej. uno antiguo de antes de
 * fijar la paleta, ver REACTION_TIME_COLOR_DEFAULTS_VERSION) no tiene
 * nombre conocido: se muestra su propio codigo hex como valor, nunca un
 * nombre inventado - la muestra visual del color sigue mostrandose
 * igual. */
const COLOR_NAMES: Record<string, string> = {
  "#22c55e": "Verde",
  "#ef4444": "Rojo",
  "#3b82f6": "Azul",
  "#f59e0b": "Ámbar",
  "#8b5cf6": "Violeta",
  "#ec4899": "Rosa",
  "#06b6d4": "Cian",
  "#f97316": "Naranja",
  "#facc15": "Amarillo",
  "#6b7280": "Gris",
};

/** Claves puramente de contabilidad interna (ver buildConfigUsed en
 * effectiveConfig.ts) - nunca aportan informacion operativa a un
 * profesional: exerciseId ya se ve en el titulo de la tarjeta;
 * configVersion/fallback son banderas de implementacion sin significado
 * fuera del codigo. Se ocultan explicitamente (documentado aqui, no en
 * silencio) en vez de mostrarse como "campo desconocido". */
const HIDDEN_KEYS = new Set(["exerciseId", "configVersion", "fallback"]);

const END_MODE_LABELS: Record<string, string> = {
  repetitions: "Por repeticiones",
  time: "Por tiempo",
  progressive: "Progresivo",
};

const GO_DISTRIBUTION_LABELS: Record<string, string> = {
  fixed: "Fija",
  random: "Aleatoria",
};

/** CellSize real de VisualMemoryExercise.tsx ('small'|'medium'|'large'). */
const CELL_SIZE_LABELS: Record<string, string> = {
  small: "Pequeña",
  medium: "Mediana",
  large: "Grande",
};

function yesNo(value: boolean): string {
  return value ? "Sí" : "No";
}

function formatNumber(value: unknown): string | null {
  return isFiniteNumber(value) ? String(value) : null;
}

function formatSeconds(value: unknown): string | null {
  return isFiniteNumber(value) ? `${value} s` : null;
}

function formatMs(value: unknown): string | null {
  return isFiniteNumber(value) ? `${value} ms` : null;
}

function formatPercent(value: unknown): string | null {
  return isFiniteNumber(value) ? `${value} %` : null;
}

/** goRatio es una PROPORCION (0-1) de ensayos GO, no un percentil - se
 * multiplica por 100 para mostrarla como porcentaje, nunca se confunde
 * con un percentil estadistico. */
function formatRatioAsPercent(value: unknown): string | null {
  return isFiniteNumber(value) ? `${Math.round(value * 100)} %` : null;
}

function formatBoolean(value: unknown): string | null {
  return typeof value === "boolean" ? yesNo(value) : null;
}

function formatEnum(labels: Record<string, string>): (value: unknown) => string | null {
  return (value) => (typeof value === "string" ? (labels[value] ?? null) : null);
}

/** Para campos de color: nombre legible si el hex esta en la paleta
 * conocida (COLOR_NAMES), si no el propio codigo hex (nunca un nombre
 * inventado) - en ambos casos la muestra visual (colorSwatch) se añade
 * por separado en formatConfigUsed. */
function formatColorValue(value: unknown): string | null {
  if (!isHexColor(value)) return null;
  return COLOR_NAMES[value.toLowerCase()] ?? value;
}

interface FieldSpec {
  label: string;
  format: (value: unknown) => string | null;
  isColor?: boolean;
}

/**
 * Una entrada por cada clave REAL encontrada en el codigo (ver cabecera
 * del archivo) - nunca una clave inventada. Varias claves distintas
 * comparten intencionalmente la misma etiqueta en español cuando
 * representan el mismo concepto con otro nombre interno (p.ej.
 * `targetCount`/`repetitions` son ambos "Repeticiones configuradas" -
 * `targetCount` incluso ya se presenta asi en la propia pantalla de
 * configuracion de Click Targets, ver el comentario de ExerciseConfig
 * alli).
 */
const FIELD_SPECS: Record<string, FieldSpec> = {
  // Comunes / ReactionTime+SimpleReaction+ClickTargets
  endMode: { label: "Finalización", format: formatEnum(END_MODE_LABELS) },
  durationSeconds: { label: "Duración", format: formatSeconds },
  contrastPercent: { label: "Contraste", format: formatPercent },
  showFeedback: { label: "Feedback visual", format: formatBoolean },
  showFixation: { label: "Punto de fijación", format: formatBoolean },

  // Reaction Time (Go/No Go)
  totalTrials: { label: "Intentos configurados", format: formatNumber },
  goDistribution: { label: "Distribución de GO", format: formatEnum(GO_DISTRIBUTION_LABELS) },
  goRatio: { label: "Proporción de GO", format: formatRatioAsPercent },
  intervalMinMs: { label: "Intervalo mínimo", format: formatMs },
  intervalMaxMs: { label: "Intervalo máximo", format: formatMs },
  goColor: { label: "Color GO", format: formatColorValue, isColor: true },
  noGoColor: { label: "Color NO GO", format: formatColorValue, isColor: true },

  // Simple Reaction (Tiempo de reacción)
  stimulusColor: { label: "Color del estímulo", format: formatColorValue, isColor: true },

  // Click Targets
  targetCount: { label: "Repeticiones configuradas", format: formatNumber },
  targetSize: { label: "Tamaño del objetivo", format: (v) => (isFiniteNumber(v) ? `${v} px` : null) },
  targetColor: { label: "Color del objetivo", format: formatColorValue, isColor: true },

  // Visual Memory Precision
  gridSize: { label: "Tamaño de cuadrícula", format: formatNumber },
  patternCount: { label: "Elementos del patrón", format: formatNumber },
  cellSize: { label: "Tamaño de celda", format: formatEnum(CELL_SIZE_LABELS) },
  memorizeTimeSec: { label: "Tiempo para memorizar", format: formatSeconds },
  repetitions: { label: "Repeticiones configuradas", format: formatNumber },
  fixationDurationMs: { label: "Duración del punto de fijación", format: formatMs },

  // Fallbacks fijos (effectiveConfig.ts) - nombres de campo DISTINTOS a
  // los de arriba, misma config_used pero capturada de forma generica.
  maxTrials: { label: "Intentos máximos", format: formatNumber },
  waitMinMs: { label: "Espera mínima", format: formatMs },
  waitMaxMs: { label: "Espera máxima", format: formatMs },
  goStimulusTimeoutMs: { label: "Tiempo máximo de respuesta (GO)", format: formatMs },
  noGoDisplayMs: { label: "Duración del estímulo NO GO", format: formatMs },
  stimulusTimeoutMs: { label: "Tiempo máximo de respuesta", format: formatMs },
};

/** Nombre "humano" generico para una clave tecnica sin entrada en
 * FIELD_SPECS - separa camelCase en palabras y capitaliza la primera.
 * NO inventa significado, solo mejora la tipografia del nombre tecnico
 * real (p.ej. "colorDefaultsVersion" -> "Color defaults version"). */
function humanizeKey(key: string): string {
  const withSpaces = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function formatRawValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return yesNo(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export interface ConfigFieldDisplay {
  key: string;
  label: string;
  value: string;
  /** Codigo hex si este campo representa un color, para pintar una
   * muestra visual - `null` en cualquier otro caso. */
  colorSwatch: string | null;
}

/**
 * Convierte config_used (ya resuelto, el objeto completo que guarda
 * session_activities.config_used) en una lista ordenada de campos
 * legibles. Nunca modifica el objeto de entrada, nunca inventa claves
 * que no esten presentes en el - "presenta unicamente las propiedades
 * disponibles" (ver limites de la tarea).
 */
export function formatConfigUsed(config: Record<string, unknown>): ConfigFieldDisplay[] {
  const fields: ConfigFieldDisplay[] = [];

  for (const [key, rawValue] of Object.entries(config)) {
    if (HIDDEN_KEYS.has(key)) continue;

    const spec = FIELD_SPECS[key];
    const formatted = spec ? spec.format(rawValue) : null;

    if (spec && formatted !== null) {
      fields.push({
        key,
        label: spec.label,
        value: formatted,
        colorSwatch: spec.isColor && isHexColor(rawValue) ? rawValue : null,
      });
    } else {
      // Clave sin etiqueta conocida, o con un valor de tipo inesperado
      // para la etiqueta que tenia (p.ej. endMode con un valor que no es
      // ninguno de los 3 conocidos) - etiqueta tecnica legible + valor en
      // bruto, nunca se finge una interpretacion que no se pudo
      // confirmar.
      fields.push({ key, label: humanizeKey(key), value: formatRawValue(rawValue), colorSwatch: null });
    }
  }

  return fields;
}
