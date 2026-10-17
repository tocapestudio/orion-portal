/**
 * Modo "con deportista" de la prueba V.2: todavia NO conecta
 * persistencia (eso se resuelve en una fase posterior, junto con
 * submitPlayAttempt/Core). athleteId solo se usa para mostrar el nombre
 * del atleta en la cabecera, via una lectura RLS ya existente
 * (getAthleteById) - no se escribe nada, no hay sesion/resultado creado
 * en Core. Si el profesional autenticado no tiene acceso a este atleta,
 * getAthleteById devuelve null y la pagina da 404 antes de ejecutar nada
 * (mismo patron que ya usa el piloto V1 real).
 */

import { notFound } from 'next/navigation'
import { getAthleteById } from '@/lib/data/athletes'
import ReactionTimeV2Runner from '@/components/orionPlayV2/reactionTime/ReactionTimeV2Runner'

export default async function ReactionTimeV2AthletePage({
  params,
}: {
  params: Promise<{ athleteId: string }>
}) {
  const { athleteId } = await params
  const athlete = await getAthleteById(athleteId)
  if (!athlete) notFound()

  return <ReactionTimeV2Runner contextLabel={athlete.full_name} />
}
