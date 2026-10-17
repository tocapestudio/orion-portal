import { createClient } from "@/lib/supabase/server";

export interface ConversationSummary {
  id: string;
  type: string;
  createdAt: string;
  lastMessage: {
    body: string;
    sentAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}

/**
 * Conversaciones del usuario actual, tal como las permite ver RLS
 * (core.conversations solo expone las conversaciones donde el
 * usuario esta en participant_ids) — no se filtra nada mas aqui.
 */
export async function getMyConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, type, created_at")
    .order("created_at", { ascending: false });

  if (!conversations || conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);

  const { data: messages } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, sent_at, read_at")
    .in("conversation_id", ids)
    .order("sent_at", { ascending: false });

  return conversations.map((c) => {
    const msgsForConvo = (messages ?? []).filter((m) => m.conversation_id === c.id);
    const last = msgsForConvo[0] ?? null;
    const unreadCount = msgsForConvo.filter(
      (m) => m.read_at === null && m.sender_id !== user.id
    ).length;

    return {
      id: c.id,
      type: c.type,
      createdAt: c.created_at,
      lastMessage: last
        ? { body: last.body, sentAt: last.sent_at, senderId: last.sender_id }
        : null,
      unreadCount,
    };
  });
}

export async function getUnreadMessageCount(): Promise<number> {
  const conversations = await getMyConversations();
  return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, sent_at, read_at")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true });

  return (data ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    body: m.body,
    sentAt: m.sent_at,
    readAt: m.read_at,
  }));
}
