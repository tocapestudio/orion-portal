import Link from "next/link";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

const ITEMS = [
  { href: "/disenar/crear-ejercicio", label: "Crear ejercicio" },
  { href: "/disenar/crear-evaluacion", label: "Crear evaluación" },
  { href: "/disenar/crear-sesion", label: "Crear sesión" },
];

export default function DisenarPage() {
  return (
    <SecondaryScreenShell backHref="/inicio">
      <div className="mx-auto max-w-xl space-y-3">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl border border-orion-navy-100 bg-white px-5 py-4 text-sm font-medium text-orion-navy-900 shadow-sm hover:border-orion-navy-400 hover:shadow-md"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </SecondaryScreenShell>
  );
}
