"use client";

import { useActionState, useState } from "react";
import { createAthlete, type NewAthleteState } from "./actions";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

const initialState: NewAthleteState = { error: null };

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default function NewAthleteForm({
  programs,
  defaultProgram,
}: {
  programs: { id: string; label: string }[];
  defaultProgram?: string;
}) {
  const [state, formAction, pending] = useActionState(createAthlete, initialState);
  const [birthDate, setBirthDate] = useState("");
  const age = calcAge(birthDate);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-orion-navy-100 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-orion-navy-700">Nombre</label>
          <input
            name="first_name"
            required
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-orion-navy-700">Apellidos</label>
          <input
            name="last_name"
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-orion-navy-700">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            name="birth_date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
          {age !== null && (
            <p className="mt-1 text-xs text-orion-navy-500">Edad: {age} años</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-orion-navy-700">Género</label>
          <select
            name="gender"
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          >
            <option value="">— Sin especificar —</option>
            <option value="female">Femenino</option>
            <option value="male">Masculino</option>
            <option value="other">Otro</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-orion-navy-700">
            Correo electrónico (opcional)
          </label>
          <input
            type="email"
            name="email"
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-orion-navy-700">
            Teléfono (opcional)
          </label>
          <input
            type="tel"
            name="phone"
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-orion-navy-700">
          Programa(s) — puede elegir más de uno
        </label>
        <div className="flex flex-wrap gap-3">
          {programs.map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-sm text-orion-navy-800">
              <input
                type="checkbox"
                name="programs"
                value={p.id}
                defaultChecked={p.id === defaultProgram}
                className="h-4 w-4"
              />
              {p.label}
            </label>
          ))}
        </div>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-60 ${CREATE_ACTION_CLASSES}`}
      >
        {pending ? "Creando…" : "Crear perfil"}
      </button>
    </form>
  );
}
