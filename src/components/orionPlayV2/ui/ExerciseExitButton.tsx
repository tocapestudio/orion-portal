'use client'

/**
 * Control de salida COMUN a los 3 ejercicios de ORION Play V2 (Reaction
 * Time, Click Targets, Visual Memory): "Salir a ORION Play". Antes cada
 * ejercicio tenia su propio boton, con texto ("Salir a Visual Lab" en dos
 * de los tres), destino (`/visual-lab` en vez de `/visual-lab/play`) y
 * posicion (dentro de la tarjeta, centrado debajo de ella, flotante en una
 * esquina...) distintos entre si - exactamente el tipo de inconsistencia
 * que este componente elimina al ser la UNICA implementacion que los tres
 * consumen, tanto desde su pantalla de resultados normal como desde la de
 * resultados parciales (al interrumpir).
 *
 * Se renderiza SIEMPRE como un boton normal, sin portal propio: quien lo
 * usa (ExerciseResultsCard) ya lo coloca DENTRO de la Card de resultados,
 * que a su vez ya esta dentro del contexto correcto en cada caso (el
 * overlay/portal que StoppedScreen crea para pantalla completa, o el flujo
 * normal de la pagina en ResultsScreen) - no hay ninguna necesidad de que
 * este componente cree su propio portal adicional.
 *
 * (Version anterior: portaba a document.body de forma independiente, lo
 * que para StoppedScreen creaba un SEGUNDO portal `fixed` compitiendo en
 * stacking context con el overlay propio de StoppedScreen, tapando el
 * boton. Solucionado moviendolo dentro de la Card en vez de intentar
 * ganar esa competencia de portales/z-index.)
 *
 * `onBeforeExit` es opcional: permite a cada ejercicio notificar su
 * propio `onComplete` (que a su vez espera a `onPersist`, ver
 * ExerciseRunner.tsx) justo antes de navegar, sin que este componente
 * necesite saber nada de metricas ni de cada ejercicio.
 *
 * `onBeforeExit` puede devolver una Promise: este boton la espera
 * (`await`) antes de navegar. Mientras tanto se deshabilita (evita un
 * doble clic que dispare dos guardados concurrentes) y muestra
 * "Guardando...". Si la promesa rechaza (fallo de guardado real, p.ej.
 * RLS/red), NO navega - muestra el mensaje de error devuelto y deja el
 * boton listo para que el usuario pueda reintentar pulsandolo otra vez
 * (handleExit en cada ejercicio reutiliza la misma clave de idempotencia
 * de esa ejecucion en el reintento, ver actions.ts). Antes, este boton
 * navegaba de inmediato sin esperar nada - un fallo de guardado era
 * estructuralmente invisible, porque el componente ya se habia
 * desmontado para cuando el error podia llegar a mostrarse.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

export default function ExerciseExitButton({ onBeforeExit }: { onBeforeExit?: () => void | Promise<void> }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    if (isSaving) return
    if (!onBeforeExit) {
      router.push('/visual-lab/play')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onBeforeExit()
      router.push('/visual-lab/play')
    } catch (err) {
      setIsSaving(false)
      setError(err instanceof Error ? err.message : 'No se pudo guardar el resultado.')
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isSaving}
        aria-label="Salir a ORION Play"
        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {isSaving ? 'Guardando…' : 'Salir a ORION Play'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error} Puedes volver a pulsar para reintentar.</p>
      )}
    </div>
  )
}
