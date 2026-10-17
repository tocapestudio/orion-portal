'use client'

/**
 * Hook compartido que combina useSelectedAthlete.ts (localStorage
 * reactivo) con la verificacion server-side
 * (getSelectedAthleteIfAccessible) - extraido del antiguo
 * SelectedAthleteIndicator.tsx (components/visualLab/) para que la nueva
 * tarjeta de la entrada de Visual Lab (VisualLabAthleteCard.tsx) y la
 * nueva etiqueta compacta de las pantallas de ejercicio (AthleteTag.tsx,
 * orionPlayV2/ui/) compartan EXACTAMENTE la misma maquina de estados, sin
 * duplicar el useEffect de verificacion/autolimpieza en dos sitios.
 *
 * Mismo comportamiento de seguridad que ya tenia el indicador anterior,
 * sin cambios: el UUID de localStorage nunca se trata como autorizacion,
 * se re-verifica siempre contra el servidor (RLS real); si la
 * verificacion devuelve null (revocado, invalido, inexistente), se limpia
 * la seleccion de forma segura.
 */

import { useEffect, useState } from 'react'
import { useSelectedAthlete } from './useSelectedAthlete'
import {
  getSelectedAthleteIfAccessible,
  type SelectedAthleteResult,
} from '@/app/(portal)/visual-lab/play/selectedAthlete.actions'

interface Verification {
  athleteId: string
  result: SelectedAthleteResult | null
}

export interface UseVerifiedSelectedAthleteResult {
  /** false hasta completar la primera lectura de localStorage. */
  isHydrated: boolean
  /** id crudo guardado (solo para decidir si hay "algo" seleccionado -
   * nunca para mostrar datos sin pasar por `verified`). */
  athleteId: string | null
  /** true mientras hay un athleteId pendiente de verificar (o cuya
   * verificacion ya esta obsoleta por haber cambiado la seleccion). */
  isChecking: boolean
  /** Datos ya verificados contra el servidor, listos para mostrar - null
   * si no hay seleccion, o si la verificacion todavia esta en curso. */
  verified: SelectedAthleteResult | null
  selectAthlete: (id: string) => void
  clearAthlete: () => void
}

export function useVerifiedSelectedAthlete(): UseVerifiedSelectedAthleteResult {
  const { athleteId, isHydrated, selectAthlete, clearAthlete } = useSelectedAthlete()
  const [verification, setVerification] = useState<Verification | null>(null)

  useEffect(() => {
    if (!athleteId) return
    let cancelled = false
    getSelectedAthleteIfAccessible(athleteId).then((result) => {
      if (cancelled) return
      setVerification({ athleteId, result })
      if (!result) clearAthlete()
    })
    return () => {
      cancelled = true
    }
  }, [athleteId, clearAthlete])

  const matchesCurrent = verification?.athleteId === athleteId
  const verified = athleteId && matchesCurrent ? verification.result : null
  // Pendiente de verificar: hay athleteId pero `verification` todavia no
  // corresponde a el (null porque nunca se resolvio, u obsoleto por un
  // cambio de seleccion mientras la llamada anterior seguia en vuelo).
  const isChecking = Boolean(athleteId) && !matchesCurrent

  return {
    isHydrated,
    athleteId,
    isChecking,
    verified,
    selectAthlete,
    clearAthlete,
  }
}
