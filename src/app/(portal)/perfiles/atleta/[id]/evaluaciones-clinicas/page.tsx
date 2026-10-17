import { getClinicalEvaluationSummaries } from "@/lib/data/perfil";
import { getEvaluationTemplates } from "@/lib/data/library";
import { getCurrentUser } from "@/lib/auth/session";
import FichaOptometricaCard from "./FichaOptometricaCard";
import EvaluacionesClinicasSection from "./EvaluacionesClinicasSection";

export default async function EvaluacionesClinicasTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [summaries, { own, defaults }, currentUser] = await Promise.all([
    getClinicalEvaluationSummaries(id),
    getEvaluationTemplates("clinical"),
    getCurrentUser(),
  ]);
  const templates = [...defaults, ...own.filter((t) => !defaults.some((d) => d.id === t.id))];

  // Igual que canEditWorkProfile en general/page.tsx: la Ficha Optometrica
  // es dato clinico sin policy de atleta/coach en Core (ver migracion
  // 20261001110000) — canEdit solo evita mostrar controles que fallarian
  // igualmente al guardar, RLS es la proteccion real.
  const roles = currentUser?.roles ?? [];
  const canEdit = roles.includes("admin") || roles.includes("professional");

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <FichaOptometricaCard athleteId={id} canEdit={canEdit} />
      <EvaluacionesClinicasSection athleteId={id} summaries={summaries} templates={templates} />
    </div>
  );
}
