import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import HartClient from "@/components/visualLabTools/cartas/hart/HartClient";

/**
 * `backHref` apunta directamente al hub de Tools (no a un sub-hub de
 * Cartas) a proposito: la tarjeta "Cartas" del hub abre Hart
 * directamente (todavia no existe un submenu intermedio de Cartas,
 * solo esta implementada esta herramienta de momento).
 */
export default function HartPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab/tools">
      <HartClient />
    </SecondaryScreenShell>
  );
}
