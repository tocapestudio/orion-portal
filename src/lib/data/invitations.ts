import { createClient } from "@/lib/supabase/server";
import type { Invitation } from "@/lib/invitationStatus";

/**
 * Invitaciones de un atleta. RLS ya restringe core.invitations a las
 * creadas por el profesional autenticado (created_by = auth.uid()) — no
 * se filtra nada mas aqui. Se ordena por expires_at (no existe created_at
 * en la tabla) como proxy fiable de recencia, ya que expires_at se fija
 * siempre a la creacion (now() + 7 dias por defecto).
 */
export async function getAthleteInvitations(athleteId: string): Promise<Invitation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("expires_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}
