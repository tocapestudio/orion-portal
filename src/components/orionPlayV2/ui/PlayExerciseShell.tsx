/**
 * Envoltorio compartido de las rutas de ejecucion de ORION Play V2
 * (demo y con deportista, para Reaction Time/Click Targets/Visual
 * Memory/Tiempo de reaccion - 4 ejercicios, no 3 como decia el
 * comentario original de este archivo): sustituye a SecondaryScreenShell
 * (usado por el resto del Portal) solo aqui, para que PlayBackLink.tsx
 * pueda posicionarse `absolute` sin desplazar el contenido - ver el
 * comentario de PlayBackLink.tsx para el motivo. No se toca
 * SecondaryScreenShell ni sus demas consumidores (perfiles, biblioteca,
 * disenar, chat, el resto de ORION Play...), que siguen usando el boton
 * "Volver" rectangular de siempre.
 *
 * AthleteTag.tsx YA NO se renderiza aqui (corregido un problema visual:
 * se solapaba con el titulo de cada ejercicio, que empieza en el mismo
 * punto arriba a la izquierda). Ahora se renderiza DENTRO de cada
 * *Exercise.tsx, como hermano real del titulo en una fila flex - ver
 * ReactionTimeExercise.tsx/ClickTargetsExercise.tsx/
 * VisualMemoryExercise.tsx/SimpleReactionExercise.tsx. Este Shell sigue
 * aportando solo PlayBackLink.tsx (sin cambios, sigue `absolute`).
 */

import type { ReactNode } from 'react'
import PlayBackLink from './PlayBackLink'

export default function PlayExerciseShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <PlayBackLink />
      {children}
    </div>
  )
}
