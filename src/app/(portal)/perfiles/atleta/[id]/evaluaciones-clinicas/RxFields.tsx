"use client";

import { forwardRef } from "react";
import type { OpticalRefractionRow } from "@/lib/data/opticalProfile";
import SourceBadge from "./SourceBadge";
import { FichaValue, formatSigned } from "./FichaValue";

const EYES = ["OD", "OI"] as const;

function rowFor(rows: OpticalRefractionRow[], eye: "OD" | "OI") {
  return rows.find((r) => r.eye === eye) ?? null;
}

const inputClass = "w-full rounded border border-orion-navy-200 px-1 py-0.5 text-center text-[11px]";

/**
 * Tabla horizontal unica: una fila por ojo (OD/OI), columnas Esf/Cil/Eje/
 * Add VI/Add VP — NO dos bloques OD/OI por separado. Bloque "tonto":
 * editing llega como prop, expone su <form> via ref para el "Guardar
 * ficha" unico del padre.
 *
 * Esfera/Cilindro/Add VI/Add VP se muestran SIEMPRE con signo explicito
 * (+4, -4, 0) via formatSigned — Eje no lleva signo (no es clinicamente
 * significativo en un angulo 0-180°). El signo es solo formato de
 * entrada/salida: el valor sigue siendo numeric en Core.
 */
const RxFields = forwardRef<
  HTMLFormElement,
  { athleteId: string; evaluationId: string; rows: OpticalRefractionRow[]; editing: boolean }
>(function RxFields({ athleteId, evaluationId, rows, editing }, ref) {
  if (!editing) {
    return (
      <div>
        <p className="mb-1 text-xs font-semibold text-orion-navy-700">Rx (Refracción subjetiva)</p>
        <table className="w-full text-[11px] text-orion-navy-600">
          <thead>
            <tr className="text-orion-navy-400">
              <th className="text-left font-normal" />
              <th className="font-normal">Esf</th>
              <th className="font-normal">Cil</th>
              <th className="font-normal">Eje</th>
              <th className="font-normal">Add VI</th>
              <th className="font-normal">Add VP</th>
            </tr>
          </thead>
          <tbody>
            {EYES.map((eye) => {
              const row = rowFor(rows, eye);
              return (
                <tr key={eye}>
                  <td className="py-0.5 font-semibold text-orion-navy-700">{eye}</td>
                  <td className="py-0.5 text-center">
                    <FichaValue value={row?.sphere != null ? formatSigned(row.sphere) : null} />
                  </td>
                  <td className="py-0.5 text-center">
                    <FichaValue value={row?.cylinder != null ? formatSigned(row.cylinder) : null} />
                  </td>
                  <td className="py-0.5 text-center">
                    <FichaValue value={row?.axis_deg ?? null} suffix="°" />
                  </td>
                  <td className="py-0.5 text-center">
                    <FichaValue value={row?.add_vi != null ? formatSigned(row.add_vi) : null} />
                  </td>
                  <td className="py-0.5 text-center">
                    <FichaValue value={row?.add_vp != null ? formatSigned(row.add_vp) : null} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <SourceBadge
          source={rows.some((r) => r.source === "evaluation") ? "evaluation" : rows.length > 0 ? "manual" : null}
          date={rows.find((r) => r.source_evaluation_date)?.source_evaluation_date}
        />
      </div>
    );
  }

  return (
    <form ref={ref} onSubmit={(e) => e.preventDefault()}>
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <p className="mb-1 text-xs font-semibold text-orion-navy-700">Rx (Refracción subjetiva)</p>
      <table className="w-full table-fixed text-[11px]">
        <thead>
          <tr className="text-orion-navy-400">
            <th className="w-8 text-left font-normal" />
            <th className="font-normal">Esf</th>
            <th className="font-normal">Cil</th>
            <th className="font-normal">Eje</th>
            <th className="font-normal">Add VI</th>
            <th className="font-normal">Add VP</th>
          </tr>
        </thead>
        <tbody>
          {EYES.map((eye) => {
            const row = rowFor(rows, eye);
            const prefix = eye.toLowerCase();
            return (
              <tr key={eye}>
                <td className="py-0.5 pr-1 font-semibold text-orion-navy-700">{eye}</td>
                <td className="px-0.5 py-0.5">
                  <input name={`${prefix}_sphere`} defaultValue={formatSigned(row?.sphere ?? null)} className={inputClass} />
                </td>
                <td className="px-0.5 py-0.5">
                  <input name={`${prefix}_cylinder`} defaultValue={formatSigned(row?.cylinder ?? null)} className={inputClass} />
                </td>
                <td className="px-0.5 py-0.5">
                  <input name={`${prefix}_axis_deg`} defaultValue={row?.axis_deg ?? ""} className={inputClass} />
                </td>
                <td className="px-0.5 py-0.5">
                  <input name={`${prefix}_add_vi`} defaultValue={formatSigned(row?.add_vi ?? null)} className={inputClass} />
                </td>
                <td className="px-0.5 py-0.5">
                  <input name={`${prefix}_add_vp`} defaultValue={formatSigned(row?.add_vp ?? null)} className={inputClass} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </form>
  );
});

export default RxFields;
