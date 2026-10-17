import PendingDecision from "@/components/ui/PendingDecision";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { DISENAR_PENDING_DECISIONS } from "@/lib/pendingDecisions";

export default function CrearEjercicioPage() {
  return (
    <SecondaryScreenShell fallbackHref="/disenar">
      <PendingDecision title="Crear ejercicio" pendingDecisions={DISENAR_PENDING_DECISIONS} />
    </SecondaryScreenShell>
  );
}
