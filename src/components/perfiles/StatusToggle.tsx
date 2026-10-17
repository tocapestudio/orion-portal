"use client";

import { useState, useTransition } from "react";
import { updateAthleteStatus, type AthleteProfessionalStatus } from "@/app/(portal)/perfiles/actions";

const LABELS: Record<AthleteProfessionalStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  ended: "Finalizado",
};

const STYLES: Record<AthleteProfessionalStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-orion-navy-100 text-orion-navy-600",
  ended: "bg-red-100 text-red-700",
};

export default function StatusToggle({
  athleteId,
  status,
}: {
  athleteId: string;
  status: string;
}) {
  const [current, setCurrent] = useState<AthleteProfessionalStatus>(
    status === "inactive" || status === "ended" ? status : "active"
  );
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = current === "active" ? "inactive" : "active";
    setCurrent(next);
    startTransition(async () => {
      const { error } = await updateAthleteStatus(athleteId, next);
      if (error) setCurrent(current); // revertir si falla
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title="Cambiar entre Activo e Inactivo"
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition disabled:opacity-60 ${STYLES[current]}`}
    >
      {LABELS[current]}
    </button>
  );
}
