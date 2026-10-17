import Link from "next/link";

/**
 * Variante estatica de BackButton: navega SIEMPRE a href, sin condicion
 * de historial interno ni router.back() — para pantallas donde "Volver"
 * es literalmente "ir a este destino fijo", nunca "a la pantalla
 * anterior" (p.ej. el perfil de atleta: Volver debe salir siempre al
 * listado de Perfiles, independientemente de por cuantas pestañas
 * internas se haya navegado). Mismo estilo visual que BackButton (ver ese
 * archivo para el motivo del cambio a solo icono).
 */
export default function StaticBackLink({
  href,
  label = "Volver",
}: {
  href: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      // Mismo fondo calido que BackButton.tsx (--orion-warm-100/-200) -
      // ver ese archivo para el motivo del cambio respecto a bg-white.
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
    </Link>
  );
}
