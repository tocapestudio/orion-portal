"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import { getLastVisitedProfile, clearLastVisitedProfile } from "@/lib/lastVisitedProfile";
import {
  getLastVisitedProfileIfAccessible,
  type LastVisitedProfileResult,
} from "@/app/(portal)/perfiles/actions";

/**
 * Bloque pequeño y discreto — no se muestra nada hasta confirmar (en el
 * servidor, respetando RLS) que el perfil guardado en localStorage sigue
 * existiendo y sigue siendo accesible. Nunca abre el perfil solo, solo
 * deja el enlace a un clic.
 *
 * "dismissed" es estado de React puro (no se guarda en ningun sitio): al
 * volver a entrar en /perfiles el componente se monta de cero y la
 * tarjeta reaparece por defecto, tal como se pidio — ocultarla con la X
 * es solo para esta visita, nunca borra el "ultimo perfil visitado" real.
 *
 * Vive como columna lateral NORMAL del grid de perfiles/page.tsx (no
 * como insignia en una esquina via position:absolute + container query,
 * ni estirada a toda la altura via align-items:stretch) - se muestra
 * siempre que haya un perfil accesible, sin umbral de ancho. Columna
 * compacta de 190-210px (ver perfiles/page.tsx, `items-start` +
 * `minmax(190px,210px)`) - discreta a proposito, sin protagonismo
 * visual. La altura de esta tarjeta es SOLO la de su propio contenido
 * (sin h-full, min-height ni padding de mas), nunca la del listado
 * vecino.
 *
 * Orden vertical exacto pedido: 1) etiqueta "ÚLTIMO PERFIL" (junto al
 * avatar, compacto), 2) nombre en una linea (truncada con `title` solo
 * si es excepcionalmente largo - es el comportamiento esperado, no una
 * salvaguarda rara), 3) ORION ID + programa debajo. Esa ULTIMA linea
 * NO usa `truncate` a proposito: si no cabe completa, se ajusta en 2
 * lineas (wrap normal) en vez de recortarse sin necesidad - a este
 * ancho (190-210px) un programa largo es mas probable que no quepa en
 * una sola linea, y cortarlo sin motivo lo haria ilegible.
 */
export default function LastVisitedProfileCard() {
  const [profile, setProfile] = useState<LastVisitedProfileResult | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Lee localStorage dentro del efecto (nunca en el render/SSR, donde
    // "window" no existe) y solo actualiza estado dentro del .then() —
    // nunca de forma sincrona en el cuerpo del efecto.
    const cached = getLastVisitedProfile();
    if (!cached) return;
    getLastVisitedProfileIfAccessible(cached.athleteId).then((fresh) => {
      if (!fresh) clearLastVisitedProfile();
      setProfile(fresh);
    });
  }, []);

  if (!profile || dismissed) return null;

  const fullLabel = `Último perfil: ${profile.fullName} · ORION ID #${profile.shortId}${
    profile.programLabel ? ` · ${profile.programLabel.toUpperCase()}` : ""
  }`;

  return (
    <div className="relative rounded-lg border border-orion-navy-100 bg-white p-2.5 shadow-sm">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Ocultar último perfil visitado"
        className="absolute right-1 top-1 cursor-pointer rounded-full p-1 text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-3 w-3"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <Link
        href={`/perfiles/atleta/${profile.athleteId}`}
        title={fullLabel}
        className="block rounded-md pr-4 transition-colors hover:bg-orion-navy-100/50"
      >
        <div className="flex items-center gap-1.5">
          <Avatar src={profile.profileImage} size={24} />
          <p className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-wide text-orion-navy-400">
            Último perfil
          </p>
        </div>
        <p className="mt-1.5 truncate text-sm font-semibold leading-snug text-orion-navy-900">
          {profile.fullName}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-orion-navy-500">
          ORION ID #{profile.shortId}
          {profile.programLabel && <> · {profile.programLabel.toUpperCase()}</>}
        </p>
      </Link>
    </div>
  );
}
