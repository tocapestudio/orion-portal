"use server";

/**
 * Verificacion server-side de la seleccion ACTIVA de deportista (Fase 1
 * del contexto compartido de Visual Lab) - archivo DELIBERADAMENTE
 * separado de actions.ts (que contiene submitPlayAttempt y toda la
 * persistencia de resultados): esta funcion no escribe nada, no toca
 * sessions/session_activities/results, y mezclarla con esa logica
 * dificultaria distinguir "codigo que persiste intentos" de "codigo que
 * solo resuelve quien esta seleccionado".
 *
 * Mismo patron exacto que getLastVisitedProfileIfAccessible
 * (src/app/(portal)/perfiles/actions.ts): re-consulta `athletes` por id
 * usando el cliente de Supabase del SERVIDOR (RLS real, no un atajo) -
 * si el profesional autenticado no tiene acceso a ese atleta,
 * `.maybeSingle()` devuelve null y esta funcion propaga null. El id
 * guardado en localStorage (ver ../../../../lib/selectedAthlete.ts)
 * NUNCA se trata como prueba de autorizacion por si mismo - esta es la
 * unica forma en que "hay una seleccion guardada" se convierte en "se
 * puede ofrecer de verdad", y es exactamente la misma barrera que ya usa
 * getAthleteById() en [athleteId]/page.tsx, sin duplicarla de forma
 * distinta ni debilitarla.
 *
 * NOTA (corrección arquitectónica posterior a la Fase 2): este archivo
 * sigue viviendo bajo visual-lab/play/ por minimizar cambios de ruta de
 * importación mientras el indicador antiguo (orionPlayV2/ui/
 * SelectedAthleteIndicator.tsx) sigue presente sin usarse - ver ese
 * archivo y visual-lab/play/layout.tsx para el estado de la migración.
 * Ya NO es exclusivo de ORION Play: getMyAthletesForSelection (mas abajo)
 * lo usa el nuevo indicador compartido de /visual-lab/layout.tsx. Mover
 * este archivo a visual-lab/ queda pendiente para cuando se retire el
 * indicador antiguo, no en este cambio (migracion en pasos pequeños).
 */

import { createClient } from "@/lib/supabase/server";
import { isValidAthleteId } from "@/lib/selectedAthlete";
import { getMyAthletes } from "@/lib/data/athletes";

export interface SelectedAthleteResult {
  athleteId: string;
  fullName: string;
  shortId: number;
}

/**
 * Devuelve los datos minimos visibles del deportista (nombre, ORION ID)
 * SOLO si el profesional autenticado tiene acceso real segun RLS; null en
 * cualquier otro caso (id con formato invalido, atleta inexistente, o
 * atleta existente pero no autorizado para este profesional - los tres
 * casos se tratan igual desde fuera, sin distinguir cual fue, igual que
 * ya hace getAthleteById()).
 */
export async function getSelectedAthleteIfAccessible(
  athleteId: string
): Promise<SelectedAthleteResult | null> {
  if (!isValidAthleteId(athleteId)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("athletes")
    .select("id, full_name, short_id")
    .eq("id", athleteId)
    .maybeSingle();

  if (!data) return null;

  return {
    athleteId: data.id,
    fullName: data.full_name,
    shortId: data.short_id,
  };
}

export interface AthleteSelectionOption {
  id: string;
  label: string;
  shortId: number;
}

/**
 * Lista de deportistas para el panel de seleccion del indicador
 * compartido de Visual Lab - deliberadamente NO se llama desde el layout
 * (que se montaria en cada pagina de /visual-lab/*), sino solo cuando el
 * profesional abre el panel ("Elegir"/"Cambiar"), para no repetir esta
 * consulta en cada navegacion. Reutiliza getMyAthletes() tal cual (ya
 * filtrado por RLS, sin modificarlo) y solo remapea la forma al
 * `AthleteOption` que ya espera AthletePicker.tsx (id/label/shortId).
 */
export async function getMyAthletesForSelection(): Promise<AthleteSelectionOption[]> {
  const athletes = await getMyAthletes();
  return athletes.map((a) => ({ id: a.id, label: a.full_name, shortId: a.short_id }));
}
