import { createClient } from "@/lib/supabase/server";

export type PortalRole = "admin" | "professional" | "athlete" | "coach" | "researcher";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  roles: PortalRole[];
}

/**
 * Usuario autenticado + sus roles, leidos directamente de
 * core.profiles / core.user_roles respetando RLS (cada usuario
 * solo puede leer su propia fila - no hay ningun bypass aqui).
 * Devuelve null si no hay sesion.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role_id").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    roles: (roleRows ?? []).map((r) => r.role_id as PortalRole),
  };
}

export function roleLabel(role: PortalRole): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "professional":
      return "Profesional";
    case "athlete":
      return "Usuario";
    case "coach":
      return "Entrenador";
    case "researcher":
      return "Investigador";
    default:
      return role;
  }
}
