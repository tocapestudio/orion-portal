import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Athlete = Database["core"]["Tables"]["athletes"]["Row"];

/**
 * getMyActiveAthleteIds() vive en su propio archivo (./athleteOwnership)
 * para poder probarla con node --test: ese archivo no importa
 * createClient a nivel de modulo (Node no puede resolver "@/lib/..."
 * fuera del bundler de Next.js), este sí. Se re-exporta aqui para no
 * cambiar ningun import existente (@/lib/data/athletes sigue siendo la
 * ruta publica).
 */
export { getMyActiveAthleteIds } from "./athleteOwnership";
import { getMyActiveAthleteIds } from "./athleteOwnership";

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

/**
 * Un atleta concreto, SOLO si tiene relacion activa con el profesional
 * autenticado (ver getMyActiveAthleteIds) - no basta con que RLS deje
 * pasar la consulta porque el usuario tiene rol admin. Si el id no
 * pertenece a este profesional, devuelve null ANTES de consultar
 * "athletes" - nunca revela si el atleta existe o no para alguien sin
 * acceso (mismo comportamiento para "no existe" y "no autorizado").
 */
export async function getAthleteById(id: string): Promise<Athlete | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");

  const athleteIds = await getMyActiveAthleteIds(supabase, user.id);
  if (!athleteIds.includes(id)) return null;

  const { data, error } = await supabase.from("athletes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
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
