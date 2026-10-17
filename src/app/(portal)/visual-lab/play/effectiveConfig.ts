/**
 * Logica PURA de identificacion de ejercicio y validacion/construccion de
 * `config_used` (fiabilidad de datos, Fase B/C) - extraida de actions.ts
 * para que sea comprobable con el test runner nativo de Node
 * (node --test) sin arrastrar `next/cache`/`@/lib/supabase/server`
 * (que si importa `next/headers`), que actions.ts si necesita para el
 * resto de submitPlayAttempt.
 *
 * Deliberadamente SIN "use server"/"use client" y SIN ningun import de
 * Next.js o Supabase - cualquier import de ese tipo aqui reintroduciria
 * exactamente el problema que esta extraccion resuelve. No añadir
 * ninguno sin repetir este razonamiento.
 *
 * actions.ts importa todo lo de aqui en vez de redefinirlo - unica
 * fuente de verdad para estos identificadores/constantes, sin
 * duplicados entre los dos archivos.
 */

/**
 * exerciseId tecnico de Go/No Go. Coincide con el `name` real de su fila
 * en core.activity_catalog (modality_id='play') - a diferencia de Solo
 * GO (ver SIMPLE_REACTION_EXERCISE_ID), para Go/No Go ambos conceptos SI
 * coinciden hoy.
 */
export const REACTION_TIME_ACTIVITY_NAME = "reaction-time";

/**
 * exerciseId tecnico de Solo GO (orionPlayV2/exercises/SimpleReactionExercise.tsx).
 * Distinto de REACTION_TIME_ACTIVITY_NAME a proposito: este es el valor
 * de ENRUTAMIENTO/persistencia (exerciseId), no el `name` de una fila de
 * core.activity_catalog - ver DEUDA TECNICA en actions.ts, junto a
 * resolveReactionTimeActivityId, para por que ambos conceptos NO
 * coinciden hoy para Solo GO.
 */
export const SIMPLE_REACTION_EXERCISE_ID = "simple-reaction";

/**
 * exerciseId tecnico de Click Targets (orionPlayV2/exercises/ClickTargetsExercise.tsx).
 * A diferencia de Solo GO, coincide con el `name` real de su propia fila
 * en core.activity_catalog (modality_id='play') - Click Targets NO
 * reutiliza el activity_catalog_id de reaction-time, tiene su propia fila
 * (ver resolveActivityIdByName en actions.ts) - sin la deuda tecnica de
 * Solo GO.
 */
export const CLICK_TARGETS_ACTIVITY_NAME = "click-targets";

/**
 * exerciseId tecnico de Visual Memory Precision
 * (orionPlayV2/exercises/VisualMemoryExercise.tsx). Mismo criterio que
 * CLICK_TARGETS_ACTIVITY_NAME: coincide con el `name` de su propia fila
 * de catalogo, sin reutilizar la de reaction-time.
 */
export const VISUAL_MEMORY_ACTIVITY_NAME = "visual-memory-precision";

/**
 * Constantes reales de components/orionPlay/ReactionTimeExercise.tsx
 * (MAX_TRIALS/WAIT_MIN_MS/WAIT_MAX_MS/GO_STIMULUS_TIMEOUT_MS/
 * NO_GO_DISPLAY_MS) — se registran en session_activities.config_used
 * porque son la configuracion REAL que gobierna esta ejecucion (el
 * ejercicio no tiene hoy parametros variables/configurables; si en el
 * futuro los tiene, iran aqui igual). Si esas constantes cambian algun
 * dia en ReactionTimeExercise.tsx, hay que actualizarlas aqui tambien.
 *
 * NOTA (deuda preexistente, no introducida por Solo GO): este objeto ya
 * estaba desactualizado antes de este cambio - noGoDisplayMs dice 2000
 * pero el valor real en orionPlayV2/exercises/ReactionTimeExercise.tsx es
 * 1500, y ninguno de los campos configurables añadidos en fases
 * posteriores (totalTrials/goRatio/intervalMinMs/intervalMaxMs/colores)
 * se refleja aqui - config_used para Go/No Go sigue siendo un valor
 * fijo, no la configuracion real de cada ejecucion. No se corrige en este
 * cambio (fuera de alcance: tocaria el comportamiento ya validado de
 * Go/No Go) - se deja documentado como deuda tecnica ya existente.
 */
export const REACTION_TIME_CONFIG_USED = {
  maxTrials: 20,
  waitMinMs: 1500,
  waitMaxMs: 3000,
  goStimulusTimeoutMs: 1000,
  noGoDisplayMs: 2000,
};

/**
 * Analogo a REACTION_TIME_CONFIG_USED pero para Solo GO - valores por
 * defecto reales de SimpleReactionExercise.tsx (STIMULUS_TIMEOUT_MS/
 * DEFAULT_CONFIG). Mismo tipo de limitacion ya documentada arriba para
 * Go/No Go (valor fijo, no la configuracion real de cada ejecucion) -
 * deuda tecnica de la MISMA clase, no una nueva.
 */
export const SIMPLE_REACTION_CONFIG_USED = {
  maxTrials: 20,
  waitMinMs: 1500,
  waitMaxMs: 3000,
  stimulusTimeoutMs: 1000,
  // Discriminador explicito para distinguir Solo GO de Go/No Go en
  // session_activities.config_used SIN cambiar activity_catalog_id (que
  // hoy es el MISMO para ambos - ver DEUDA TECNICA en actions.ts, junto
  // a resolveReactionTimeActivityId). No se añade el campo equivalente a
  // REACTION_TIME_CONFIG_USED (se deja intacta, sin tocar Go/No Go en
  // absoluto) - la ausencia de este campo ya identifica una fila como
  // Go/No Go frente a su presencia como Solo GO.
  exerciseId: SIMPLE_REACTION_EXERCISE_ID,
};

/**
 * Fallback de config_used para Click Targets/Visual Memory. A diferencia
 * de REACTION_TIME_CONFIG_USED/SIMPLE_REACTION_CONFIG_USED (que replican
 * constantes que de verdad gobernaron estos ejercicios ANTES de que
 * existiera effectiveConfigRef), estos dos ejercicios ya capturan su
 * configuracion efectiva desde su primera version con persistencia - este
 * fallback no corresponde a ningun comportamiento real pasado, es
 * puramente defensivo (effectiveConfig ausente o invalido, caso que no
 * deberia darse en la practica). Deliberadamente con nombres de campo que
 * NO coinciden con ningun campo real de ExerciseConfig de ninguno de los
 * dos ejercicios (ver isValidEffectiveConfig) - mismo invariante que los
 * dos fallbacks de arriba: un objeto que pasa la validacion nunca puede
 * ser este fallback.
 */
export const CLICK_TARGETS_CONFIG_USED = {
  fallback: true as const,
  exerciseId: CLICK_TARGETS_ACTIVITY_NAME,
};

/** Analogo a CLICK_TARGETS_CONFIG_USED, mismo motivo. */
export const VISUAL_MEMORY_CONFIG_USED = {
  fallback: true as const,
  exerciseId: VISUAL_MEMORY_ACTIVITY_NAME,
};

/**
 * Fase C (cierre - endurecimiento de la validacion): comprueba que
 * `effectiveConfig` tiene la forma MINIMA esperada del ExerciseConfig
 * real del ejercicio correspondiente - no es un validador exhaustivo
 * (no comprueba cada campo de ExerciseConfig), solo lo suficiente para
 * rechazar un array, un objeto vacio/incompleto, o cualquier otra cosa
 * que no sea la configuracion real de ESTE ejercicio.
 *
 * Los nombres de campo exigidos (totalTrials/durationSeconds/endMode, mas
 * uno distintivo por ejercicio) nunca coinciden con los de
 * REACTION_TIME_CONFIG_USED/SIMPLE_REACTION_CONFIG_USED (que usan
 * maxTrials/waitMinMs/waitMaxMs/...) - por construccion, un objeto que
 * pase esta comprobacion nunca puede ser una de esas constantes fijas.
 *
 * `Number.isFinite` en los campos numericos descarta NaN/Infinity (que
 * JSON.stringify serializaria como `null`/el propio token invalido,
 * respectivamente, de forma silenciosa). `.trim() !== ""` en los campos
 * de color descarta cadenas vacias o solo espacios, que `typeof ===
 * "string"` por si solo no detectaria.
 *
 * No comprueba limites numericos "razonables" (p.ej. totalTrials
 * negativo o cero) - solo tipo y finitud. Posible mejora futura,
 * documentada aqui, no implementada en esta fase.
 */
export function isValidEffectiveConfig(exerciseId: string, value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;

  // Click Targets/Visual Memory: forma real de su ExerciseConfig propio,
  // DISTINTA de totalTrials/durationSeconds/endMode (dos valores) de
  // Reaction Time/Simple Reaction mas abajo - ninguno de los dos
  // ejercicios nuevos usa `totalTrials` (Click Targets usa `targetCount`,
  // Visual Memory no tiene un equivalente de recuento de intentos en
  // absoluto), y Visual Memory admite un tercer valor de `endMode`
  // ('progressive') que no existe en ningun otro ejercicio. Por eso se
  // resuelven en ramas propias, ANTES de llegar a la validacion
  // compartida de Reaction Time/Simple Reaction, en vez de forzarlos a
  // compartir esos mismos campos.
  if (exerciseId === CLICK_TARGETS_ACTIVITY_NAME) {
    if (typeof v.targetCount !== "number" || !Number.isFinite(v.targetCount)) return false;
    if (typeof v.durationSeconds !== "number" || !Number.isFinite(v.durationSeconds)) return false;
    if (v.endMode !== "repetitions" && v.endMode !== "time") return false;
    if (typeof v.targetColor !== "string" || v.targetColor.trim() === "") return false;
    return true;
  }
  if (exerciseId === VISUAL_MEMORY_ACTIVITY_NAME) {
    if (typeof v.gridSize !== "number" || !Number.isFinite(v.gridSize)) return false;
    if (typeof v.durationSeconds !== "number" || !Number.isFinite(v.durationSeconds)) return false;
    if (v.endMode !== "repetitions" && v.endMode !== "time" && v.endMode !== "progressive") return false;
    if (typeof v.stimulusColor !== "string" || v.stimulusColor.trim() === "") return false;
    return true;
  }

  // Reaction Time/Simple Reaction: sin cambios respecto al comportamiento
  // original (mismo orden, mismas comprobaciones).
  if (typeof v.totalTrials !== "number" || !Number.isFinite(v.totalTrials)) return false;
  if (typeof v.durationSeconds !== "number" || !Number.isFinite(v.durationSeconds)) return false;
  if (v.endMode !== "repetitions" && v.endMode !== "time") return false;
  if (exerciseId === REACTION_TIME_ACTIVITY_NAME) {
    if (typeof v.goColor !== "string" || v.goColor.trim() === "") return false;
    if (typeof v.noGoColor !== "string" || v.noGoColor.trim() === "") return false;
  }
  if (exerciseId === SIMPLE_REACTION_EXERCISE_ID) {
    if (typeof v.stimulusColor !== "string" || v.stimulusColor.trim() === "") return false;
  }
  return true;
}

/**
 * Fase B (fiabilidad de datos): construye el `config_used` real de esta
 * ejecucion a partir de `effectiveConfig` (la configuracion capturada por
 * cada ejercicio en Fase A, reenviada hasta actions.ts) en vez de las
 * constantes fijas de siempre.
 *
 * `configVersion: 1` marca EXPLICITAMENTE que este `config_used` es una
 * captura real (la configuracion que de verdad gobernaba esta ejecucion),
 * no una aproximacion - se añade SOLO en esa rama. Si `effectiveConfig`
 * no pasa isValidEffectiveConfig (ausente, no-objeto, array, incompleta,
 * o con valores invalidos - ver esa funcion), se cae en la constante fija
 * de siempre, SIN `configVersion` - no se etiqueta una configuracion fija
 * como si fuera una captura real.
 * `exerciseId` se añade siempre, en ambas ramas, para que la
 * identificacion sea simetrica entre 'reaction-time' y 'simple-reaction'
 * (REACTION_TIME_CONFIG_USED, a diferencia de SIMPLE_REACTION_CONFIG_USED,
 * no lo llevaba hasta ahora).
 */
export function buildConfigUsed(exerciseId: string, effectiveConfig: Record<string, unknown> | undefined) {
  const fallback =
    exerciseId === SIMPLE_REACTION_EXERCISE_ID ? SIMPLE_REACTION_CONFIG_USED :
    exerciseId === CLICK_TARGETS_ACTIVITY_NAME ? CLICK_TARGETS_CONFIG_USED :
    exerciseId === VISUAL_MEMORY_ACTIVITY_NAME ? VISUAL_MEMORY_CONFIG_USED :
    REACTION_TIME_CONFIG_USED;
  if (!isValidEffectiveConfig(exerciseId, effectiveConfig)) {
    return fallback;
  }
  return { ...effectiveConfig, exerciseId, configVersion: 1 };
}
