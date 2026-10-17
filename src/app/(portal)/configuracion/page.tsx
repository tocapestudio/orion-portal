import { getCurrentUser } from "@/lib/auth/session";
import RoleBadge from "@/components/ui/RoleBadge";
import { signOut } from "./actions";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

export default async function ConfiguracionPage() {
  const user = await getCurrentUser();

  return (
    <SecondaryScreenShell backHref="/inicio">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
            Perfil profesional
          </p>
          <p className="text-sm text-orion-navy-900">{user?.fullName ?? user?.email}</p>
          <p className="text-xs text-orion-navy-500">{user?.email}</p>
          <div className="mt-2 flex gap-1.5">
            {(user?.roles ?? []).map((r) => (
              <RoleBadge key={r} role={r} />
            ))}
          </div>
          <button
            disabled
            className="mt-4 cursor-not-allowed rounded-lg bg-orion-navy-300 px-4 py-2 text-sm font-semibold text-white"
          >
            Editar perfil (próximamente)
          </button>
        </div>

        <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
            Preferencias
          </p>
          <div className="flex items-center justify-between text-sm text-orion-navy-700">
            <span>Tema claro / oscuro</span>
            <button
              disabled
              className="cursor-not-allowed rounded-full bg-orion-navy-100 px-3 py-1 text-xs text-orion-navy-400"
            >
              Próximamente
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
            Soporte
          </p>
          <p className="text-sm text-orion-navy-600">
            Contacto con soporte — estructura pendiente de definir canal.
          </p>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </SecondaryScreenShell>
  );
}
