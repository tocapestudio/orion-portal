"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { archiveLegacyProfile } from "@/lib/legacyProfileSync";

export type AthleteProfessionalStatus = "active" | "inactive" | "ended";

/**
 * Cambia el estado de la relacion profesional-atleta. RLS
 * ("professional gestiona athlete_professional propia") ya limita
 * esto a la fila de ESTE profesional con ese atleta - no afecta a
 * la relacion de otros profesionales con el mismo atleta.
 */
export async function updateAthleteStatus(
  athleteId: string,
  status: AthleteProfessionalStatus
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("athlete_professional")
    .update({ status })
    .eq("athlete_id", athleteId);

  if (error) return { error: error.message };

  revalidatePath("/perfiles");
  revalidatePath(`/perfiles/atleta/${athleteId}`);
  return { error: null };
}

/**
 * "Eliminar atleta" (primera version, borrado logico): NO borra
 * core.athletes ni ningun dato historico - solo marca como 'ended' (junto
 * a ended_at) la relacion de ESTE profesional con el atleta, el mismo
 * valor que ya contemplaba el constraint original de
 * athlete_professional.status desde su creacion (20260924180000_orion_
 * core_schema.sql:203) y cuya semantica quedo documentada despues, al
 * añadir 'inactive', como "relacion terminada formalmente (junto a
 * ended_at)" - distinto de 'inactive' (pausa temporal, NO implica
 * desvinculacion). Por eso aqui se usa 'ended', nunca 'inactive'.
 *
 * El atleta deja de ser visible para este profesional de forma
 * automatica: core.is_professional_of_athlete() (base de toda la RLS de
 * profesional) exige status='active' - en cuanto pasa a 'ended', RLS ya
 * no la devuelve en ningun SELECT de este profesional, sin necesidad de
 * ningun filtro adicional aqui.
 *
 * Se filtra explicitamente por status='active' en el UPDATE (no solo por
 * athlete_id) para tocar unicamente la relacion vigente, nunca una fila
 * historica ya finalizada antes. RLS ("professional gestiona
 * athlete_professional propia", professional_id = auth.uid()) ya impide
 * que esto afecte a la relacion de CUALQUIER otro profesional con este
 * mismo atleta.
 *
 * Tambien archiva (nunca borra) la ficha legacy vinculada en ORION React,
 * si existe - ver el orden exacto de lectura/escritura mas abajo: es
 * imprescindible leer legacy_player_profile_id ANTES de terminar la
 * relacion, no despues.
 */
export async function removeAthleteFromProfessional(
  athleteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  // Se lee legacy_player_profile_id ANTES de tocar athlete_professional,
  // mientras la relacion sigue 'active' y la RLS de core.athletes
  // ("professional lee sus atletas", via core.is_professional_of_athlete,
  // que exige status='active') todavia permite esta lectura. En cuanto
  // la relacion pase a 'ended' mas abajo, este mismo profesional ya NO
  // podria volver a leer este atleta - intentarlo despues (version
  // anterior de esta funcion) hacia que el archivado fallara siempre en
  // silencio. No es un error si no hay ficha legacy (el atleta nunca se
  // sincronizo con React) - se continua igualmente con la desvinculacion.
  const { data: athleteRow, error: athleteError } = await supabase
    .from("athletes")
    .select("legacy_player_profile_id")
    .eq("id", athleteId)
    .maybeSingle();
  const legacyProfileId = athleteRow?.legacy_player_profile_id ?? null;
  if (athleteError) {
    console.error(
      `[removeAthleteFromProfessional] No se pudo leer legacy_player_profile_id del atleta ${athleteId} antes de desvincular:`,
      athleteError
    );
  }

  const { data, error } = await supabase
    .from("athlete_professional")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .select("athlete_id");

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return {
      error: "No se encontró una relación activa con este atleta, o ya no tienes acceso a ella.",
    };
  }

  // La desvinculacion en Core ya se completo correctamente en este punto
  // (arriba) - un fallo al archivar la ficha legacy de ORION React NUNCA
  // debe revertirla ni convertirse en un error para el usuario. Se
  // registra explicitamente (athleteId + legacyProfileId + la causa, sin
  // datos personales) para poder diagnosticarlo y, si hace falta,
  // reintentar mas tarde llamando a archiveLegacyProfile con el mismo
  // legacyProfileId - esa funcion no exige ninguna relacion activa.
  if (legacyProfileId) {
    try {
      const archiveResult = await archiveLegacyProfile(supabase, { legacyProfileId, authUserId: user.id });
      if (archiveResult.status !== "archived" && archiveResult.status !== "already_archived") {
        console.error(
          `[removeAthleteFromProfessional] No se pudo archivar la ficha legacy (athleteId=${athleteId}, legacyProfileId=${legacyProfileId}):`,
          archiveResult
        );
      }
    } catch (archiveException) {
      console.error(
        `[removeAthleteFromProfessional] Excepcion inesperada archivando la ficha legacy (athleteId=${athleteId}, legacyProfileId=${legacyProfileId}):`,
        archiveException
      );
    }
  }

  revalidatePath("/perfiles");
  revalidatePath(`/perfiles/atleta/${athleteId}`);
  return { error: null };
}

export interface LastVisitedProfileResult {
  athleteId: string;
  fullName: string;
  shortId: number;
  profileImage: string | null;
  programLabel: string | null;
}

/**
 * Verifica que el "ultimo perfil visitado" guardado en localStorage siga
 * existiendo y siga siendo accesible para el profesional actual. No hace
 * falta ninguna comprobacion manual de permisos: la RLS de core.athletes
 * ya limita el select a los atletas de este profesional — si no hay
 * acceso (o el atleta se borro), la consulta simplemente no devuelve
 * fila y se trata igual que "ya no existe". Devuelve datos frescos, no
 * los que habia en localStorage, por si el nombre cambio desde la
 * ultima visita.
 */
export async function getLastVisitedProfileIfAccessible(
  athleteId: string
): Promise<LastVisitedProfileResult | null> {
  if (!athleteId) return null;
  const supabase = await createClient();

  const [{ data: athlete }, { data: programRows }, { data: allPrograms }] = await Promise.all([
    supabase
      .from("athletes")
      .select("id, full_name, short_id, profile_image")
      .eq("id", athleteId)
      .maybeSingle(),
    supabase.from("athlete_programs").select("program_id").eq("athlete_id", athleteId),
    supabase.from("programs").select("id, label"),
  ]);

  if (!athlete) return null;

  const programIds = (programRows ?? []).map((r) => r.program_id);
  const labelById = new Map((allPrograms ?? []).map((p) => [p.id, p.label]));
  const programLabel = programIds.length > 0 ? (labelById.get(programIds[0]) ?? null) : null;

  return {
    athleteId: athlete.id,
    fullName: athlete.full_name,
    shortId: athlete.short_id,
    profileImage: athlete.profile_image,
    programLabel,
  };
}
