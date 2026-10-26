import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import McDonaldClient from "@/components/visualLabTools/cartas/mcdonald/McDonaldClient";

/**
 * `backHref` apunta directamente al hub de Tools (no a un sub-hub de
 * Cartas) a proposito: la navegacion entre herramientas de Cartas vive
 * en CartasNav, dentro de la propia pagina (igual que en Hart).
 */
export default function McDonaldPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab/tools">
      <McDonaldClient />
    </SecondaryScreenShell>
  );
}
