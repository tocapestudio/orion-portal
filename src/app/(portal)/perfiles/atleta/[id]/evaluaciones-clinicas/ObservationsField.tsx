"use client";

import { forwardRef } from "react";

/**
 * Texto libre en la cabecera de la ficha — siempre manual, sin badge de
 * procedencia. Bloque "tonto": editing llega como prop, expone su <form>
 * via ref para el "Guardar ficha" unico del padre (ya no gestiona su
 * propio modo edicion/guardado independiente).
 */
const ObservationsField = forwardRef<
  HTMLFormElement,
  { athleteId: string; evaluationId: string; observations: string | null; editing: boolean }
>(function ObservationsField({ athleteId, evaluationId, observations, editing }, ref) {
  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-orion-navy-500">Observaciones</p>
        <p
          className={`max-w-[260px] truncate text-xs ${
            observations ? "font-medium text-orion-navy-800" : "text-orion-navy-300"
          }`}
        >
          {observations || "—"}
        </p>
      </div>
    );
  }

  return (
    <form ref={ref} onSubmit={(e) => e.preventDefault()} className="space-y-1">
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <p className="text-xs text-orion-navy-500">Observaciones</p>
      <textarea
        name="observations"
        rows={2}
        defaultValue={observations ?? ""}
        className="w-full rounded-md border border-orion-navy-200 px-2 py-1.5 text-xs"
      />
    </form>
  );
});

export default ObservationsField;
