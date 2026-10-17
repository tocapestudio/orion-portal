import type { Database } from "@/types/database.types";

export type Invitation = Database["core"]["Tables"]["invitations"]["Row"];
export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

/**
 * Estado derivado SIEMPRE a partir de used_at/expires_at/revoked_at — no
 * existe (ni debe crearse) una columna status en core.invitations, por
 * decision explicita, para evitar que se desincronice con el tiempo.
 * Misma logica que core.check_invitation() en la base de datos.
 */
export function deriveInvitationStatus(inv: Invitation): InvitationStatus {
  if (inv.revoked_at) return "revoked";
  if (inv.used_at) return "accepted";
  if (inv.expires_at && new Date(inv.expires_at).getTime() <= Date.now()) return "expired";
  return "pending";
}

/** Formato visual XXXX-XXXX del codigo real de 8 caracteres de Core (sin tocar el dato almacenado). */
export function formatInvitationCode(code: string): string {
  if (code.length === 8) return `${code.slice(0, 4)}-${code.slice(4)}`;
  return code;
}
