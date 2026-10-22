"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

/**
 * Server Action de ORION Tools: una unica funcion fina que llama al RPC
 * core.create_tool_activity (ver migracion 20261022090000) - a
 * diferencia de submitPlayAttempt (Play), toda la validacion pesada
 * (autorizacion vigente con bloqueo, conteo de participantes por modo,
 * forma de cada participante, atomicidad cabecera+participantes) ya vive
 * en el propio RPC de Postgres, asi que esta Server Action no duplica
 * nada de eso - solo resuelve la identidad del profesional via
 * createClient()+auth.getUser() (igual que el resto de Server Actions
 * del Portal) y da forma al payload que espera el RPC.
 *
 * Alcance de este primer incremento: solo modo 'individual' (exactamente
 * 1 participante) se ejerce desde la UI hoy - la firma ya admite varios
 * participantes (acepta el mismo contrato que el RPC) para no tener que
 * cambiarla cuando se implemente el modo compartido mas adelante.
 */

export interface ToolActivityParticipantInput {
  athleteId: string;
  /** null si el profesional no escribio ninguna observacion para esta
   * persona - nunca una cadena vacia (ver normalizeObservation). */
  individualObservation: string | null;
}

export interface CreateToolActivityResult {
  error: string | null;
  activityId?: string;
}

function normalizeObservation(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createToolActivity(
  toolType: "stimulus_generator" | "optotypes",
  mode: "individual" | "shared",
  configUsed: Record<string, unknown>,
  groupObservation: string | null,
  participants: ToolActivityParticipantInput[]
): Promise<CreateToolActivityResult> {
  // Comprobaciones minimas de forma ANTES de llegar al RPC - el RPC ya
  // las repite (es la autoridad real), esto solo evita un viaje de red
  // para un caso trivialmente invalido.
  if (!Array.isArray(participants) || participants.length === 0) {
    return { error: "Falta seleccionar al menos una persona." };
  }
  if (mode === "individual" && participants.length !== 1) {
    return { error: "El modo individual requiere exactamente 1 persona." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  // Los dos casts de abajo son de tipo, no de comportamiento: el RPC
  // real (ver migracion 20261022090000) acepta p_group_observation NULL
  // en tiempo de ejecucion (parametro `text` sin NOT NULL) y
  // p_config_used es jsonb generico - el generador de tipos de Supabase
  // no refleja la nulabilidad real de los parametros de una funcion (a
  // diferencia de las columnas de una tabla) ni conoce la forma exacta
  // de un jsonb de entrada, asi que exige `string`/`Json` estricto donde
  // el esquema real es mas permisivo. No se modifica ningun tipo
  // generado para "arreglar" esto - es un cast local, acotado a esta
  // unica llamada.
  const { data, error } = await supabase.rpc("create_tool_activity", {
    p_tool_type: toolType,
    p_mode: mode,
    p_config_used: configUsed as unknown as Json,
    p_group_observation: normalizeObservation(groupObservation) as string,
    p_participants: participants.map((p) => ({
      athlete_id: p.athleteId,
      individual_observation: normalizeObservation(p.individualObservation),
    })),
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null, activityId: data as string };
}
