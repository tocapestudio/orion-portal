import { getAthleteById, getMyClubForAthlete } from "@/lib/data/athletes";
import { getAthleteProgramIds } from "@/lib/data/programs";
import { getAthleteBoard, getAthleteClubTeam } from "@/lib/data/perfil";
import { getClubs, getTeamCategoriesByClub } from "@/lib/data/clubs";
import { getWorkProfile } from "@/lib/data/workProfile";
import {
  getPrismaProfile,
  getPrismaGuardians,
  getPrismaGuardianNotes,
  getPrismaProfessionalNotes,
} from "@/lib/data/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import GeneralForm from "./GeneralForm";
import VisualPerformanceSummary from "./VisualPerformanceSummary";
import SportsDataSection from "./SportsDataSection";
import ProfessionalDataCard from "./ProfessionalDataCard";
import PrismaChildInfoCard from "./PrismaChildInfoCard";
import PrismaGuardiansCard from "./PrismaGuardiansCard";
import PrismaSchoolCard from "./PrismaSchoolCard";
import PrismaReferralCard from "./PrismaReferralCard";
import PrismaTherapyPlanCard from "./PrismaTherapyPlanCard";
import PrismaObservationsCard from "./PrismaObservationsCard";
import BoardSection from "./BoardSection";

export default async function GeneralTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [athlete, club, team, programIds, board, clubs] = await Promise.all([
    getAthleteById(id),
    getMyClubForAthlete(id),
    getAthleteClubTeam(id),
    getAthleteProgramIds(id),
    getAthleteBoard(id),
    getClubs(),
  ]);

  if (!athlete) return null;
  const isKeratos = programIds.includes("keratos");
  const isAvanza = programIds.includes("avanza");
  const isPrisma = programIds.includes("prisma");
  const currentClubId = club?.club_id ?? null;
  const categories = currentClubId ? await getTeamCategoriesByClub(currentClubId) : [];

  // Datos profesionales (AVANZA): admin/profesional pueden gestionar; el
  // propio atleta solo puede consultar; coach/researcher no ven la tarjeta.
  // La proteccion real es el RLS de core.athlete_work_profile — esto solo
  // evita mostrar controles que fallarian igualmente al intentar usarlos.
  const currentUser = await getCurrentUser();
  const roles = currentUser?.roles ?? [];
  const isSelfAthlete = Boolean(currentUser && athlete.user_id === currentUser.id);
  const canEditWorkProfile = roles.includes("admin") || roles.includes("professional");
  const canViewWorkProfile = canEditWorkProfile || isSelfAthlete;
  const workProfile =
    isAvanza && canViewWorkProfile ? await getWorkProfile(id) : null;

  // PRISMA: esta ficha solo la ven profesional/admin (no existe policy de
  // tutor ni de self-athlete sobre core.athletes para un niño de PRISMA),
  // asi que no hace falta distinguir canView de canEdit como en AVANZA.
  const canManagePrisma = roles.includes("admin") || roles.includes("professional");
  const [prismaProfile, prismaGuardians, prismaGuardianNotes, prismaProfessionalNotes] =
    isPrisma && canManagePrisma
      ? await Promise.all([
          getPrismaProfile(id),
          getPrismaGuardians(id),
          getPrismaGuardianNotes(id),
          getPrismaProfessionalNotes(id),
        ])
      : [null, [], [], []];

  const hasContextualInfo = isKeratos || (isAvanza && canViewWorkProfile) || (isPrisma && canManagePrisma);

  return (
    <div className="space-y-4">
      {/* Fila superior: Datos Personales (~60%, con Notas integradas) + Métricas (~40%) */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <GeneralForm athlete={athlete} programIds={programIds} />

        <div className="flex min-h-0 flex-col rounded-xl border border-orion-navy-100 bg-white p-5">
          <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
            Rendimiento visual
          </p>
          {/* Sin min-height propio a proposito: esta tarjeta NUNCA crece
              para encajar el grafico - su altura la sigue marcando la
              columna hermana (GeneralForm); el radar (viewBox +
              preserveAspectRatio="meet") se encoge para caber en lo que
              quede, sin recortar etiquetas. */}
          <div className="min-h-0 flex-1">
            <VisualPerformanceSummary athleteId={id} />
          </div>
        </div>
      </div>

      {/* Fila inferior: contexto profesional/club/PRISMA (~40%) + Tablón
          (~60%, necesita mas ancho real: publicaciones/imagenes del
          profesional, ya no un panel lateral estrecho) - grid INDEPENDIENTE
          de la fila superior (otro <div>, no la misma cuadricula), asi que
          este cambio de proporcion no afecta en nada a Datos
          Personales/Rendimiento Visual de arriba. Sin `items-start`: se
          deja el `align-items: stretch` por defecto de CSS Grid - ambas
          tarjetas (cada una un simple <div> de flujo normal, sin flex
          interno que reparta su contenido) se estiran hasta igualar la
          altura de la mas alta, con su contenido alineado arriba por
          flujo normal de bloque - ningun campo ni boton se estira, solo
          el borde/fondo de la tarjeta crece para igualar bordes. */}
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-6">
          {/* h-full: este wrapper (space-y-6, que es el propio elemento
              del grid) ya recibe una altura RESUELTA (no "auto") del
              align-items:stretch de la fila - un hijo con h-full hereda
              esa misma altura resuelta, y SportsDataSection.tsx tambien
              tiene h-full en su propio div raiz, asi que su borde llega
              a igualar exactamente el del Tablón (la otra columna del
              grid, sin wrapper intermedio, ya se estira directamente).
              El contenido interno de SportsDataSection sigue en flujo de
              bloque normal - queda arriba, nada se estira. */}
          {isKeratos && (
            <div className="h-full">
              <SportsDataSection
                athleteId={id}
                currentClubId={currentClubId}
                currentClubName={club ? (club.clubs as { name: string } | null)?.name ?? null : null}
                clubs={clubs}
                currentCategory={
                  team ? (team.teams as { category: string | null } | null)?.category ?? null : null
                }
                currentPosition={team?.position ?? null}
                currentDorsal={team?.dorsal ?? null}
                categories={categories}
              />
            </div>
          )}

          {isAvanza && canViewWorkProfile && (
            <ProfessionalDataCard
              athleteId={id}
              workProfile={workProfile}
              canEdit={canEditWorkProfile}
            />
          )}

          {isPrisma && canManagePrisma && (
            <>
              <PrismaChildInfoCard athleteId={id} profile={prismaProfile} />
              <PrismaGuardiansCard athleteId={id} guardians={prismaGuardians} />
              <PrismaSchoolCard athleteId={id} profile={prismaProfile} />
              <PrismaReferralCard athleteId={id} profile={prismaProfile} />
              <PrismaTherapyPlanCard athleteId={id} profile={prismaProfile} />
              <PrismaObservationsCard
                athleteId={id}
                guardianNotes={prismaGuardianNotes}
                professionalNotes={prismaProfessionalNotes}
              />
            </>
          )}

          {!hasContextualInfo && (
            <div className="rounded-xl border border-dashed border-orion-navy-200 bg-white p-5">
              <p className="text-sm text-orion-navy-400">
                Sin información contextual adicional para este perfil.
              </p>
            </div>
          )}
        </div>

        <BoardSection athleteId={id} board={board} />
      </div>
    </div>
  );
}
