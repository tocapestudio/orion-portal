"use client";

/**
 * Convencion de Next.js (App Router): limite de error para este
 * segmento de ruta - solo se activa si page.tsx lanza una excepcion de
 * verdad (p.ej. un fallo de autenticacion al crear el cliente de
 * Supabase), nunca ante un simple "sin resultados" (ese caso ya lo
 * devuelve getAthletePlayResults como array vacio, gestionado dentro de
 * page.tsx). Debe ser "use client" - requisito de Next.js para
 * error.tsx.
 */
export default function RendimientoVisualError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      <p className="font-semibold">No se pudieron cargar los resultados de ORION Play.</p>
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
