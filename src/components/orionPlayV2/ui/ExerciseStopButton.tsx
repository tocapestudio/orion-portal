'use client'

/**
 * Icono discreto "Detener ejercicio y ver resultados" COMUN a los 3
 * ejercicios de ORION Play V2. Antes cada ejercicio envolvia el mismo
 * boton (clases identicas) en un contenedor distinto: `absolute
 * bottom-6 right-6` en Reaction Time, `absolute bottom-6 left-1/2
 * -translate-x-1/2` en Click Targets, o como hijo normal de un
 * flex-column centrado en Visual Memory - tres posiciones distintas
 * segun la pantalla de ejecucion de cada uno, pese a tener exactamente el
 * mismo proposito.
 *
 * `container` (OBLIGATORIO, no document.body): debe ser
 * `flow.fullscreenRef.current`, el MISMO elemento que entra en Fullscreen
 * real. Portar a document.body (como hacia la primera version de este
 * componente, y de donde viene el patron: StoppedScreen) parecia correcto
 * por el motivo de "containing block" de position:fixed, pero ignoraba
 * algo distinto y mas fuerte: cuando el Fullscreen API del navegador esta
 * realmente activo, el elemento fullscreen pasa a pintarse en la "top
 * layer" del navegador, una capa POR ENCIMA de todo el resto del
 * documento - incluido CUALQUIER contenido portado a document.body, sin
 * importar su z-index. Es exactamente lo que hacia invisible a este boton
 * durante la ejecucion real en fullscreen: estaba portado FUERA del
 * subarbol que el navegador promociona a esa capa superior. Portando
 * dentro de `flow.fullscreenRef.current` en vez de document.body, este
 * boton queda SIEMPRE dentro de ese subarbol (haya o no Fullscreen API
 * real: si no esta activo, ese div simplemente sigue siendo un
 * `fixed inset-0` normal dentro del documento, y position:fixed aqui
 * dentro sigue funcionando igual).
 *
 * Esquina inferior DERECHA (bottom-6 right-6): a proposito la esquina
 * contraria a la de ExerciseExitButton.tsx (inferior izquierda), para que
 * nunca puedan coincidir en pantalla - el de detener solo aparece durante
 * la ejecucion, el de salida solo en resultados/resultados parciales, por
 * lo que en la practica nunca coexisten, pero mantenerlos en esquinas
 * opuestas evita cualquier ambiguedad visual igualmente.
 *
 * La logica de que hace "detener" (que metricas parciales conserva, como
 * decide que ronda/intento/objetivo en curso no cuenta) sigue siendo
 * 100% de cada ejercicio via su propio `onClick` - este componente no
 * sabe nada de eso, solo renderiza el control y posiciona.
 *
 * stopPropagation interno: un portal escapa del arbol DOM (aunque ahora
 * sea dentro de `container`, sigue sin ser un descendiente React directo
 * de quien lo invoca) pero NO del arbol REACT (los eventos sinteticos de
 * React siguen burbujeando segun la jerarquia de componentes React, no la
 * del DOM real) - Reaction Time y Click Targets tienen un `onClick` de
 * "click en cualquier parte responde" en un ancestro de este boton, asi
 * que sin esto, pulsar detener tambien dispararia una respuesta de
 * trial/target. Se hace aqui dentro (no en cada ejercicio) para que sea
 * un comportamiento del propio control, no algo que cada consumidor
 * tenga que recordar replicar - inofensivo en Visual Memory, que no
 * tiene ese ancestro. */

import { createPortal } from 'react-dom'

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export default function ExerciseStopButton({ onClick, container }: { onClick: () => void; container: HTMLElement | null }) {
  // container llega de flow.fullscreenRef.current, ya montado para cuando
  // RunningScreen pueda llegar a renderizar (el div que lo porta es el
  // mismo padre de fullscreen-ready/running/feedback, nunca se desmonta
  // entre esas fases) - null solo cabria en un primer frame teorico,
  // autocorregido en el siguiente render.
  if (!container) return null

  return createPortal(
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      aria-label="Detener ejercicio y ver resultados"
      title="Detener ejercicio y ver resultados"
      className="fixed bottom-6 right-6 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-gray-600 bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-white"
    >
      <XMarkIcon className="h-4 w-4" />
    </button>,
    container
  )
}
