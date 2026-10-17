"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { AthleteRosterRow } from "@/lib/data/athletes";
import AthleteListItem from "./AthleteListItem";

/**
 * Toolbar (buscador + acciones) y listado de un programa concreto
 * (/perfiles/[programa]) — mismo patron que RosterClient (el buscador
 * general de /perfiles): estado local de React, filtrado en cliente con
 * useMemo, sin query params ni router.push. Al no pushear una entrada de
 * historial por cada busqueda, el boton "Volver" (que usa router.back
 * cuando hay historial interno) vuelve a /perfiles directamente, sin
 * quedarse atrapado en el historial de búsquedas.
 *
 * `toolbarActions` (toggle Perfiles/Clubes + boton crear) y `clubsContent`
 * (listado de clubes) llegan ya renderizados desde el Server Component —
 * viven aqui dentro para conservar EXACTAMENTE la misma fila de toolbar
 * que ya existia (buscador a la izquierda, acciones a la derecha), ya que
 * el buscador necesita compartir estado de React con el listado de abajo.
 */
export default function ProgramRosterClient({
  athletes,
  clubNameByAthleteId,
  occupationByAthleteId,
  isKeratos,
  isAvanza,
  placeholder,
  toolbarActions,
  showClubesView,
  clubsContent,
}: {
  athletes: AthleteRosterRow[];
  clubNameByAthleteId: Record<string, string>;
  occupationByAthleteId: Record<string, string>;
  isKeratos: boolean;
  isAvanza: boolean;
  placeholder: string;
  toolbarActions: ReactNode;
  showClubesView: boolean;
  clubsContent: ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter(
      (a) => a.full_name.toLowerCase().includes(q) || String(a.short_id).includes(q)
    );
  }, [athletes, query]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative sm:flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-orion-navy-200 bg-white px-4 py-2 pr-9 text-sm text-orion-navy-900 outline-none focus:border-orion-navy-500 focus:ring-2 focus:ring-orion-navy-200"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-3.5 w-3.5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbarActions}</div>
      </div>

      {showClubesView ? (
        clubsContent
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-orion-navy-400">
              {athletes.length === 0
                ? "Todavía no hay perfiles en este programa."
                : "Sin resultados."}
            </p>
          )}
          {filtered.map((a) => (
            <AthleteListItem
              key={a.id}
              athlete={a}
              status={a.status}
              subtitle={
                isKeratos
                  ? (clubNameByAthleteId[a.id] ?? null)
                  : isAvanza
                    ? (occupationByAthleteId[a.id] ?? null)
                    : undefined
              }
              subtitleType={isKeratos ? "club" : isAvanza ? "profession" : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
