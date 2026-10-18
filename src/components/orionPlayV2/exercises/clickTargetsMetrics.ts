/**
 * Logica PURA derivada de los registros por ensayo de Click Targets -
 * SIN ningun import de React/Next/Supabase, comprobable con el test
 * runner nativo de Node (node --test). Mismo patron ya usado en el
 * Portal (athleteOwnership.ts, selectedAthleteVerificationState.ts):
 * ClickTargetsExercise.tsx importa `createClient`/React a nivel de
 * modulo, lo que impide a Node resolverlo fuera del bundler de Next.js -
 * esta funcion vive aqui para poder probarse de verdad.
 *
 * Tipo estructural (no importa TargetRecord de ClickTargetsExercise.tsx,
 * que no lo exporta) - cualquier array con esta forma es valido, incluido
 * targetLog (TargetRecord[]).
 */
export interface TrialOutcomeRecord {
  reactionTimeMs: number;
  outcome: "hit" | "miss";
}

/**
 * Minimo de reactionTimeMs entre los ensayos con outcome==='hit' -
 * EXCLUYE siempre los fallos ('miss'). null si no hay ningun acierto
 * (array vacio, o solo fallos) - nunca 0 ni Infinity como valor por
 * defecto, para no confundir "sin aciertos" con "0 ms de reaccion".
 */
export function getBestHitTimeMs(records: readonly TrialOutcomeRecord[]): number | null {
  const hitTimes = records.filter((r) => r.outcome === "hit").map((r) => r.reactionTimeMs);
  if (hitTimes.length === 0) return null;
  return Math.min(...hitTimes);
}
