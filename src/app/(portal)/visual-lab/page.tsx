import Link from "next/link";
import { getModalities } from "@/lib/data/visualLab";
import { ModuleIcon, MODULE_LABELS, MODULE_DEFINITIONS, StatusPill } from "./moduleMeta";
import VisualLabAthleteCard from "@/components/visualLab/VisualLabAthleteCard";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

/**
 * Jerarquia visual: ORION Play es el modulo protagonista (tarjeta ancha,
 * horizontal, arriba del todo); React/Frame/Tools son modulos
 * secundarios, en una fila de 3 tarjetas mas grandes que antes debajo, en
 * este orden fijo (no el orden alfabetico por id que devuelve
 * getModalities()). Misma data (getModalities), mismas rutas
 * (/visual-lab/[modality]), solo cambia como se agrupan/dimensionan/
 * ordenan — ningun modulo pierde ni gana logica de navegacion.
 */
const SECONDARY_ORDER = ["react", "frame", "manual"];

export default async function VisualLabPage() {
  const modalities = await getModalities();
  const play = modalities.find((m) => m.id === "play");
  const secondary = SECONDARY_ORDER.map((id) => modalities.find((m) => m.id === id)).filter(
    (m): m is NonNullable<typeof m> => m != null
  );

  return (
    <SecondaryScreenShell backHref="/inicio">
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <p className="text-sm text-orion-navy-600">
        Acceso al control y utilización de los diferentes dispositivos y plataformas del
        ecosistema ORION. Cada módulo mantiene su propia interfaz cuando la necesita, pero
        todos escriben en el mismo ORION Core.
      </p>

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
            <p className="text-3xl font-bold tracking-tight text-white">
              {MODULE_LABELS[play.id] ?? play.label}
            </p>
            <p className="mt-1.5 text-sm text-orion-navy-200">{MODULE_DEFINITIONS[play.id]}</p>
          </div>
        </Link>
      )}

      <VisualLabAthleteCard />

      <div className="grid gap-5 sm:grid-cols-3">
        {secondary.map((m) => {
          const isFrame = m.id === "frame";
          return (
            <Link
              key={m.id}
              href={`/visual-lab/${m.id}`}
              className={`flex h-56 flex-col gap-3 rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
                isFrame
                  ? "border-orion-navy-100 bg-orion-navy-50/50 opacity-80 hover:border-orion-navy-200"
                  : "border-orion-navy-100 bg-white hover:border-orion-navy-400"
              }`}
            >
              <ModuleIcon
                moduleId={m.id}
                className={`h-8 w-8 shrink-0 ${isFrame ? "text-orion-navy-300" : "text-orion-navy-800"}`}
              />
              <div className="flex min-h-0 flex-1 flex-col justify-between">
                <div>
                  <p
                    className={`text-base font-semibold ${isFrame ? "text-orion-navy-500" : "text-orion-navy-900"}`}
                  >
                    {MODULE_LABELS[m.id] ?? m.label}
                  </p>
                  <p className={`mt-1.5 text-sm leading-snug ${isFrame ? "text-orion-navy-400" : "text-orion-navy-500"}`}>
                    {MODULE_DEFINITIONS[m.id] ?? (m.requires_device ? "Requiere dispositivo" : "Sin dispositivo")}
                  </p>
                </div>
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
