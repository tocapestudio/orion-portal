/**
 * Referencia al ultimo perfil de atleta visitado, guardada solo en
 * localStorage del navegador — nada de esto vive en Core. Solo se
 * guardan datos ya visibles en cualquier lista de Perfiles (nombre,
 * ORION ID, programa), nada sensible. Solo tiene sentido usado desde
 * componentes cliente.
 */
const STORAGE_KEY = "orion-portal:last-visited-profile";

export interface LastVisitedProfile {
  athleteId: string;
  fullName: string;
  shortId: number;
  programLabel: string | null;
}

export function saveLastVisitedProfile(profile: LastVisitedProfile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage puede fallar (navegacion privada, cuota...) — no es critico.
  }
}

export function getLastVisitedProfile(): LastVisitedProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.athleteId !== "string") return null;
    return parsed as LastVisitedProfile;
  } catch {
    return null;
  }
}

export function clearLastVisitedProfile() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorar
  }
}
