import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import StimulusGeneratorClient from "@/components/visualLabTools/stimulusGenerator/StimulusGeneratorClient";

/**
 * 3er incremento: ya NO se envuelve en `max-w-2xl` aqui - el layout de
 * configuracion paso de una columna a dos (controles + vista previa) y
 * necesita mas ancho; StimulusGeneratorClient fija su propio max-width
 * por etapa (config/running/finished), incluida la pantalla de ejecucion
 * (`fixed inset-0`, pantalla completa real via CSS, independiente de
 * cualquier contenedor de esta pagina).
 */
export default function StimulusGeneratorPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab/tools">
      <StimulusGeneratorClient />
    </SecondaryScreenShell>
  );
}
