'use client'

/**
 * Icono de "Volver a ORION Play" para las pantallas de ejecucion de ORION
 * Play V2 (Reaction Time, Click Targets, Visual Memory). A diferencia de
 * BackButton/SecondaryScreenShell (el boton "Volver" rectangular, con
 * texto, que usa el resto del Portal), este NO reserva ninguna columna de
 * ancho fijo a la izquierda del contenido: esa columna reservada era
 * exactamente lo que desplazaba el titulo/tarjetas de cada ejercicio
 * respecto al centro real del area principal. Aqui el icono es
 * `position: absolute` dentro del `relative` que provee PlayExerciseShell.tsx
 * - queda fuera del flujo normal, por lo que nunca participa en el calculo
 * de centrado (`mx-auto max-w-6xl`) de ReactionTimeExercise.tsx/
 * ClickTargetsExercise.tsx/VisualMemoryExercise.tsx (no se tocan).
 *
 * Mismo glifo Y mismo aspecto visual (caja 32x32, rounded-lg, hover/focus)
 * que BackButton.tsx/StaticBackLink.tsx (el boton "Volver" del catalogo
 * de ORION Play y del resto del Portal). Fondo azul marino solido
 * (--orion-navy-950, el mismo token que Sidebar.tsx), icono blanco
 * (text-white), hover un paso mas claro (--orion-navy-900), sin borde -
 * mismo cambio y mismo motivo que esos dos componentes (el azul claro
 * anterior tenia muy poco contraste).
 *
 * Destino fijo /visual-lab/play (no router.back()): mismo criterio que
 * StaticBackLink.tsx para pantallas donde "Volver" no debe depender del
 * historial de navegacion del usuario.
 */

import { useRouter } from 'next/navigation'

export default function PlayBackLink() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push('/visual-lab/play')}
      title="Volver a ORION Play"
      aria-label="Volver a ORION Play"
      className="absolute left-0 top-0 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orion-navy-950 text-white transition-colors hover:bg-orion-navy-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
      >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  )
}
