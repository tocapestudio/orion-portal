import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InvitationClaimForm from "./InvitationClaimForm";

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  not_found: {
    title: "Código no válido",
    body: "Este enlace de invitación no existe. Comprueba que lo has copiado completo.",
  },
  expired: {
    title: "Invitación caducada",
    body: "Esta invitación ya no está disponible. Pide a tu profesional que genere una nueva.",
  },
  revoked: {
    title: "Invitación revocada",
    body: "Esta invitación ha sido invalidada por el profesional. Pide una nueva si sigues interesado/a.",
  },
  accepted: {
    title: "Invitación ya utilizada",
    body: "Este código ya se usó para crear una cuenta. Si ya tienes cuenta, inicia sesión.",
  },
};

const FALLBACK_MESSAGE = {
  title: "No se pudo completar la vinculación",
  body: "No se pudo vincular tu cuenta con este código. Contacta con tu profesional para que compruebe la invitación.",
};

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Ya hay sesion: viene de confirmar el email via /auth/callback, o
    // ha vuelto a abrir el mismo enlace mas tarde. Intentamos el canje
    // aqui mismo — este es el UNICO sitio del Portal que llama a
    // redeem_invitation(), tanto en el flujo directo como en el
    // diferido por confirmacion de email.
    const { error: redeemError } = await supabase.rpc("redeem_invitation", { p_code: code });
    if (!redeemError) redirect("/inicio");

    // Si el canje falla pero este usuario YA tiene el rol athlete (p.ej.
    // porque completo el vinculo en una visita anterior a este mismo
    // enlace), no es un error real para el — simplemente ya esta dentro.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("role_id", "athlete");
    if (roles && roles.length > 0) redirect("/inicio");
  }

  const { data } = await supabase.rpc("check_invitation", { p_code: code });
  const result = data?.[0] ?? null;
  const showError = !result || !result.valid || Boolean(user);
  const info = showError
    ? (STATUS_MESSAGES[result?.status ?? "not_found"] ?? FALLBACK_MESSAGE)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-orion-navy-100 px-6 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
        {showError ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-orion-navy-900">{info!.title}</h1>
            <p className="text-sm text-orion-navy-500">{info!.body}</p>
            <p className="mt-6 text-center text-sm">
              <Link
                href={user ? "/inicio" : "/login"}
                className="text-orion-navy-500 hover:underline"
              >
                {user ? "Ir a Inicio" : "Volver al inicio de sesión"}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-xl font-semibold text-orion-navy-900">
              ¡Te han invitado a ORION!
            </h1>
            <p className="mb-1 text-sm text-orion-navy-600">
              <strong>{result!.professional_name ?? "Tu profesional"}</strong> te ha invitado a
              formar parte de ORION Visual Lab.
            </p>
            <p className="mb-6 text-sm text-orion-navy-600">
              Perfil: <strong>{result!.athlete_name}</strong>
            </p>
            <InvitationClaimForm code={code} />
          </>
        )}
      </div>
    </div>
  );
}
