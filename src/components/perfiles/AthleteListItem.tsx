import Link from "next/link";
import Avatar from "@/components/ui/Avatar";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-orion-navy-100 text-orion-navy-500",
  ended: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  ended: "Finalizado",
};

interface AthleteListItemAthlete {
  id: string;
  full_name: string;
  short_id: number;
  profile_image?: string | null;
}

function ClubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
    >
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3Z" />
    </svg>
  );
}

function ProfessionIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
    >
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

export default function AthleteListItem({
  athlete,
  subtitle,
  subtitleType,
  programLabel,
  status,
}: {
  athlete: AthleteListItemAthlete;
  /** Dato especifico del programa: club (Keratos) o profesion (Avanza). */
  subtitle?: string | null;
  /** Controla el icono que acompana al subtitulo. */
  subtitleType?: "club" | "profession";
  programLabel?: string;
  status?: string;
}) {
  const statusKey = status === "inactive" || status === "ended" ? status : "active";

  return (
    <Link
      href={`/perfiles/atleta/${athlete.id}`}
      className="flex items-center gap-3 rounded-lg border border-orion-navy-100 bg-white px-4 py-3 text-sm hover:border-orion-navy-400"
    >
      <Avatar src={athlete.profile_image} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-orion-navy-900">{athlete.full_name}</p>
        {subtitle && (
          <p className="flex items-center gap-1 truncate text-xs text-orion-navy-500">
            {subtitleType === "club" && <ClubIcon />}
            {subtitleType === "profession" && <ProfessionIcon />}
            <span className="truncate">{subtitle}</span>
          </p>
        )}
        <p className="truncate text-xs text-orion-navy-400">
          {programLabel ? `${programLabel.toUpperCase()} · ` : ""}ORION ID #{athlete.short_id}
        </p>
      </div>
      {status && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[statusKey]}`}
        >
          {STATUS_LABEL[statusKey]}
        </span>
      )}
    </Link>
  );
}
