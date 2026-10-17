"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface GeneralFormState {
  error: string | null;
  success: boolean;
}

export async function updateAthleteGeneral(
  _prev: GeneralFormState,
  formData: FormData
): Promise<GeneralFormState> {
  const supabase = await createClient();

  const athleteId = String(formData.get("athlete_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "") || null;
  const gender = String(formData.get("gender") ?? "") || null;
  const dominantHand = String(formData.get("dominant_hand") ?? "") || null;
  const dominantFoot = String(formData.get("dominant_foot") ?? "") || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  // Checkboxes de programa (name="programs", multiple) - mismo nombre de
  // campo/formato que ya usa el formulario de creacion de atleta
  // (perfiles/nuevo/actions.ts, formData.getAll("programs")): el modelo
  // real (core.athlete_programs) es muchos-a-muchos, nunca un unico
  // programa por atleta, asi que esto es una seleccion multiple, no un
  // <select> de una sola opcion.
  const programIds = formData.getAll("programs").map(String);

  if (!athleteId || !fullName) {
    return { error: "El nombre es obligatorio.", success: false };
  }

  const { error } = await supabase
    .from("athletes")
    .update({
      full_name: fullName,
      birth_date: birthDate,
      gender,
      dominant_hand: dominantHand,
      dominant_foot: dominantFoot,
      email,
      phone,
      notes,
    })
    .eq("id", athleteId);

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  // Sincroniza core.athlete_programs con la seleccion actual: borra TODAS
  // las filas de este atleta y vuelve a insertar solo las marcadas -
  // mismo criterio de "reemplazar por completo" que updateAthleteClub usa
  // para athlete_club (cerrar la anterior, abrir la nueva), adaptado aqui
  // a una relacion sin estado activo/historico (athlete_programs no tiene
  // columna status, a diferencia de athlete_club/athlete_team) - no hay
  // nada que "cerrar", solo sustituir el conjunto de filas. Mismo patron
  // de escritura ya usado (y probado) en perfiles/nuevo/actions.ts al
  // crear un atleta nuevo (createAthlete) - RLS para DELETE no se ha
  // vuelto a verificar de forma independiente en esta tarea, se infiere
  // del mismo modelo "professional gestiona sus propios atletas" ya usado
  // en el resto de tablas relacionadas con el atleta (athlete_professional,
  // athlete_club, athlete_team).
  const { error: deleteError } = await supabase
    .from("athlete_programs")
    .delete()
    .eq("athlete_id", athleteId);
  if (deleteError) {
    return {
      error: `Se guardaron los datos, pero no se pudo actualizar el programa: ${deleteError.message}`,
      success: false,
    };
  }

  if (programIds.length > 0) {
    const { error: insertError } = await supabase
      .from("athlete_programs")
      .insert(programIds.map((program_id) => ({ athlete_id: athleteId, program_id })));
    if (insertError) {
      return {
        error: `Se guardaron los datos, pero no se pudo actualizar el programa: ${insertError.message}`,
        success: false,
      };
    }
  }

  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  revalidatePath(`/perfiles/atleta/${athleteId}`);
  revalidatePath("/perfiles");
  return { error: null, success: true };
}

export interface ClubFormState {
  error: string | null;
  success: boolean;
}

/**
 * Cambia el club del atleta cerrando la membresia activa anterior
 * (status='ended', ended_at=now) y abriendo una nueva en
 * core.athlete_club, en vez de sobrescribir la fila — conserva el
 * historial de clubes igual que ya se hace con athlete_professional.
 */
export async function updateAthleteClub(
  _prev: ClubFormState,
  formData: FormData
): Promise<ClubFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  const clubId = String(formData.get("club_id") ?? "") || null;

  if (!athleteId) return { error: "Falta el atleta.", success: false };

  const { data: current } = await supabase
    .from("athlete_club")
    .select("id, club_id")
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();

  if (current?.club_id === clubId) {
    return { error: null, success: true };
  }

  if (current) {
    const { error: closeError } = await supabase
      .from("athlete_club")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", current.id);
    if (closeError) return { error: `No se pudo actualizar: ${closeError.message}`, success: false };
  }

  if (clubId) {
    const { error: insertError } = await supabase.from("athlete_club").insert({
      athlete_id: athleteId,
      club_id: clubId,
      status: "active",
      started_at: new Date().toISOString(),
    });
    if (insertError) return { error: `No se pudo asignar el club: ${insertError.message}`, success: false };
  }

  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

export interface WorkProfileFormState {
  error: string | null;
  success: boolean;
}

/**
 * Crea/actualiza core.athlete_work_profile (1:1 con athletes via PK
 * compartida). RLS es la unica proteccion real: solo admin o el
 * profesional vinculado al atleta tienen policy de escritura — si esta
 * accion la llama cualquier otro rol (ej. el propio atleta), el upsert
 * simplemente falla aqui abajo, no antes.
 */
export async function saveWorkProfile(
  _prev: WorkProfileFormState,
  formData: FormData
): Promise<WorkProfileFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return { error: "Falta el atleta.", success: false };

  const occupation = String(formData.get("occupation") ?? "").trim() || null;
  const workplace = String(formData.get("workplace") ?? "").trim() || null;
  const workHours = String(formData.get("work_hours") ?? "").trim() || null;
  const workShiftType = String(formData.get("work_shift_type") ?? "").trim() || null;
  const visualNeeds = String(formData.get("visual_needs") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("athlete_work_profile").upsert(
    {
      athlete_id: athleteId,
      occupation,
      workplace,
      work_hours: workHours,
      work_shift_type: workShiftType,
      visual_needs: visualNeeds,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id" }
  );

  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  revalidatePath("/perfiles");
  revalidatePath("/perfiles/avanza");
  return { error: null, success: true };
}

export interface CategoryFormState {
  error: string | null;
  success: boolean;
}

/**
 * Guarda categoria/posicion/dorsal del atleta en KERATOS. "Equipo" no es
 * un concepto que el profesional vea ni gestione: core.teams se sigue
 * usando por debajo sin cambios (es donde athlete_team.team_id guarda la
 * relacion, y team.category ya existia sin usar en la UI) — se busca o
 * crea automaticamente por (club, deporte del club, categoria); el
 * deporte se obtiene de core.club_sports y nunca se pide aqui. Igual que
 * con el club, cambiar de categoria cierra la membresia anterior en
 * athlete_team (status='ended') y abre una nueva; si la categoria no
 * cambia, solo se actualizan posicion/dorsal sobre la fila activa.
 */
export async function updateAthleteCategory(
  _prev: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  const supabase = await createClient();
  const athleteId = String(formData.get("athlete_id") ?? "");
  const clubId = String(formData.get("club_id") ?? "") || null;
  const category = String(formData.get("category") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim() || null;
  const dorsalRaw = String(formData.get("dorsal") ?? "").trim();
  const dorsal = dorsalRaw ? Number(dorsalRaw) : null;

  if (!athleteId) return { error: "Falta el atleta.", success: false };
  if (!clubId) return { error: "Asigna primero un club.", success: false };
  if (!category) return { error: "Indica la categoría.", success: false };

  const { data: clubSport } = await supabase
    .from("club_sports")
    .select("sport_id")
    .eq("club_id", clubId)
    .limit(1)
    .maybeSingle();

  if (!clubSport) {
    return {
      error: "Este club no tiene un deporte asignado todavía — asígnalo primero en Clubes.",
      success: false,
    };
  }

  const { data: existingTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("club_id", clubId)
    .eq("sport_id", clubSport.sport_id)
    .eq("category", category)
    .maybeSingle();

  let teamId = existingTeam?.id ?? null;

  if (!teamId) {
    const { data: created, error: createError } = await supabase
      .from("teams")
      .insert({ club_id: clubId, sport_id: clubSport.sport_id, category, name: category })
      .select("id")
      .single();
    if (createError || !created) {
      return { error: `No se pudo crear la categoría: ${createError?.message ?? ""}`, success: false };
    }
    teamId = created.id;
  }

  const { data: current } = await supabase
    .from("athlete_team")
    .select("id, team_id")
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();

  if (current && current.team_id === teamId) {
    const { error } = await supabase
      .from("athlete_team")
      .update({ position, dorsal })
      .eq("id", current.id);
    if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  } else {
    if (current) {
      const { error: closeError } = await supabase
        .from("athlete_team")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", current.id);
      if (closeError) return { error: `No se pudo actualizar: ${closeError.message}`, success: false };
    }
    const { error: insertError } = await supabase.from("athlete_team").insert({
      athlete_id: athleteId,
      team_id: teamId,
      position,
      dorsal,
      status: "active",
      started_at: new Date().toISOString(),
    });
    if (insertError) {
      return { error: `No se pudo guardar la categoría: ${insertError.message}`, success: false };
    }
  }

  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}
