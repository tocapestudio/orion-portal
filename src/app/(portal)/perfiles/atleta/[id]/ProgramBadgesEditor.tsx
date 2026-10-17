"use client";

import { useActionState, useState } from "react";
import type { Athlete } from "@/lib/data/athletes";
import type { Program } from "@/lib/data/programs";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { PROGRAM_COLOR, PROGRAM_DESCRIPTIONS } from "@/lib/programMeta";
import { updateAthleteGeneral, type GeneralFormState } from "./general/actions";

const initialState: GeneralFormState = { error: null, success: false };

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/**
 * Distintivos de programa en la cabecera del perfil (visible en TODAS
 * las pestañas, no solo General) + edicion in-situ, SIN duplicar el
 * formulario de Datos Personales: reutiliza exactamente la misma accion
 * de guardado (updateAthleteGeneral) que ya sincroniza
 * core.athlete_programs - mismo name="programs" en los checkboxes, mismo
 * modelo muchos-a-muchos. Como esa accion actualiza TODOS los campos de
 * Datos Personales a la vez (no solo programas), se reenvian los demas
 * campos actuales del atleta como inputs ocultos para no borrarlos al
 * guardar solo el programa desde aqui.
 *
 * El campo "Programa" ya NO vive en GeneralForm.tsx (se retiro de la
 * cuadricula de Datos Personales) - este es el UNICO sitio donde se
 * edita ahora.
 */
export default function ProgramBadgesEditor({
  athleteId,
  athlete,
  programs,
  programIds,
}: {
  athleteId: string;
  athlete: Athlete;
  /** Catalogo completo (PRISMA/KERATOS/AVANZA), para listar las opciones
   * del selector - nunca para limitar lo que ya tiene el atleta. */
  programs: Program[];
  programIds: string[];
}) {
  const [state, formAction, pending] = useActionState(updateAthleteGeneral, initialState);
  const [editing, setEditing] = useState(false);

  useCloseOnSuccess(state, () => setEditing(false));

  const athletePrograms = programs.filter((p) => programIds.includes(p.id));

  if (!editing) {
    return (
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        {athletePrograms.map((p) => (
          <span
            key={p.id}
            title={p.description ?? PROGRAM_DESCRIPTIONS[p.id] ?? p.label}
            className="flex items-center gap-1 rounded-full bg-orion-navy-100 px-2 py-0.5 text-xs font-medium text-orion-navy-700"
          >
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-sm ${PROGRAM_COLOR[p.id] ?? "bg-orion-navy-400"}`}
            />
            {p.label}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Editar programa"
          aria-label="Editar programa"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700"
        >
          <PencilIcon className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="full_name" value={athlete.full_name} />
      <input type="hidden" name="birth_date" value={athlete.birth_date ?? ""} />
      <input type="hidden" name="gender" value={athlete.gender ?? ""} />
      <input type="hidden" name="dominant_hand" value={athlete.dominant_hand ?? ""} />
      <input type="hidden" name="dominant_foot" value={athlete.dominant_foot ?? ""} />
      <input type="hidden" name="email" value={athlete.email ?? ""} />
      <input type="hidden" name="phone" value={athlete.phone ?? ""} />
      <input type="hidden" name="notes" value={athlete.notes ?? ""} />

      <div className="flex flex-wrap gap-2.5">
        {programs.map((p) => (
          <label key={p.id} className="flex items-center gap-1 text-xs text-orion-navy-800">
            <input
              type="checkbox"
              name="programs"
              value={p.id}
              defaultChecked={programIds.includes(p.id)}
              className="h-3.5 w-3.5 rounded border-orion-navy-300 text-orion-navy-700 focus:ring-orion-navy-400"
            />
            {p.label}
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-orion-navy-700 px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="rounded border border-orion-navy-200 px-2 py-0.5 text-[11px] font-medium text-orion-navy-700"
      >
        Cancelar
      </button>
      {state.error && <p className="w-full text-[11px] text-red-600">{state.error}</p>}
    </form>
  );
}
