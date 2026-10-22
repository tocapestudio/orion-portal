import Link from "next/link";
import { getModalities } from "@/lib/data/visualLab";
import { ModuleIcon, MODULE_DEFINITIONS, MODULE_CARD_THEME, ModuleTitle, StatusPill } from "./moduleMeta";
import VisualLabAthleteCard from "@/components/visualLab/VisualLabAthleteCard";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

/**
 * Jerarquia visual: ORION Play es el modulo protagonista (tarjeta ancha,
 * horizontal, arriba del todo); React/Frame/Tools son los 3 modulos
 * secundarios, en una fila de 3 tarjetas debajo, en este orden fijo (no
 * el orden alfabetico por id que devuelve getModalities()). Misma data
 * (getModalities), mismas rutas (/visual-lab/[modality]), solo cambia
 * como se agrupan/dimensionan/ordenan — ningun modulo pierde ni gana
 * logica de navegacion.
 *
 * "manual" deliberadamente FUERA de esta lista (reorganizacion del hub,
 * ver auditoria previa): deja de tener tarjeta propia en el hub, sin que
 * eso afecte a su modalidad, su ruta (/visual-lab/manual sigue existiendo
 * y accesible por URL directa via [modality]/page.tsx) ni a Biblioteca ->
 * Mis Ejercicios (que filtra core.activity_catalog por modality_id=
 * 'manual' de forma totalmente independiente de este archivo).
 */
const SECONDARY_ORDER = ["react", "frame", "tools"];

export default async function VisualLabPage() {
  const modalities = await getModalities();
  const play = modalities.find((m) => m.id === "play");
  const secondary = SECONDARY_ORDER.map((id) => modalities.find((m) => m.id === id)).filter(
    (m): m is NonNullable<typeof m> => m != null
  );

  return (
    <SecondaryScreenShell backHref="/inicio">
    {/* lg:min-h-full + lg:justify-center: el contenedor padre (children
        de SecondaryScreenShell) es lg:flex-1 dentro de una columna alta -
        sin este centrado, un bloque mas corto que esa altura (como este,
        tras quitar el parrafo introductorio) queda pegado arriba, con un
        hueco vacio grande debajo, en vez de sentirse centrado/deliberado.
        Solo en lg: en movil se sigue apilando desde arriba, como siempre. */}
    <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:min-h-full lg:justify-center">
      {play && (
        // Sin CTA interior: la tarjeta COMPLETA es el enlace/boton (un
        // unico Link, sin elementos interactivos anidados dentro). Fondo
        // azul marino oscuro (coherente con el Sidebar, bg-orion-navy-950 -
        // ver Sidebar.tsx) en vez del azul claro anterior: ORION Play debe
        // ser el elemento protagonista de la pantalla, con mas presencia
        // que la tarjeta de deportista y que React/Frame/Tools (mas
        // ancha/alta, centrada con mx-auto, max-w-3xl - mas estrecha que
        // el contenedor max-w-5xl pero mas ancha que VisualLabAthleteCard,
        // que usa max-w-md - ver ese archivo).
        <Link
          href={`/visual-lab/${play.id}`}
          className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-2xl bg-gradient-to-br from-orion-navy-900 to-orion-navy-950 p-7 shadow-md transition hover:from-orion-navy-800 hover:to-orion-navy-900 hover:shadow-lg sm:flex-row sm:items-center sm:gap-6 sm:p-8"
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <ModuleIcon moduleId={play.id} className="h-8 w-8 text-orion-sky" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-bold tracking-wide text-white">
              <ModuleTitle moduleId={play.id} />
            </p>
            <p className="mt-1.5 text-sm text-orion-navy-200">{MODULE_DEFINITIONS[play.id]}</p>
          </div>
        </Link>
      )}

      <VisualLabAthleteCard />

      <div className="grid gap-5 sm:grid-cols-3">
        {secondary.map((m) => {
          // Identidad cromatica por modulo (ver MODULE_CARD_THEME en
          // moduleMeta.tsx) - sin rama especial por id aqui: anadir un
          // 4o modulo secundario en el futuro solo exige una entrada mas
          // en esa tabla, no tocar este componente. La tarjeta en si es
          // SIEMPRE blanca y el titulo SIEMPRE oscuro (fijos aqui, no en
          // la tabla) - el color del modulo solo vive en el icono, su
          // caja pequeña y el borde.
          //
          // 4a pasada: contenido centrado vertical y horizontalmente
          // (items-center + justify-center + text-center, en vez de
          // justify-between con el icono arriba) - orden nombre -> icono
          // -> descripcion. Altura h-48 (192px) -> h-[216px] (+24px).
          //
          // 8a pasada (mas presencia, menos vacio alrededor del conjunto):
          // h-[216px] -> h-[264px] (+48px, +22.2%, dentro del rango 20-25%
          // pedido - valor arbitrario porque 264 no esta en la escala
          // estandar de Tailwind).
          //
          // 9a pasada, parte 1 (tamaño del titulo): text-lg (18px) ->
          // text-[21px] (+16.7%, dentro del rango 15-20% pedido) - crece
          // la palabra completa ("ORION" en Geist + la segunda palabra en
          // Rajdhani), nunca el titulo de Play (su <p> es un elemento
          // totalmente distinto, mas arriba en este archivo, sin tocar).
          // El `text-[1.25em]` de Rajdhani (ver ModuleTitle) es relativo a
          // este tamaño, asi que escala junto con el resto del titulo sin
          // tocar ese valor.
          //
          // 9a pasada, parte 2 (alineacion con "Proximamente"): antes,
          // title/icono/descripcion/StatusPill eran UN solo bloque con
          // justify-center - como StatusPill solo existe en Frame (ver
          // MODULE_STATUS), ese bloque tenia 4 hijos en Frame y 3 en
          // React/Tools, con lo que el centrado los colocaba a alturas
          // distintas entre tarjetas. Ahora se separan en dos zonas
          // independientes dentro de la MISMA tarjeta (altura total sigue
          // fija en h-[264px]):
          //   1) un grupo flex-1 (title+icono+descripcion) que con
          //      justify-center se centra en el espacio QUE QUEDA tras
          //      reservar la zona de estado - como esa zona reservada
          //      mide lo mismo en las 3 tarjetas (h-6, con o sin
          //      contenido dentro), este grupo ocupa la misma altura y
          //      queda centrado igual en las 3, y title/icono/
          //      descripcion quedan a las mismas alturas en las 3 sin
          //      depender de si Frame tiene pildora de estado o no.
          //   2) una zona de estado de altura FIJA (h-6 = 24px, shrink-0
          //      para que nunca la comprima el flex) siempre presente -
          //      vacia en React/Tools, con StatusPill ("Proximamente") en
          //      Frame - nunca desplaza al grupo de arriba.
          const theme = MODULE_CARD_THEME[m.id];
          return (
            <Link
              key={m.id}
              href={`/visual-lab/${m.id}`}
              className={`flex h-[264px] flex-col items-center gap-2 rounded-xl border-2 bg-white p-6 text-center shadow-sm transition hover:shadow-lg ${
                theme?.border ?? "border-orion-navy-200"
              } ${theme?.hoverBorder ?? "hover:border-orion-navy-400"}`}
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-5">
                <p className="text-[21px] font-bold tracking-wide text-orion-navy-900">
                  <ModuleTitle moduleId={m.id} />
                </p>
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${theme?.iconBg ?? "bg-orion-navy-100"}`}
                >
                  <ModuleIcon moduleId={m.id} className={`h-6 w-6 ${theme?.icon ?? "text-orion-navy-800"}`} />
                </div>
                <p className="text-sm leading-snug text-orion-navy-500">
                  {MODULE_DEFINITIONS[m.id] ?? (m.requires_device ? "Requiere dispositivo" : "Sin dispositivo")}
                </p>
              </div>
              <div className="flex h-6 shrink-0 items-center justify-center">
                <StatusPill moduleId={m.id} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
    </SecondaryScreenShell>
  );
}
