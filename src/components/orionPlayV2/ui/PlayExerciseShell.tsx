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
 * `athleteLabel` (nuevo, ajuste visual posterior a la Fase 3): nombre YA
 * RESUELTO server-side (getAthleteById, en [athleteId]/page.tsx) del
 * atleta de ESTA ejecucion - se reenvia a AthleteTag.tsx para la
 * etiqueta compacta junto al boton de volver, sustituyendo a la linea de
 * texto `contextLabel` que cada *V2Runner.tsx renderizaba antes (ver
 * esos archivos). Opcional: ausente en demo/page.tsx (nunca hay atleta
 * real ahi), AthleteTag.tsx no renderiza nada en ese caso.
 */

import type { ReactNode } from 'react'
import PlayBackLink from './PlayBackLink'
import AthleteTag from './AthleteTag'

export default function PlayExerciseShell({ athleteLabel, children }: { athleteLabel?: string; children: ReactNode }) {
  return (
    <div className="relative">
      <PlayBackLink />
      <AthleteTag fullName={athleteLabel} />
      {children}
    </div>
  )
}
