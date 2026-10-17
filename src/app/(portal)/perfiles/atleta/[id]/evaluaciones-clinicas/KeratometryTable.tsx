"use client";

import { forwardRef } from "react";
import type { OpticalKeratometryRow } from "@/lib/data/opticalProfile";
import SourceBadge from "./SourceBadge";
import { FichaValue } from "./FichaValue";

const MERIDIANS = ["H", "V"] as const;

function cellFor(rows: OpticalKeratometryRow[], eye: "OD" | "OI", meridian: "H" | "V") {
  return rows.find((r) => r.eye === eye && r.meridian === meridian) ?? null;
}

const numInputClass = "w-12 rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]";

function TableHead() {
  return (
    <thead>
      <tr className="text-orion-navy-400">
        <th />
        <th colSpan={3} className="pb-0.5 text-center font-medium">
          OD
        </th>
        <th colSpan={3} className="pb-0.5 text-center font-medium">
          OI
        </th>
      </tr>
      <tr className="text-orion-navy-400">
        <th />
        <th className="font-normal">D</th>
        <th className="font-normal">mm</th>
        <th className="font-normal">Eje</th>
        <th className="font-normal">D</th>
        <th className="font-normal">mm</th>
        <th className="font-normal">Eje</th>
      </tr>
    </thead>
  );
}

/**
 * Tabla OD/OI x H/V — exactamente el mockup acordado. D (power_d) es
 * SIEMPRE de solo lectura: nunca se renderiza como <input>, nunca se envia
 * en el form — en Core es una columna GENERATED a partir de radius_mm, no
 * editable bajo ningun concepto. Bloque "tonto": editing llega como prop,
 * expone su <form> via ref para el "Guardar ficha" unico.
 */
const KeratometryTable = forwardRef<
  HTMLFormElement,
  { athleteId: string; evaluationId: string; rows: OpticalKeratometryRow[]; editing: boolean }
>(function KeratometryTable({ athleteId, evaluationId, rows, editing }, ref) {
  const hasAnyRow = rows.some((r) => r.radius_mm != null || r.axis_deg != null);

  if (!editing) {
    return (
      <div>
        <p className="mb-1 text-xs font-semibold text-orion-navy-700">Queratometría</p>
        <div className="space-y-1">
          <table className="w-full text-[11px] text-orion-navy-600">
            <TableHead />
            <tbody>
              {MERIDIANS.map((meridian) => {
                const od = cellFor(rows, "OD", meridian);
                const oi = cellFor(rows, "OI", meridian);
                return (
                  <tr key={meridian}>
                    <td className="pr-1 font-semibold text-orion-navy-700">{meridian}</td>
                    <td className="px-0.5 text-center">
                      <FichaValue value={od?.power_d ?? null} />
                    </td>
                    <td className="px-0.5 text-center">
                      <FichaValue value={od?.radius_mm ?? null} />
                    </td>
                    <td className="px-0.5 text-center">
                      <FichaValue value={od?.axis_deg ?? null} />
                    </td>
                    <td className="px-0.5 text-center">
                      <FichaValue value={oi?.power_d ?? null} />
                    </td>
                    <td className="px-0.5 text-center">
                      <FichaValue value={oi?.radius_mm ?? null} />
                    </td>
                    <td className="px-0.5 text-center">
                      <FichaValue value={oi?.axis_deg ?? null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <SourceBadge source={hasAnyRow ? "manual" : null} />
        </div>
      </div>
    );
  }

  return (
    <form ref={ref} onSubmit={(e) => e.preventDefault()}>
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <p className="mb-1 text-xs font-semibold text-orion-navy-700">Queratometría</p>
      <table className="w-full text-[11px]">
        <TableHead />
        <tbody>
          {MERIDIANS.map((meridian) => {
            const od = cellFor(rows, "OD", meridian);
            const oi = cellFor(rows, "OI", meridian);
            const odPrefix = `od_${meridian.toLowerCase()}`;
            const oiPrefix = `oi_${meridian.toLowerCase()}`;
            return (
              <tr key={meridian}>
                <td className="pr-1 font-semibold text-orion-navy-700">{meridian}</td>
                <td className="px-0.5 text-center text-orion-navy-500">{od?.power_d ?? "—"}</td>
                <td className="px-0.5">
                  <input name={`${odPrefix}_radius_mm`} defaultValue={od?.radius_mm ?? ""} className={numInputClass} />
                </td>
                <td className="px-0.5">
                  <input name={`${odPrefix}_axis_deg`} defaultValue={od?.axis_deg ?? ""} className={numInputClass} />
                </td>
                <td className="px-0.5 text-center text-orion-navy-500">{oi?.power_d ?? "—"}</td>
                <td className="px-0.5">
                  <input name={`${oiPrefix}_radius_mm`} defaultValue={oi?.radius_mm ?? ""} className={numInputClass} />
                </td>
                <td className="px-0.5">
                  <input name={`${oiPrefix}_axis_deg`} defaultValue={oi?.axis_deg ?? ""} className={numInputClass} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </form>
  );
});

export default KeratometryTable;
