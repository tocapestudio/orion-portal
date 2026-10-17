import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback generico de autenticacion (PKCE). Unica responsabilidad:
 * intercambiar el "code" que envia Supabase por una sesion real, y
 * redirigir a "next". No sabe nada de invitaciones ni de ningun otro
 * flujo concreto — quien necesite continuar algo despues de confirmar
 * el email (p.ej. /invitacion/[code]) lo hace en su propia pantalla,
 * al detectar que ya hay sesion.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/inicio";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
