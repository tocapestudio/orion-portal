'use client'

/**
 * Boton "Guardar resultados" COMUN a los 3 ejercicios de ORION Play V2,
 * aunque hoy solo Reaction Time (Go/No Go) lo usa (es el unico con
 * persistencia real conectada - ver ReactionTimeV2Runner.tsx). Permite
 * guardar la ejecucion actual SIN salir de la pantalla de resultados,
 * reutilizando exactamente la misma funcion de guardado que ya usa
 * "Salir a ORION Play" (ver handleExit en ReactionTimeExercise.tsx) - no
 * hay una segunda implementacion de persistencia, solo un segundo punto
 * desde el que se llama a la misma.
 *
 * Componente controlado (no gestiona su propio estado): quien lo usa es
 * responsable de mantener `state` y de que `onClick` dispare el guardado
 * real. Esto evita duplicar la logica de idempotencia/outcome/errores,
 * que ya vive centralizada en handleExit - este boton solo la refleja
 * visualmente.
 *
 * `state`:
 * - 'idle': aun no se ha intentado guardar esta ejecucion.
 * - 'saving': guardado en curso (boton deshabilitado).
 * - 'saved': ya se guardo con exito (boton deshabilitado - un segundo
 *   clic no tiene nada que hacer, por diseño no vuelve a intentarlo).
 * - 'error': el ultimo intento fallo - el boton vuelve a estar habilitado
 *   para reintentar (la clave de idempotencia de la ejecucion se
 *   mantiene igual en el reintento, ver idempotencyKeyRef en
 *   ReactionTimeExercise.tsx, así que reintentar nunca duplica datos).
 */

import Button from './Button'

export type ExerciseSaveState = 'idle' | 'saving' | 'saved' | 'error'

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3.75A.75.75 0 0 1 3.75 3h10.5a.75.75 0 0 1 .53.22l4.5 4.5c.141.14.22.331.22.53v12a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1-.75-.75V3.75Z" />
      <path d="M8.25 20.25v-6.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 .75.75v6.75M8.25 3.75V8.25h6V3.75" />
    </svg>
  )
}

export default function ExerciseSaveButton({
  state,
  error,
  onClick,
}: {
  state: ExerciseSaveState
  error?: string | null
  onClick: () => void
}) {
  const label =
    state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado correctamente' : 'Guardar resultados'

  return (
    <div>
      <Button
        type="button"
        onClick={onClick}
        disabled={state === 'saving' || state === 'saved'}
        variant={state === 'saved' ? 'secondary' : 'primary'}
        className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 ${state === 'saved' ? 'text-green-700 border-green-300' : ''}`}
      >
        {state === 'saved' ? <CheckIcon className="h-4 w-4" /> : <SaveIcon className="h-4 w-4" />}
        {label}
      </Button>
      {state === 'error' && error && (
        <p className="mt-2 text-sm text-red-600">{error} Puedes volver a pulsar para reintentar.</p>
      )}
    </div>
  )
}
