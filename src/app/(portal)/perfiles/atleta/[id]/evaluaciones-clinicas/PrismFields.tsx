"use client";

import { forwardRef } from "react";
import type { OpticalPrismRow } from "@/lib/data/opticalProfile";
import SourceBadge from "./SourceBadge";
import { FichaValue } from "./FichaValue";

const EYES = ["OD", "OI"] as const;
const DIRECTION_COMPONENTS = ["horizontal", "vertical"] as const;
const BASE_OPTIONS: Record<(typeof DIRECTION_COMPONENTS)[number], string[]> = {
  horizontal: ["nasal", "temporal"],
  vertical: ["superior", "inferior"],
};

function cellFor(rows: OpticalPrismRow[], eye: string, component: string) {
  return rows.find((r) => r.eye === eye && r.component === component) ?? null;
}

/**
 * Correccion prismatica ACTUAL por ojo (OD/OI) — no existe un prisma
 * binocular independiente. Cada ojo: horizontal + vertical (magnitude_pd
 * + base) y "Prisma resultante" (magnitude_pd + axis_deg, manual, sin
 * componente ni base). Bloque "tonto": editing llega como prop, expone su
 * <form> via ref para el "Guardar ficha" unico del padre.
 */
const PrismFields = forwardRef<
  HTMLFormElement,
  { athleteId: string; evaluationId: string; rows: OpticalPrismRow[]; editing: boolean }
>(function PrismFields({ athleteId, evaluationId, rows, editing }, ref) {
  const hasAny = rows.length > 0;

  if (!editing) {
    return (
      <div>
        <p className="mb-1 text-xs font-semibold text-orion-navy-700">Prismas</p>
        {hasAny ? (
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-2 text-[11px] text-orion-navy-600">
              {EYES.map((eye) => {
                const h = cellFor(rows, eye, "horizontal");
                const v = cellFor(rows, eye, "vertical");
                const r = cellFor(rows, eye, "resultant");
                if (!h && !v && !r) return <div key={eye} />;
                return (
                  <div key={eye}>
                    <p className="font-semibold text-orion-navy-700">{eye}</p>
                    {h && (
                      <p>
                        H: <FichaValue value={h.magnitude_pd} suffix="Δ" /> {h.base}
                      </p>
                    )}
                    {v && (
                      <p>
                        V: <FichaValue value={v.magnitude_pd} suffix="Δ" /> {v.base}
                      </p>
                    )}
                    {r && (
                      <p>
                        Resultante: <FichaValue value={r.magnitude_pd} suffix="Δ" /> · Eje{" "}
                        <FichaValue value={r.axis_deg} suffix="°" />
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <SourceBadge
              source={rows.some((r) => r.source === "evaluation") ? "evaluation" : "manual"}
              date={rows.find((r) => r.source_evaluation_date)?.source_evaluation_date}
            />
          </div>
        ) : (
          <p className="text-[11px] text-orion-navy-400">—</p>
        )}
      </div>
    );
  }

  return (
    <form ref={ref} onSubmit={(e) => e.preventDefault()}>
      <input type="hidden" name="athlete_id" value={athleteId} />
      <input type="hidden" name="evaluation_id" value={evaluationId} />
      <p className="mb-1 text-xs font-semibold text-orion-navy-700">Prismas</p>
      <div className="grid grid-cols-2 gap-2">
        {EYES.map((eye) => {
          const r = cellFor(rows, eye, "resultant");
          return (
            <div key={eye} className="space-y-1">
              <p className="text-[10px] font-semibold text-orion-navy-500">{eye}</p>
              {DIRECTION_COMPONENTS.map((component) => {
                const c = cellFor(rows, eye, component);
                const prefix = `${eye}_${component}`;
                return (
                  <div key={component} className="flex items-center gap-1">
                    <span className="w-3 text-[10px] text-orion-navy-400">
                      {component === "horizontal" ? "H" : "V"}
                    </span>
                    <input
                      name={`${prefix}_magnitude`}
                      defaultValue={c?.magnitude_pd ?? ""}
                      placeholder="Δ"
                      className="w-10 rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]"
                    />
                    <select
                      name={`${prefix}_base`}
                      defaultValue={c?.base ?? ""}
                      className="rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]"
                    >
                      <option value="">—</option>
                      {BASE_OPTIONS[component].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              <div className="flex items-center gap-1">
                <span className="w-3 text-[10px] text-orion-navy-400">R</span>
                <input
                  name={`${eye}_resultant_magnitude`}
                  defaultValue={r?.magnitude_pd ?? ""}
                  placeholder="Δ"
                  className="w-10 rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]"
                />
                <input
                  name={`${eye}_resultant_axis_deg`}
                  defaultValue={r?.axis_deg ?? ""}
                  placeholder="Eje°"
                  className="w-12 rounded border border-orion-navy-200 px-1 py-0.5 text-[11px]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
});

export default PrismFields;
