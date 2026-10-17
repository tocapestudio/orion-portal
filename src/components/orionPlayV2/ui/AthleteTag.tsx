'use client'

/**
 * Etiqueta compacta de deportista para las pantallas de ejecucion de
 * ORION Play (Fase de ajuste visual posterior a la Fase 3) - sustituye a
 * la antigua franja horizontal de SelectedAthleteIndicator (ya retirada
 * del layout) Y a la linea de texto duplicada `contextLabel` que cada
 * *V2Runner.tsx renderizaba junto al titulo del ejercicio (ver esos
 * archivos: la linea se elimino, `contextLabel`/`isDemo` siguen intactos
 * para su uso funcional).
 *
 * DISEÑO DELIBERADO: `fullName` llega como PROP (resuelto server-side por
 * [athleteId]/page.tsx via getAthleteById, el mismo dato que ya recibia
 * contextLabel) - esta etiqueta NO re-deriva el nombre de la seleccion
 * global (useSelectedAthlete). Motivo: el atleta de ESTA ejecucion ya
 * esta fijado y verificado por la URL/RLS; si se mostrase en su lugar la
 * seleccion global, podria desincronizarse (p.ej. si el profesional
 * cambia la seleccion global DESPUES de entrar en el ejercicio, sin
 * afectar a la ejecucion ya en curso) y mostrar un nombre distinto al
 * atleta real con el que se esta trabajando - exactamente la confusion
 * que esta tarea busca evitar.
 *
 * PURAMENTE INFORMATIVA (ajuste posterior): ya NO lleva "Cambiar" ni
 * "Cerrar"/eliminar seleccion - esas acciones, al estar junto al boton
 * Volver de la pantalla de configuracion, se pulsaban por accidente y
 * afectaban a la seleccion GLOBAL desde un sitio inesperado. Para
 * cambiar o quitar el deportista, el profesional usa exclusivamente el
 * selector de /visual-lab (VisualLabAthleteCard.tsx) - esta etiqueta no
 * escribe en useSelectedAthlete/localStorage en ningun caso, solo
 * muestra `fullName`. No es un <button> ni tiene ningun manejador de
 * eventos - no abre ningun panel ni ejecuta ninguna accion al pulsarla.
 *
 * Posicionamiento absoluto (igual criterio que PlayBackLink.tsx, mismo
 * `relative` de PlayExerciseShell.tsx) para no desplazar ni superponerse
 * con el contenido de cada ejercicio (titulo/descripcion), que empieza
 * mas abajo, fuera de esta franja.
 *
 * Oculta en rutas /demo (ver isDemoPathname) - ahi fullName nunca se pasa
 * de todas formas (demo/page.tsx no llama a PlayExerciseShell con
 * athleteLabel), asi que esta comprobacion es una segunda capa, no la
 * unica.
 */

import { usePathname } from 'next/navigation'

function isDemoPathname(pathname: string): boolean {
  return /^\/visual-lab\/play\/[^/]+\/demo(?:\/|$)/.test(pathname)
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function AthleteTag({ fullName }: { fullName?: string }) {
  const pathname = usePathname()

  if (!fullName || isDemoPathname(pathname)) return null

  return (
    <div className="absolute left-10 top-0 z-10 flex h-8 items-center gap-1.5 rounded-lg border border-orion-navy-200 bg-white px-2.5 text-xs">
      <UserIcon className="h-3.5 w-3.5 shrink-0 text-orion-navy-500" />
      <span className="max-w-[9rem] truncate font-medium text-orion-navy-700" title={fullName}>
        {fullName}
      </span>
    </div>
  )
}
