/**
 * Pagina de prueba TEMPORAL, aislada, para la Fase 2C. Antes montaba
 * directamente ExerciseRunner+ReactionTimeExercise; ahora es el paso de
 * seleccion previo: elegir deportista (navega a ./[athleteId]) o modo
 * demo (navega a ./demo) - ninguno de los dos conecta persistencia
 * todavia. No sustituye ni modifica el piloto V.1 existente en
 * /visual-lab/play/reaction-time/[athleteId].
 */

import { getMyAthletes } from '@/lib/data/athletes'
import ReactionTimeV2AthletePicker from '@/components/orionPlayV2/reactionTime/ReactionTimeV2AthletePicker'

export default async function PlayV2TestReactionTimePickerPage() {
  const athletes = await getMyAthletes()

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900">ORION Play</h1>
        <p className="text-sm text-orion-navy-500">Reaction Time</p>
      </div>
      <ReactionTimeV2AthletePicker
        basePath="/visual-lab/play-v2-test/reaction-time"
        athletes={athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }))}
      />
    </div>
  )
}
