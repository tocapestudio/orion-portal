"use client";

import { useRouter } from "next/navigation";
import { hasInternalHistory } from "@/lib/navigationHistory";

/**
 * Boton "Volver" discreto para pantallas secundarias. Usa el
 * historial interno (router.back) cuando el usuario llego navegando
 * dentro de la app; si no (URL directa, marcador, nueva pestaña,
 * recarga) cae al fallback contextual indicado por la propia pantalla.
 *
 * Para pantallas donde "Volver" debe ser un destino fijo SIN ninguna
 * condicion de historial (p.ej. el perfil de atleta), no se usa este
 * componente — ver StaticBackLink.
 *
 * Solo icono (32x32): antes era un boton rectangular con texto "Volver",
 * colocado por SecondaryScreenShell en una columna lateral de 6rem + gap
 * que restaba ancho horizontal al contenido y lo descentraba. Ahora es un
 * icono compacto que SecondaryScreenShell coloca en su propia fila (sin
 * columna, sin reservar ancho), asi el contenido conserva el 100% del
 * ancho disponible y su centrado de siempre. Sin texto visible, el
 * aria-label/title pasan a ser obligatorios para accesibilidad.
 *
 * Sin margen propio: quien coloca el espaciado es SecondaryScreenShell
 * (el unico sitio desde el que se renderiza), no el propio boton.
 */
export default function BackButton({
  fallbackHref,
  label = "Volver",
}: {
  fallbackHref: string;
  label?: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (hasInternalHistory()) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      // Fondo melocoton/dorado suave (--orion-warm-100, hover
      // --orion-warm-200 - ver globals.css) en vez de blanco, para
      // destacar sobre el fondo azul grisaceo claro de las pantallas
      // (bg-orion-navy-100/40 en el <main> del Portal). Icono/borde
      // siguen en navy (contraste ya adecuado sobre un fondo claro,
      // calido u oscuro): no se tocan.
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orion-navy-200 bg-orion-warm-100 text-orion-navy-600 transition-colors hover:border-orion-navy-300 hover:bg-orion-warm-200 hover:text-orion-navy-800"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  );
}
