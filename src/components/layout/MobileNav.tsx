"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import NavIcon from "./NavIcon";

/**
 * Panel desplegable universal (las "3 rayitas"), accesible desde
 * cualquier pantalla. Al abrirse muestra los mismos botones que el
 * menu lateral, apilados. Al cerrarse solo quedan las rayitas.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-md hover:bg-orion-navy-100"
      >
        <span className="block h-0.5 w-5 bg-orion-navy-900" />
        <span className="block h-0.5 w-5 bg-orion-navy-900" />
        <span className="block h-0.5 w-5 bg-orion-navy-900" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-14 z-40 border-t border-orion-navy-100 bg-orion-navy-950 shadow-lg">
          <nav className="flex flex-col divide-y divide-white/10">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-5 py-3 text-sm font-medium ${
                    active ? "bg-orion-navy-600 text-white" : "text-orion-navy-200"
                  }`}
                >
                  <NavIcon href={item.href} className="h-4 w-4 shrink-0" />
                  {item.label.toUpperCase()}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
