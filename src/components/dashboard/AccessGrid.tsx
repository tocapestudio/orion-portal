import Link from "next/link";
import NavIcon from "@/components/layout/NavIcon";

function AccessCard({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-orion-navy-100 bg-white text-center text-xs font-semibold text-orion-navy-800 shadow-sm transition hover:border-orion-navy-400 hover:shadow-md"
    >
      <NavIcon href={href} className="h-6 w-6 text-orion-navy-600" />
      {label.toUpperCase()}
    </Link>
  );
}

function WideAccessButton({
  href,
  label,
  showDot,
  tone,
}: {
  href: string;
  label: string;
  showDot?: boolean;
  tone: "green" | "gray";
}) {
  // Un paso mas intenso que antes dentro de la MISMA familia de Tailwind
  // (emerald-50->100, gray-100->200) - mas visibles sobre las tarjetas
  // blancas vecinas, sin llegar a un verde oscuro/gris oscuro ni a un tono
  // fluorescente. Solo afecta a estas 2 tarjetas de Inicio (WideAccessButton),
  // no a Chat/Configuracion de la barra superior ni de la barra lateral.
  const toneClasses =
    tone === "green"
      ? "bg-emerald-100 hover:border-emerald-300"
      : "bg-gray-200 hover:border-gray-300";

  return (
    <Link
      href={href}
      className={`relative flex h-16 items-center justify-center gap-2 rounded-xl border border-orion-navy-100 text-xs font-semibold text-orion-navy-800 shadow-sm transition hover:shadow-md ${toneClasses}`}
    >
      <NavIcon href={href} className="h-6 w-6 shrink-0 text-orion-navy-600" />
      <span>{label.toUpperCase()}</span>
      {showDot && (
        <span className="absolute right-2 top-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
      )}
    </Link>
  );
}

/**
 * Accesos principales de Inicio: composicion compacta con jerarquia
 * (Visual Lab destacado, mas grande y oscuro) en vez de una
 * cuadricula uniforme de 7 tarjetas iguales — sigue el flujo
 * original (FLUJO ORION.pdf / boceto de dashboard aportado).
 *
 * [Mi Agenda] [Perfiles]   [           ]
 * [Diseñar]   [Biblioteca] [ VISUAL LAB]
 * [   Chat   ] [Config.]   [           ]
 */
export default function AccessGrid({ hasUnreadChats }: { hasUnreadChats: boolean }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
        Accesos principales
      </h2>

      <div className="grid grid-cols-3 items-stretch gap-3">
        <div className="col-span-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <AccessCard href="/mi-agenda" label="Mi Agenda" />
            <AccessCard href="/perfiles" label="Perfiles" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <AccessCard href="/disenar" label="Diseñar" />
            <AccessCard href="/biblioteca" label="Biblioteca" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <WideAccessButton href="/chat" label="Chat" showDot={hasUnreadChats} tone="green" />
            <WideAccessButton href="/configuracion" label="Configuración" tone="gray" />
          </div>
        </div>

        <Link
          href="/visual-lab"
          // Degradado diagonal (135deg) de azul marino profundo a celeste/
          // turquesa: combina orion-navy-950/800 (tokens existentes, la
          // base oscura ya usada en el resto de la marca) con un paso
          // intermedio turquesa (#2a9dc9, sin token propio - puente visual
          // entre el navy y el celeste) y orion-sky (#4dc8e8, el MISMO
          // token exacto del triangulo de play de la tarjeta ORION Play -
          // ver text-orion-sky en visual-lab/page.tsx) como ultimo stop.
          // El celeste mas brillante se concentra SOLO en el 25% final
          // (75%->100%, la esquina inferior-derecha) a proposito: el texto
          // centrado (items-center/justify-center) nunca llega a pisar esa
          // esquina, así que puede permanecer blanco (igual que el diseño
          // original) sin perder contraste - verificado por calculo WCAG
          // en el centro del boton (~7.6:1, zona navy/turquesa intermedia)
          // y en los tonos oscuros (aun mayor contraste); solo la esquina
          // mas clara (100%, orion-sky puro) cae a ~2:1, pero el texto no
          // se renderiza ahi. NavIcon hereda este mismo blanco via
          // stroke="currentColor", sin clase de color propia.
          className="flex h-full flex-col items-center justify-center gap-2.5 rounded-2xl bg-[linear-gradient(135deg,var(--orion-navy-950)_0%,var(--orion-navy-800)_40%,#2a9dc9_75%,var(--orion-sky)_100%)] text-center text-base font-semibold text-white shadow-md transition hover:brightness-110"
        >
          <NavIcon href="/visual-lab" className="h-9 w-9" />
          VISUAL
          <br />
          LAB
        </Link>
      </div>
    </section>
  );
}
