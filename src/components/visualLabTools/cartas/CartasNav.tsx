"use client";

/**
 * ORION Tools · Cartas - navegacion horizontal superior COMPARTIDA entre
 * todas las herramientas del modulo (Hart, y las que se añadan despues).
 * Mismo patron visual ya probado en OculomotorClient.tsx (ModalityTab):
 * pestañas de igual ancho dentro de un contenedor tipo "pill", color
 * solido en la activa, nunca solo un borde/subrayado sutil.
 *
 * DIFERENCIA deliberada con el patron de Oculomotricidad: alli las
 * pestañas cambian un campo de config DENTRO del mismo componente/ruta
 * (dos modalidades de un unico ejercicio). Aqui cada entrada es una
 * HERRAMIENTA independiente con su propia ruta (Hart y McDonald ya la
 * tienen; Panales/Mis cartas todavia no existen) - por eso se navega
 * con <Link>, no con estado local. Las entradas sin `href` (todavia no
 * implementadas) se renderizan como "Próximamente", igual que las
 * tarjetas deshabilitadas del hub de Tools (visual-lab/tools/page.tsx):
 * nunca un enlace que lleve a un error o a una pagina vacia.
 *
 * Añadir una herramienta futura es una entrada mas en CARTAS_NAV_ENTRIES
 * (ponerle `href` cuando exista su ruta), nunca JSX repetido a mano.
 */

import Link from "next/link";

export type CartasSection = "hart" | "mcdonald" | "panales" | "misCartas";

interface CartasNavEntry {
  id: CartasSection;
  label: string;
  /** null = todavia no implementada ("Próximamente", nunca un enlace roto). */
  href: string | null;
}

const CARTAS_NAV_ENTRIES: CartasNavEntry[] = [
  { id: "hart", label: "Hart", href: "/visual-lab/tools/cartas/hart" },
  { id: "mcdonald", label: "McDonald", href: "/visual-lab/tools/cartas/mcdonald" },
  { id: "panales", label: "Panales", href: null },
  { id: "misCartas", label: "Mis cartas", href: null },
];

export default function CartasNav({ active }: { active: CartasSection }) {
  return (
    <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-1.5 rounded-xl border border-orion-navy-100 bg-white p-1.5 sm:grid-cols-4">
      {CARTAS_NAV_ENTRIES.map((entry) => {
        if (!entry.href) {
          return (
            <div
              key={entry.id}
              aria-disabled="true"
              className="flex flex-col items-center justify-center gap-0.5 whitespace-normal rounded-lg px-3 py-2 text-center text-sm font-semibold text-orion-navy-300"
            >
              <span>{entry.label}</span>
              <span className="text-[10px] font-medium">Próximamente</span>
            </div>
          );
        }
        const isActive = entry.id === active;
        return (
          <Link
            key={entry.id}
            href={entry.href}
            className={`whitespace-normal rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition sm:whitespace-nowrap ${
              isActive ? "bg-orion-navy-900 text-white" : "text-orion-navy-700 hover:bg-orion-navy-50"
            }`}
          >
            {entry.label}
          </Link>
        );
      })}
    </div>
  );
}
