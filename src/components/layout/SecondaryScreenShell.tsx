import BackButton from "./BackButton";
import StaticBackLink from "./StaticBackLink";

/**
 * Estructura compartida de toda pantalla secundaria del Portal (cualquiera
 * con boton Volver).
 *
 * Volver es un icono compacto (32x32, ver BackButton.tsx/StaticBackLink.tsx)
 * SIEMPRE en el margen lateral izquierdo, fuera del flujo normal
 * (`position: absolute`, ver el div inmediatamente debajo) — ya NO ocupa
 * una fila propia por encima del contenido. Motivo del cambio (antes SI
 * reservaba esa fila, lo que empujaba titulos/contenido hacia abajo en
 * TODAS las pantallas): el titulo y el contenido principal deben empezar
 * exactamente a la misma altura que en una pantalla sin boton Volver, sin
 * ningun hueco vertical adicional.
 *
 * `pl-12` (48px) en el contenedor de CONTENIDO (nunca en el que posiciona
 * la flecha) reserva el margen lateral: la flecha (32px) mas 16px de
 * aire quedan siempre fuera de la caja de contenido, sin solaparse nunca,
 * incluso en pantallas sin ningun mx-auto/max-w-* propio que deje un
 * hueco natural a la izquierda (p.ej. el grid de Mi Agenda, o la cabecera
 * de ancho completo del perfil de atleta - ver esos consumidores). Esto SI
 * reintroduce un margen lateral fijo (como el que existia antes de la
 * fila, y que se habia quitado por descentrar el contenido) pero mucho
 * mas estrecho que aquel (48px, no 6rem) y aplicado SOLO como padding del
 * propio contenido (nunca como una columna hermana) - el mx-auto/max-w-*
 * de cada pantalla sigue centrandose dentro de esa caja ya mas estrecha,
 * exactamente igual que se centraria dentro de cualquier otro padding.
 *
 * `backSlot` (opcional, aditivo): contenido renderizado ENCIMA del resto
 * del contenido (dentro de la misma caja con el margen de `pl-12`, no
 * junto a la flecha) - para pantallas donde el titulo debe aparecer antes
 * que `children` en vez de venir incluido en el (p.ej. el catalogo de
 * ORION Play, /visual-lab/play). Su posicion horizontal ya no depende de
 * estar "a la derecha del boton": comparte el mismo borde izquierdo que
 * `header`/`children`.
 */
export default function SecondaryScreenShell({
  fallbackHref,
  backHref,
  backSlot,
  header,
  children,
}: {
  /** Comportamiento normal: usa historial interno si existe, si no cae
   * aqui. No usar junto con backHref. */
  fallbackHref?: string;
  /** Si se indica, "Volver" navega SIEMPRE aqui (StaticBackLink), sin
   * ninguna condicion de historial — tiene prioridad sobre
   * fallbackHref. No afecta a las pantallas que no lo pasan. */
  backHref?: string;
  backSlot?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col lg:h-full lg:min-h-0">
      {/* Flecha "Volver": absolute left-0 top-0 respecto al contenedor
          relative de arriba - mide desde la MISMA esquina que el resto
          del contenido (ambos dentro del mismo padding p-4/md:p-6 de
          <main>), nunca participa en el flujo/altura del resto. z-10 por
          si algun contenido propio de una pantalla tuviera su propio
          fondo opaco empezando en x=0 (no deberia, dado el pl-12 de
          abajo, pero asegura que la flecha siempre quede encima). */}
      <div className="absolute left-0 top-0 z-10">
        {backHref ? (
          <StaticBackLink href={backHref} />
        ) : (
          <BackButton fallbackHref={fallbackHref ?? "/"} />
        )}
      </div>

      <div className="flex flex-1 flex-col pl-12 lg:min-h-0">
        {backSlot && <div className="mb-4 shrink-0">{backSlot}</div>}
        {/* La cabecera nunca necesita scroll (su contenido siempre cabe),
            pero se le da el mismo overflow-y-auto + scrollbar-gutter:stable
            que a la zona de contenido de abajo — sin esto, en cuanto el
            contenido SÍ tiene barra de scroll, esa barra le resta ancho
            solo a él, y su ancho centrado (mx-auto + max-w-*) queda unos pixeles
            a la izquierda respecto a la cabecera (que nunca pierde ese
            ancho). Reservando el mismo hueco en los dos siempre, ambos
            comparten exactamente el mismo eje de centrado haya o no scroll. */}
        {header && (
          <div className="mb-4 shrink-0 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
            {header}
          </div>
        )}
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-gutter:stable]">
          {children}
        </div>
      </div>
    </div>
  );
}
