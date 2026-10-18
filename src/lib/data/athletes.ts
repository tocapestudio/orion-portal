import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Athlete = Database["core"]["Tables"]["athletes"]["Row"];

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * IDs de los atletas con relacion ACTIVA con el profesional autenticado
 * (core.athlete_professional, status='active' - misma condicion exacta
 * que usa core.is_professional_of_athlete() del lado de RLS). No hay
 * columna professional_id en core.athletes: el vinculo vive solo en
 * esta tabla puente.
 *
 * Se añade como filtro explicito de aplicacion (ademas de RLS, no en
 * su lugar) porque las policies "admin todo X" son globales: una
 * cuenta con rol admin seguiria viendo todos los atletas via RLS
 * aunque tambien tenga professional. Este filtro hace que las
 * pantallas personales (Inicio/Perfiles/Mi Agenda) muestren siempre
 * los atletas del profesional activo, tenga o no el rol admin.
 *
 * Lanza en caso de fallo real de la consulta - nunca lo convierte en
 * lista vacia (eso haria indistinguible "sin atletas" de "error").
 */
export async function getMyActiveAthleteIds(
  supabase: SupabaseServerClient,
  professionalId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("athlete_professional")
    .select("athlete_id")
    .eq("professional_id", professionalId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((r) => r.athlete_id);
}

/**
 * Atletas del profesional autenticado. Filtrados explicitamente por
 * relacion activa (ver getMyActiveAthleteIds) - no basta con RLS
 * porque las policies "admin todo athletes" son globales.
 */
export async function getMyAthletes(): Promise<Athlete[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const athleteIds = await getMyActiveAthleteIds(supabase, user.id);
  if (athleteIds.length === 0) return [];

  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .in("id", athleteIds)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAthleteById(id: string): Promise<Athlete | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/**
 * Busqueda por nombre, ORION ID (athletes.short_id) o codigo
 * interno del profesional (athlete_professional.internal_code).
 * Acotada explicitamente a la relacion activa del profesional
 * autenticado (ver getMyActiveAthleteIds) - no solo a lo que RLS
 * permitiria ver, por la misma razon que getMyAthletes().
 */
export async function searchMyAthletes(query: string): Promise<Athlete[]> {
  const supabase = await createClient();
  const trimmed = query.trim();
  if (!trimmed) return getMyAthletes();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const athleteIds = await getMyActiveAthleteIds(supabase, user.id);
  if (athleteIds.length === 0) return [];

  const asNumber = Number(trimmed);
  const orFilters = [`full_name.ilike.%${trimmed}%`];
  if (!Number.isNaN(asNumber)) {
    orFilters.push(`short_id.eq.${asNumber}`);
  }

  const [{ data: byNameOrOrionId, error: nameError }, { data: byInternalCode, error: codeError }] =
    await Promise.all([
      supabase
        .from("athletes")
        .select("*")
        .in("id", athleteIds)
        .or(orFilters.join(","))
        .order("full_name", { ascending: true }),
      supabase
        .from("athlete_professional")
        .select("athlete_id, athletes(*)")
        .eq("professional_id", user.id)
        .ilike("internal_code", `%${trimmed}%`),
    ]);
  if (nameError) throw nameError;
  if (codeError) throw codeError;

  const fromInternalCode = (byInternalCode ?? [])
    .map((row) => row.athletes)
    .filter((a): a is Athlete => Boolean(a));

  const merged = new Map<string, Athlete>();
  [...(byNameOrOrionId ?? []), ...fromInternalCode].forEach((a) => merged.set(a.id, a));
  return Array.from(merged.values());
}

export async function getMyClubForAthlete(athleteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_club")
    .select("club_id, status, clubs(id, name)")
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

export interface AthleteRosterRow {
  id: string;
  full_name: string;
  short_id: number;
  status: string;
  programIds: string[];
  profile_image: string | null;
}

/**
 * Listado completo del profesional (todos los programas), con el
 * estado de la relacion (siempre 'active' - ver getMyActiveAthleteIds)
 * y los programas de cada atleta ya resueltos, para la lista con
 * busqueda/orden/filtro de Perfiles. Acotado explicitamente a la
 * relacion activa del profesional autenticado, no solo a lo que RLS
 * permitiria ver (las policies "admin todo X" son globales).
 */
export async function getMyAthleteRoster(): Promise<AthleteRosterRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const athleteIds = await getMyActiveAthleteIds(supabase, user.id);
  if (athleteIds.length === 0) return [];

  const [{ data: athletes, error: athletesError }, { data: programs, error: programsError }] =
    await Promise.all([
      supabase
        .from("athletes")
        .select("id, full_name, short_id, profile_image")
        .in("id", athleteIds)
        .order("full_name"),
      supabase.from("athlete_programs").select("athlete_id, program_id").in("athlete_id", athleteIds),
    ]);
  if (athletesError) throw athletesError;
  if (programsError) throw programsError;

  const programsByAthlete = new Map<string, string[]>();
  for (const p of programs ?? []) {
    const list = programsByAthlete.get(p.athlete_id) ?? [];
    list.push(p.program_id);
    programsByAthlete.set(p.athlete_id, list);
  }

  return (athletes ?? []).map((a) => ({
    id: a.id,
    full_name: a.full_name,
    short_id: a.short_id,
    status: "active",
    programIds: programsByAthlete.get(a.id) ?? [],
    profile_image: a.profile_image,
  }));
}

export async function getInternalCode(athleteId: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("athlete_professional")
    .select("internal_code")
    .eq("athlete_id", athleteId)
    .eq("professional_id", user.id)
    .maybeSingle();
  return data?.internal_code ?? null;
}

/** Atletas propios que ya tienen una cuenta de usuario real vinculada (user_id no nulo). */
export async function getMyAthletesWithAccount(): Promise<Pick<Athlete, "id" | "full_name" | "short_id" | "user_id">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athletes")
    .select("id, full_name, short_id, user_id")
    .not("user_id", "is", null)
    .order("full_name");
  return data ?? [];
}

/** Estado (active/inactive/ended) de la relacion de ESTE profesional con el atleta. */
export async function getAthleteStatus(athleteId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_professional")
    .select("status")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return data?.status ?? "active";
}
