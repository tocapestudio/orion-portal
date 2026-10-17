"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AthletePicker from "@/components/agenda/AthletePicker";

interface Option {
  id: string;
  label: string;
  shortId?: number;
}

/**
 * Paso "seleccionar perfil/atleta" del flujo de ORION Play, despues de
 * elegir el ejercicio en el catalogo. Reutiliza AthletePicker tal cual
 * (mismo componente que ya usa EventFormModal en Agenda) — se lee el
 * valor via FormData del propio <form> al enviar, sin tocar AthletePicker
 * ni añadirle ningun callback nuevo. Al confirmar, navega a
 * /visual-lab/play/[exerciseId]/[athleteId], donde vive el
 * ExerciseRunner real.
 */
export default function PlayAthletePicker({
  exerciseId,
  athletes,
}: {
  exerciseId: string;
  athletes: Option[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const athleteId = String(formData.get("athlete_id") ?? "");
        if (!athleteId) {
          setError("Selecciona un perfil para continuar.");
          return;
        }
        router.push(`/visual-lab/play/${exerciseId}/${athleteId}`);
      }}
      className="space-y-4"
    >
      <AthletePicker name="athlete_id" athletes={athletes} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-800"
      >
        Continue
      </button>
    </form>
  );
}
