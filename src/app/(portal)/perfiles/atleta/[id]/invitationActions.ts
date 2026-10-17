"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface InvitationActionState {
  error: string | null;
}

/**
 * Crea una invitacion para el atleta actual. code y expires_at se dejan a
 * los defaults de Core (codigo aleatorio unico, caducidad 7 dias) — no se
 * fijan aqui. Nunca crea un atleta: solo referencia el athlete_id existente.
 */
export async function createInvitation(athleteId: string): Promise<InvitationActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const { error } = await supabase.from("invitations").insert({
    athlete_id: athleteId,
    created_by: user.id,
  });

  if (error) return { error: `No se pudo crear la invitación: ${error.message}` };

  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null };
}

/** Revoca una invitacion pendiente. RLS ya restringe esto a las propias del profesional. */
export async function revokeInvitation(
  invitationId: string,
  athleteId: string
): Promise<InvitationActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (error) return { error: `No se pudo revocar: ${error.message}` };

  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null };
}
