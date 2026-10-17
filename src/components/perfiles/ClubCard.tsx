import Avatar from "@/components/ui/Avatar";
import { sportColor, sportLabel } from "@/lib/sportColors";
import type { ClubWithStats } from "@/lib/data/clubs";

export default function ClubCard({ club }: { club: ClubWithStats }) {
  const color = sportColor(club.sportId);

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-orion-navy-100 bg-white py-3 pl-3 pr-4 text-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <Avatar src={club.logo_url} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-orion-navy-900">{club.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-xs text-orion-navy-500">{sportLabel(club.sportId)}</span>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-orion-navy-100 px-2 py-0.5 text-xs text-orion-navy-600">
        {club.profileCount} perfil{club.profileCount === 1 ? "" : "es"}
      </span>
    </div>
  );
}
