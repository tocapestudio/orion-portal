"use client";

/**
 * Hook cliente para leer/actualizar la seleccion ACTIVA de deportista
 * (Fase 1 del contexto compartido de Visual Lab) - envuelve
 * selectedAthlete.ts (localStorage) con estado reactivo. Sin
 * Context/Provider: cada componente que llame a este hook lee el MISMO
 * localStorage, asi que no hace falta un arbol de Provider para
 * compartir el valor entre componentes - ver el diseño aprobado para el
 * razonamiento completo de por que se descarto un Context de React aqui.
 *
 * Hidratacion (Next.js): el estado inicial es `undefined` (distinto de
 * `null`) para representar "todavia no se ha leido localStorage" - ni
 * siquiera se intenta leer durante el render inicial (que en el servidor
 * no tiene `window` y en el cliente, si se leyera de forma sincrona en el
 * cuerpo del componente, podria no coincidir con el HTML ya renderizado
 * por el servidor). La lectura real ocurre dentro de useEffect, que solo
 * se ejecuta en el cliente DESPUES del primer render/hidratacion - mismo
 * patron ya probado en AthletePicker.tsx (useEffect(() => { const cached
 * = getLastVisitedProfile() ... }, [])), aqui generalizado a un hook
 * reutilizable. `isHydrated` expone esta distincion a quien consuma el
 * hook, para poder evitar un parpadeo "sin seleccion" -> "Nombre X" en la
 * UI (relevante para la Fase 2, no se usa en esta fase).
 *
 * Sincronizacion entre pestañas: el evento `storage` del navegador se
 * dispara automaticamente en las DEMAS pestañas/ventanas del mismo origen
 * cuando una de ellas modifica localStorage (nunca en la pestaña que hizo
 * el cambio, por eso selectAthlete/clearAthlete tambien actualizan el
 * estado local directamente, sin depender de este evento para su propia
 * pestaña). Se filtra por `event.key` para no reaccionar a cambios de
 * otras claves de localStorage ajenas a esta (p.ej. lastVisitedProfile).
 */

import { useCallback, useEffect, useState } from "react";
import {
  SELECTED_ATHLETE_STORAGE_KEY,
  clearSelectedAthlete,
  getSelectedAthleteId,
  saveSelectedAthlete,
} from "./selectedAthlete";

export interface UseSelectedAthleteResult {
  /** null = sin seleccion activa (o todavia no leido - ver isHydrated). */
  athleteId: string | null;
  /** false hasta que se complete la primera lectura de localStorage en
   * el cliente (un unico tick, tras el montaje). */
  isHydrated: boolean;
  /** Guarda la seleccion. El propio hook NO valida aqui que el id sea
   * accesible para el profesional - eso es responsabilidad de quien
   * llame (ver selectedAthlete.actions.ts, getSelectedAthleteIfAccessible),
   * que debe verificarlo ANTES de invocar a selectAthlete con un id que
   * provenga de una fuente no confiable. Este hook solo valida el
   * FORMATO (UUID), nunca la autorizacion. */
  selectAthlete: (athleteId: string) => void;
  clearAthlete: () => void;
}

export function useSelectedAthlete(): UseSelectedAthleteResult {
  const [athleteId, setAthleteId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    // Lectura de localStorage (sistema externo) tras el montaje,
    // exactamente el caso que la propia regla admite como legitimo
    // ("subscribe for updates from some external system") - mismo patron
    // ya usado en useExerciseFlow.ts para hidratar config desde
    // localStorage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAthleteId(getSelectedAthleteId());

    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== SELECTED_ATHLETE_STORAGE_KEY) return;
      setAthleteId(getSelectedAthleteId());
    }

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, []);

  const selectAthlete = useCallback((id: string) => {
    saveSelectedAthlete(id);
    setAthleteId(id);
  }, []);

  const clearAthlete = useCallback(() => {
    clearSelectedAthlete();
    setAthleteId(null);
  }, []);

  return {
    athleteId: athleteId ?? null,
    isHydrated: athleteId !== undefined,
    selectAthlete,
    clearAthlete,
  };
}
