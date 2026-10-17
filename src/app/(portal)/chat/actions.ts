"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Abre (o crea si no existe) la conversacion 1:1 profesional-atleta.
 * Solo funciona si el atleta ya tiene una cuenta real vinculada
 * (athletes.user_id) - sin eso no hay un auth.uid() con el que
 * formar participant_ids, que es lo que exige el RLS de insercion
 * de core.conversations (cardinality 2, uid propio incluido).
 */
export async function startConversationWithAthlete(athleteUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida.");

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, participant_ids")
    .contains("participant_ids", [user.id, athleteUserId]);

  const match = (existing ?? []).find((c) => c.participant_ids.length === 2);
  if (match) redirect(`/chat/${match.id}`);

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "professional_athlete", participant_ids: [user.id, athleteUserId] })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "No se pudo crear la conversación.");
  }

  redirect(`/chat/${created.id}`);
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  revalidatePath(`/chat/${conversationId}`);
  revalidatePath("/chat");
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .is("read_at", null)
    .neq("sender_id", user.id);
}
