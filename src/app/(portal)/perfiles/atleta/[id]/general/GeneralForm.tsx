"use client";

import { useActionState, useState } from "react";
import type { Athlete } from "@/lib/data/athletes";
import { useCloseOnSuccess } from "@/lib/useCloseOnSuccess";
import { updateAthleteGeneral, type GeneralFormState } from "./actions";

const initialState: GeneralFormState = { error: null, success: false };

function ViewField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-orion-navy-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-orion-navy-900">{value ?? "—"}</p>
    </div>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-orion-navy-400">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm text-orion-navy-900 outline-none focus:border-orion-navy-500 focus:ring-2 focus:ring-orion-navy-200"
      />
    </label>
  );
}

function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// birth_date llega como "aaaa-mm-dd" (input type=date) — se parte el
// string directamente en vez de pasar por Date, para no arrastrar
// desfases de zona horaria al reformatear.
function formatBirthDate(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-");
  if (!year || !month || !day) return birthDate;
  return `${day}-${month}-${year}`;
}

const GENDER_LABEL: Record<string, string> = {
  female: "Femenino",
  male: "Masculino",
  other: "Otro",
};

function formatGender(gender: string | null): string | null {
  if (!gender) return null;
  return GENDER_LABEL[gender] ?? gender;
}

/**
 * Notas vive como mini-columna lateral estrecha (170px) DENTRO de esta
 * misma tarjeta (grid xl:grid-cols-[1fr_170px]), no como bloque aparte
 * — asi aprovecha la altura que ya ocupan los campos principales en vez
 * de añadir una fila nueva al dashboard. athlete.notes ya existia como
 * campo editable (antes solo en modo edicion, sin mostrarse en modo
 * vista) — aqui no se crea ningun campo nuevo, solo se reubica. La foto
 * de perfil ya no vive aqui — se muestra junto al nombre en la cabecera
 * del perfil (layout.tsx), para no duplicarla.
 */
export default function GeneralForm({
  athlete,
  programIds,
}: {
  athlete: Athlete;
  /** Programas YA asignados a este atleta (core.athlete_programs) - el
   * modelo real admite varios a la vez (muchos-a-muchos), por eso es un
   * array, no un unico id. Ya NO se edita aqui (ver
   * ProgramBadgesEditor.tsx, en la cabecera del perfil) - este formulario
   * solo los reenvia como ocultos para que updateAthleteGeneral (que
   * sincroniza TODA la asignacion en cada guardado) no los borre al
   * guardar el resto de Datos Personales. */
  programIds: string[];
}) {
  const [state, formAction, pending] = useActionState(updateAthleteGeneral, initialState);
  const [editing, setEditing] = useState(false);

  useCloseOnSuccess(state, () => setEditing(false));

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Datos Personales
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
          >
            Editar ficha
          </button>
        )}
      </div>

      {editing ? (
        <form action={formAction}>
          <input type="hidden" name="athlete_id" value={athlete.id} />
          {programIds.map((pid) => (
            <input key={pid} type="hidden" name="programs" value={pid} />
          ))}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_170px]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Input label="Nombre y apellidos" name="full_name" defaultValue={athlete.full_name} required />
                <Input label="Fecha de nacimiento" name="birth_date" type="date" defaultValue={athlete.birth_date ?? ""} />
                <Input label="Género" name="gender" defaultValue={athlete.gender ?? ""} />
                <Input label="Mano dominante" name="dominant_hand" defaultValue={athlete.dominant_hand ?? ""} />
                <Input label="Pie dominante" name="dominant_foot" defaultValue={athlete.dominant_foot ?? ""} />
              </div>
              {/* Fila propia para Telefono/Correo: email siempre con el
                  doble de ancho que telefono (sm:col-span-2), en una
                  sub-rejilla independiente de los demas campos para que
                  queden alineados igual en modo edicion y lectura pese
                  a tener distinto numero de campos antes (Edad solo
                  existe en modo lectura). */}
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Input label="Teléfono" name="phone" type="tel" defaultValue={athlete.phone ?? ""} />
                <div className="sm:col-span-2">
                  <Input label="Correo electrónico" name="email" type="email" defaultValue={athlete.email ?? ""} />
                </div>
              </div>
            </div>

            <div className="flex h-full flex-col rounded-md border border-amber-200 bg-amber-50 p-3 shadow-sm">
              <span className="mb-1 block text-xs font-semibold text-amber-800">Notas</span>
              <textarea
                name="notes"
                rows={7}
                defaultValue={athlete.notes ?? ""}
                placeholder="Notas internas…"
                className="h-full w-full resize-none rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1.5 text-xs text-amber-900 outline-none placeholder:text-amber-400/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </div>
          </div>

          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm font-medium text-orion-navy-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_170px]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <ViewField label="Nombre y apellidos" value={athlete.full_name} />
              <ViewField label="Fecha de nacimiento" value={formatBirthDate(athlete.birth_date)} />
              <ViewField label="Edad" value={ageFromBirthDate(athlete.birth_date)} />
              <ViewField label="Género" value={formatGender(athlete.gender)} />
              <ViewField label="Mano dominante" value={athlete.dominant_hand} />
              <ViewField label="Pie dominante" value={athlete.dominant_foot} />
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
              <ViewField label="Teléfono" value={athlete.phone} />
              <div className="sm:col-span-2">
                <ViewField label="Correo electrónico" value={athlete.email} />
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-md border border-amber-200 bg-amber-50 p-3 shadow-sm">
            <p className="mb-1 text-xs font-semibold text-amber-800">Notas</p>
            {athlete.notes ? (
              <p className="whitespace-pre-wrap text-xs text-amber-900">{athlete.notes}</p>
            ) : (
              <p className="text-xs text-amber-400">Sin notas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
