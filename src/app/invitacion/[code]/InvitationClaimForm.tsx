"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";

export default function InvitationClaimForm({ code }: { code: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    // El codigo de invitacion viaja en la propia URL de confirmacion:
    // Supabase conserva nuestro query string y le añade su propio
    // "code" (PKCE) al final. /auth/callback lo intercambia por sesion
    // y redirige de vuelta a esta misma pantalla, que entonces detecta
    // la sesion y completa el canje. No se usa localStorage ni cookies
    // propias para conservar el codigo.
    const next = encodeURIComponent(`/invitacion/${code}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    if (!signUpData.session) {
      // Caso esperado: la confirmacion de email esta activa.
      setCheckEmail(true);
      setPending(false);
      return;
    }

    // Defensivo: si alguna vez hubiera sesion inmediata, completar aqui tambien.
    const { error: redeemError } = await supabase.rpc("redeem_invitation", { p_code: code });
    if (redeemError) {
      setError(`No se pudo vincular la cuenta a tu perfil: ${redeemError.message}`);
      setPending(false);
      return;
    }

    router.push("/inicio");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <p className="font-semibold">Revisa tu correo</p>
        <p className="mt-1">
          Te hemos enviado un enlace de confirmación a <strong>{email}</strong>. Al confirmarlo,
          volverás automáticamente aquí y tu cuenta quedará vinculada a tu perfil.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-orion-navy-900">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-orion-navy-900">Contraseña</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-orion-navy-900">
          Confirmar contraseña
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`w-full rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${CREATE_ACTION_CLASSES}`}
      >
        {pending ? "Creando cuenta…" : "Crear mi cuenta"}
      </button>
    </form>
  );
}
