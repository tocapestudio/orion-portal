"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

/**
 * Titulo de seccion en el header, derivado de la ruta actual -
 * asi el Header (server component, con el contador de chats)
 * no necesita que cada pagina le pase el titulo manualmente.
 */
export default function SectionTitle() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  return (
    <h1 className="text-sm font-semibold uppercase tracking-wide text-orion-navy-900">
      {current?.label ?? ""}
    </h1>
  );
}
