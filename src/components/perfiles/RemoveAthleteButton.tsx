"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeAthleteFromProfessional } from "@/app/(portal)/perfiles/actions";

/**
 * Borrado logico (ver removeAthleteFromProfessional): nunca borra al
 * atleta ni su historico, solo termina la relacion de este profesional
 * con el. Tras el exito, ya no es visible para este profesional via RLS
 * (is_professional_of_athlete exige status='active') - por eso se navega
 * fuera de la ficha, igual que si ya no existiera para esta sesion.
 */
export default function RemoveAthleteButton({
  athleteId,
  fullName,
}: {
  athleteId: string;
  fullName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    const confirmed = window.confirm(
      `¿Eliminar a "${fullName}" de tus atletas?\n\n` +
        "No se borrará su ficha ni su historial (sesiones, evaluaciones, resultados, notas) - " +
        "solo dejará de aparecer entre tus atletas. Un administrador podría restaurar el acceso más adelante."
    );
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const res = await removeAthleteFromProfessional(athleteId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/perfiles");
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title="Eliminar atleta"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Eliminando…" : "Eliminar atleta"}
      </button>
      {error && <p className="mt-1 max-w-[220px] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
