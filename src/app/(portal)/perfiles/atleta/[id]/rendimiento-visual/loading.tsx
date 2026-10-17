/**
 * Convencion de Next.js (App Router): Next envuelve automaticamente a
 * page.tsx en un limite de Suspense cuando existe este archivo en el
 * mismo segmento de ruta - se muestra mientras el Server Component
 * (que hace `await getAthletePlayResults(id)`) sigue resolviendo.
 */
export default function RendimientoVisualLoading() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-orion-navy-100 bg-orion-navy-50"
        />
      ))}
    </div>
  );
}
