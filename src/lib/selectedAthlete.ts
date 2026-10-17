/**
 * Seleccion ACTIVA de deportista para ORION Play (Fase 1 del contexto
 * compartido de Visual Lab) - guardada solo en localStorage del
 * navegador, nunca en Core. Clave DELIBERADAMENTE distinta de
 * lastVisitedProfile.ts (ver ese archivo): son conceptos distintos -
 * "ultimo perfil visitado" se actualiza pasivamente al entrar en
 * cualquier ficha de /perfiles/atleta/[id], mientras que esta clave solo
 * cambia por una accion explicita dentro de ORION Play. Reutilizar la
 * misma clave permitiria que visitar la ficha de otro atleta en
 * /perfiles cambiase silenciosamente con quien se esta entrenando en
 * ORION Play - exactamente la asociacion accidental que este diseño
 * evita a proposito.
 *
 * Solo se guarda el identificador (UUID de core.athletes.id) - NINGUN
 * dato clinico ni personal adicional (nombre, ORION ID, programa...):
 * a diferencia de lastVisitedProfile.ts (que si cachea nombre/ORION ID/
 * programa como conveniencia visual), aqui se prioriza no duplicar esos
 * datos en el navegador. Quien necesite mostrar el nombre debe resolverlo
 * con una consulta autorizada (ver selectedAthlete.actions.ts,
 * getSelectedAthleteIfAccessible) - nunca confiando en nada cacheado.
 *
 * El valor guardado NUNCA es prueba de autorizacion por si mismo: es una
 * comodidad de navegacion para rellenar un atajo en el selector. La
 * barrera de seguridad real sigue siendo, sin cambios, getAthleteById()/
 * RLS en /visual-lab/play/[exerciseId]/[athleteId]/page.tsx y la propia
 * RLS de core.sessions en submitPlayAttempt.
 */

export const SELECTED_ATHLETE_STORAGE_KEY = "orion-portal:visual-lab:selected-athlete";

/** UUID v4 estandar (el formato real de core.athletes.id, usado ya en
 * todo el proyecto via crypto.randomUUID()). Cualquier valor que no
 * cumpla este formato se trata como "no hay seleccion valida" - nunca se
 * reenvia tal cual a una consulta ni a un componente. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidAthleteId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * Guarda el id del deportista activo. No valida aqui el formato antes de
 * escribir (quien llama a esta funcion - el hook, mas abajo - ya debe
 * tener un id real procedente de una seleccion valida del propio
 * profesional, nunca de una fuente externa no confiable); la validacion
 * estricta se aplica siempre AL LEER (getSelectedAthleteId), que es el
 * punto donde un valor corrupto o manipulado podria entrar en juego.
 */
export function saveSelectedAthlete(athleteId: string): void {
  try {
    window.localStorage.setItem(SELECTED_ATHLETE_STORAGE_KEY, athleteId);
  } catch {
    // localStorage puede fallar (navegacion privada, cuota...) - no es critico,
    // la seleccion simplemente no sobrevive a esta sesion/pestaña.
  }
}

/**
 * Lee el id guardado. Devuelve null tanto si no hay nada guardado como si
 * el valor guardado no tiene forma de UUID valido (corrupto, manipulado a
 * mano, o de una version futura/anterior con otro formato) - en ese
 * segundo caso, ademas, se limpia la entrada invalida para no repetir
 * esta comprobacion fallida en cada lectura futura.
 */
export function getSelectedAthleteId(): string | null {
  try {
    const raw = window.localStorage.getItem(SELECTED_ATHLETE_STORAGE_KEY);
    if (!raw) return null;
    if (!isValidAthleteId(raw)) {
      clearSelectedAthlete();
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function clearSelectedAthlete(): void {
  try {
    window.localStorage.removeItem(SELECTED_ATHLETE_STORAGE_KEY);
  } catch {
    // ignorar
  }
}
