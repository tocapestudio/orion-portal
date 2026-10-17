import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrograms } from "@/lib/data/programs";
import { getMyAthleteRoster } from "@/lib/data/athletes";
import { getClubNamesForAthletes, getClubsWithStats, getSports } from "@/lib/data/clubs";
import { getOccupationsForAthletes } from "@/lib/data/workProfile";
import ProgramRosterClient from "@/components/perfiles/ProgramRosterClient";
import ClubCard from "@/components/perfiles/ClubCard";
import CreateClubForm from "@/components/perfiles/CreateClubForm";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";
import { PROGRAM_COLOR } from "@/lib/programMeta";

export default async function ProgramaPage({
  params,
  searchParams,
}: {
  params: Promise<{ programa: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { programa } = await params;
  const { vista } = await searchParams;

  const programs = await getPrograms();
  const program = programs.find((p) => p.id === programa);
  if (!program) notFound();

  const isKeratos = programa === "keratos";
  const isAvanza = programa === "avanza";
  const view = vista === "clubes" ? "clubes" : "perfiles";

  // La busqueda ya no filtra aqui (server) — se pasa el roster completo del
  // programa a ProgramRosterClient, que filtra en cliente con el mismo
  // patron (estado local, sin query params) que RosterClient en /perfiles.
  const roster = await getMyAthleteRoster();
  const athletes = roster
    .filter((a) => a.programIds.includes(programa))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const clubNameByAthlete = isKeratos
    ? await getClubNamesForAthletes(athletes.map((a) => a.id))
    : new Map<string, string>();

  const occupationByAthlete = isAvanza
    ? await getOccupationsForAthletes(athletes.map((a) => a.id))
    : new Map<string, string>();

  const clubs = isKeratos && view === "clubes" ? await getClubsWithStats() : [];
  const sports = isKeratos && view === "clubes" ? await getSports() : [];

  const showClubesView = isKeratos && view === "clubes";

  return (
    <SecondaryScreenShell
      fallbackHref={showClubesView ? `/perfiles/${programa}?vista=perfiles` : "/perfiles"}
    >
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Programa
        </p>
        <h2 className="flex items-center gap-2 text-xl font-bold text-orion-navy-900">
          <span
            aria-hidden
            className={`h-4 w-4 shrink-0 rounded-sm ${PROGRAM_COLOR[program.id] ?? "bg-orion-navy-400"}`}
          />
          {program.label}
        </h2>
      </div>

      <ProgramRosterClient
        athletes={athletes}
        clubNameByAthleteId={Object.fromEntries(clubNameByAthlete)}
        occupationByAthleteId={Object.fromEntries(occupationByAthlete)}
        isKeratos={isKeratos}
        isAvanza={isAvanza}
        placeholder={isKeratos ? "Buscar por nombre o club" : "Buscar por nombre"}
        showClubesView={showClubesView}
        toolbarActions={
          <>
            {isKeratos && (
              <div className="flex gap-2 text-sm">
                <Link
                  href={`/perfiles/${programa}?vista=perfiles`}
                  className={`rounded-lg px-3 py-1.5 ${
                    view === "perfiles"
                      ? "bg-orion-navy-700 text-white"
                      : "border border-orion-navy-200 text-orion-navy-700"
                  }`}
                >
                  Perfiles
                </Link>
                <Link
                  href={`/perfiles/${programa}?vista=clubes`}
                  className={`rounded-lg px-3 py-1.5 ${
                    view === "clubes"
                      ? "bg-orion-navy-700 text-white"
                      : "border border-orion-navy-200 text-orion-navy-700"
                  }`}
                >
                  Clubes
                </Link>
              </div>
            )}
            {showClubesView ? (
              <CreateClubForm sports={sports} />
            ) : (
              <Link
                href={`/perfiles/nuevo?programa=${programa}`}
                className={`shrink-0 rounded-lg px-4 py-2 text-center text-sm font-semibold ${CREATE_ACTION_CLASSES}`}
              >
                + Crear perfil
              </Link>
            )}
          </>
        }
        clubsContent={
          <div className="space-y-4">
            {clubs.length === 0 && (
              <p className="py-8 text-center text-sm text-orion-navy-400">
                Todavía no hay clubes creados.
              </p>
            )}
            <div className="space-y-2">
              {clubs.map((c) => (
                <ClubCard key={c.id} club={c} />
              ))}
            </div>
          </div>
        }
      />
    </div>
    </SecondaryScreenShell>
  );
}
