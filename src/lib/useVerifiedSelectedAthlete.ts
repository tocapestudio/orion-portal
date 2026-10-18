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
 *
 * Si la verificacion FALLA de verdad (red/consulta) en vez de devolver un
 * resultado, se expone como `error=true` en vez de dejar `isChecking`
 * en true para siempre - un fallo transitorio nunca se trata como "no
 * accesible" (no limpia la seleccion) ni como seleccion valida (no
 * expone `verified`). `retry()` reintenta sin perder el athleteId
 * guardado.
 */

import { useEffect, useState } from 'react'
import { useSelectedAthlete } from './useSelectedAthlete'
import {
  getSelectedAthleteIfAccessible,
  type SelectedAthleteResult,
} from '@/app/(portal)/visual-lab/play/selectedAthlete.actions'
import {
  deriveSelectedAthleteVerificationState,
  type AthleteVerification,
} from './selectedAthleteVerificationState'

type Verification = AthleteVerification<SelectedAthleteResult>

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
  /** true si la verificacion del athleteId ACTUAL fallo de verdad
   * (red/consulta) - nunca se confunde con "no accesible" (ese caso deja
   * `verified=null` con `error=false`, y SI limpia la seleccion; este no
   * limpia nada, podria ser recuperable). Mientras error=true, isChecking
   * es false (no se queda "comprobando" para siempre) y verified es null
   * (nunca se concede ni se muestra una seleccion sin verificar). */
  error: boolean
  selectAthlete: (id: string) => void
  clearAthlete: () => void
  /** Reintenta la verificacion del athleteId actual tras un error. */
  retry: () => void
}

export function useVerifiedSelectedAthlete(): UseVerifiedSelectedAthleteResult {
  const { athleteId, isHydrated, selectAthlete, clearAthlete } = useSelectedAthlete()
  const [verification, setVerification] = useState<Verification | null>(null)
  const [failedAthleteId, setFailedAthleteId] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!athleteId) return
    let cancelled = false
    // Cada intento (incluido un reintento manual) empieza limpiando el
    // fallo anterior para ESTE athleteId - si seguia marcado, isChecking
    // nunca volveria a ser true y la UI se quedaria mostrando el error
    // viejo mientras el nuevo intento ya esta en curso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailedAthleteId((prev) => (prev === athleteId ? null : prev))
    getSelectedAthleteIfAccessible(athleteId)
      .then((result) => {
        if (cancelled) return
        setVerification({ athleteId, result })
        if (!result) clearAthlete()
      })
      .catch(() => {
        // Fallo real (no "no accesible"): nunca se limpia la seleccion
        // guardada aqui (podria ser recuperable) ni se marca como
        // verificada - solo se señala el fallo para este athleteId.
        if (cancelled) return
        setFailedAthleteId(athleteId)
      })
    return () => {
      cancelled = true
    }
  }, [athleteId, clearAthlete, retryKey])

  const { error, verified, isChecking } = deriveSelectedAthleteVerificationState(
    athleteId,
    verification,
    failedAthleteId
  )

  return {
    isHydrated,
    athleteId,
    isChecking,
    verified,
    error,
    selectAthlete,
    clearAthlete,
    retry: () => setRetryKey((k) => k + 1),
  }
}
