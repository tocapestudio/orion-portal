"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AthleteRosterRow } from "@/lib/data/athletes";
import type { Program } from "@/lib/data/programs";
import StatusToggle from "./StatusToggle";
import Avatar from "@/components/ui/Avatar";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

type SortKey = "name_asc" | "name_desc" | "orion_asc" | "orion_desc";
type StatusFilter = "all" | "active" | "inactive";

export default function RosterClient({
  athletes,
  programs,
  clubByAthleteId,
  occupationByAthleteId,
}: {
  athletes: AthleteRosterRow[];
  programs: Program[];
  /** Club activo (Keratos) por atleta, para mostrarlo en la linea de programa. */
  clubByAthleteId: Record<string, string>;
  /** Profesion (Avanza) por atleta, para mostrarla en la linea de programa. */
  occupationByAthleteId: Record<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name_asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");

  const programLabel = useMemo(
    () => new Map(programs.map((p) => [p.id, p.label])),
    [programs]
  );

  /** "Miguelturreño Femenino · KERATOS · Fisioterapeuta · AVANZA" — dato
   * extra solo cuando aplica (club en Keratos, profesion en Avanza). */
  const programSummary = (a: AthleteRosterRow) =>
    a.programIds
      .map((pid) => {
        const label = (programLabel.get(pid) ?? pid).toUpperCase();
        if (pid === "keratos") {
          const club = clubByAthleteId[a.id];
          return club ? `${club} · ${label}` : label;
        }
        if (pid === "avanza") {
          const occupation = occupationByAthleteId[a.id];
          return occupation ? `${occupation} · ${label}` : label;
        }
        return label;
      })
      .join("  ·  ");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = athletes.filter((a) => {
      const matchesQuery =
        !q || a.full_name.toLowerCase().includes(q) || String(a.short_id).includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && a.status === "active") ||
        (statusFilter === "inactive" && a.status !== "active");
      const matchesProgram = programFilter === "all" || a.programIds.includes(programFilter);
      return matchesQuery && matchesStatus && matchesProgram;
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "name_desc":
          return b.full_name.localeCompare(a.full_name);
        case "orion_asc":
          return a.short_id - b.short_id;
        case "orion_desc":
          return b.short_id - a.short_id;
        default:
          return a.full_name.localeCompare(b.full_name);
      }
    });

    return rows;
  }, [athletes, query, sort, statusFilter, programFilter]);

  return (
    <div className="space-y-4">
      {/* Fila unica en escritorio: buscador, grupo de filtros y +Nuevo son
          3 hijos directos del mismo flex row (nada anidado con flex-1 "de
          relleno"). El hueco flexible antes de +Nuevo es un simple
          "margin-left: auto" — el patron estandar de flexbox para empujar
          un item al extremo, no un margen arbitrario. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o ORION ID"
          className="w-full rounded-lg border border-orion-navy-200 bg-white px-4 py-2 text-sm text-orion-navy-900 outline-none focus:border-orion-navy-500 focus:ring-2 focus:ring-orion-navy-200 lg:w-72 lg:shrink-0"
        />

        <div className="flex flex-wrap items-center gap-2 text-xs lg:flex-nowrap">
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="rounded-lg border border-orion-navy-200 bg-white px-2 py-1.5 text-orion-navy-700"
          >
            <option value="all">Todos los programas</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-orion-navy-200 bg-white px-2 py-1.5 text-orion-navy-700"
          >
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="name_desc">Nombre (Z-A)</option>
            <option value="orion_asc">ORION ID (asc.)</option>
            <option value="orion_desc">ORION ID (desc.)</option>
          </select>

          <div className="flex shrink-0 overflow-hidden rounded-lg border border-orion-navy-200">
            {(["all", "active", "inactive"] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1.5 font-medium ${
                  statusFilter === f
                    ? "bg-orion-navy-700 text-white"
                    : "bg-white text-orion-navy-600 hover:bg-orion-navy-100"
                }`}
              >
                {f === "all" ? "Todos" : f === "active" ? "Activos" : "Inactivos"}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/perfiles/nuevo"
          className={`shrink-0 rounded-lg px-4 py-2 text-center text-sm font-semibold lg:ml-auto ${CREATE_ACTION_CLASSES}`}
        >
          + Nuevo
        </Link>
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-orion-navy-400">Sin resultados.</p>
      )}

      <div className="space-y-2">
        {filtered.map((a) => (
          <Link
            key={a.id}
            href={`/perfiles/atleta/${a.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-orion-navy-100 bg-white px-4 py-3 text-sm hover:border-orion-navy-400"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar src={a.profile_image} size={36} />
              <div className="min-w-0">
                <p className="truncate font-medium text-orion-navy-900">{a.full_name}</p>
                <p className="truncate text-xs text-orion-navy-500" title={programSummary(a)}>
                  {programSummary(a)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-orion-navy-100 px-2 py-0.5 text-xs text-orion-navy-600">
                ORION ID #{a.short_id}
              </span>
              <StatusToggle athleteId={a.id} status={a.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
