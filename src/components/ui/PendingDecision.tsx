export default function PendingDecision({
  title,
  pendingDecisions,
}: {
  title: string;
  pendingDecisions: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-orion-navy-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-orion-navy-900">{title}</h2>
      <p className="mb-3 text-sm text-orion-navy-600">
        La estructura de navegación existe; la implementación del constructor se deja
        deliberadamente pendiente hasta cerrar estas decisiones de producto:
      </p>
      <ul className="list-inside list-disc space-y-1 text-sm text-orion-navy-700">
        {pendingDecisions.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  );
}
