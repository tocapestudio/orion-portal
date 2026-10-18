/**
 * Logica PURA de derivacion de estado para useVerifiedSelectedAthlete.ts
 * - SIN ningun import de React/Next/Supabase, comprobable con el test
 * runner nativo de Node (node --test). Decide, a partir de tres datos
 * ya conocidos (el athleteId actual, el ultimo resultado de verificacion
 * recibido, y si la ULTIMA verificacion de ese mismo athleteId fallo de
 * verdad), que exponer: nunca `error` y `verified` a la vez, nunca
 * `isChecking` en true si ya hubo un fallo real (eso dejaria la UI
 * atascada en "comprobando" para siempre en vez de mostrar el error).
 */

export interface AthleteVerification<TResult> {
  athleteId: string;
  result: TResult | null;
}

export interface SelectedAthleteVerificationState<TResult> {
  /** true si la verificacion del athleteId ACTUAL fallo de verdad
   * (red/consulta) - nunca a la vez que `verified` tenga datos. */
  error: boolean;
  /** Resultado ya verificado, o null si no hay, esta en curso, o fallo. */
  verified: TResult | null;
  /** true solo mientras hay un athleteId pendiente de verificar y NO ha
   * fallado - un fallo real nunca se expresa como "sigue comprobando". */
  isChecking: boolean;
}

export function deriveSelectedAthleteVerificationState<TResult>(
  athleteId: string | null,
  verification: AthleteVerification<TResult> | null,
  failedAthleteId: string | null
): SelectedAthleteVerificationState<TResult> {
  const matchesCurrent = verification?.athleteId === athleteId;
  const error = Boolean(athleteId) && failedAthleteId === athleteId;
  const verified = athleteId && matchesCurrent && !error ? verification!.result : null;
  const isChecking = Boolean(athleteId) && !matchesCurrent && !error;
  return { error, verified, isChecking };
}
