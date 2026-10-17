"use client";

import { useState, useTransition } from "react";
import { createInvitation, revokeInvitation } from "../invitationActions";
import { deriveInvitationStatus, formatInvitationCode, type Invitation } from "@/lib/invitationStatus";
import QrModal from "@/components/ui/QrModal";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

const STATUS_LABEL: Record<string, string> = {
  pending: "Invitación pendiente",
  accepted: "Aceptada",
  expired: "Caducada",
  revoked: "Revocada",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  expired: "bg-orion-navy-100 text-orion-navy-500",
  revoked: "bg-red-100 text-red-700",
};

/** Mismo sistema de iconos inline SVG ya usado en el resto del Portal
 * (p.ej. BackButton) — no hay libreria de iconos instalada. */
function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * compact=true: sin tarjeta propia ni titulo "Acceso a ORION" — pensado
 * para vivir dentro del recuadro estrecho e independiente que
 * layout.tsx coloca a la derecha de la cabecera del perfil (no como
 * seccion de la pestaña General, ni mezclado con StatusToggle/
 * StartChatButton). La logica (invitar/copiar/QR/revocar) es identica
 * en ambos modos, solo cambia el envoltorio visual.
 */
export default function InviteSection({
  athleteId,
  athleteUserId,
  latestInvitation,
  compact = false,
}: {
  athleteId: string;
  athleteUserId: string | null;
  latestInvitation: Invitation | null;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (athleteUserId) {
    if (compact) {
      return <p className="text-xs font-medium text-emerald-700">✓ Cuenta vinculada</p>;
    }
    return (
      <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          Acceso a ORION
        </p>
        <p className="text-sm text-emerald-700">✓ Esta persona ya tiene una cuenta vinculada.</p>
      </div>
    );
  }

  const status = latestInvitation ? deriveInvitationStatus(latestInvitation) : null;
  const isPending = status === "pending";
  const canInviteNew = !latestInvitation || status === "expired" || status === "revoked";
  const link =
    latestInvitation && typeof window !== "undefined"
      ? `${window.location.origin}/invitacion/${latestInvitation.code}`
      : "";

  function handleInvite() {
    setError(null);
    startTransition(async () => {
      const res = await createInvitation(athleteId);
      if (res.error) setError(res.error);
    });
  }

  function handleRevoke() {
    if (!latestInvitation) return;
    if (!window.confirm("¿Revocar esta invitación? El enlace dejará de funcionar.")) return;
    setError(null);
    startTransition(async () => {
      const res = await revokeInvitation(latestInvitation.id, athleteId);
      if (res.error) setError(res.error);
    });
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const body = (
    <>
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
            Acceso a ORION
          </p>
          {latestInvitation && status && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          )}
        </div>
      )}

      {compact && latestInvitation && status && (
        <div className="mb-1 text-center">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      )}

      {latestInvitation && isPending && (
        <div className={`${compact ? "mb-2 text-center" : "mb-3"} space-y-1 text-sm text-orion-navy-700`}>
          <p>
            Código:{" "}
            <span className="font-mono font-semibold">
              {formatInvitationCode(latestInvitation.code)}
            </span>
          </p>
          {latestInvitation.expires_at && (
            <p className="text-xs text-orion-navy-500">
              Caduca el{" "}
              {new Date(latestInvitation.expires_at).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className={`flex flex-wrap justify-center ${compact ? "gap-1" : "gap-1.5"}`}>
        {isPending && (
          <>
            <button
              type="button"
              onClick={handleCopy}
              disabled={pending}
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg bg-orion-navy-700 text-xs font-semibold text-white disabled:opacity-60 ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}
            >
              <LinkIcon />
              {copied ? "¡Copiado!" : "Copiar enlace"}
            </button>
            <button
              type="button"
              onClick={() => setShowQr(true)}
              disabled={pending}
              className={`shrink-0 rounded-lg border border-orion-navy-200 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100 disabled:opacity-60 ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}
            >
              {compact ? "QR" : "Mostrar QR"}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={pending}
              className={`shrink-0 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}
            >
              Revocar
            </button>
          </>
        )}
        {canInviteNew && (
          <button
            type="button"
            onClick={handleInvite}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${CREATE_ACTION_CLASSES}`}
          >
            <LinkIcon />
            {pending ? "Creando…" : latestInvitation ? "Generar nueva invitación" : "Invitar a ORION"}
          </button>
        )}
      </div>

      {showQr && link && (
        <QrModal
          url={link}
          title="Invitación a ORION"
          caption="Escanea para unirte a ORION"
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  );

  if (compact) {
    return <div className="w-full">{body}</div>;
  }

  return <div className="rounded-xl border border-orion-navy-100 bg-white p-5">{body}</div>;
}
