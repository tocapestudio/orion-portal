"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isReactionTimeMetrics,
  type ReactionTimeMetrics,
  isSimpleReactionMetrics,
  type SimpleReactionMetrics,
  isClickTargetMetrics,
  isVisualMemoryMetrics,
} from "@/components/orionPlay/types";
// ClickTargetMetrics/VisualMemoryMetrics de orionPlayV2 (no de
// @/components/orionPlay/types, de donde ya vienen sus propios
// isClickTargetMetrics/isVisualMemoryMetrics de arriba): ese modulo V1
// todavia no incluye los campos aditivos hits/accuracyPercent/
// roundsCompleted que orionPlayV2/lib/types.ts si tiene (ver
// ClickTargetsExercise.tsx/VisualMemoryExercise.tsx) - se usa el tipo
// completo de aqui para el mapeo a core.results, sin tocar el modulo V1
// compartido. Los guard de V1 solo comprueban el subconjunto de 4 campos
// comun a ambas versiones, compatible con el objeto real mas completo.
import type { ClickTargetMetrics, VisualMemoryMetrics } from "@/components/orionPlayV2/lib/types";
import {
  REACTION_TIME_ACTIVITY_NAME,
  SIMPLE_REACTION_EXERCISE_ID,
  CLICK_TARGETS_ACTIVITY_NAME,
  VISUAL_MEMORY_ACTIVITY_NAME,
  buildConfigUsed,
} from "./effectiveConfig";
import {
  buildReactionTimeResultRow,
  buildSimpleReactionResultRow,
  buildClickTargetsResultRow,
  buildVisualMemoryResultRow,
  isValidTargetLog,
  isValidRoundLog,
  type ClickTargetRecordForPersistence,
  type VisualMemoryRoundRecordForPersistence,
} from "./resultRowMapping";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface PlayAttemptResult {
  error: string | null;
}

/** 'completed': finalizacion normal. 'interrupted': el usuario detuvo el
 * ejercicio antes de tiempo (ver StoppedScreen en ReactionTimeExercise.tsx) -
 * se refleja en sessions.status='cancelled' (unico valor existente del
 * CHECK de Core que tiene sentido para una ejecucion abandonada;
 * 'in_progress'/'completed' no aplican) y session_activities.status=
 * 'interrupted' (esa columna no tiene CHECK en Core, acepta texto libre -
 * confirmado contra la base real, no solo las migraciones). Ninguno de
 * los dos requiere una migracion. */
export type PlayAttemptOutcome = "completed" | "interrupted";

const PLAY_MODALITY_ID = "play";

/**
 * Resuelve (NUNCA crea) la fila de activity_catalog de Reaction Time.
 * RLS de core.activity_catalog solo permite INSERT a un profesional
 * cuando modality_id='manual' ("professional crea actividades
 * manuales") — cualquier otro modality_id (incluido 'play') solo lo
 * puede insertar un admin. Por eso esta funcion nunca intenta un
 * insert: si la fila no existe, es un problema de catalogo a resolver
 * por un administrador, no algo que esta Server Action deba (ni pueda)
 * arreglar sola.
 *
 * DEUDA TECNICA (Solo GO): esta funcion tambien se reutiliza para
 * exerciseId==='simple-reaction' (ver submitPlayAttempt mas abajo) -
 * Solo GO NO tiene su propia fila en core.activity_catalog (no se crea
 * automaticamente, restriccion explicita de esta fase) y provisionalmente
 * comparte el activity_catalog_id de 'reaction-time'. Esto significa que
 * session_activities.activity_catalog_id es IDENTICO para ejecuciones de
 * Go/No Go y de Solo GO - NO sirve por si solo para distinguirlas. La
 * distincion real vive en otro sitio, sin tocar esquema: el campo
 * `exerciseId` que se añade a session_activities.config_used y a
 * results.metrics (ver SIMPLE_REACTION_CONFIG_USED y
 * buildSimpleReactionResultRow mas abajo), y la propia FORMA de
 * results.metrics (SimpleReactionMetrics no tiene correctResponses/
 * falseAlarms/misses; ReactionTimeMetrics no tiene validTrials/omissions/
 * falseStarts - las formas no se solapan). Si en el futuro se crea una
 * fila de catalogo propia para 'simple-reaction' (accion manual de un
 * administrador, fuera de esta Server Action), esta funcion deberia
 * dejar de reutilizarse para Solo GO y resolverse por su propio `name`.
 */
async function resolveReactionTimeActivityId(
  supabase: SupabaseServerClient
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("activity_catalog")
    .select("id")
    .eq("modality_id", PLAY_MODALITY_ID)
    .eq("name", REACTION_TIME_ACTIVITY_NAME)
    .maybeSingle();

  if (error) return { id: null, error: error.message };
  if (!data) {
    return {
      id: null,
      error:
        "No existe la actividad 'reaction-time' en el catálogo de ORION Play. Debe crearla un administrador antes de poder guardar resultados.",
    };
  }
  return { id: data.id, error: null };
}

/**
 * Version generica de resolveReactionTimeActivityId, para actividades que
 * SI tienen su propia fila de catalogo (Click Targets, Visual Memory
 * Precision) - a diferencia de Solo GO, no reutilizan el
 * activity_catalog_id de ninguna otra actividad. Mismo patron exacto
 * (RLS de activity_catalog solo permite INSERT a un profesional cuando
 * modality_id='manual'; para 'play' solo un admin - por eso esta funcion
 * tampoco intenta nunca un insert).
 *
 * Deliberadamente NO se reescribe resolveReactionTimeActivityId para
 * llamar a esta funcion (evitar tocar el camino ya validado de Go/No Go/
 * Solo GO) - hay una pequeña duplicacion a proposito, no es un olvido.
 */
async function resolveActivityIdByName(
  supabase: SupabaseServerClient,
  activityName: string
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("activity_catalog")
    .select("id")
    .eq("modality_id", PLAY_MODALITY_ID)
    .eq("name", activityName)
    .maybeSingle();

  if (error) return { id: null, error: error.message };
  if (!data) {
    return {
      id: null,
      error: `No existe la actividad '${activityName}' en el catálogo de ORION Play. Debe crearla un administrador antes de poder guardar resultados.`,
    };
  }
  return { id: data.id, error: null };
}

/**
 * Sustituye a apiClient.submitExerciseAttempt(...) de ORION Play. Crea
 * una ejecucion real en core.sessions/session_activities/results.
 *
 * Identidad: el usuario autenticado es el PROFESIONAL que opera el
 * Portal (professional_id = auth.uid()), nunca el cliente decide ese
 * valor. El atleta al que pertenece el resultado es athleteId,
 * explicito y distinto del usuario autenticado — asi funciona ya el
 * resto de Server Actions del Portal (createGoal, createAssignment...).
 *
 * Autorizacion profesional->atleta: NO se añade ninguna comprobacion
 * nueva. Se reutiliza exactamente la misma RLS que ya protege
 * sessions/session_activities/results ("professional inserta sessions
 * de sus atletas" -> is_professional_of_athlete(athlete_id)): si el
 * profesional autenticado no esta vinculado a este atleta, el INSERT de
 * sessions falla aqui mismo con un error de permisos.
 *
 * nature='performance' en session_activities (NOT NULL) separa esto por
 * construccion de evaluations/evaluation_results (clinico) — nunca se
 * toca esa cadena.
 *
 * Idempotencia (`idempotencyKey`, opcional): una clave generada UNA VEZ
 * por ejecucion en el cliente (ReactionTimeExercise.tsx), reenviada tal
 * cual en cada reintento de la MISMA ejecucion (fallo de red, un segundo
 * intento tras un error ya mostrado). El indice unico (device_id,
 * idempotency_key) que ya existe en Core no protege esta via: aqui
 * device_id siempre es null (escritura de profesional, no de
 * dispositivo), y Postgres no considera iguales dos NULL en un indice
 * unico.
 *
 * IMPORTANTE - esto NO es una garantia de exclusion mutua: es una
 * comprobacion de aplicacion (SELECT, luego INSERT solo de lo que falte),
 * en dos pasos separados, sin transaccion ni bloqueo que los una. Si dos
 * solicitudes con la MISMA idempotencyKey llegaran de verdad en paralelo
 * (p.ej. dos pestañas sobre la misma ejecucion - no el reintento normal
 * de un solo usuario, que es secuencial), ambas podrian leer "no existe
 * todavia" antes de que la otra termine de insertar, y crear filas
 * duplicadas. Cerrar esa ventana de verdad exigiria una constraint unica
 * nueva o un bloqueo a nivel de base de datos - fuera de alcance de este
 * cambio (no se toca el esquema). La proteccion real contra el caso
 * comun (un usuario reintentando tras ver un error) es esta comprobacion
 * MAS la guarda de un solo envio en vuelo de ExerciseExitButton.tsx.
 *
 * Recuperacion de una escritura parcial (reintento que encuentra un
 * intento anterior incompleto): en vez de asumir que la existencia de
 * `sessions` significa "ya guardado completo" (eso permitia que, si
 * session_activities o results fallaban antes, un reintento reportara
 * exito sin haber guardado nunca la actividad/el resultado), se
 * comprueba el estado REAL de cada eslabon de la cadena
 * (sessions -> session_activities -> results) y se inserta UNICAMENTE lo
 * que falte. Nunca se borra ni se repite una fila que ya existe: si
 * `sessions` ya existe, se reutiliza su id; si `session_activities` ya
 * existe, se reutiliza el suyo; solo se considera "ya guardado" (exito
 * sin insertar nada) cuando los 3 eslabones existen de verdad.
 *
 * Antes de reutilizar una `sessions` existente se comprueba que su
 * `status` coincida con el que le correspondería al `outcome` de ESTA
 * llamada - si no coincide, se rechaza con un error explícito en vez de
 * continuar (ver el bloque de abajo). No debería dispararse nunca con el
 * unico llamador real de hoy (el outcome de una ejecucion no cambia
 * retroactivamente para la misma idempotencyKey), es una defensa contra
 * un futuro llamador que lo hiciera mal, no una situacion esperada.
 *
 * Solo GO (exerciseId==='simple-reaction', añadido en esta fase): mismo
 * flujo de principio a fin (identidad, autorizacion via RLS, idempotencia,
 * recuperacion de escritura parcial) sin ninguna diferencia - solo
 * cambian el validador de metricas, config_used y el mapeo a
 * core.results (ver las ramas por exerciseId mas abajo). DEUDA TECNICA
 * documentada junto a resolveReactionTimeActivityId: Solo GO no tiene
 * fila propia en core.activity_catalog (no se crea automaticamente) y
 * reutiliza provisionalmente la de 'reaction-time' - la distincion real
 * entre ambos ejercicios vive en session_activities.config_used y en la
 * FORMA/el campo `exerciseId` de results.metrics, nunca en
 * activity_catalog_id.
 */
export async function submitPlayAttempt(
  athleteId: string,
  exerciseId: string,
  metrics: Record<string, unknown>,
  options?: {
    outcome?: PlayAttemptOutcome
    idempotencyKey?: string
    /** Fase B (fiabilidad de datos) - configuracion REAL capturada por
     * cada ejercicio (effectiveConfigRef, Fase A), opaca para esta
     * funcion: no se valida su forma interna (no es un tipo con
     * validador propio como `metrics`, es descriptiva, no de
     * autorizacion), solo se comprueba que sea un objeto antes de
     * confiar en ella - ver buildConfigUsed mas abajo. Opcional: si esta
     * ausente, config_used sigue cayendo en las constantes fijas de
     * siempre (ver REACTION_TIME_CONFIG_USED/SIMPLE_REACTION_CONFIG_USED),
     * sin ningun cambio de comportamiento para un llamador que todavia no
     * la envie. */
    effectiveConfig?: Record<string, unknown>
  }
): Promise<PlayAttemptResult> {
  if (
    exerciseId !== "reaction-time" &&
    exerciseId !== SIMPLE_REACTION_EXERCISE_ID &&
    exerciseId !== CLICK_TARGETS_ACTIVITY_NAME &&
    exerciseId !== VISUAL_MEMORY_ACTIVITY_NAME
  ) {
    return { error: `Ejercicio "${exerciseId}" todavía no está conectado a ORION Core.` };
  }
  if (exerciseId === "reaction-time" && !isReactionTimeMetrics(metrics)) {
    return { error: "Las métricas recibidas no tienen el formato esperado de Reaction Time." };
  }
  if (exerciseId === SIMPLE_REACTION_EXERCISE_ID && !isSimpleReactionMetrics(metrics)) {
    return { error: "Las métricas recibidas no tienen el formato esperado de Tiempo de reacción." };
  }
  if (exerciseId === CLICK_TARGETS_ACTIVITY_NAME && !isClickTargetMetrics(metrics)) {
    return { error: "Las métricas recibidas no tienen el formato esperado de Click Targets." };
  }
  if (exerciseId === VISUAL_MEMORY_ACTIVITY_NAME && !isVisualMemoryMetrics(metrics)) {
    return { error: "Las métricas recibidas no tienen el formato esperado de Visual Memory Precision." };
  }
  // Fiabilidad de datos: targetLog/roundLog son propiedades de transporte
  // (ver resultRowMapping.ts) que isClickTargetMetrics/isVisualMemoryMetrics
  // NUNCA miran - sin esta comprobacion, un log malformado solo se detectaba
  // dentro de buildClickTargetsResultRow/buildVisualMemoryResultRow, YA
  // DESPUES de haber insertado sessions/session_activities (ver mas abajo).
  // Se valida aqui, ANTES de createClient()/cualquier escritura, para que un
  // log invalido nunca llegue a crear ninguna fila huerfana - exactamente
  // el mismo resultado (`isValidTargetLog`/`isValidRoundLog` de
  // resultRowMapping.ts, reutilizados tal cual, sin duplicar la regla) que
  // usan los builders mas abajo, solo que AQUI se rechaza antes de tiempo.
  if (
    exerciseId === CLICK_TARGETS_ACTIVITY_NAME &&
    metrics.targetLog !== undefined &&
    !isValidTargetLog(metrics.targetLog)
  ) {
    return { error: "El registro detallado de intentos (targetLog) no tiene el formato esperado." };
  }
  if (
    exerciseId === VISUAL_MEMORY_ACTIVITY_NAME &&
    metrics.roundLog !== undefined &&
    !isValidRoundLog(metrics.roundLog)
  ) {
    return { error: "El registro detallado de rondas (roundLog) no tiene el formato esperado." };
  }
  if (!athleteId) {
    return { error: "Falta el atleta para el que se ejecuta el ejercicio." };
  }

  const outcome: PlayAttemptOutcome = options?.outcome ?? "completed";
  const idempotencyKey = options?.idempotencyKey || null;
  const effectiveConfig = options?.effectiveConfig;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const now = new Date().toISOString();
  const sessionStatus = outcome === "interrupted" ? "cancelled" : "completed";
  const sessionActivityStatus = outcome === "interrupted" ? "interrupted" : "completed";

  // sessionId/sessionActivityId quedan en null mientras no se sepa que ya
  // existen (primer intento) o se rellenan con los de un intento anterior
  // incompleto (reintento) - en ningun caso se vuelve a crear una fila
  // cuyo id ya se conoce aqui.
  let sessionId: string | null = null;
  let sessionActivityId: string | null = null;

  if (idempotencyKey) {
    const { data: existingSession, error: existingSessionError } = await supabase
      .from("sessions")
      .select("id, status")
      .eq("athlete_id", athleteId)
      .eq("professional_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingSessionError) return { error: existingSessionError.message };

    if (existingSession) {
      // Defensa adicional: el unico llamador real de hoy
      // (ReactionTimeExercise.tsx) siempre reenvia el mismo `outcome`
      // para la misma idempotencyKey en cualquier reintento (el outcome
      // se decide una vez, al pulsar "Detener" o al llegar a
      // resultados, y no puede cambiar retroactivamente para esa misma
      // ejecucion - ver handleExit/handleStopEarly). Si alguna vez
      // llegara un outcome distinto del que ya quedo grabado para esta
      // clave, no se asume cual de los dos es el correcto: se rechaza
      // explicitamente en vez de crear session_activities con un status
      // inconsistente con el de su sessions ya existente. No se inserta
      // ni se modifica nada en este caso.
      if (existingSession.status !== sessionStatus) {
        return {
          error:
            "El estado de la sesión existente no coincide con el de este intento (posible conflicto de reintento). No se ha guardado nada nuevo.",
        };
      }

      sessionId = existingSession.id;

      const { data: existingActivity, error: existingActivityError } = await supabase
        .from("session_activities")
        .select("id")
        .eq("session_id", sessionId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existingActivityError) return { error: existingActivityError.message };

      if (existingActivity) {
        sessionActivityId = existingActivity.id;

        const { data: existingResults, error: existingResultsError } = await supabase
          .from("results")
          .select("id")
          .eq("session_activity_id", sessionActivityId)
          .limit(1);
        if (existingResultsError) return { error: existingResultsError.message };

        if (existingResults && existingResults.length > 0) {
          // Los 3 eslabones existen: ya se guardo correctamente en un
          // envio anterior de esta misma ejecucion. Exito idempotente,
          // no se inserta nada de nuevo.
          return { error: null };
        }
        // sessions + session_activities existen, results no: un intento
        // anterior se quedo a medias justo antes del ultimo paso. Se
        // completa mas abajo SOLO el resultado, sin tocar los dos que ya
        // existen.
      }
      // sessions existe, session_activities no: el intento anterior se
      // quedo a medias en el primer paso. Se completa mas abajo desde el
      // segundo eslabon, sin volver a crear sessions.
    }
  }

  if (!sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        athlete_id: athleteId,
        professional_id: user.id,
        initiated_by: "professional",
        started_at: now,
        ended_at: now,
        status: sessionStatus,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      return { error: `No se pudo crear la sesión: ${sessionError?.message ?? ""}` };
    }
    sessionId = session.id;
  }

  if (!sessionActivityId) {
    // Click Targets/Visual Memory resuelven su propia fila de catalogo,
    // por nombre, con resolveActivityIdByName - NUNCA la de reaction-time
    // (a diferencia de Solo GO, que si la reutiliza - ver DEUDA TECNICA
    // arriba). Go/No Go y Solo GO siguen exactamente igual que antes.
    const { id: activityId, error: activityError } =
      exerciseId === CLICK_TARGETS_ACTIVITY_NAME
        ? await resolveActivityIdByName(supabase, CLICK_TARGETS_ACTIVITY_NAME)
        : exerciseId === VISUAL_MEMORY_ACTIVITY_NAME
        ? await resolveActivityIdByName(supabase, VISUAL_MEMORY_ACTIVITY_NAME)
        : await resolveReactionTimeActivityId(supabase);
    if (activityError || !activityId) {
      return { error: activityError ?? "No se pudo resolver la actividad de catálogo." };
    }

    // Bug real de RLS encontrado y reproducido (BEGIN/ROLLBACK, sin
    // escribir en produccion): la policy SELECT "professional lee
    // session_activities de sus atletas" usa
    // core.athlete_id_of_session_activity(id), que vuelve a consultar
    // session_activities POR SU PROPIO id para resolver session_id ->
    // athlete_id. Esa auto-consulta no resuelve la fila que se esta
    // insertando EN ESE MISMO INSERT, asi que is_professional_of_athlete
    // recibe NULL y la comprobacion de visibilidad que Postgres aplica
    // automaticamente a un INSERT ... RETURNING falla - no el INSERT en
    // si (su WITH CHECK se cumple, verificado por separado), sino la
    // devolucion de la fila. Por eso `.select("id").single()` (que pide
    // RETURNING) fallaba con "violates row-level security policy" pese a
    // que el INSERT era valido; sin RETURNING, el mismo INSERT funciona
    // (tambien verificado). La correccion real de fondo esta en esa
    // policy/funcion SQL (fuera de alcance aqui, no se toca RLS): el
    // rodeo valido desde la aplicacion es generar el id en el cliente y
    // no pedir RETURNING en absoluto.
    sessionActivityId = randomUUID();

    const { error: sessionActivityError } = await supabase
      .from("session_activities")
      .insert({
        id: sessionActivityId,
        session_id: sessionId,
        activity_catalog_id: activityId,
        nature: "performance",
        order_index: 0,
        status: sessionActivityStatus,
        // Fase B: config_used real (buildConfigUsed), con fallback a las
        // constantes fijas de siempre si effectiveConfig no llega o no es
        // un objeto - ver esa funcion para el detalle completo. Este
        // insert solo ocurre cuando !sessionActivityId (primer intento
        // real), nunca al reutilizar una fila existente por idempotencia.
        config_used: buildConfigUsed(exerciseId, effectiveConfig),
        idempotency_key: idempotencyKey,
      });

    if (sessionActivityError) {
      return { error: `No se pudo crear la actividad de la sesión: ${sessionActivityError.message}` };
    }
  }

  // Mismo razonamiento que config_used arriba: para 'reaction-time' se
  // llama exactamente a la misma funcion de siempre, sin cambios. Rama
  // separada (en vez de un unico `insert` con un resultRow de tipo union)
  // a proposito: el tipo generado de Supabase para "results" no infiere
  // bien una union de dos formas de `metrics` distintas a traves de un
  // ternario - cada rama llama a `.insert()` con un tipo concreto propio.
  if (exerciseId === SIMPLE_REACTION_EXERCISE_ID) {
    const resultRow = buildSimpleReactionResultRow(sessionActivityId, metrics as unknown as SimpleReactionMetrics, user.id);
    const { error: resultError } = await supabase.from("results").insert(resultRow);
    if (resultError) {
      return { error: `No se pudo guardar el resultado: ${resultError.message}` };
    }
  } else if (exerciseId === CLICK_TARGETS_ACTIVITY_NAME) {
    // targetLog ya se valido mas arriba (antes de cualquier escritura), asi
    // que este builder no deberia lanzar en el camino normal - el try/catch
    // es una red de seguridad adicional (no la unica barrera) para que
    // CUALQUIER excepcion inesperada de este builder se convierta en un
    // {error} controlado en vez de propagarse sin tratar desde una Server
    // Action, que es justo lo que esta funcion nunca ha hecho en ningun
    // otro camino (ver PlayAttemptResult).
    let resultRow;
    try {
      resultRow = buildClickTargetsResultRow(
        sessionActivityId,
        metrics as unknown as ClickTargetMetrics & { hits: number; accuracyPercent: number; targetLog?: ClickTargetRecordForPersistence[] },
        user.id
      );
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo construir el resultado de Click Targets." };
    }
    const { error: resultError } = await supabase.from("results").insert(resultRow);
    if (resultError) {
      return { error: `No se pudo guardar el resultado: ${resultError.message}` };
    }
  } else if (exerciseId === VISUAL_MEMORY_ACTIVITY_NAME) {
    // Mismo motivo exacto que la rama de Click Targets de arriba.
    let resultRow;
    try {
      resultRow = buildVisualMemoryResultRow(
        sessionActivityId,
        metrics as unknown as VisualMemoryMetrics & { roundsCompleted: number; roundLog?: VisualMemoryRoundRecordForPersistence[] },
        user.id
      );
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo construir el resultado de Visual Memory Precision." };
    }
    const { error: resultError } = await supabase.from("results").insert(resultRow);
    if (resultError) {
      return { error: `No se pudo guardar el resultado: ${resultError.message}` };
    }
  } else {
    const resultRow = buildReactionTimeResultRow(sessionActivityId, metrics as unknown as ReactionTimeMetrics, user.id);
    const { error: resultError } = await supabase.from("results").insert(resultRow);
    if (resultError) {
      return { error: `No se pudo guardar el resultado: ${resultError.message}` };
    }
  }

  revalidatePath(`/visual-lab/play/${exerciseId}/${athleteId}`);
  return { error: null };
}
