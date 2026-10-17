/**
 * Etiqueta de procedencia compartida por los 5 bloques clinicos de la
 * Ficha (Rx, Queratometria, AV SC/CC, Prismas, PIO) — modelo hibrido.
 * Solo se muestra para source='evaluation' (con su fecha de origen): el
 * caso 'manual' es el mas frecuente en varios bloques y mostrar "Manual"
 * ahi es ruido visual, no informacion nueva — a peticion expresa del
 * usuario se omite, pero el campo source sigue existiendo y funcionando
 * en Core/logica hibrida sin cambios, esto es solo presentacion.
 */
export default function SourceBadge({
  source,
  date,
}: {
  source: string | null | undefined;
  date?: string | null;
}) {
  if (!source || source === "manual") return null;

  const formatted = date
    ? new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <span className="text-[10px] font-medium text-emerald-600">
      Procede de evaluación{formatted ? ` · ${formatted}` : ""}
    </span>
  );
}
