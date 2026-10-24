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

/**
 * 4o incremento (configuracion predeterminada del Generador de
 * estimulos) - usa DIRECTAMENTE la tabla core.tool_presets via el
 * cliente de Supabase (sin RPC): esa tabla ya existia desde la migracion
 * 20261022090000 (pensada exactamente para esto, ver su comentario
 * "incremento futuro" en StimulusGeneratorClient.tsx) pero NINGUN codigo
 * la usaba todavia - no hizo falta ninguna migracion/tabla nueva para
 * este incremento. Confirmado por auditoria antes de escribir esto: sus
 * 2 politicas RLS (`for all using/with check (professional_id =
 * auth.uid())`, mas la de admin) ya permiten acceso directo desde un
 * cliente autenticado normal - no exigen SECURITY DEFINER ni ningun
 * envoltorio RPC.
 *
 * Semantica deliberadamente simple ("LA configuracion predeterminada",
 * no "varias plantillas con nombre" - aunque la tabla admite nombres):
 * una unica fila por profesional+tool_type, con `name` fijo a
 * STIMULUS_PRESET_NAME, nunca expuesto en la UI. Guardar = actualizar esa
 * fila si ya existe, insertarla si no - sin `upsert()` con `onConflict`
 * porque la tabla no tiene una restriccion UNIQUE sobre
 * (professional_id, tool_type, name) y añadirsela seria una migracion,
 * fuera de alcance de este incremento. La ventana de carrera entre el
 * SELECT y el INSERT (dos guardados casi simultaneos del MISMO
 * profesional pulsando el mismo boton dos veces) en el peor caso crearia
 * una fila duplicada inofensiva, nunca un dato incorrecto - y la lectura
 * siempre coge la mas reciente (`order by updated_at desc limit 1`), que
 * la neutraliza igualmente.
 */

const STIMULUS_PRESET_TOOL_TYPE = "stimulus_generator";
const STIMULUS_PRESET_NAME = "default";

export interface SaveStimulusPresetResult {
  error: string | null;
}

export async function saveStimulusGeneratorDefaultConfig(config: Record<string, unknown>): Promise<SaveStimulusPresetResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { data: existing, error: selectError } = await supabase
    .from("tool_presets")
    .select("id")
    .eq("professional_id", user.id)
    .eq("tool_type", STIMULUS_PRESET_TOOL_TYPE)
    .eq("name", STIMULUS_PRESET_NAME)
    .limit(1)
    .maybeSingle();
  if (selectError) return { error: selectError.message };

  if (existing) {
    const { error } = await supabase
      .from("tool_presets")
      .update({ config: config as unknown as Json, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { error: error ? error.message : null };
  }

  const { error } = await supabase.from("tool_presets").insert({
    professional_id: user.id,
    tool_type: STIMULUS_PRESET_TOOL_TYPE,
    name: STIMULUS_PRESET_NAME,
    config: config as unknown as Json,
  });
  return { error: error ? error.message : null };
}

export interface GetStimulusPresetResult {
  config: Json | null;
  error: string | null;
}

export async function getStimulusGeneratorDefaultConfig(): Promise<GetStimulusPresetResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sin sesion valida: simplemente no hay configuracion predeterminada
  // que ofrecer - no es un error, el llamador cae a su propio valor por
  // defecto (ver loadStoredConfig/DEFAULT_STIMULUS_CONFIG).
  if (!user) return { config: null, error: null };

  const { data, error } = await supabase
    .from("tool_presets")
    .select("config")
    .eq("professional_id", user.id)
    .eq("tool_type", STIMULUS_PRESET_TOOL_TYPE)
    .eq("name", STIMULUS_PRESET_NAME)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { config: null, error: error.message };
  return { config: data?.config ?? null, error: null };
}
