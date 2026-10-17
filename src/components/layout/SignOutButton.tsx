"use client";

import { useTransition } from "react";
import { signOut } from "@/app/(portal)/configuracion/actions";

/**
 * Boton de cerrar sesion en la cabecera, separado del icono de Chat
 * a proposito: pide confirmacion antes de cerrar sesion (para evitar
 * cierres accidentales al pulsar cerca del icono de Chat) y usa un
 * tono rojizo para diferenciarse visualmente de las demas acciones.
 */
export default function SignOutButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (window.confirm("¿Quieres cerrar sesión?")) {
      startTransition(() => signOut());
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-5 w-5 shrink-0"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17l5-5-5-5M20 12H9M12 19H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"
        />
      </svg>
      <span className="hidden sm:inline">CERRAR SESIÓN</span>
    </button>
  );
}
