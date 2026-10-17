import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Club = Database["core"]["Tables"]["clubs"]["Row"];

export async function getClubs(): Promise<Club[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clubs").select("*").order("name");
  return data ?? [];
}

export type Team = Database["core"]["Tables"]["teams"]["Row"];
export type Sport = Database["core"]["Tables"]["sports"]["Row"];

export async function getTeamsByClub(clubId: string): Promise<Team[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("*").eq("club_id", clubId).order("name");
  return data ?? [];
}

export async function getSports(): Promise<Sport[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("sports").select("*").order("name");
  return data ?? [];
}

export interface ClubWithStats {
  id: string;
  name: string;
  logo_url: string | null;
  sportId: string | null;
  profileCount: number;
}

/**
 * Clubes + su deporte (si tiene alguno asignado) + numero de perfiles
 * asociados. La lectura de core.clubs es abierta para autenticados,
 * pero athlete_club solo devuelve (via RLS) las membresias de LOS
 * ATLETAS DE ESTE PROFESIONAL — el recuento ya queda correctamente
 * acotado sin filtrar nada a mano.
 */
export async function getClubsWithStats(): Promise<ClubWithStats[]> {
  const supabase = await createClient();
  const [{ data: clubs }, { data: clubSports }, { data: memberships }] = await Promise.all([
    supabase.from("clubs").select("id, name, logo_url").order("name"),
    supabase.from("club_sports").select("club_id, sport_id"),
    supabase.from("athlete_club").select("club_id").eq("status", "active"),
  ]);

  const sportByClub = new Map((clubSports ?? []).map((cs) => [cs.club_id, cs.sport_id]));
  const countByClub = new Map<string, number>();
  for (const m of memberships ?? []) {
    countByClub.set(m.club_id, (countByClub.get(m.club_id) ?? 0) + 1);
  }

  return (clubs ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    logo_url: c.logo_url,
    sportId: sportByClub.get(c.id) ?? null,
    profileCount: countByClub.get(c.id) ?? 0,
  }));
}

/**
 * Categorias ya usadas dentro de un club (valores distintos de
 * core.teams.category). Sirve solo para autocompletar en el formulario y
 * reducir el riesgo de duplicados por error tipografico — la busqueda real
 * de "existe o se crea" la hace la propia accion del servidor.
 */
export async function getTeamCategoriesByClub(clubId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("category")
    .eq("club_id", clubId)
    .not("category", "is", null);
  return [...new Set((data ?? []).map((t) => t.category as string))].sort();
}

/** Nombre del club activo de cada atleta, en bloque (para listas). */
export async function getClubNamesForAthletes(
  athleteIds: string[]
): Promise<Map<string, string>> {
  if (athleteIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_club")
    .select("athlete_id, status, clubs(name)")
    .in("athlete_id", athleteIds)
    .eq("status", "active");

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const clubName = (row.clubs as { name: string } | null)?.name;
    if (clubName) map.set(row.athlete_id, clubName);
  }
  return map;
}
