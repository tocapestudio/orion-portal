import Image from "next/image";
import Link from "next/link";

/**
 * Logo universal — siempre pulsable para volver a Inicio, en
 * cualquier pantalla del Portal (incluidas las de cada modulo de
 * Visual Lab en el futuro).
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/inicio" className={`inline-flex items-center gap-2 ${className}`}>
      <Image src="/brand/icon.png" alt="" width={32} height={32} priority />
      <span className="hidden text-sm font-semibold tracking-wide text-orion-navy-900 sm:inline">
        ORION VISUAL LAB
      </span>
    </Link>
  );
}
