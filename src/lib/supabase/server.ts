import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Cliente de Supabase para Server Components, Server Actions y
 * Route Handlers. Igual que el cliente de navegador, usa la anon
 * key - RLS es quien decide que puede ver/escribir cada usuario,
 * segun su JWT (via las cookies de sesion), nunca este helper.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "core">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "core" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puede llamarse desde un Server Component sin
            // permiso de escritura de cookies; el middleware ya se
            // encarga de refrescar la sesion en ese caso.
          }
        },
      },
    }
  );
}
