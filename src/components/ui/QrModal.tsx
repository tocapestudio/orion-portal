"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Modal generico que dibuja un QR a partir de una URL ya existente —
 * no crea ningun dato ni entidad nueva, es solo una representacion
 * visual del mismo enlace que "Copiar enlace".
 */
export default function QrModal({
  url,
  title,
  caption,
  onClose,
}: {
  url: string;
  title: string;
  caption?: string;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 280, margin: 1 }).then((result) => {
      if (!cancelled) setDataUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs cursor-auto rounded-xl bg-white p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-orion-navy-900">{title}</h2>
          <button onClick={onClose} className="text-orion-navy-400 hover:text-orion-navy-700">
            ✕
          </button>
        </div>

        <div className="flex items-center justify-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL generado en cliente, no aplica optimizacion de next/image
            <img src={dataUrl} alt="Código QR" width={280} height={280} className="rounded-lg" />
          ) : (
            <div className="flex h-[280px] w-[280px] items-center justify-center text-xs text-orion-navy-400">
              Generando QR…
            </div>
          )}
        </div>

        {caption && <p className="mt-4 text-sm text-orion-navy-600">{caption}</p>}
      </div>
    </div>
  );
}
