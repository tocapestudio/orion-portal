import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

export default function ConsultaMaterialPage() {
  return (
    <SecondaryScreenShell fallbackHref="/biblioteca">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-dashed border-orion-navy-200 bg-white p-6 text-sm text-orion-navy-600">
          <p className="mb-2 font-semibold text-orion-navy-900">Consulta tu material</p>
          <p>
            Estructura reservada para adjuntos/documentación de apoyo (PDF, imágenes, vídeos)
            asociados a ejercicios y evaluaciones — pendiente de que se cierre el modelo de
            Diseñar, del que dependen los objetos a los que este material se adjuntará.
          </p>
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
