"use client";

import { useEffect } from "react";
import { saveLastVisitedProfile } from "@/lib/lastVisitedProfile";

/**
 * Invisible: solo registra en localStorage que este perfil fue el ultimo
 * visitado. Vive en el layout de la ficha, que Next.js NO vuelve a montar
 * al cambiar de pestaña dentro del mismo perfil (General -> Objetivos...),
 * solo al entrar en un atleta distinto — asi que esto se ejecuta una vez
 * por visita a un perfil, no en cada cambio de pestaña.
 */
export default function LastVisitedProfileTracker({
  athleteId,
  fullName,
  shortId,
  programLabel,
}: {
  athleteId: string;
  fullName: string;
  shortId: number;
  programLabel: string | null;
}) {
  useEffect(() => {
    saveLastVisitedProfile({ athleteId, fullName, shortId, programLabel });
  }, [athleteId, fullName, shortId, programLabel]);

  return null;
}
