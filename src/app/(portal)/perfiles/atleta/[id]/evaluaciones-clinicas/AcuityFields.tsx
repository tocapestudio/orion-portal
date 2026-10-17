"use client";

import { forwardRef, Fragment } from "react";
import type { OpticalAcuityRow } from "@/lib/data/opticalProfile";
import SourceBadge from "./SourceBadge";
import { FichaValue } from "./FichaValue";

const LATERALITIES = ["OD", "OI", "binocular"] as const;
const DISTANCES = ["VL", "VP"] as const;

function cellFor(rows: OpticalAcuityRow[], distance: string, laterality: string) {
  return rows.find((r) => r.distance === distance && r.laterality === laterality) ?? null;
}

function fieldKey(distance: string, laterality: string) {
  return `${distance.toLowerCase()}_${laterality === "binocular" ? "bin" : laterality.toLowerCase()}`;
}

function lateralityLabel(laterality: string) {
  return laterality === "binocular" ? "Bin" : laterality;
}

/**
 * Reutilizable para AV SC y AV CC (prop correctionType). Filas OD/OI/Bin,
 * columnas VL/VP. Bloque "tonto": editing llega como prop, expone su
 * <form> via ref para el "Guardar ficha" unico del padre.
 */
const AcuityFields = forwardRef<
  HTMLFormElement,
  {
    athleteId: string;
    evaluationId: string;
    correctionType: "sc" | "cc";
    label: string;
    rows: OpticalAcuityRow[];
    editing: boolean;
  }
>(function AcuityFields({ athleteId, evaluationId, correctionType, label, rows, editing }, ref) {
  if (!editing) {
    return (
      <div className="min-w-0">
        <p className="mb-0.5 text-xs font-semibold text-orion-navy-700">{label}</p>
        <div className="space-y-0.5 text-[11px] text-orion-navy-500">
          {DISTANCES.map((dist) => (
            <p key={dist}>
              {dist}:{" "}
              {LATERALITIES.map((lat, i) => {
                const c = cellFor(rows, dist, lat);
                return (
                  <Fragment key={lat}>
                    {i > 0 && " / "}
                    {lateralityLabel(lat)} <FichaValue value={c?.value_numeric ?? null} />
                  </Fragment>
                );
              })}
            </p>
          ))}
          {rows.length > 0 && (
            <SourceBadge
              source={rows.some((r) => r.source === "evaluation") ? "evaluation" : "manual"}
              date={rows.find((r) => r.source_evaluation_date)?.source_evaluation_date}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <form ref={ref} onSubmit={(e) => e.preventDefault()} className="min-w-0">
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <input type="hidden" name="correction_type" value={correctionType} />
      <p className="mb-0.5 text-xs font-semibold text-orion-navy-700">{label}</p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-orion-navy-400">
            <th />
            <th className="font-normal">VL</th>
            <th className="font-normal">VP</th>
          </tr>
        </thead>
        <tbody>
          {LATERALITIES.map((lat) => (
            <tr key={lat}>
              <td className="pr-1 font-semibold text-orion-navy-700">{lateralityLabel(lat)}</td>
              {DISTANCES.map((dist) => {
                const c = cellFor(rows, dist, lat);
                return (
                  <td key={dist} className="px-0.5">
                    <input
                      name={fieldKey(dist, lat)}
                      defaultValue={c?.value_numeric ?? ""}
                      className="w-12 rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </form>
  );
});

export default AcuityFields;
