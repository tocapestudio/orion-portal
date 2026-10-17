import PendingDecision from "@/components/ui/PendingDecision";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { DISENAR_PENDING_DECISIONS } from "@/lib/pendingDecisions";

export default function CrearSesionPage() {
  return (
    <SecondaryScreenShell fallbackHref="/disenar">
      <PendingDecision
        title="Crear sesión"
        pendingDecisions={[
          "core.sessions → core.session_activities → core.results ya existe y es la base — no se crea ningún modelo paralelo.",
          ...DISENAR_PENDING_DECISIONS,
        ]}
      />
    </SecondaryScreenShell>
  );
}
