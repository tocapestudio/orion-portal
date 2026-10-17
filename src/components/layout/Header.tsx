import Link from "next/link";
import Logo from "./Logo";
import MobileNav from "./MobileNav";
import SectionTitle from "./SectionTitle";
import SignOutButton from "./SignOutButton";
import NavIcon from "./NavIcon";
import { getUnreadMessageCount } from "@/lib/data/chat";

export default async function Header() {
  const unread = await getUnreadMessageCount();

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-orion-navy-100 bg-white px-4">
      <div className="flex items-center gap-3">
        <MobileNav />
        <Logo className="md:hidden" />
        <SectionTitle />
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/chat"
          className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
          aria-label="Chats"
        >
          <NavIcon href="/chat" className="h-5 w-5 shrink-0" />
          <span className="hidden sm:inline">CHAT</span>
          {unread > 0 && (
            <span className="absolute right-1 top-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </Link>

        <Link
          href="/configuracion"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100"
          aria-label="Configuración"
        >
          <NavIcon href="/configuracion" className="h-5 w-5 shrink-0" />
          <span className="hidden sm:inline">CONFIGURACIÓN</span>
        </Link>

        <SignOutButton />
      </div>
    </header>
  );
}
