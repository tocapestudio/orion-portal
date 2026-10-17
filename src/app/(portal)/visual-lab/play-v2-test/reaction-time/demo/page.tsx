/**
 * Modo demo: ejecuta Reaction Time V.2 sin deportista asociado. No hay
 * seleccion de atleta, no hay athleteId, no hay persistencia ni
 * creacion de datos en Core - los resultados solo viven en memoria del
 * navegador durante esta ejecucion y se pierden al salir.
 */

import ReactionTimeV2Runner from '@/components/orionPlayV2/reactionTime/ReactionTimeV2Runner'

export default function ReactionTimeV2DemoPage() {
  return <ReactionTimeV2Runner />
}
