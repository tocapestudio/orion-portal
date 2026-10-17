"use client";

import { useState } from "react";
import Image from "next/image";
import Avatar from "@/components/ui/Avatar";

/**
 * Avatar de cabecera del perfil. Solo es clicable cuando hay una foto
 * real (src) — abre un visor ligero con la imagen ampliada. Reutiliza
 * exactamente la misma URL (profile_image) que ya pinta el avatar
 * circular, no sube ni cambia ninguna foto. Si no hay foto real (solo
 * el icono generico), no hace nada al pulsar.
 */
export default function ProfilePhotoViewer({
  src,
  size = 48,
}: {
  src: string | null;
  size?: number;
}) {
  const [open, setOpen] = useState(false);

  if (!src) {
    return <Avatar src={src} size={size} />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-orion-navy-400"
        aria-label="Ver foto de perfil ampliada"
      >
        <Avatar src={src} size={size} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative h-[70vh] w-[70vh] max-h-[85vh] max-w-[85vw] cursor-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-9 right-0 text-sm font-medium text-white hover:text-orion-navy-200"
            >
              ✕ Cerrar
            </button>
            <Image src={src} alt="" fill className="rounded-lg object-contain shadow-xl" />
          </div>
        </div>
      )}
    </>
  );
}
