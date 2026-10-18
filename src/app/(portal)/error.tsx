"use client";

/**
 * Limite de error compartido por todo el grupo (portal) - convencion
 * de Next.js (App Router). Solo se activa si una pagina lanza una
 * excepcion de verdad (p.ej. un fallo real de red/consulta al cargar
 * atletas o eventos - ver getMyAthletes()/getTodayEvents()/
 * getMyCalendarEvents()), nunca ante un "sin resultados" legitimo,
 * que esas funciones ya devuelven como array vacio. Un solo archivo
 * aqui cubre Inicio/Perfiles/Mi Agenda/etc. sin duplicar uno por
 * pantalla. Debe ser "use client" - requisito de Next.js para error.tsx.
 */
export default function PortalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      <p className="font-semibold">No se pudo cargar esta pantalla.</p>
      <p className="mt-1 text-red-600">Inténtalo de nuevo en unos segundos.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
      >
        Reintentar
      </button>
    </div>
  );
}
