"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CreateClubState {
  error: string | null;
  success: boolean;
}

/**
 * Crea un club reutilizando core.clubs tal cual ya existe. Si se
 * indica deporte, se asocia en core.club_sports. El profesional
 * creador queda vinculado en core.club_professional para poder
 * gestionarlo despues (equipos, edicion) — RLS de esas tablas ya lo
 * exige via is_professional_of_club().
 */
export async function createClub(
  _prev: CreateClubState,
  formData: FormData
): Promise<CreateClubState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const name = String(formData.get("name") ?? "").trim();
  const sportId = String(formData.get("sport_id") ?? "") || null;
  const logoUrl = String(formData.get("logo_url") ?? "").trim() || null;

  if (!name) return { error: "El nombre del club es obligatorio.", success: false };

  const { data: club, error } = await supabase
    .from("clubs")
    .insert({ name, logo_url: logoUrl })
    .select("id")
    .single();

  if (error || !club) {
    return { error: `No se pudo crear el club: ${error?.message ?? ""}`, success: false };
  }

  // El vinculo profesional-club debe crearse ANTES que club_sports: el RLS
  // de club_sports exige is_professional_of_club(), que a su vez comprueba
  // club_professional — en el orden inverso, la insercion de club_sports
  // seria rechazada por RLS (comprobado).
  const { error: linkError } = await supabase
    .from("club_professional")
    .insert({ club_id: club.id, professional_id: user.id, role: "owner", status: "active" });

  if (linkError) {
    return { error: `Club creado, pero no se pudo vincular: ${linkError.message}`, success: false };
  }

  if (sportId) {
    await supabase.from("club_sports").insert({ club_id: club.id, sport_id: sportId });
  }

  revalidatePath("/perfiles/keratos");
  return { error: null, success: true };
}
