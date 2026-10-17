import Link from "next/link";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

const ITEMS = [
  { href: "/biblioteca/mis-ejercicios", label: "Mis ejercicios" },
  { href: "/biblioteca/mis-evaluaciones", label: "Mis evaluaciones" },
  { href: "/biblioteca/mis-sesiones", label: "Mis sesiones" },
  { href: "/biblioteca/consulta-material", label: "Consulta tu material" },
];

export default function BibliotecaPage() {
  return (
    <SecondaryScreenShell backHref="/inicio">
      <div className="mx-auto max-w-2xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-orion-navy-100 bg-white px-5 py-4 text-sm font-medium text-orion-navy-900 shadow-sm hover:border-orion-navy-400 hover:shadow-md"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
