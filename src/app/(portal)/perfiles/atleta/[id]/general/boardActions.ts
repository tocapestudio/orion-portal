"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BOARD_MEDIA_BUCKET } from "@/lib/data/perfil";

export interface BoardFormState {
  error: string | null;
  success: boolean;
}

const VALID_MEDIA_TYPES = ["image", "link", "spotify"];

interface ResourceInput {
  media_type: string;
  url: string;
  caption: string | null;
}

function parseResources(raw: FormDataEntryValue | null): ResourceInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ResourceInput =>
        r &&
        typeof r.url === "string" &&
        r.url.trim().length > 0 &&
        VALID_MEDIA_TYPES.includes(r.media_type)
    );
  } catch {
    return [];
  }
}

/**
 * Sube un unico archivo al bucket privado board-media, en el path
 * {athlete_id}/{board_id}/... que ya espera la RLS de Storage (ver
 * migracion 20260929170000). board_id es estable para el tablon de este
 * atleta (se genera una vez y se reutiliza en cada edicion — ver
 * BoardPostModal), asi que el path no cambia entre ediciones.
 */
export async function uploadBoardMedia(
  athleteId: string,
  boardId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { path: null, error: "Sesión no válida." };
  if (!athleteId || !boardId) return { path: null, error: "Falta el atleta." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "imagen";
  const path = `${athleteId}/${boardId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BOARD_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });

  if (error) return { path: null, error: `No se pudo subir la imagen: ${error.message}` };
  return { path, error: null };
}

/**
 * El Tablon es unico por atleta: guardar SIEMPRE sustituye cualquier
 * contenido anterior, nunca coexisten dos ni se conserva historial.
 *
 * 1) upsert (por id) del contenido nuevo — PRIMERO, para no dejar al
 *    atleta sin nada visible si algo falla a mitad de operacion. El id
 *    es estable (el mismo tablon reutiliza siempre el suyo al editar; se
 *    genera uno nuevo solo la primerísima vez que ese atleta tiene
 *    tablon).
 * 2) limpieza defensiva: por si alguna vez hubiera mas de una fila para
 *    este athlete_id (core.board_posts lo permite tecnicamente aunque el
 *    Portal nunca deberia crearlas), se borra cualquier otra.
 * 3) recursos: se sustituyen por completo (borrar + insertar los
 *    actuales) — mas simple que reconciliar, y coherente con "sustituir,
 *    no acumular".
 */
export async function saveBoard(
  _prev: BoardFormState,
  formData: FormData
): Promise<BoardFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida.", success: false };

  const id = String(formData.get("id") ?? "");
  const athleteId = String(formData.get("athlete_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const expiresAtRaw = String(formData.get("expires_at") ?? "");
  const expiresAt = expiresAtRaw ? expiresAtRaw : null;

  if (!id || !athleteId) return { error: "Falta el atleta.", success: false };
  if (!body) return { error: "El texto del tablón es obligatorio.", success: false };

  const resources = parseResources(formData.get("resources"));

  const { error } = await supabase.from("board_posts").upsert(
    {
      id,
      athlete_id: athleteId,
      author_id: user.id,
      body,
      expires_at: expiresAt,
      status: "active",
    },
    { onConflict: "id" }
  );
  if (error) return { error: `No se pudo guardar el tablón: ${error.message}`, success: false };

  await supabase.from("board_posts").delete().eq("athlete_id", athleteId).neq("id", id);

  const { error: deleteMediaError } = await supabase
    .from("board_post_media")
    .delete()
    .eq("board_post_id", id);
  if (deleteMediaError) {
    return {
      error: `No se pudieron actualizar los recursos: ${deleteMediaError.message}`,
      success: false,
    };
  }

  if (resources.length > 0) {
    const { error: mediaError } = await supabase.from("board_post_media").insert(
      resources.map((r, index) => ({
        board_post_id: id,
        media_type: r.media_type,
        url: r.url,
        caption: r.caption,
        position: index,
      }))
    );
    if (mediaError) {
      return {
        error: `Tablón guardado, pero no se pudieron guardar los recursos: ${mediaError.message}`,
        success: false,
      };
    }
  }

  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null, success: true };
}

/**
 * Vacia el tablon del atleta manualmente, antes de que llegue su
 * caducidad — el profesional puede querer retirarlo antes de tiempo. El
 * ON DELETE CASCADE de Core se lleva sus board_post_media; los archivos
 * ya subidos a Storage no se borran (quedan huerfanos, igual que ocurria
 * ya al sustituir recursos en una edicion).
 */
export async function clearBoard(athleteId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("board_posts").delete().eq("athlete_id", athleteId);
  if (error) return { error: `No se pudo vaciar el tablón: ${error.message}` };
  revalidatePath(`/perfiles/atleta/${athleteId}/general`);
  return { error: null };
}
