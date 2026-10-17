import type { ReactNode } from "react";

/**
 * Layout de TODO Visual Lab - VACIADO deliberadamente en el ajuste visual
 * posterior a la Fase 3 (ver tarea "Ajuste de diseño del selector y
 * eliminación de duplicados"): la franja horizontal global
 * (SelectedAthleteIndicator.tsx, montada aquí desde la corrección
 * arquitectónica) se retiró porque desplazaba el contenido de cada
 * página y duplicaba el nombre del deportista en las pantallas de
 * ejercicio. Sustituida por dos piezas más específicas:
 * - VisualLabAthleteCard.tsx, montada directamente en
 *   visual-lab/page.tsx (la entrada), como tarjeta compacta.
 * - AthleteTag.tsx, montada en PlayExerciseShell.tsx, junto al botón de
 *   volver de las pantallas de ejecución de ORION Play.
 *
 * El antiguo SelectedAthleteIndicator.tsx se conserva sin usar, sin
 * borrar (migración en pasos reversibles ya establecida en fases
 * anteriores).
 *
 * Se quita también el `max-w-6xl mx-auto` que este layout aplicaba:
 * ya no envuelve ningún contenido propio (solo el indicador, ahora
 * retirado), y cada página bajo /visual-lab/* ya tiene su propio ancho
 * (max-w-5xl en la entrada, max-w-6xl en las pantallas de ejecución,
 * etc.) - mantenerlo aquí solo habría sido un ancho redundante sin
 * ningún efecto visual distinto.
 */
export default function VisualLabLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
