import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Cliente de Supabase para Client Components.
 * Usa siempre la anon key - la autorizacion real la garantiza RLS,
 * nunca este cliente ni ninguna clave que viaje al navegador.
 */
export function createClient() {
  return createBrowserClient<Database, "core">(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "core" } }
  );
}
