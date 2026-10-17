import Link from "next/link";

export default function RegistroPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-orion-navy-100 px-6 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-orion-navy-900">
          Solicita tu registro
        </h1>
        <p className="mb-6 text-sm text-orion-navy-500">
          ORION Visual Lab no tiene alta abierta. El acceso se concede así:
        </p>

        <ul className="mb-6 space-y-2 text-sm text-orion-navy-700">
          <li>
            <strong>Profesional</strong> — invitado/creado por un Administrador.
          </li>
          <li>
            <strong>Usuario</strong> — invitado/creado por su Profesional.
          </li>
          <li>
            <strong>Entrenador</strong> — autorizado/invitado por su club o equipo.
          </li>
        </ul>

        <form className="space-y-4 opacity-60">
          <div>
            <label className="mb-1 block text-sm font-medium text-orion-navy-900">
              Nombre y apellidos
            </label>
            <input
              disabled
              className="w-full rounded-lg border border-orion-navy-200 bg-orion-navy-100 px-3 py-2 text-sm"
              placeholder="Próximamente"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-orion-navy-900">
              Email
            </label>
            <input
              disabled
              className="w-full rounded-lg border border-orion-navy-200 bg-orion-navy-100 px-3 py-2 text-sm"
              placeholder="Próximamente"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-orion-navy-900">
              ¿Qué perfil solicitas?
            </label>
            <select
              disabled
              className="w-full rounded-lg border border-orion-navy-200 bg-orion-navy-100 px-3 py-2 text-sm"
            >
              <option>Profesional</option>
              <option>Entrenador</option>
            </select>
          </div>
          <button
            disabled
            type="button"
            className="w-full cursor-not-allowed rounded-lg bg-orion-navy-300 px-4 py-2 text-sm font-semibold text-white"
          >
            Flujo de solicitud pendiente de activar
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-orion-navy-500 hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
