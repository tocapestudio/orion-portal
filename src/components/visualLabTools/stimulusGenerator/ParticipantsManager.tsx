"use client";

/**
 * Gestion de participantes adicionales (ORION Tools, 2o incremento) -
 * boton "+ Añadir participantes" (abre AthleteSelectorPanel, variante
 * 'floating', YA existente - no se duplica logica de busqueda/permisos)
 * + lista de chips con boton para quitar antes de iniciar.
 *
 * Estado CONTROLADO por el padre (StimulusGeneratorClient): este
 * componente no decide el modo individual/compartido ni llama al RPC,
 * solo gestiona la lista en memoria. "Evitar duplicados" se resuelve
 * pasando `excludeIds` a AthleteSelectorPanel (la persona principal y los
 * ya añadidos ni siquiera aparecen como opcion) + una comprobacion
 * defensiva aqui mismo antes de añadir.
 */

import AthleteSelectorPanel from "@/components/visualLab/AthleteSelectorPanel";
import type { AthleteSelectionOption } from "@/app/(portal)/visual-lab/play/selectedAthlete.actions";

export interface Participant {
  id: string;
  label: string;
  shortId: number;
}

export interface ParticipantsManagerProps {
  primaryAthleteId: string | null;
  participants: Participant[];
  onChange: (participants: Participant[]) => void;
}

export default function ParticipantsManager({ primaryAthleteId, participants, onChange }: ParticipantsManagerProps) {
  const excludeIds = [...(primaryAthleteId ? [primaryAthleteId] : []), ...participants.map((p) => p.id)];

  const handleAdd = (id: string, option: AthleteSelectionOption) => {
    if (excludeIds.includes(id)) return; // defensivo: no deberia poder pasar (ver excludeIds arriba)
    onChange([...participants, { id: option.id, label: option.label, shortId: option.shortId }]);
  };

  const handleRemove = (id: string) => {
    onChange(participants.filter((p) => p.id !== id));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AthleteSelectorPanel
        variant="floating"
        triggerLabel="+ Añadir participantes"
        triggerClassName="rounded-lg border border-dashed border-orion-navy-300 px-3 py-1.5 text-xs font-semibold text-orion-navy-600 hover:border-orion-navy-500 hover:text-orion-navy-800"
        excludeIds={excludeIds}
        onSelect={handleAdd}
      />
      {participants.map((p) => (
        <span
          key={p.id}
          className="flex items-center gap-1.5 rounded-lg border border-orion-navy-200 bg-white px-2.5 py-1 text-xs text-orion-navy-700"
        >
          {p.label}
          <button
            type="button"
            onClick={() => handleRemove(p.id)}
            aria-label={`Quitar a ${p.label}`}
            className="font-bold text-orion-navy-400 hover:text-red-600"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
