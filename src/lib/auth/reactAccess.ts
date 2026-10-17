/**
 * Decision PURA de autorizacion para ORION React - SIN import de
 * Next.js/Supabase (solo `import type` de PortalRole, que se borra en
 * tiempo de ejecucion), comprobable con el test runner nativo de Node
 * (node --test). Mismo patron ya establecido en playConfigLabels.ts/
 * playRadarMetrics.ts.
 *
 * Unica responsabilidad: dado el conjunto de roles YA verificado en el
 * servidor (ver getCurrentUser() en session.ts, que los lee de
 * core.user_roles vía RLS), decide si esos roles permiten solicitar
 * acceso a ORION React. Solo `admin` y `professional` - `athlete`,
 * `coach` y `researcher` quedan excluidos explicitamente, nunca por
 * omision.
 *
 * Esta funcion NUNCA decide por si sola si el acceso es seguro - solo
 * es la mitad "que rol puede intentarlo" de la decision completa (la
 * otra mitad, "tiene sesion real" y "tiene acceso a ESTE deportista",
 * vive en el route handler que la usa, porque requiere Supabase/RLS y
 * no es pura).
 */

import type { PortalRole } from "./session";

export const REACT_ALLOWED_ROLES: readonly PortalRole[] = ["admin", "professional"];

export function hasReactAccess(roles: readonly PortalRole[]): boolean {
  return roles.some((role) => REACT_ALLOWED_ROLES.includes(role));
}
