"use client";

import { useState } from "react";
import type { Club } from "@/lib/data/clubs";
import ClubField from "./ClubField";
import TeamField from "./TeamField";

export default function SportsDataSection({
  athleteId,
  currentClubId,
  currentClubName,
  clubs,
  currentCategory,
  currentPosition,
  currentDorsal,
  categories,
}: {
  athleteId: string;
  currentClubId: string | null;
  currentClubName: string | null;
  clubs: Club[];
  currentCategory: string | null;
  currentPosition: string | null;
  currentDorsal: number | null;
  categories: string[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    // h-full: hereda la altura resuelta que le pasa su wrapper en
    // page.tsx (a su vez estirado por align-items:stretch de la fila
    // inferior de General) - asi su borde llega a igualar el del Tablón.
    // El contenido sigue en flujo de bloque normal (cabecera + rejilla de
    // campos), nada se estira ni se reparte para rellenar el hueco.
    <div className="h-full rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Datos deportivos (Keratos)
        </p>
        {editing ? (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
          >
            Editar
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ClubField
          athleteId={athleteId}
          currentClubId={currentClubId}
          currentClubName={currentClubName}
          clubs={clubs}
          editing={editing}
          onSaved={() => setEditing(false)}
        />
        <TeamField
          athleteId={athleteId}
          clubId={currentClubId}
          currentCategory={currentCategory}
          currentPosition={currentPosition}
          currentDorsal={currentDorsal}
          categories={categories}
          editing={editing}
          onSaved={() => setEditing(false)}
        />
      </div>
    </div>
  );
}
