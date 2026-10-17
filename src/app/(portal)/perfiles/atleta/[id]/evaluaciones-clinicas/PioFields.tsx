"use client";

import { forwardRef } from "react";
import type { OpticalPioRow } from "@/lib/data/opticalProfile";
import SourceBadge from "./SourceBadge";
import { FichaValue } from "./FichaValue";

const EYES = ["OD", "OI"] as const;

function rowFor(rows: OpticalPioRow[], eye: "OD" | "OI") {
  return rows.find((r) => r.eye === eye) ?? null;
}

/** Bloque "tonto": editing llega como prop, expone su <form> via ref para
 * el "Guardar ficha" unico del padre. */
const PioFields = forwardRef<
  HTMLFormElement,
  { athleteId: string; evaluationId: string; rows: OpticalPioRow[]; editing: boolean }
>(
  function PioFields({ athleteId, evaluationId, rows, editing }, ref) {
    const hasAny = rows.some((r) => r.value_numeric != null);

    if (!editing) {
      return (
        <div>
          <p className="mb-1 text-xs font-semibold text-orion-navy-700">PIO</p>
          <div className="flex items-center gap-3 text-[11px] text-orion-navy-600">
            {EYES.map((eye) => {
              const row = rowFor(rows, eye);
              return (
                <span key={eye}>
                  {eye} <FichaValue value={row?.value_numeric ?? null} suffix={row?.value_numeric != null ? ` ${row.unit}` : ""} />
                </span>
              );
            })}
            <SourceBadge source={hasAny ? "manual" : null} />
          </div>
        </div>
      );
    }

    return (
      <form ref={ref} onSubmit={(e) => e.preventDefault()}>
        <input type="hidden" name="athlete_id" value={athleteId} />
        <input type="hidden" name="evaluation_id" value={evaluationId} />
        <p className="mb-1 text-xs font-semibold text-orion-navy-700">PIO</p>
        <div className="flex gap-3">
          {EYES.map((eye) => {
            const row = rowFor(rows, eye);
            const prefix = eye.toLowerCase();
            return (
              <div key={eye} className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-orion-navy-500">{eye}</span>
                <input
                  name={`${prefix}_value`}
                  defaultValue={row?.value_numeric ?? ""}
                  className="w-12 rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]"
                />
                <input
                  name={`${prefix}_unit`}
                  defaultValue={row?.unit ?? "mmHg"}
                  className="w-14 rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]"
                />
              </div>
            );
          })}
        </div>
      </form>
    );
  }
);

export default PioFields;
