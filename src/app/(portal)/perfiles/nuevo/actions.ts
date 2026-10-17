"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncLegacyProfile } from "@/lib/legacyProfileSync";

export interface NewAthleteState {
  error: string | null;
}

export async function createAthlete(
  _prev: NewAthleteState,
  formData: FormData
): Promise<NewAthleteState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida." };

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "") || null;
  const gender = String(formData.get("gender") ?? "") || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const programIds = formData.getAll("programs").map(String);

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  if (!fullName) return { error: "Nombre y apellidos son obligatorios." };

  // El id se genera aqui, en vez de leerlo de vuelta con `.select()`
  // (= INSERT ... RETURNING), porque en el instante del INSERT en
  // "athletes" todavia no existe la fila de athlete_professional que
  // le da acceso de SELECT al profesional bajo RLS: RETURNING exige
  // que la fila nueva ya sea visible bajo alguna policy de SELECT, y
  // en esta ventana no lo es, aunque el INSERT en si cumpla su
  // WITH CHECK. Conociendo el id de antemano no hace falta RETURNING.
  const athleteId = crypto.randomUUID();

  const { error } = await supabase
    .from("athletes")
    .insert({ id: athleteId, full_name: fullName, birth_date: birthDate, gender, email, phone });

  if (error) {
    return { error: `No se pudo crear el perfil: ${error.message}` };
  }

  const { error: linkError } = await supabase
    .from("athlete_professional")
    .insert({ athlete_id: athleteId, professional_id: user.id, status: "active" });

  if (linkError) {
    return { error: `Perfil creado, pero no se pudo vincular: ${linkError.message}` };
  }

  if (programIds.length > 0) {
    await supabase
      .from("athlete_programs")
      .insert(programIds.map((program_id) => ({ athlete_id: athleteId, program_id })));
  }

  // Se lee short_id (el entero secuencial autogenerado por Postgres,
  // "generated always as identity" - el mismo numero que se muestra en
  // el Portal) justo ahora, porque es la primera vez que RLS permite al
  // profesional leer este atleta: core.is_professional_of_athlete()
  // exige una fila de athlete_professional ya existente, que recien se
  // creo arriba. Un fallo aqui no bloquea la sincronizacion - se
  // continua con shortId=null en vez de inventar o derivar un valor del
  // UUID (ver syncLegacyProfile).
  const { data: shortIdRow, error: shortIdError } = await supabase
    .from("athletes")
    .select("short_id")
    .eq("id", athleteId)
    .maybeSingle();
  if (shortIdError) {
    console.error(
      `[createAthlete] No se pudo leer short_id del atleta ${athleteId} recien creado:`,
      shortIdError
    );
  }
  const shortId = shortIdRow?.short_id ?? null;

  // Sincronizacion con ORION React (public.player_profiles). El atleta y
  // su relacion profesional ya existen en Core en este punto - un fallo
  // aqui NUNCA debe hacer que el profesional reintente este formulario
  // (volver a enviarlo crearia un segundo atleta duplicado, con un nuevo
  // crypto.randomUUID()). Por eso se registra el fallo en el servidor y
  // se continua hacia la ficha del atleta en vez de devolver un error que
  // invite a reenviar el formulario. syncLegacyProfile() es idempotente
  // (ver src/lib/legacyProfileSync.ts), asi que un reintento futuro desde
  // otro punto de entrada podria completarlo sin duplicar nada - pero hoy
  // no existe ningun punto de entrada de reintento fuera de este flujo
  // (ver limitacion señalada en el informe).
  try {
    const syncResult = await syncLegacyProfile(supabase, {
      athleteId,
      fullName,
      authUserId: user.id,
      shortId,
    });
    if (syncResult.status !== "synced" && syncResult.status !== "already_synced") {
      console.error("[createAthlete] Sincronizacion legacy con ORION React fallida:", syncResult);
    }
  } catch (syncException) {
    // El atleta y su relacion Core ya existen (pasos anteriores) - una
    // excepcion inesperada aqui tampoco debe provocar que se reintente
    // este formulario (duplicaria el atleta). Se registra en detalle y
    // se continua hacia el redirect, igual que ante un fallo "normal".
    console.error(
      "[createAthlete] Excepcion inesperada en la sincronizacion legacy con ORION React:",
      syncException
    );
  }

  redirect(`/perfiles/atleta/${athleteId}`);
}
