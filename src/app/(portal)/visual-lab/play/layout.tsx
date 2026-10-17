import type { ReactNode } from "react";

/**
 * Layout de ORION Play - VACIADO deliberadamente en la corrección
 * arquitectónica posterior a la Fase 2 (paso explícito y documentado,
 * autorizado junto con esa corrección): el indicador compartido de
 * deportista ya NO vive aquí, se trasladó a visual-lab/layout.tsx (nivel
 * superior, cubre TODO Visual Lab, no solo ORION Play - ver ese
 * archivo). Mantenerlo aquí también habría mostrado el indicador
 * DUPLICADO (uno del layout padre, otro de este) en cada página de
 * ORION Play.
 *
 * Se conserva este archivo (no se borra) por si en el futuro ORION Play
 * necesita su propia franja de layout por otro motivo - hoy es un simple
 * passthrough, sin su propio max-w-6xl (el layout padre, visual-lab/layout.tsx,
 * ya lo aplica una vez para todo Visual Lab; duplicarlo aquí sería un
 * ancho redundante sin ningún efecto visual distinto).
 *
 * El componente antiguo que este layout montaba
 * (components/orionPlayV2/ui/SelectedAthleteIndicator.tsx) se conserva
 * sin usar, sin borrar, hasta confirmar que el nuevo
 * (components/visualLab/SelectedAthleteIndicator.tsx) funciona
 * correctamente - migración en pasos pequeños y reversibles.
 */
export default function VisualLabPlayLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
