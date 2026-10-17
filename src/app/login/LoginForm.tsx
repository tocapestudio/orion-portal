"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-orion-navy-900">
          Usuario / email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-orion-navy-200 bg-white px-3 py-2 text-sm text-orion-navy-900 outline-none focus:border-orion-navy-500 focus:ring-2 focus:ring-orion-navy-200"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-orion-navy-900">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-orion-navy-200 bg-white px-3 py-2 text-sm text-orion-navy-900 outline-none focus:border-orion-navy-500 focus:ring-2 focus:ring-orion-navy-200"
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-800 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <div className="flex flex-col items-center gap-1.5 text-sm text-orion-navy-500">
        <Link href="#" className="hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/registro" className="hover:underline">
          ¿Eres nuevo? Solicita tu registro
        </Link>
      </div>
    </form>
  );
}
