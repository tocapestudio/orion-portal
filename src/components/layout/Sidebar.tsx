"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";
import NavIcon from "./NavIcon";

const PERFILES_SUBMENU = [
  { label: "PRISMA", href: "/perfiles/prisma" },
  { label: "KERATOS", href: "/perfiles/keratos" },
  { label: "AVANZA", href: "/perfiles/avanza" },
];

const EXPANDED_WIDTH = "15rem";
const COLLAPSED_WIDTH = "4.5rem";

/**
 * Menu lateral universal (desktop). El submenu de Perfiles
 * (PRISMA/KERATOS/AVANZA) reproduce el flujo original de ORION
 * (FLUJO ORION.pdf) — el resto de secciones no tienen submenu
 * definido todavia en ese flujo.
 *
 * El ancho se fija por estilo inline (no solo por clase de Tailwind)
 * para garantizar que el colapso se aplique siempre, y el contenedor
 * hermano (contenido principal) se reajusta automaticamente porque
 * este aside es un item flex sin flex-grow.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [perfilesOpen, setPerfilesOpen] = useState(pathname.startsWith("/perfiles"));

  return (
    <aside
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      className="hidden shrink-0 grow-0 flex-col overflow-hidden border-r border-orion-navy-100 bg-orion-navy-950 text-white transition-[width] duration-200 md:flex"
    >
      <div
        className={`flex items-center border-b border-white/10 py-5 ${
          collapsed ? "justify-center px-3" : "px-4"
        }`}
      >
        <Link href="/inicio" aria-label="Ir a Inicio" className="inline-flex shrink-0 items-center">
          {collapsed ? (
            <Image
              src="/brand/sidebar-icon.png"
              alt="ORION Visual Lab"
              width={134}
              height={100}
              className="h-8 w-auto shrink-0"
              priority
            />
          ) : (
            <Image
              src="/brand/sidebar-logo-full.png"
              alt="ORION Visual Lab"
              width={343}
              height={100}
              className="h-10 w-auto shrink-0"
              priority
            />
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const hasSubmenu = item.href === "/perfiles";
          const inactiveTone =
            item.href === "/chat"
              ? "text-emerald-300"
              : item.href === "/configuracion"
                ? "text-gray-400"
                : "text-orion-navy-200";

          return (
            <div key={item.href}>
              <div className="flex items-center">
                <Link
                  href={item.href}
                  className={`group/tip relative flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    collapsed ? "justify-center" : ""
                  } ${
                    active
                      ? "bg-orion-navy-600 text-white"
                      : `${inactiveTone} hover:bg-white/5 hover:text-white`
                  }`}
                >
                  <NavIcon href={item.href} className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="truncate whitespace-nowrap">{item.label.toUpperCase()}</span>
                  )}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-orion-navy-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 z-20">
                      {item.label}
                    </span>
                  )}
                </Link>
                {hasSubmenu && !collapsed && (
                  <button
                    type="button"
                    onClick={() => setPerfilesOpen((v) => !v)}
                    aria-label="Desplegar submenu de Perfiles"
                    className="px-2 py-2 text-orion-navy-300 hover:text-white"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      className={`h-3.5 w-3.5 transition-transform ${perfilesOpen ? "rotate-90" : ""}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                )}
              </div>

              {hasSubmenu && perfilesOpen && !collapsed && (
                <div className="ml-6 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                  {PERFILES_SUBMENU.map((sub) => {
                    const subActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`block rounded-md px-2 py-1.5 text-xs font-medium ${
                          subActive ? "text-white" : "text-orion-navy-300 hover:text-white"
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Desplegar menú" : "Recoger menú"}
          aria-pressed={collapsed}
          className="mx-auto mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm leading-none font-semibold text-orion-navy-700 shadow transition hover:bg-orion-navy-100"
        >
          {collapsed ? ">" : "<"}
        </button>
      </nav>
    </aside>
  );
}
