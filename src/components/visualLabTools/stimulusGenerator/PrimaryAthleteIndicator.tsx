"use client";

/**
 * Indicador COMPACTO de solo lectura de la persona principal (ORION
 * Tools, 2o incremento) - sustituye al uso anterior de
 * VisualLabAthleteCard dentro del generador, que era la tarjeta
 * COMPLETA de seleccion (con "Cambiar usuario"/"Quitar usuario" y
 * buscador inline) duplicada dentro de la herramienta. El UNICO selector
 * real sigue viviendo en /visual-lab (VisualLabAthleteCard.tsx, sin
 * tocar) - este componente NUNCA escribe en useSelectedAthlete, solo lee
 * el mismo hook global (useVerifiedSelectedAthlete) para mostrar quien
 * ya esta seleccionado.
 *
 * Distinto de AthleteTag.tsx (orionPlayV2/ui/): aquel recibe `fullName`
 * como prop ya resuelta server-side para un atleta FIJADO por la URL de
 * una ejecucion de Play en curso (deliberadamente no re-deriva la
 * seleccion global, para no desincronizarse de una ejecucion ya
 * empezada). Tools no tiene ese fijado por URL - aqui SI queremos leer
 * la seleccion global directamente (es la persona "heredada" de Visual
 * Lab), asi que no se reutiliza ese componente.
 *
 * Sin seleccion valida: mensaje claro + enlace de vuelta a /visual-lab
 * (nunca un selector propio aqui).
 */

import Link from "next/link";
import { useVerifiedSelectedAthlete } from "@/lib/useVerifiedSelectedAthlete";

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export interface PrimaryAthleteIndicatorProps {
  /** Elementos adicionales (p.ej. el boton "+ Añadir participantes") que
   * se muestran junto al indicador SOLO cuando hay una seleccion valida -
   * sin seleccion valida no tiene sentido poder añadir participantes. */
  actions?: React.ReactNode;
}

export default function PrimaryAthleteIndicator({ actions }: PrimaryAthleteIndicatorProps) {
  const { isHydrated, athleteId, isChecking, verified, error } = useVerifiedSelectedAthlete();

  // Evita parpadeo: nada hasta confirmar si hay o no seleccion guardada.
  if (!isHydrated) return null;

  const hasError = Boolean(athleteId) && error;
  const isPendingCheck = Boolean(athleteId) && isChecking;

  if (hasError || isPendingCheck || !verified) {
    return (
      <div className="mx-auto flex w-fit max-w-md items-center gap-3 rounded-xl border border-orion-navy-100 bg-orion-navy-50/60 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orion-navy-100 text-orion-navy-500">
          <UserIcon className="h-5 w-5" />
        </div>
        <p className="text-sm text-orion-navy-600">
          {hasError && "No se pudo comprobar la selección actual. "}
          {isPendingCheck && "Comprobando selección…"}
          {!hasError && !isPendingCheck && (
            <>
              No hay ninguna persona seleccionada.{" "}
              <Link href="/visual-lab" className="font-semibold text-orion-accent underline hover:text-[#1a8f60]">
                Volver a Visual Lab para seleccionarla
              </Link>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-fit max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <UserIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-orion-navy-900">{verified.fullName}</p>
        <p className="text-xs text-orion-navy-500">ORION ID #{verified.shortId}</p>
      </div>
      {actions}
    </div>
  );
}
