/**
 * Formato compartido de valores reales vs. placeholders vacios en toda la
 * Ficha Optometrica (Rx, AV, Queratometria, Prismas, PIO) — los valores
 * reales deben tener claramente mas peso visual que el "—" de un campo
 * vacio. Pura presentacion, no toca el modelo de datos.
 */
export function FichaValue({ value, suffix = "" }: { value: string | number | null; suffix?: string }) {
  if (value == null || value === "") {
    return <span className="text-orion-navy-300">—</span>;
  }
  return (
    <span className="font-semibold text-orion-navy-800">
      {value}
      {suffix}
    </span>
  );
}

/**
 * +4 -> "+4.00", 0.5 -> "+0.50", -1.25 -> "-1.25", 0 -> "0", null -> "". El
 * signo nunca se almacena como texto (sigue siendo numeric en Core) — esto
 * es solo formato de entrada/salida para Esfera, Cilindro, Add VI y Add VP,
 * donde el signo es clinicamente significativo (no aplica a Eje).
 *
 * toFixed(2) es necesario, no cosmetico: numeric en Postgres SI preserva
 * los decimales introducidos (4.00 se guarda como 4.00), pero esa
 * informacion se pierde en el viaje JSON -> JS Number (JSON.parse("4.00")
 * da el number 4, sin ningun rastro de los ceros) antes de que este codigo
 * se ejecute — por eso NO basta con `${v}`, hay que fijar siempre 2
 * decimales al formatear, igual en lectura que en el valor por defecto del
 * input de edicion.
 */
export function formatSigned(v: number | null): string {
  if (v == null) return "";
  if (v === 0) return "0";
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}
