import Link from "next/link";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { ModuleIcon } from "../moduleMeta";
import { PLAY_EXERCISES } from "@/components/orionPlay/catalog";

/**
 * Catalogo de ORION Play — recupera la estructura real de
 * app/exercises/page.tsx del frontend original (orion-lab-fe): cabecera
 * con icono+titulo+subtitulo, grid de tarjetas (icono en caja de color +
 * nombre + descripcion + CTA "Start exercise →"), una tarjeta por
 * ejercicio del DEMO_EXERCISES original. No es una pantalla nueva: es el
 * mismo catalogo, con clases Tailwind del Portal en vez del tema propio
 * de Play.
 *
 * Reaction Time es el unico disponible (conectado a Core); Click Targets
 * y Visual Memory se muestran tal cual existian en el catalogo original
 * pero atenuados y marcados "Coming soon" — no se implementan todavia.
 *
 * El icono de cabecera reutiliza ModuleIcon("play") - mismo triangulo de
 * Play puro usado en /visual-lab (ver moduleMeta.tsx): un unico icono
 * fuente, sin duplicar SVGs por pantalla.
 */
export default function PlayCatalogPage() {
  return (
    <SecondaryScreenShell
      backHref="/visual-lab"
      // Titulo (icono+"Ejercicios") encima del resto del contenido (ver
      // backSlot en SecondaryScreenShell.tsx) - la flecha "Volver" ya no
      // comparte fila con este bloque (vive en el margen lateral,
      // position:absolute), asi que el titulo comparte el mismo borde
      // izquierdo que la descripcion/grid de abajo, sin ningun ajuste de
      // margen adicional.
      backSlot={
        <div className="flex items-center gap-3">
          <ModuleIcon moduleId="play" className="h-7 w-7 text-orion-sky" />
          <h1 className="text-3xl font-bold text-orion-navy-900">Ejercicios</h1>
        </div>
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm text-orion-navy-500">
            Selecciona un ejercicio para comenzar el entrenamiento y mejorar tus habilidades cognitivas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLAY_EXERCISES.map((exercise) => {
            const card = (
              <div
                className={`flex h-full flex-col rounded-xl border bg-white p-6 shadow-sm transition ${
                  exercise.available
                    ? "border-orion-navy-100 hover:border-orion-accent hover:shadow-md"
                    : "border-orion-navy-100 opacity-60"
                }`}
              >
                <div className="mb-4 flex items-start">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                      exercise.available ? "bg-orion-accent/15" : "bg-orion-navy-100"
                    }`}
                  >
                    <exercise.Icon
                      className={`h-6 w-6 ${exercise.available ? "text-orion-accent" : "text-orion-navy-400"}`}
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="mb-1 text-xl font-bold text-orion-navy-900">{exercise.name}</h3>
                    {!exercise.available && (
                      <span className="inline-block rounded-full bg-orion-navy-100 px-2 py-0.5 text-[11px] font-medium text-orion-navy-500">
                        Próximamente
                      </span>
                    )}
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-gray-600">{exercise.description}</p>
                {exercise.available && (
                  <div className="text-sm font-medium text-orion-accent">Iniciar ejercicio →</div>
                )}
              </div>
            );

            return exercise.available ? (
              <Link key={exercise.id} href={`/visual-lab/play/${exercise.id}`} className="h-full">
                {card}
              </Link>
            ) : (
              <div key={exercise.id} className="h-full cursor-default">
                {card}
              </div>
            );
          })}
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
