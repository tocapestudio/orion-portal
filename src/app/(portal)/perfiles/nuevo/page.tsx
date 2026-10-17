import { getPrograms } from "@/lib/data/programs";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import NewAthleteForm from "./NewAthleteForm";

export default async function NuevoPerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ programa?: string }>;
}) {
  const [programs, { programa }] = await Promise.all([getPrograms(), searchParams]);

  return (
    <SecondaryScreenShell fallbackHref={programa ? `/perfiles/${programa}` : "/perfiles"}>
      <div className="mx-auto max-w-xl">
        <h2 className="mb-4 text-lg font-semibold text-orion-navy-900">Nuevo perfil</h2>
        <NewAthleteForm programs={programs} defaultProgram={programa} />
      </div>
    </SecondaryScreenShell>
  );
}
