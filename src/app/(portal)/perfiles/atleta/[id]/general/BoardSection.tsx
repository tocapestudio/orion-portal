"use client";

import { useState, useTransition } from "react";
import type { BoardWithMedia } from "@/lib/data/perfil";
import { CREATE_ACTION_CLASSES } from "@/lib/ui/buttonStyles";
import BoardPostModal from "./BoardPostModal";
import { clearBoard } from "./boardActions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tablon del perfil — UN UNICO contenido por atleta, sin historial ni
 * listado de versiones anteriores. El profesional lo crea/edita; guardar
 * siempre sustituye lo que hubiera antes (ver saveBoard en
 * boardActions.ts). El atleta solo lo lee (su propia RLS ya oculta el
 * contenido caducado — no hay ningun archivado manual aqui).
 */
export default function BoardSection({
  athleteId,
  board,
}: {
  athleteId: string;
  board: BoardWithMedia | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [clearing, startClearing] = useTransition();

  function handleClear() {
    if (!window.confirm("¿Vaciar el tablón? El atleta dejará de verlo inmediatamente.")) return;
    startClearing(async () => {
      await clearBoard(athleteId);
    });
  }

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Tablón</p>
        {board && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg border border-orion-navy-200 px-3 py-1.5 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {clearing ? "Vaciando…" : "Vaciar"}
            </button>
          </div>
        )}
      </div>

      {!board && (
        <div className="space-y-3">
          <p className="text-sm text-orion-navy-400">No hay contenido en el tablón.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${CREATE_ACTION_CLASSES}`}
          >
            + Crear tablón
          </button>
        </div>
      )}

      {board && (
        <div>
          <p className="whitespace-pre-wrap text-sm text-orion-navy-800">{board.body}</p>

          {board.media.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {board.media.map((m) =>
                m.media_type === "image" ? (
                  m.signedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL privada, no aplica optimizacion de next/image
                    <img
                      key={m.id}
                      src={m.signedUrl}
                      alt={m.caption ?? ""}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )
                ) : (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-orion-navy-200 px-2 py-1 text-xs text-orion-navy-700 hover:bg-orion-navy-100"
                  >
                    {m.media_type === "spotify" ? "♪" : "🔗"} {m.caption || m.url}
                  </a>
                )
              )}
            </div>
          )}

          {board.expires_at && (
            <p className="mt-1.5 text-[11px] text-orion-navy-400">
              Caduca el {formatDate(board.expires_at)}
            </p>
          )}
        </div>
      )}

      {modalOpen && (
        <BoardPostModal
          athleteId={athleteId}
          board={board ?? undefined}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
