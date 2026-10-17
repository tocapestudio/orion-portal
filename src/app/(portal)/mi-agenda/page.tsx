import { getMyCalendarEvents, getMyEventNotes } from "@/lib/data/agenda";
import { getMyAthletes } from "@/lib/data/athletes";
import { getClubs } from "@/lib/data/clubs";
import AgendaClient from "@/components/agenda/AgendaClient";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

export default async function MiAgendaPage() {
  const [events, athletes, clubs, notes] = await Promise.all([
    getMyCalendarEvents(),
    getMyAthletes(),
    getClubs(),
    getMyEventNotes(),
  ]);

  return (
    <SecondaryScreenShell backHref="/inicio">
      <AgendaClient
        events={events}
        athletes={athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }))}
        clubs={clubs.map((c) => ({ id: c.id, label: c.name }))}
        notes={notes}
      />
    </SecondaryScreenShell>
  );
}
