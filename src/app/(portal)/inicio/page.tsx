import Image from "next/image";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyConversations } from "@/lib/data/chat";
import { getTodayEvents } from "@/lib/data/dashboard";
import RoleBadge from "@/components/ui/RoleBadge";
import TodayAgendaWidget from "@/components/dashboard/TodayAgendaWidget";
import AccessGrid from "@/components/dashboard/AccessGrid";

export default async function InicioPage() {
  const user = await getCurrentUser();
  const [allConversations, todayEvents] = await Promise.all([
    getMyConversations(),
    getTodayEvents(),
  ]);
  const hasUnreadChats = allConversations.some((c) => c.unreadCount > 0);

  const firstName = user?.fullName?.split(" ")[0] ?? user?.email ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-orion-navy-200 text-orion-navy-700">
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.6-5-8-5Z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-xl font-semibold text-orion-navy-900">¡Hola, {firstName}!</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(user?.roles ?? []).map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </div>
        </div>
      </section>

      <AccessGrid hasUnreadChats={hasUnreadChats} />

      <TodayAgendaWidget events={todayEvents} />
    </div>
  );
}
