import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import PanalesClient from "@/components/visualLabTools/cartas/panales/PanalesClient";

/**
 * `backHref` apunta directamente al hub de Tools (no a un sub-hub de
 * Cartas) a proposito: la navegacion entre herramientas de Cartas vive
 * en CartasNav, dentro de la propia pagina (igual que en Hart/McDonald).
 */
export default function PanalesPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab/tools">
      <PanalesClient />
    </SecondaryScreenShell>
  );
}
