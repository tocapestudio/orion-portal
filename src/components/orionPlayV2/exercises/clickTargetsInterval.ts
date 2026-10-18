/**
 * Logica PURA de los 3 modos de pausa entre estimulos de Click Targets
 * ('immediate'/'fixed'/'random') y de la migracion de configuraciones
 * antiguas (solo `interTargetDelayMs`, sin `intervalMode`) al nuevo
 * modelo - SIN ningun import de React/Next/Supabase, comprobable con el
 * test runner nativo de Node (node --test). Mismo patron ya usado en
 * clickTargetsMetrics.ts/athleteOwnership.ts de este proyecto.
 *
 * Tipos estructurales (no importan ExerciseConfig de ClickTargetsExercise.tsx,
 * que no lo exporta, y para evitar un import circular con un archivo que
 * SI importa React/Next) - cualquier objeto con estos campos es valido.
 */
export type IntervalMode = "immediate" | "fixed" | "random";

export interface IntervalExerciseConfig {
  intervalMode: IntervalMode;
  fixedIntervalMs: number;
  randomIntervalMinMs: number;
  randomIntervalMaxMs: number;
}

/**
 * Valor que tenia la antigua constante fija FEEDBACK_DISPLAY_MS /
 * el default del campo legacy `interTargetDelayMs` que este modulo
 * sustituye - usado por migrateLegacyIntervalConfig como fallback.
 */
export const LEGACY_FIXED_INTERVAL_DEFAULT_MS = 800;

/**
 * Rango admitido para fixedIntervalMs/randomIntervalMinMs/MaxMs - unica
 * fuente de verdad, importada tambien por ClickTargetsExercise.tsx para
 * los limites `min`/`max` de los sliders de la UI, de forma que el valor
 * que esta funcion considera "en rango" sea SIEMPRE el mismo que el
 * slider puede representar (evita que migrateLegacyIntervalConfig admita
 * un valor que el slider no podria mostrar).
 */
export const INTERVAL_MIN_MS = 0;
export const INTERVAL_MAX_MS = 2000;

function clampToIntervalRange(value: number): number {
  return Math.min(INTERVAL_MAX_MS, Math.max(INTERVAL_MIN_MS, value));
}

function isValidIntervalMode(value: unknown): value is IntervalMode {
  return value === "immediate" || value === "fixed" || value === "random";
}

/**
 * Resuelve la pausa real (ms) para la PROXIMA transicion entre
 * estimulos, segun el modo configurado:
 *   - 'immediate' -> siempre 0, sin pausa intencionada.
 *   - 'fixed'     -> siempre fixedIntervalMs.
 *   - 'random'    -> un entero nuevo en [min, max] (ambos inclusive) en
 *                     CADA llamada - nunca cachea, nunca reutiliza el
 *                     valor de la llamada anterior. Si min>max en la
 *                     entrada (nunca deberia pasar, la UI ya lo impide -
 *                     ver ClickTargetsExercise.tsx -, pero esta funcion
 *                     no confia en eso), se normalizan con
 *                     Math.min/Math.max antes de generar el numero, para
 *                     no devolver nunca un resultado fuera de rango ni
 *                     lanzar.
 *
 * `random` es inyectable (mismo patron que generateInvitationCodeCandidate
 * en legacyProfileSync.ts) para que las pruebas sean deterministas - el
 * valor por defecto es el `Math.random` real.
 */
export function resolveIntervalMs(
  config: IntervalExerciseConfig,
  random: () => number = Math.random
): number {
  if (config.intervalMode === "immediate") return 0;
  if (config.intervalMode === "fixed") return config.fixedIntervalMs;

  const min = Math.min(config.randomIntervalMinMs, config.randomIntervalMaxMs);
  const max = Math.max(config.randomIntervalMinMs, config.randomIntervalMaxMs);
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Traduce una configuracion YA cargada de localStorage al nuevo modelo de
 * 3 modos, y valida/sanea `intervalMode` y `fixedIntervalMs` para que el
 * objeto devuelto SIEMPRE sea coherente con lo que la UI puede mostrar -
 * cubre tanto configuraciones legacy genuinas como datos ya corruptos o
 * fuera de rango (edicion manual de localStorage, version futura, etc.).
 *
 * Casos, en orden:
 * 1. `intervalMode` presente y valido ('immediate'/'fixed'/'random') ->
 *    se devuelve exactamente igual, sin tocar - evita volver a migrar
 *    algo que el usuario ya guardo con el selector nuevo.
 * 2. `intervalMode` presente pero con un valor NO reconocido (corrupto o
 *    de una version futura) -> fallback seguro y predecible a 'fixed'
 *    con un intervalo valido (nunca se interpreta implicitamente como
 *    'random'). Si `fixedIntervalMs` ya es un numero se conserva
 *    (recortado al rango admitido); si no, se usa
 *    LEGACY_FIXED_INTERVAL_DEFAULT_MS.
 * 3. Sin `intervalMode` pero con `interTargetDelayMs` numerico (modelo
 *    legacy real) -> `=== 0` migra a 'immediate'; cualquier otro valor
 *    migra a 'fixed', preservando la eleccion real del usuario en
 *    fixedIntervalMs pero RECORTADA al rango admitido por el slider
 *    (INTERVAL_MIN_MS-INTERVAL_MAX_MS) para que el valor efectivo nunca
 *    difiera del que el slider puede mostrar. Valores <=0 (incluidos
 *    negativos) caen al mismo fallback que el caso 2.
 * 4. Cualquier otra forma (objeto vacio, sin ninguno de los dos campos)
 *    se devuelve igual - useExerciseFlow.ts ya aplica sus propios
 *    defaults despues de esto (`{...defaultConfig, ...validated}`), asi
 *    que no hace falta rellenar aqui los campos que falten.
 */
export function migrateLegacyIntervalConfig(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null) return parsed;
  const obj = parsed as Record<string, unknown>;

  if ("intervalMode" in obj) {
    if (isValidIntervalMode(obj.intervalMode)) return obj;

    const fallbackFixedMs =
      typeof obj.fixedIntervalMs === "number"
        ? clampToIntervalRange(obj.fixedIntervalMs)
        : LEGACY_FIXED_INTERVAL_DEFAULT_MS;
    return { ...obj, intervalMode: "fixed", fixedIntervalMs: fallbackFixedMs };
  }

  if (typeof obj.interTargetDelayMs !== "number") return obj;

  const legacyMs = obj.interTargetDelayMs;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring deliberado para EXCLUIR interTargetDelayMs de `rest` (campo legacy sustituido, no se conserva en el objeto migrado)
  const { interTargetDelayMs, ...rest } = obj;
  return {
    ...rest,
    intervalMode: legacyMs === 0 ? "immediate" : "fixed",
    fixedIntervalMs: legacyMs > 0 ? clampToIntervalRange(legacyMs) : LEGACY_FIXED_INTERVAL_DEFAULT_MS,
  };
}
