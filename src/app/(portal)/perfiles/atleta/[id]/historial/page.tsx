export default function HistorialTab() {
  return (
    <div className="rounded-xl border border-dashed border-orion-navy-200 bg-white p-6 text-sm text-orion-navy-600">
      <p className="mb-2 font-semibold text-orion-navy-900">Historial — pendiente de diseño</p>
      <p>
        Este historial unificado (entrenamiento en casa, en el centro, evaluaciones, sesiones
        de Visual Lab…) se construirá directamente sobre{" "}
        <code>core.sessions → core.session_activities → core.results</code> una vez se cierre
        el modelo de Diseñar/Biblioteca — no se deriva por coincidencia de fecha ni se crea
        ningún modelo paralelo.
      </p>
    </div>
  );
}
