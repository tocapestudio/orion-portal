"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { BoardWithMedia } from "@/lib/data/perfil";
import { saveBoard, uploadBoardMedia, type BoardFormState } from "./boardActions";

const initialState: BoardFormState = { error: null, success: false };

const DURATION_UNITS = [
  { value: "hours", label: "horas", ms: 60 * 60 * 1000 },
  { value: "days", label: "días", ms: 24 * 60 * 60 * 1000 },
  { value: "weeks", label: "semanas", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "months", label: "meses", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

type DurationUnitValue = (typeof DURATION_UNITS)[number]["value"];
type DurationChoice = "keep" | "none" | DurationUnitValue;

interface ResourceDraft {
  localId: string;
  mediaType: "image" | "link" | "spotify";
  url: string;
  caption: string;
  previewUrl: string | null;
  uploading: boolean;
  error: string | null;
}

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
 * Crear/editar EL Tablon del atleta (unico, no un post entre varios) —
 * ambos casos llaman a la misma accion saveBoard, que siempre sustituye
 * cualquier contenido anterior.
 */
export default function BoardPostModal({
  athleteId,
  board,
  onClose,
}: {
  athleteId: string;
  board?: BoardWithMedia;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveBoard, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Id estable del tablon de este atleta — el mismo en cada edicion (para
  // que las imagenes ya subidas sigan viviendo en el mismo path), uno
  // nuevo solo la primera vez que este atleta tiene tablon.
  const [boardId] = useState(() => board?.id ?? crypto.randomUUID());

  const [resources, setResources] = useState<ResourceDraft[]>(
    () =>
      board?.media.map((m) => ({
        localId: m.id,
        mediaType: m.media_type as "image" | "link" | "spotify",
        url: m.url,
        caption: m.caption ?? "",
        previewUrl: m.media_type === "image" ? m.signedUrl : null,
        uploading: false,
        error: null,
      })) ?? []
  );

  const [durationChoice, setDurationChoice] = useState<DurationChoice>(
    board?.expires_at ? "keep" : "none"
  );
  const [durationAmount, setDurationAmount] = useState(1);

  useEffect(() => {
    if (state.success) onClose();
  }, [state, onClose]);

  const uploading = resources.some((r) => r.uploading);

  function addLinkResource(mediaType: "link" | "spotify") {
    setResources((prev) => [
      ...prev,
      {
        localId: crypto.randomUUID(),
        mediaType,
        url: "",
        caption: "",
        previewUrl: null,
        uploading: false,
        error: null,
      },
    ]);
  }

  async function handleFileSelected(file: File) {
    const localId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    setResources((prev) => [
      ...prev,
      { localId, mediaType: "image", url: "", caption: "", previewUrl, uploading: true, error: null },
    ]);

    const result = await uploadBoardMedia(athleteId, boardId, file);

    setResources((prev) =>
      prev.map((r) =>
        r.localId === localId
          ? { ...r, uploading: false, url: result.path ?? "", error: result.error }
          : r
      )
    );
  }

  function updateResource(localId: string, patch: Partial<ResourceDraft>) {
    setResources((prev) => prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r)));
  }

  function removeResource(localId: string) {
    setResources((prev) => prev.filter((r) => r.localId !== localId));
  }

  function computeExpiresAt(): string {
    if (durationChoice === "keep") return board?.expires_at ?? "";
    if (durationChoice === "none") return "";
    const unit = DURATION_UNITS.find((u) => u.value === durationChoice);
    if (!unit) return "";
    return new Date(Date.now() + unit.ms * durationAmount).toISOString();
  }

  const readyResources = resources.filter((r) => !r.uploading && !r.error && r.url.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-orion-navy-100 px-6 py-4">
          <h2 className="text-base font-semibold text-orion-navy-900">
            {board ? "Editar tablón" : "Crear tablón"}
          </h2>
          <button onClick={onClose} className="text-orion-navy-400 hover:text-orion-navy-700">
            ✕
          </button>
        </div>

        <form
          action={(formData) => {
            formData.set("resources", JSON.stringify(readyResources));
            formData.set("expires_at", computeExpiresAt());
            formAction(formData);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input type="hidden" name="id" value={boardId} />
          <input type="hidden" name="athlete_id" value={athleteId} />

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">
                Texto de la publicación
              </label>
              <textarea
                name="body"
                required
                rows={4}
                defaultValue={board?.body ?? ""}
                placeholder="Escribe el mensaje que verá el atleta…"
                className="w-full rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-orion-navy-700">Duración</label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={durationChoice}
                  onChange={(e) => setDurationChoice(e.target.value as DurationChoice)}
                  className="rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                >
                  {board?.expires_at && <option value="keep">Mantener caducidad actual</option>}
                  <option value="none">Sin caducidad</option>
                  {DURATION_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                {(DURATION_UNITS as readonly { value: string }[]).some(
                  (u) => u.value === durationChoice
                ) && (
                  <input
                    type="number"
                    min={1}
                    value={durationAmount}
                    onChange={(e) => setDurationAmount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-20 rounded-lg border border-orion-navy-200 px-3 py-2 text-sm"
                  />
                )}
              </div>
              {durationChoice === "keep" && board?.expires_at && (
                <p className="mt-1 text-xs text-orion-navy-400">
                  Caduca el {formatDate(board.expires_at)}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-orion-navy-700">
                  Recursos asociados (opcional)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-orion-navy-200 px-2.5 py-1 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
                  >
                    + Imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => addLinkResource("link")}
                    className="rounded-lg border border-orion-navy-200 px-2.5 py-1 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
                  >
                    + Enlace
                  </button>
                  <button
                    type="button"
                    onClick={() => addLinkResource("spotify")}
                    className="rounded-lg border border-orion-navy-200 px-2.5 py-1 text-xs font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
                  >
                    + Spotify
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = "";
                  }}
                />
              </div>

              {resources.length > 0 && (
                <div className="space-y-2 rounded-lg border border-orion-navy-100 bg-orion-navy-100/30 p-2">
                  {resources.map((r) => (
                    <div
                      key={r.localId}
                      className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs"
                    >
                      {r.mediaType === "image" ? (
                        r.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- preview local/firmada, no aplica optimizacion de next/image
                          <img
                            src={r.previewUrl}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded bg-orion-navy-100" />
                        )
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-orion-navy-100 text-orion-navy-500">
                          {r.mediaType === "spotify" ? "♪" : "🔗"}
                        </span>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        {r.mediaType !== "image" && (
                          <input
                            type="url"
                            value={r.url}
                            onChange={(e) => updateResource(r.localId, { url: e.target.value })}
                            placeholder={
                              r.mediaType === "spotify"
                                ? "https://open.spotify.com/…"
                                : "https://…"
                            }
                            className="w-full rounded border border-orion-navy-200 px-2 py-1 text-xs"
                          />
                        )}
                        <input
                          type="text"
                          value={r.caption}
                          onChange={(e) => updateResource(r.localId, { caption: e.target.value })}
                          placeholder="Descripción (opcional)"
                          className="w-full rounded border border-orion-navy-200 px-2 py-1 text-xs"
                        />
                        {r.uploading && <p className="text-orion-navy-400">Subiendo…</p>}
                        {r.error && <p className="text-red-600">{r.error}</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeResource(r.localId)}
                        aria-label="Quitar recurso"
                        className="shrink-0 rounded-full p-1 text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {state.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-orion-navy-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm text-orion-navy-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || uploading}
              className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-800 disabled:opacity-60"
            >
              {pending ? "Guardando…" : uploading ? "Subiendo…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
