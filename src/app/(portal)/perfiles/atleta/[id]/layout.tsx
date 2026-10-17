import { notFound } from "next/navigation";
import { getAthleteById, getInternalCode, getAthleteStatus } from "@/lib/data/athletes";
import { getPrograms, getAthleteProgramIds } from "@/lib/data/programs";
import { getAthleteInvitations } from "@/lib/data/invitations";
import ProfileTabs from "@/components/perfiles/ProfileTabs";
import StatusToggle from "@/components/perfiles/StatusToggle";
import StartChatButton from "@/components/perfiles/StartChatButton";
import RemoveAthleteButton from "@/components/perfiles/RemoveAthleteButton";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import LastVisitedProfileTracker from "@/components/perfiles/LastVisitedProfileTracker";
import InviteSection from "./general/InviteSection";
import ProfilePhotoViewer from "@/components/perfiles/ProfilePhotoViewer";
import ProgramBadgesEditor from "./ProgramBadgesEditor";

export default async function AthleteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const athlete = await getAthleteById(id);
  if (!athlete) notFound();

  const [internalCode, programs, programIds, status, invitations] = await Promise.all([
    getInternalCode(id),
    getPrograms(),
    getAthleteProgramIds(id),
    getAthleteStatus(id),
    getAthleteInvitations(id),
  ]);
  const athletePrograms = programs.filter((p) => programIds.includes(p.id));

  return (
    <>
      <LastVisitedProfileTracker
        athleteId={id}
        fullName={athlete.full_name}
        shortId={athlete.short_id}
        programLabel={athletePrograms[0]?.label ?? null}
      />
      <SecondaryScreenShell
        backHref="/perfiles"
      header={
        // Ancho completo (igual que el contenido) — el margen lateral
        // real ya lo da el p-4/md:p-6 del <main> del portal, no hace
        // falta duplicarlo aqui. max-w-[1800px] es solo un tope de
        // cortesia para monitores ultra-anchos, nunca se activa en
        // resoluciones normales. Vive fuera del area con scroll del
        // shell — permanece visible sin position:sticky ni margenes
        // negativos, simplemente porque nunca esta dentro del contenedor
        // que se desplaza.
        //
        // Franja compacta (punto intermedio: ni la cabecera grande
        // original ni la ultra-estrecha de la iteracion anterior) y el
        // recuadro de Invitar a ORION son dos columnas HERMANAS de igual
        // altura (items-stretch), no un bloque dentro del otro — asi el
        // recuadro de invitacion nunca se convierte en una tarjeta
        // vertical grande, solo ocupa la altura real de la cabecera (y
        // crece/encoge automaticamente si la cabecera lo hace).
        <div className="mx-auto flex w-full max-w-[1800px] items-stretch gap-3">
          <div className="min-w-0 flex-1 space-y-4 rounded-xl border border-orion-navy-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProfilePhotoViewer src={athlete.profile_image} size={56} />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-orion-navy-900">
                    {athlete.full_name}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="shrink-0 text-xs text-orion-navy-500">
                      #{athlete.short_id}
                      {internalCode ? ` · ${internalCode}` : ""}
                    </span>
                    <ProgramBadgesEditor
                      athleteId={id}
                      athlete={athlete}
                      programs={programs}
                      programIds={programIds}
                    />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusToggle athleteId={id} status={status} />
                <StartChatButton athleteUserId={athlete.user_id} />
                <RemoveAthleteButton athleteId={id} fullName={athlete.full_name} />
              </div>
            </div>

            <ProfileTabs athleteId={id} />
          </div>

          <div className="flex w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-orion-navy-100 bg-white p-3 text-center">
            <InviteSection
              compact
              athleteId={id}
              athleteUserId={athlete.user_id}
              latestInvitation={invitations[0] ?? null}
            />
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[1800px] lg:h-full lg:min-h-0">{children}</div>
      </SecondaryScreenShell>
    </>
  );
}
