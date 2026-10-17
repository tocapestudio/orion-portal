import { getEvaluationTemplates } from "@/lib/data/library";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import EvaluationsClient from "./EvaluationsClient";

export default async function MisEvaluacionesPage() {
  const { own, defaults } = await getEvaluationTemplates();

  return (
    <SecondaryScreenShell fallbackHref="/biblioteca">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-orion-navy-500">
          Plantillas reutilizables de evaluación (core.evaluation_templates), separadas de las
          evaluaciones clínicas privadas del perfil y de las actividades ejecutables en sesión.
        </p>
        <EvaluationsClient own={own} defaults={defaults} />
      </div>
    </SecondaryScreenShell>
  );
}
