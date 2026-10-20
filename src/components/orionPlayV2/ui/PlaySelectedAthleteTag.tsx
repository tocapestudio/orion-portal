'use client'

/**
 * Conector minimo entre la seleccion GLOBAL de deportista (useVerifiedSelectedAthlete,
 * mismo hook que ya usa VisualLabAthleteCard.tsx en /visual-lab) y
 * AthleteTag.tsx (mismo componente/estilo ya usado dentro de las pantallas
 * de ejecucion de cada ejercicio) - para el catalogo de ORION Play
 * (/visual-lab/play), que no tiene ningun athleteId en su URL (a
 * diferencia de /visual-lab/play/[exerciseId]/[athleteId], donde
 * AthleteTag recibe el nombre YA resuelto server-side via getAthleteById).
 *
 * No duplica logica de autorizacion: useVerifiedSelectedAthlete ya hace la
 * re-verificacion server-side (getSelectedAthleteIfAccessible, RLS real) y
 * la autolimpieza si la seleccion deja de ser accesible - este componente
 * solo decide CUANDO mostrar la etiqueta ya existente, nunca deriva el
 * nombre por su cuenta.
 *
 * Sin problema de hidratacion: antes de `isHydrated` (primera lectura de
 * localStorage) no se renderiza nada, igual que VisualLabAthleteCard.tsx -
 * el servidor tampoco renderiza nada (este componente es 'use client' sin
 * props, nunca recibe el nombre por SSR), asi que el primer render del
 * cliente coincide con el del servidor (ambos vacios) y la etiqueta
 * aparece despues, cuando la verificacion real termina - mismo
 * comportamiento ya existente en VisualLabAthleteCard.tsx, no uno nuevo.
 *
 * Solo se muestra con una seleccion YA verificada (`verified`, nunca
 * durante `isChecking` ni si `error` es real) - igual criterio que
 * AthleteTag.tsx: nunca mostrar un nombre sin confirmar.
 */

import { useVerifiedSelectedAthlete } from '@/lib/useVerifiedSelectedAthlete'
import AthleteTag from './AthleteTag'

export default function PlaySelectedAthleteTag() {
  const { isHydrated, verified } = useVerifiedSelectedAthlete()

  if (!isHydrated || !verified) return null

  return <AthleteTag fullName={verified.fullName} />
}
