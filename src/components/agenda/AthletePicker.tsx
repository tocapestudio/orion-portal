"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getLastVisitedProfile } from "@/lib/lastVisitedProfile";
import {
  getLastVisitedProfileIfAccessible,
  type LastVisitedProfileResult,
} from "@/app/(portal)/perfiles/actions";

interface AthleteOption {
  id: string;
  label: string;
  shortId?: number;
}

const ACTIVE_BTN = "border-orion-navy-700 bg-orion-navy-700 text-white";
const INACTIVE_BTN = "border-orion-navy-200 text-orion-navy-700 hover:bg-orion-navy-100";

/**
 * Selector compacto de atleta/perfil para el formulario de eventos:
 * busqueda por nombre/ORION ID sobre el roster ya cargado (sin nueva
 * consulta a Core/RLS — filtra en cliente sobre `athletes`), boton
 * "Ninguno" y boton "Último perfil visto". Este ultimo reutiliza
 * exactamente el mismo localStorage y la misma Server Action con
 * verificacion RLS que ya usa LastVisitedProfileCard
 * (src/components/perfiles/LastVisitedProfileCard.tsx) — sin duplicar
 * logica de acceso a perfiles.
 *
 * Toda seleccion (dropdown, "Ninguno", "Último perfil visto") es un clic
 * explicito del usuario; nada se autoselecciona. Un <input type="hidden">
 * mantiene el mismo FormData nativo que usaba el <select> anterior — el
 * formulario sigue sin estar controlado a nivel de submit.
 *
 * `placeholder` (Visual Lab - aditivo, default = texto de siempre): solo
 * para que VisualLabAthleteCard.tsx pueda usar un texto mas especifico
 * ("Buscar deportista por nombre o ID…"). Ningun otro consumidor pasa
 * esta prop, asi que su render no cambia.
 *
 * La lista de resultados SIEMPRE flota (`position: absolute`, ver mas
 * abajo) sobre el contenido que haya debajo, con scroll interno propio -
 * nunca empuja el layout ni cambia la altura de quien use este
 * componente. Se probo una variante que la integraba en el flujo (Visual
 * Lab, Fase 3) y se revirtio: hacia que la tarjeta de seleccion creciera
 * y desplazara las tarjetas de debajo mientras se escribia, que es
 * justo el problema que el modo flotante evita.
 */
export default function AthletePicker({
  name,
  athletes,
  defaultAthleteId,
  onSelect,
  allowNone = true,
  placeholder = "Buscar perfil…",
}: {
  name: string;
  athletes: AthleteOption[];
  defaultAthleteId?: string;
  /** Opcional: se llama con el id elegido (cadena vacia "" si se pulsa
   * "Ninguno") cada vez que el usuario hace una seleccion explicita.
   * Permite a quien use este picker (en un <form> nativo) distinguir
   * "todavia no se ha tocado nada" de "se ha elegido explicitamente
   * Ninguno" en su propio submit - dentro de este componente esa
   * distincion ya la resuelve selectedId (string | null), pero el valor
   * final del campo del formulario sigue siendo solo un string. */
  onSelect?: (id: string) => void;
  /** Por defecto true (mismo comportamiento de siempre para todos los
   * consumidores existentes - formularios de agenda/eventos, etc). Los 3
   * pickers de ORION Play (ReactionTimeV2AthletePicker.tsx y equivalentes)
   * pasan `allowNone={false}`: ahi ya existe una via independiente para
   * "sin deportista" ("Continuar sin deportista" -> modo demo), asi que
   * el boton "Ninguno" de este componente seria una segunda forma
   * redundante de llegar a lo mismo. false oculta solo ese boton - el
   * resto (busqueda, Último perfil visto, seleccion) no cambia. */
  allowNone?: boolean;
  placeholder?: string;
}) {
  // string | null (no solo string): null = todavia no se ha elegido nada,
  // "" = "Ninguno" elegido EXPLICITAMENTE, "uuid" = atleta elegido. Antes
  // selectedId era siempre string y "" representaba ambos casos ("nada
  // tocado todavia" Y "Ninguno elegido") a la vez - un segundo estado
  // (hasInteracted) para distinguirlos no sobrevivio bien en la practica
  // (se repitio la prueba y el boton "Ninguno" seguia sin reaccionar), asi
  // que en vez de depender de dos variables de estado sincronizadas se
  // colapsa la distincion en una UNICA fuente de verdad: null vs "".
  const [selectedId, setSelectedId] = useState<string | null>(defaultAthleteId ?? null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [lastVisited, setLastVisited] = useState<LastVisitedProfileResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = getLastVisitedProfile();
    if (!cached) return;
    getLastVisitedProfileIfAccessible(cached.athleteId).then(setLastVisited);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = athletes.find((a) => a.id === selectedId) ?? null;
  // Aunque RLS lo confirme accesible en general, solo tiene sentido
  // ofrecer el boton si esta entre las opciones reales de este selector.
  const lastVisitedOption =
    lastVisited && athletes.some((a) => a.id === lastVisited.athleteId) ? lastVisited : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes.slice(0, 8);
    return athletes
      .filter((a) => a.label.toLowerCase().includes(q) || String(a.shortId ?? "").includes(q))
      .slice(0, 8);
  }, [athletes, query]);

  function select(id: string) {
    setSelectedId(id);
    setQuery("");
    setOpen(false);
    onSelect?.(id);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* selectedId ?? "" (no selectedId directo): el FormData nativo debe
          seguir enviando "" tanto si es null (nada tocado) como si es ""
          (Ninguno explicito) - el submit no distingue esos dos casos, solo
          el estado visual de este componente los distingue. */}
      <input type="hidden" name={name} value={selectedId ?? ""} />

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            type="text"
            value={open ? query : (selected?.label ?? query)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
          />
          {open && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-orion-navy-200 bg-white shadow-lg">
              {results.length === 0 && (
                <p className="px-3 py-2 text-xs text-orion-navy-400">Sin resultados</p>
              )}
              {results.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => select(a.id)}
                  className={`block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-orion-navy-100 ${
                    a.id === selectedId
                      ? "bg-orion-navy-100 font-medium text-orion-navy-900"
                      : "text-orion-navy-700"
                  }`}
                >
                  {a.label}
                  {a.shortId != null && (
                    <span className="text-orion-navy-400"> · ORION ID #{a.shortId}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* selectedId es string | null: null = nada tocado todavia,
            "" = "Ninguno" elegido explicitamente. Al ser dos valores
            DISTINTOS (ya no el mismo ""), esta comparacion por si sola ya
            es inequivoca - igual de simple que la de "Último perfil
            visto" de abajo, sin necesitar una segunda variable de estado
            sincronizada aparte. Solo se renderiza si allowNone (ver
            prop) - en ORION Play no existe, "Continuar sin deportista" ya
            cubre ese caso por su cuenta. */}
        {allowNone && (
          <button
            type="button"
            onClick={() => select("")}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium ${
              selectedId === "" ? ACTIVE_BTN : INACTIVE_BTN
            }`}
          >
            Ninguno
          </button>
        )}

        {lastVisitedOption && (
          <button
            type="button"
            onClick={() => select(lastVisitedOption.athleteId)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium ${
              selectedId === lastVisitedOption.athleteId ? ACTIVE_BTN : INACTIVE_BTN
            }`}
          >
            Último perfil visto
          </button>
        )}
      </div>

      {selected && (
        <p className="mt-1 text-xs text-orion-navy-500">
          Seleccionado: <span className="font-medium text-orion-navy-700">{selected.label}</span>
          {selected.shortId != null && ` · ORION ID #${selected.shortId}`}
        </p>
      )}
    </div>
  );
}
