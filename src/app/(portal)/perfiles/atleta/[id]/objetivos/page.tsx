import { getGoals } from "@/lib/data/perfil";
import { getCurrentUser } from "@/lib/auth/session";
import GoalForm from "./GoalForm";
import GoalCard from "./GoalCard";

/**
 * Objetivos: generales (25%) | especificos (45%) | logros (30%), TRES
 * COLUMNAS en horizontal (no filas). En pantallas lg+ es un grid de 3
 * columnas con esa proporcion exacta (grid-cols-[25fr_45fr_30fr]) +
 * grid-rows-[minmax(0,1fr)] (fuerza la unica fila a ocupar el 100% de
 * lg:h-full de forma ESTABLE, tenga poco o mucho contenido — sin esto el
 * alto de la fila dependia del contenido y las 3 columnas podian quedar
 * de alturas distintas cuando habia pocos objetivos). Cada columna es
 * flex-col con su lista interior en lg:flex-1 + lg:overflow-y-auto: la
 * lista es la que se acota y hace scroll por dentro, nunca la columna ni
 * la pagina (modo antiscroll). En movil cae a un stack vertical normal
 * sin alturas forzadas.
 *
 * "+ Nuevo objetivo" vive DENTRO de la cabecera de la columna Generales
 * (misma altura que los titulos de Especificos/Logros), no como barra
 * aparte por encima de las 3 columnas.
 *
 * Logros sigue siendo un placeholder a proposito: la logica automatica de
 * achievements se conecta en otra fase, cuando esten listas sus fuentes
 * de actividad real (ORION Play, sesiones, ejercicios, etc.).
 *
 * canEdit solo evita mostrar controles que fallarian igual bajo RLS
 * (professional CRUD de sus atletas, resto SELECT) — misma convencion que
 * ProfessionalDataCard/FichaOptometricaForm.
 */
export default async function ObjetivosTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [goals, currentUser] = await Promise.all([getGoals(id), getCurrentUser()]);

  const roles = currentUser?.roles ?? [];
  const canEdit = roles.includes("admin") || roles.includes("professional");

  const generalGoals = goals.filter((g) => g.goal_type === "general");
  const specificGoals = goals.filter((g) => g.goal_type !== "general");

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[25fr_45fr_30fr] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex flex-col rounded-xl border border-orion-navy-100 bg-white p-5 lg:min-h-0">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Objetivos generales</p>
          {canEdit && <GoalForm athleteId={id} />}
        </div>
        {generalGoals.length === 0 ? (
          <p className="text-sm text-orion-navy-400">Todavía no hay objetivos generales.</p>
        ) : (
          <div className="space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {generalGoals.map((g) => (
              <GoalCard key={g.id} goal={g} athleteId={id} canEdit={canEdit} emphasize />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col rounded-xl border border-orion-navy-100 bg-white p-5 lg:min-h-0">
        <p className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Objetivos específicos
        </p>
        {specificGoals.length === 0 ? (
          <p className="text-sm text-orion-navy-400">Todavía no hay objetivos específicos.</p>
        ) : (
          <div className="space-y-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {specificGoals.map((g) => (
              <GoalCard key={g.id} goal={g} athleteId={id} canEdit={canEdit} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col rounded-xl border border-dashed border-orion-navy-200 bg-white p-5 lg:min-h-0">
        <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Logros</p>
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <p className="text-sm text-orion-navy-400">
            Panel de logros automáticos — pendiente de conectar con las fuentes de actividad real (ORION Play,
            sesiones, ejercicios, etc.).
          </p>
        </div>
      </div>
    </div>
  );
}
