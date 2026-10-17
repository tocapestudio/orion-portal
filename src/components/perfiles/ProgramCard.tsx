import Link from "next/link";
import { PROGRAM_DESCRIPTIONS } from "@/lib/programMeta";

const STYLES: Record<string, string> = {
  prisma: "from-amber-500 to-amber-700",
  keratos: "from-orion-navy-700 to-orion-navy-900",
  avanza: "from-teal-500 to-teal-700",
};

export default function ProgramCard({
  id,
  label,
  description,
}: {
  id: string;
  label: string;
  description: string | null;
}) {
  return (
    <Link
      href={`/perfiles/${id}`}
      className={`flex h-32 flex-col justify-between rounded-xl bg-gradient-to-br p-4 text-white shadow-sm transition hover:shadow-md ${
        STYLES[id] ?? "from-orion-navy-600 to-orion-navy-800"
      }`}
    >
      <span className="text-lg font-bold tracking-wide">{label}</span>
      <span className="text-xs text-white/80">
        {description ?? PROGRAM_DESCRIPTIONS[id] ?? "—"}
      </span>
    </Link>
  );
}
