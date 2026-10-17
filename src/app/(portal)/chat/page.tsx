import Link from "next/link";
import { getMyConversations } from "@/lib/data/chat";
import { getMyAthletesWithAccount } from "@/lib/data/athletes";
import NewChatButton from "./NewChatButton";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

export default async function ChatPage() {
  const [conversations, athletes] = await Promise.all([
    getMyConversations(),
    getMyAthletesWithAccount(),
  ]);

  return (
    <SecondaryScreenShell backHref="/inicio">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex justify-end">
          <NewChatButton athletes={athletes} />
        </div>

        {conversations.length === 0 && (
          <p className="rounded-xl border border-orion-navy-100 bg-white p-6 text-center text-sm text-orion-navy-400">
            No tienes conversaciones todavía.
          </p>
        )}
        {conversations.map((c) => (
          <Link
            key={c.id}
            href={`/chat/${c.id}`}
            className={`flex items-center justify-between rounded-lg border border-orion-navy-100 p-3 text-sm ${
              c.unreadCount > 0 ? "bg-orion-navy-100 font-semibold" : "bg-white"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-orion-navy-900">
                {c.lastMessage?.body ?? "Sin mensajes todavía"}
              </p>
              <p className="text-xs font-normal text-orion-navy-400">
                {c.lastMessage ? new Date(c.lastMessage.sentAt).toLocaleString("es-ES") : ""}
              </p>
            </div>
            {c.unreadCount > 0 && (
              <span className="ml-3 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                {c.unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>
    </SecondaryScreenShell>
  );
}
