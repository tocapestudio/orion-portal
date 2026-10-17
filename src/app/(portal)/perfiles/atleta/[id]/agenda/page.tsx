import { getCalendarEventsForAthlete, getMyEventNotes } from "@/lib/data/agenda";
import { getAssignmentsForAthlete } from "@/lib/data/assignments";
import { getMyExercises } from "@/lib/data/library";
import { getMyAthletes } from "@/lib/data/athletes";
import { getClubs } from "@/lib/data/clubs";
import { getCurrentUser } from "@/lib/auth/session";
import ProfileAgendaClient from "./ProfileAgendaClient";

export default async function AgendaTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [events, assignments, manualActivities, currentUser, professionalAthletes, clubs, eventNotes] =
    await Promise.all([
      getCalendarEventsForAthlete(id),
      getAssignmentsForAthlete(id),
      getMyExercises(),
      getCurrentUser(),
      getMyAthletes(),
      getClubs(),
      getMyEventNotes(),
    ]);

  const roles = currentUser?.roles ?? [];
  const canEdit = roles.includes("admin") || roles.includes("professional");

  return (
    <ProfileAgendaClient
      athleteId={id}
      events={events}
      assignments={assignments}
      manualActivities={manualActivities}
      canEdit={canEdit}
      professionalAthletes={professionalAthletes.map((a) => ({
        id: a.id,
        label: a.full_name,
        shortId: a.short_id,
      }))}
      clubs={clubs.map((c) => ({ id: c.id, label: c.name }))}
      eventNotes={eventNotes}
    />
  );
}
