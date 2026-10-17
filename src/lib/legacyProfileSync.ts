import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sincronizacion legacy Portal -> React: crea (si falta) la fila
 * correspondiente en public.player_profiles para un atleta ya creado en
 * core.athletes, y enlaza core.athletes.legacy_player_profile_id.
 *
 * Reutiliza el propio athleteId (UUID de core.athletes) como id del
 * perfil legacy en public.player_profiles (columna text, sin formato
 * exigido) para que el proceso sea idempotente por construccion: si ya
 * existe una fila con ese id, no es necesariamente un conflicto - puede
 * ser un intento anterior (parcial) de esta misma sincronizacion. Antes
 * de reutilizarla se comprueba que pertenece al mismo profesional y al
 * mismo nombre; si no coincide, se aborta sin sobrescribir nada.
 *
 * LIMITE RECONOCIDO: si ya existiera una fila con ese id perteneciente a
 * OTRO profesional, RLS de public.player_profiles (scoped a
 * professional_id = current_legacy_professional_id()) la oculta en el
 * propio SELECT de comprobacion - no se puede detectar como "conflicto"
 * de forma positiva. En ese caso (practicamente imposible, es un UUID)
 * el INSERT fallaria por violacion de la clave primaria y se reporta
 * igualmente como fallo real (profile_create_failed), nunca se oculta.
 *
 * Tipado: el cliente de Supabase del Portal esta fijado al esquema
 * "core" (ver src/lib/supabase/server.ts, Database solo define "core").
 * Las llamadas a public.users/public.player_profiles de aqui necesitan
 * `.schema("public")`, que no compila contra ese tipo - se castea
 * localmente a SupabaseClient generico solo para esas llamadas,
 * perdiendo tipado estatico unicamente ahi. No se ha tocado
 * database.types.ts.
 */

// Generaliza deliberadamente el esquema (core u otro) del cliente ya
// autenticado que recibe este modulo, para poder alcanzar public.* via
// .schema(), que no esta declarado en Database (ver nota de tipado arriba).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchemaSupabaseClient = SupabaseClient<any, any, any>;

const INVITATION_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const INVITATION_CODE_LENGTH = 8;
const INVITATION_CODE_PRECHECK_MAX_ATTEMPTS = 20;
const INVITATION_CODE_INSERT_MAX_RETRIES = 3;

/**
 * Formato ANTIGUO de short_id (primeros 8 caracteres hex del UUID, en
 * mayusculas) - ya NO se usa para crear fichas nuevas (ver
 * syncLegacyProfile, que ahora usa core.athletes.short_id, el entero
 * secuencial que ya muestra el Portal). Se conserva exportada porque
 * sirve para detectar, en datos ya existentes, si una ficha sigue en
 * este formato antiguo (y por tanto es segura de migrar) o si fue
 * editada a mano con otro valor (y por tanto no debe tocarse) - ver la
 * consulta SQL preparada para ese backfill.
 */
export function deriveShortId(athleteId: string): string {
  return athleteId.replace(/-/g, "").substring(0, 8).toUpperCase();
}

export function generateInvitationCodeCandidate(random: () => number = Math.random): string {
  return Array.from(
    { length: INVITATION_CODE_LENGTH },
    () => INVITATION_CODE_ALPHABET[Math.floor(random() * INVITATION_CODE_ALPHABET.length)]
  ).join("");
}

/**
 * Distingue una colision REAL de la restriccion unica de invitation_code
 * (codigo Postgres 23505, con el nombre de columna en el mensaje/detalle)
 * de cualquier otro error de insercion - solo la primera debe reintentarse.
 */
export function isInvitationCodeUniqueViolation(
  error: { code?: string; message?: string; details?: string } | null | undefined
): boolean {
  if (!error || error.code !== "23505") return false;
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return text.includes("invitation_code");
}

export type LegacySyncResult =
  | { status: "synced"; legacyProfileId: string }
  | { status: "already_synced"; legacyProfileId: string }
  | { status: "no_legacy_professional" }
  | { status: "legacy_professional_lookup_failed"; message: string }
  | { status: "profile_conflict"; existingProfileId: string }
  | { status: "profile_create_failed"; message: string }
  | { status: "unarchive_failed"; legacyProfileId: string; message: string }
  | { status: "link_update_failed"; legacyProfileId: string; message: string };

/**
 * `supabase` debe ser el cliente ya autenticado del Portal (esquema
 * "core" por defecto); aqui se castea puntualmente para alcanzar
 * public.* (ver nota de tipado arriba).
 */
export async function syncLegacyProfile(
  supabase: AnySchemaSupabaseClient,
  params: { athleteId: string; fullName: string; authUserId: string; shortId: number | null }
): Promise<LegacySyncResult> {
  const { athleteId, fullName, authUserId, shortId } = params;
  const publicDb = supabase.schema("public");

  // 1. Resolver el profesional legacy - distingue "no existe la fila"
  // (resultado funcional esperable, no se inventa nada) de "la consulta
  // ha fallado de verdad" (error real, con su mensaje conservado).
  const { data: legacyUser, error: legacyUserError } = await publicDb
    .from("users")
    .select("id")
    .eq("auth_id", authUserId)
    .maybeSingle();

  if (legacyUserError) {
    return { status: "legacy_professional_lookup_failed", message: legacyUserError.message };
  }
  if (!legacyUser) {
    return { status: "no_legacy_professional" };
  }
  const legacyProfessionalId = legacyUser.id as string;

  // 2. Idempotencia real: comprobar a quien pertenece un perfil ya
  // existente con ese id antes de reutilizarlo o vincularlo. No se
  // alcanza en el flujo actual (legacy_player_profile_id solo se fija
  // una vez y nunca se vuelve a poner a NULL), pero se incluye
  // archived_at por si un futuro flujo de "reactivar atleta" reutiliza
  // este mismo athleteId tras un archivado - sin esto, un reintento
  // dejaria el atleta correctamente enlazado en Core pero invisible en
  // React para siempre, sin ningun error que lo señale.
  const { data: existingProfile, error: existingError } = await publicDb
    .from("player_profiles")
    .select("id, professional_id, full_name, archived_at")
    .eq("id", athleteId)
    .maybeSingle();

  if (existingError) {
    return { status: "profile_create_failed", message: existingError.message };
  }

  if (existingProfile) {
    const matches =
      existingProfile.professional_id === legacyProfessionalId &&
      existingProfile.full_name === fullName;
    if (!matches) {
      return { status: "profile_conflict", existingProfileId: existingProfile.id as string };
    }
    // Ya es el perfil correcto (intento previo parcial o repetido). Solo
    // se desarchiva aqui porque ya se verificaron las TRES condiciones
    // exactas: mismo id (el propio filtro de esta consulta), mismo
    // professional_id y mismo full_name - nunca de forma indiscriminada.
    if (existingProfile.archived_at) {
      const { error: unarchiveError } = await publicDb
        .from("player_profiles")
        .update({ archived_at: null })
        .eq("id", athleteId)
        .eq("professional_id", legacyProfessionalId);
      if (unarchiveError) {
        return { status: "unarchive_failed", legacyProfileId: athleteId, message: unarchiveError.message };
      }
    }
    // No reinsertar, solo confirmar/completar el vinculo.
    return linkAthlete(supabase, athleteId, athleteId);
  }

  // 3. invitation_code es opcional en React (no condiciona el listado
  // ni ningun flujo funcional) - una colision no debe impedir crear el
  // perfil, solo se deja sin codigo si se agotan los intentos. Esta es
  // solo una comprobacion previa (reduce el caso comun); la ventana de
  // carrera real entre esta comprobacion y el INSERT se gestiona abajo.
  let invitationCode: string | null = null;
  for (let attempt = 0; attempt < INVITATION_CODE_PRECHECK_MAX_ATTEMPTS; attempt++) {
    const candidate = generateInvitationCodeCandidate();
    const { data: collision } = await publicDb
      .from("player_profiles")
      .select("id")
      .eq("invitation_code", candidate)
      .maybeSingle();
    if (!collision) {
      invitationCode = candidate;
      break;
    }
  }

  // 4. Crear el perfil legacy. Si el INSERT falla especificamente por una
  // colision real de invitation_code (otra sesion lo tomo justo entre el
  // paso 3 y este INSERT), se reintenta con un candidato nuevo hasta
  // INVITATION_CODE_INSERT_MAX_RETRIES veces y, si persiste, una ultima
  // vez con invitation_code = null (varios NULL son validos bajo la
  // restriccion UNIQUE). Cualquier otro tipo de error de insercion -o una
  // colision que persista incluso con null, lo que indicaria un problema
  // distinto- se reporta como fallo real, sin reintentar.
  let triedWithNullCode = invitationCode === null;
  for (let retry = 0; ; retry++) {
    const { error: insertError } = await publicDb.from("player_profiles").insert({
      id: athleteId,
      full_name: fullName,
      professional_id: legacyProfessionalId,
      club_id: null,
      // Entero secuencial de core.athletes.short_id (el mismo "#46" que ya
      // muestra el Portal), como texto - nunca se vuelve a derivar del
      // UUID. Si no se pudo resolver (shortId null, ver createAthlete),
      // se deja sin short_id en vez de inventar un valor.
      short_id: shortId !== null ? String(shortId) : null,
      invitation_code: invitationCode,
      privacy_consent: false,
    });

    if (!insertError) {
      return linkAthlete(supabase, athleteId, athleteId);
    }

    if (!isInvitationCodeUniqueViolation(insertError) || triedWithNullCode) {
      return { status: "profile_create_failed", message: insertError.message };
    }

    if (retry < INVITATION_CODE_INSERT_MAX_RETRIES) {
      invitationCode = generateInvitationCodeCandidate();
    } else {
      invitationCode = null;
      triedWithNullCode = true;
    }
  }
}

async function linkAthlete(
  supabase: AnySchemaSupabaseClient,
  coreAthleteId: string,
  legacyProfileId: string
): Promise<LegacySyncResult> {
  const { data, error } = await supabase
    .from("athletes")
    .update({ legacy_player_profile_id: legacyProfileId })
    .eq("id", coreAthleteId)
    .is("legacy_player_profile_id", null)
    .select("id");

  if (error) {
    return { status: "link_update_failed", legacyProfileId, message: error.message };
  }

  if (data && data.length === 1) {
    return { status: "synced", legacyProfileId };
  }

  // 0 filas afectadas: o ya estaba vinculado a este mismo perfil (OK,
  // reintento tras un exito previo) o a otro distinto (fallo real).
  const { data: current } = await supabase
    .from("athletes")
    .select("legacy_player_profile_id")
    .eq("id", coreAthleteId)
    .maybeSingle();

  if (current?.legacy_player_profile_id === legacyProfileId) {
    return { status: "already_synced", legacyProfileId };
  }

  return {
    status: "link_update_failed",
    legacyProfileId,
    message: "No se pudo confirmar el vinculo (0 filas afectadas, legacy_player_profile_id no coincide).",
  };
}

export type ArchiveLegacyProfileResult =
  | { status: "archived"; legacyProfileId: string }
  | { status: "already_archived"; legacyProfileId: string }
  | { status: "no_legacy_profile" }
  | { status: "legacy_professional_lookup_failed"; message: string }
  | { status: "not_owned_by_this_professional"; legacyProfileId: string }
  | { status: "archive_update_failed"; legacyProfileId: string; message: string };

/**
 * Archiva (archived_at = now(), nunca borra) una ficha legacy, SOLO si
 * pertenece exactamente al profesional que ejecuta la accion. Si la
 * ficha no existe, o pertenece a otro profesional, no se toca nada - no
 * es un error, es el comportamiento correcto (nunca se afecta la
 * visibilidad de un tercero).
 *
 * IMPORTANTE - por que recibe `legacyProfileId` directamente en vez de
 * `athleteId` + leer core.athletes.legacy_player_profile_id aqui dentro
 * (version anterior de esta funcion): la RLS de core.athletes
 * ("professional lee sus atletas", via core.is_professional_of_athlete)
 * exige status='active' en core.athlete_professional. En el flujo real
 * de desvinculacion, esta funcion se invoca DESPUES de que
 * removeAthleteFromProfessional ya puso status='ended' - en ese
 * instante, el profesional YA NO PUEDE leer ese atleta via RLS, y una
 * lectura de core.athletes aqui devolveria siempre vacio, haciendo que
 * el archivado fallara en silencio (bug real, encontrado en revision).
 * Por eso el llamante debe resolver `legacyProfileId` ANTES de terminar
 * la relacion (mientras sigue activa y RLS SI permite leerla) y pasarlo
 * ya resuelto. Esto tambien hace que esta misma funcion sirva, sin
 * cambios, como mecanismo de reintento: no depende en ningun momento de
 * core.athletes ni de core.athlete_professional, solo de public.users
 * (lectura de la propia fila, sin restriccion de estado) y de
 * public.player_profiles (scoped por professional_id, tampoco depende
 * de ningun estado de relacion) - puede volver a invocarse mas tarde con
 * el mismo legacyProfileId (p.ej. capturado de un log previo) sin
 * exigir ninguna relacion activa.
 *
 * Idempotente: una segunda llamada sobre una ficha ya archivada devuelve
 * "already_archived" sin volver a escribir nada (ni siquiera actualiza
 * archived_at a un valor mas reciente).
 */
export async function archiveLegacyProfile(
  supabase: AnySchemaSupabaseClient,
  params: { legacyProfileId: string; authUserId: string }
): Promise<ArchiveLegacyProfileResult> {
  const { legacyProfileId, authUserId } = params;
  const publicDb = supabase.schema("public");

  // 1. Resolver el profesional legacy actual (mismo patron que
  // syncLegacyProfile - nunca se inventa si falta).
  const { data: legacyUser, error: legacyUserError } = await publicDb
    .from("users")
    .select("id")
    .eq("auth_id", authUserId)
    .maybeSingle();

  if (legacyUserError) {
    return { status: "legacy_professional_lookup_failed", message: legacyUserError.message };
  }
  if (!legacyUser) {
    return {
      status: "legacy_professional_lookup_failed",
      message: "No existe fila en public.users para este profesional.",
    };
  }
  const legacyProfessionalId = legacyUser.id as string;

  // 2. Comprobar propiedad ANTES de tocar nada - nunca archivar la ficha
  // de otro profesional, aunque el id enlazado sea correcto.
  const { data: profile, error: profileError } = await publicDb
    .from("player_profiles")
    .select("id, professional_id, archived_at")
    .eq("id", legacyProfileId)
    .maybeSingle();

  if (profileError) {
    return { status: "archive_update_failed", legacyProfileId, message: profileError.message };
  }
  if (!profile) {
    // El id enlazado ya no corresponde a ninguna fila real - nada que archivar.
    return { status: "no_legacy_profile" };
  }
  if (profile.professional_id !== legacyProfessionalId) {
    return { status: "not_owned_by_this_professional", legacyProfileId };
  }
  if (profile.archived_at) {
    return { status: "already_archived", legacyProfileId };
  }

  // 3. Archivar - idempotente (solo si sigue sin archivar en este instante).
  const { data, error } = await publicDb
    .from("player_profiles")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", legacyProfileId)
    .eq("professional_id", legacyProfessionalId)
    .is("archived_at", null)
    .select("id");

  if (error) {
    return { status: "archive_update_failed", legacyProfileId, message: error.message };
  }
  if (!data || data.length === 0) {
    // Carrera: otra llamada ya lo archivo entre el paso 3 y este UPDATE -
    // se trata como exito (ya esta archivado), no como fallo.
    return { status: "already_archived", legacyProfileId };
  }

  return { status: "archived", legacyProfileId };
}
