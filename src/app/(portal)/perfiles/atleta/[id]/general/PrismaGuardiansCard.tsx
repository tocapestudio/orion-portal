import CreateGuardianForm from "./CreateGuardianForm";
import GuardianRow from "./GuardianRow";
import type { PrismaGuardian } from "@/lib/data/prisma";

export default function PrismaGuardiansCard({
  athleteId,
  guardians,
}: {
  athleteId: string;
  guardians: PrismaGuardian[];
}) {
  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
        Tutores
      </p>

      <div className="mb-3 flex justify-end">
        <CreateGuardianForm athleteId={athleteId} />
      </div>

      {guardians.length === 0 ? (
        <p className="text-sm text-orion-navy-400">Todavía no hay tutores registrados.</p>
      ) : (
        <div className="grid gap-2 xl:grid-cols-2">
          {guardians.map((g) => (
            <GuardianRow key={g.id} guardian={g} />
          ))}
        </div>
      )}
    </div>
  );
}
