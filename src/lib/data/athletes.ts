import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Athlete = Database["core"]["Tables"]["athletes"]["Row"];

/**
 * Atletas del profesional autenticado. RLS ya devuelve
 * exclusivamente los suyos (core.is_professional_of_athlete) - no
 * hace falta (ni se debe) filtrar por professional_id aqui.
 */
export async function getMyAthletes(): Promise<Athlete[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athletes")
    .select("*")
    .order("full_name", { ascending: true });
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
 * Sigue devolviendo solo lo que RLS ya permite ver.
 */
export async function searchMyAthletes(query: string): Promise<Athlete[]> {
  const supabase = await createClient();
  const trimmed = query.trim();
  if (!trimmed) return getMyAthletes();

  const asNumber = Number(trimmed);
  const orFilters = [`full_name.ilike.%${trimmed}%`];
  if (!Number.isNaN(asNumber)) {
    orFilters.push(`short_id.eq.${asNumber}`);
  }

  const { data: byNameOrOrionId } = await supabase
    .from("athletes")
    .select("*")
    .or(orFilters.join(","))
    .order("full_name", { ascending: true });

  const { data: byInternalCode } = await supabase
    .from("athlete_professional")
    .select("athlete_id, athletes(*)")
    .ilike("internal_code", `%${trimmed}%`);

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
 * estado de la relacion (athlete_professional.status) y los
 * programas de cada atleta ya resueltos, para la lista con
 * busqueda/orden/filtro de Perfiles. RLS ya restringe cada consulta
 * a lo que corresponde a este profesional/atleta - no se anade
 * ningun filtro manual por professional_id.
 */
export async function getMyAthleteRoster(): Promise<AthleteRosterRow[]> {
  const supabase = await createClient();

  const [{ data: athletes }, { data: relations }, { data: programs }] = await Promise.all([
    supabase.from("athletes").select("id, full_name, short_id, profile_image").order("full_name"),
    supabase.from("athlete_professional").select("athlete_id, status"),
    supabase.from("athlete_programs").select("athlete_id, program_id"),
  ]);

  const statusByAthlete = new Map((relations ?? []).map((r) => [r.athlete_id, r.status]));
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
    status: statusByAthlete.get(a.id) ?? "active",
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
