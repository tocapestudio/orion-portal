import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasReactAccess } from "@/lib/auth/reactAccess";
import { getSelectedAthleteIfAccessible } from "@/app/(portal)/visual-lab/play/selectedAthlete.actions";

/**
 * Fase 1 de la integracion segura con ORION React: SOLO la decision de
 * autorizacion del lado servidor. No genera codigos temporales, no
 * devuelve ningun token de sesion, no conecta con React (ni via
 * postMessage ni de ninguna otra forma) - ver el diseño ya acordado en
 * fases anteriores para los pasos siguientes.
 *
 * Toda decision se basa EXCLUSIVAMENTE en lo que el servidor puede
 * verificar por si mismo:
 *   - la sesion real (cookies, via createClient()/getCurrentUser() -
 *     nunca un rol/id que mande el cliente en el body),
 *   - los roles reales de esa sesion (core.user_roles, vía RLS),
 *   - si se recibe `athleteId`, el acceso real a ESE deportista,
 *     reutilizando getSelectedAthleteIfAccessible() (mismo patron ya
 *     usado por el selector de ORION Play: una simple lectura de
 *     core.athletes a traves de RLS - admin ve cualquiera, professional
 *     solo los suyos, sin que este archivo tenga que distinguir los
 *     dos casos: RLS ya lo hace).
 *
 * LIMITACION TECNICA YA IDENTIFICADA (no bloquea esta fase, pero
 * condiciona como se puede probar): el middleware raiz
 * (`middleware.ts` + `src/lib/supabase/middleware.ts`) redirige a
 * /login CUALQUIER peticion sin sesion a cualquier ruta no publica,
 * INCLUIDA esta - no esta excluida en su `matcher`. Eso significa que
 * una llamada real sin cookies de sesion nunca llega a ejecutar la
 * rama "sin sesion" de abajo: recibe un 302 a /login antes de que este
 * archivo se ejecute. La rama de abajo se conserva igualmente, por
 * defensa en profundidad (y porque sigue siendo codigo correcto si en
 * el futuro cambia el matcher, o si esta ruta se invoca desde un
 * contexto que el middleware no cubra) - pero no es, hoy, la unica
 * barrera para el caso "sin sesion", ni algo que se pueda demostrar con
 * una peticion HTTP real sin montar tambien el middleware.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authorized: false, reason: "no_session" }, { status: 401 });
  }

  if (!hasReactAccess(user.roles)) {
    return NextResponse.json({ authorized: false, reason: "role_not_allowed" }, { status: 403 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const athleteId =
    body && typeof body === "object" && "athleteId" in body && typeof body.athleteId === "string"
      ? body.athleteId
      : null;

  if (athleteId) {
    const athlete = await getSelectedAthleteIfAccessible(athleteId);
    if (!athlete) {
      return NextResponse.json({ authorized: false, reason: "athlete_not_accessible" }, { status: 403 });
    }
    return NextResponse.json({ authorized: true, athleteId: athlete.athleteId }, { status: 200 });
  }

  return NextResponse.json({ authorized: true }, { status: 200 });
}
