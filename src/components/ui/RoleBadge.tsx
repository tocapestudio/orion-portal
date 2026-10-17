import { roleLabel, type PortalRole } from "@/lib/auth/session";

export default function RoleBadge({ role }: { role: PortalRole }) {
  return (
    <span className="inline-flex items-center rounded-full bg-orion-navy-100 px-3 py-1 text-sm font-medium text-orion-navy-700">
      {roleLabel(role)}
    </span>
  );
}
