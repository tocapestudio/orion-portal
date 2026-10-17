"use client";

import { useState, useTransition } from "react";
import { startConversationWithAthlete } from "./actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

interface AthleteOption {
  id: string;
  full_name: string;
  short_id: number;
  user_id: string | null;
}

export default function NewChatButton({ athletes }: { athletes: AthleteOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg px-4 py-2 text-sm font-semibold ${CREATE_ACTION_CLASSES}`}
      >
        + Nuevo chat
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-orion-navy-100 bg-white p-2 shadow-lg">
          {athletes.length === 0 && (
            <p className="p-2 text-xs text-orion-navy-400">
              Ninguno de tus atletas tiene todavía una cuenta de usuario vinculada.
            </p>
          )}
          {athletes.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                startTransition(() => startConversationWithAthlete(a.user_id as string));
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-orion-navy-800 hover:bg-orion-navy-100 disabled:opacity-60"
            >
              <span>{a.full_name}</span>
              <span className="text-xs text-orion-navy-400">#{a.short_id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
