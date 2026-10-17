import Link from "next/link";
import { getMySessions } from "@/lib/data/sessions";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

export default async function MisSesionesPage() {
  const sessions = await getMySessions();

  return (
    <SecondaryScreenShell fallbackHref="/biblioteca">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-xs text-orion-navy-500">
          Lectura real de <code>core.sessions</code> (sin catálogo/búsqueda todavía — pendiente
          de cerrar el modelo de Diseñar). La creación de sesiones se hace en Diseñar → Crear
          sesión, aún sin constructor.
        </p>

        {sessions.length === 0 ? (
          <p className="rounded-xl border border-orion-navy-100 bg-white p-6 text-center text-sm text-orion-navy-400">
            Todavía no hay sesiones registradas.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-orion-navy-100 bg-white p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-orion-navy-900">
                    {s.athleteName ?? "Sin atleta"} · {new Date(s.startedAt).toLocaleString("es-ES")}
                  </p>
                  <p className="text-xs text-orion-navy-500">
                    {s.activityCount} actividad{s.activityCount === 1 ? "" : "es"} · iniciada por{" "}
                    {s.initiatedBy} · {s.status}
                  </p>
                </div>
                <Link
                  href={`/perfiles/atleta/${s.athleteId}/historial`}
                  className="text-xs font-medium text-orion-navy-600 hover:underline"
                >
                  Ver perfil →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </SecondaryScreenShell>
  );
}
