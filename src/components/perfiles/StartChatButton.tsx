"use client";

import { useTransition } from "react";
import { startConversationWithAthlete } from "@/app/(portal)/chat/actions";

export default function StartChatButton({ athleteUserId }: { athleteUserId: string | null }) {
  const [pending, startTransition] = useTransition();

  if (!athleteUserId) {
    return (
      <button
        type="button"
        disabled
        title="Este atleta todavía no tiene una cuenta de usuario vinculada — no se puede iniciar chat"
        className="cursor-not-allowed rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-300"
      >
        Chat no disponible
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => startConversationWithAthlete(athleteUserId))}
      className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100 disabled:opacity-60"
    >
      {pending ? "Abriendo…" : "Iniciar chat"}
    </button>
  );
}
