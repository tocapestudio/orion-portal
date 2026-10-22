import Link from "next/link";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

/**
 * Hub real de ORION Tools (pisa al [modality] generico para id='tools',
 * mismo mecanismo ya usado por visual-lab/play y visual-lab/react -
 * confirmado en la auditoria previa, ningun cambio a ese mecanismo).
 *
 * Primer incremento: solo "Generador de estimulos" es un enlace real.
 * "Optotipos" se muestra como tarjeta deshabilitada ("Próximamente") -
 * explicitamente fuera de alcance de este incremento, no un enlace roto.
 */
export default function VisualLabToolsPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab">
      <div className="mx-auto max-w-xl space-y-3">
        <Link
          href="/visual-lab/tools/stimulus-generator"
          className="block rounded-xl border border-orion-navy-100 bg-white px-5 py-4 text-sm font-medium text-orion-navy-900 shadow-sm hover:border-orion-navy-400 hover:shadow-md"
        >
          Generador de estímulos
        </Link>
        <div
          className="flex items-center justify-between rounded-xl border border-orion-navy-100 bg-orion-navy-50/50 px-5 py-4 text-sm font-medium text-orion-navy-400 opacity-80"
          aria-disabled="true"
        >
          <span>Optotipos</span>
          <span className="text-xs font-normal text-orion-navy-300">Próximamente</span>
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
