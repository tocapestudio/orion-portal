import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Logica PURA de pertenencia atleta-profesional - SIN import en tiempo
 * de ejecucion de Next.js/Supabase (solo `import type`, que se borra al
 * compilar, igual que ya hace reactAccess.ts), comprobable con el test
 * runner nativo de Node (node --test). El resto de athletes.ts importa
 * `createClient` de "@/lib/supabase/server" a nivel de modulo, lo que
 * impide a Node resolver ese archivo fuera del bundler de Next.js -
 * por eso esta funcion, que ya recibia el cliente por parametro, vive
 * en su propio archivo en vez de en athletes.ts.
 */
export type CoreSupabaseClient = SupabaseClient<Database, "core">;

/**
 * IDs de los atletas con relacion ACTIVA con el profesional autenticado
 * (core.athlete_professional, status='active' - misma condicion exacta
 * que usa core.is_professional_of_athlete() del lado de RLS). No hay
 * columna professional_id en core.athletes: el vinculo vive solo en
 * esta tabla puente.
 *
 * Se añade como filtro explicito de aplicacion (ademas de RLS, no en
 * su lugar) porque las policies "admin todo X" son globales: una
 * cuenta con rol admin seguiria viendo todos los atletas/sesiones/
 * resultados via RLS aunque tambien tenga professional. Esta funcion
 * nunca consulta ni recibe ningun rol - solo professional_id y status -
 * por eso el rol admin no cambia su resultado en absoluto.
 *
 * Lanza en caso de fallo real de la consulta - nunca lo convierte en
 * lista vacia (eso haria indistinguible "sin atletas" de "error").
 */
export async function getMyActiveAthleteIds(
  supabase: CoreSupabaseClient,
  professionalId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("athlete_professional")
    .select("athlete_id")
    .eq("professional_id", professionalId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []).map((r) => r.athlete_id);
}
