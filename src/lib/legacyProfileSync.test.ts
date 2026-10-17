import assert from "node:assert/strict";
import { describe, test } from "node:test";

const modulePath = "./legacyProfileSync" + ".ts";
const {
  deriveShortId,
  generateInvitationCodeCandidate,
  isInvitationCodeUniqueViolation,
  syncLegacyProfile,
  archiveLegacyProfile,
} = await import(modulePath);

/**
 * Fake minimo de un query builder de Supabase: select/eq/is/insert/update
 * devuelven siempre `this` (permite encadenar en cualquier orden, igual
 * que hace el cliente real) y `.then()` resuelve con la respuesta
 * enlatada - asi `await chain.algo().otraCosa()` funciona sin importar
 * que combinacion exacta de metodos se haya llamado antes.
 */
function makeQueryChain(
  response: { data?: unknown; error?: unknown },
  onWrite?: (method: "insert" | "update", payload: unknown) => void
) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    insert: (payload: unknown) => {
      onWrite?.("insert", payload);
      return chain;
    },
    update: (payload: unknown) => {
      onWrite?.("update", payload);
      return chain;
    },
    maybeSingle: () => chain,
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: response.data ?? null, error: response.error ?? null }),
  };
  return chain;
}

/**
 * Fake de SupabaseClient: cada `.from(table)` consume, en orden, la
 * siguiente respuesta de la cola de esa tabla - igual que haria una
 * secuencia real de llamadas. `.schema("public")` reutiliza la misma
 * implementacion de `.from`, como el modulo real espera.
 *
 * `writes` (propiedad añadida al objeto devuelto, no cambia la forma
 * esperada por el codigo real) registra, en orden, cada `.insert()`/
 * `.update()` real con su tabla y payload - solo lo usan las pruebas que
 * necesitan comprobar el CONTENIDO exacto de una escritura, el resto lo
 * ignora sin problema.
 */
function makeFakeSupabase(queues: Record<string, Array<{ data?: unknown; error?: unknown }>>) {
  const counters: Record<string, number> = {};
  const writes: Array<{ table: string; method: "insert" | "update"; payload: unknown }> = [];
  function fromImpl(table: string) {
    const list = queues[table] ?? [];
    const idx = counters[table] ?? 0;
    counters[table] = idx + 1;
    return makeQueryChain(list[idx] ?? { data: null, error: null }, (method, payload) => {
      writes.push({ table, method, payload });
    });
  }
  return { from: fromImpl, schema: () => ({ from: fromImpl }), writes };
}

describe("deriveShortId", () => {
  test("toma los primeros 8 caracteres hexadecimales del uuid sin guiones, en mayusculas", () => {
    assert.equal(
      deriveShortId("abcdef12-3456-7890-abcd-ef1234567890"),
      "ABCDEF12"
    );
  });
});

describe("generateInvitationCodeCandidate", () => {
  test("genera 8 caracteres, todos dentro del alfabeto A-Z0-9", () => {
    const code = generateInvitationCodeCandidate();
    assert.equal(code.length, 8);
    assert.match(code, /^[A-Z0-9]{8}$/);
  });

  test("es determinista si se inyecta una funcion random fija", () => {
    const a = generateInvitationCodeCandidate(() => 0);
    const b = generateInvitationCodeCandidate(() => 0);
    assert.equal(a, b);
    assert.equal(a, "AAAAAAAA");
  });
});

describe("isInvitationCodeUniqueViolation", () => {
  test("23505 con 'invitation_code' en el mensaje -> true", () => {
    assert.equal(
      isInvitationCodeUniqueViolation({
        code: "23505",
        message: 'duplicate key value violates unique constraint "player_profiles_invitation_code_key"',
      }),
      true
    );
  });

  test("23505 de OTRA restriccion (p.ej. la clave primaria) -> false, no se confunde", () => {
    assert.equal(
      isInvitationCodeUniqueViolation({
        code: "23505",
        message: 'duplicate key value violates unique constraint "player_profiles_pkey"',
      }),
      false
    );
  });

  test("error sin codigo 23505 -> false, aunque mencione invitation_code", () => {
    assert.equal(
      isInvitationCodeUniqueViolation({ code: "23502", message: "null value in column invitation_code" }),
      false
    );
  });

  test("sin error -> false", () => {
    assert.equal(isInvitationCodeUniqueViolation(null), false);
  });
});

describe("syncLegacyProfile", () => {
  test("sin fila en public.users (sin error) -> no_legacy_professional, no intenta nada mas", async () => {
    const supabase = makeFakeSupabase({ users: [{ data: null, error: null }] });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, { status: "no_legacy_professional" });
  });

  test("la consulta a public.users falla de verdad -> legacy_professional_lookup_failed, distinto de 'no existe'", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: null, error: { message: "connection failed" } }],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, {
      status: "legacy_professional_lookup_failed",
      message: "connection failed",
    });
  });

  test("perfil existente con el mismo id pero de OTRO profesional -> profile_conflict, nunca se sobrescribe", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "ATH1", professional_id: "OTRO_PROF", full_name: "Otro Nombre" }, error: null },
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, { status: "profile_conflict", existingProfileId: "ATH1" });
  });

  test("perfil existente coincide (profesional y nombre) -> completa el vinculo sin reinsertar", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "ATH1", professional_id: "PROF1", full_name: "Juan Perez" }, error: null },
      ],
      athletes: [
        { data: [], error: null }, // update afecto 0 filas (ya estaba vinculado)
        { data: { legacy_player_profile_id: "ATH1" }, error: null }, // confirma que ya apunta aqui
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, { status: "already_synced", legacyProfileId: "ATH1" });
  });

  test("perfil existente coincide pero estaba archivado -> se desarchiva antes de vincular (solo porque id+profesional+nombre coinciden)", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        {
          data: {
            id: "ATH1",
            professional_id: "PROF1",
            full_name: "Juan Perez",
            archived_at: "2026-01-01T00:00:00Z",
          },
          error: null,
        },
        { data: null, error: null }, // UPDATE de desarchivado (sin error)
      ],
      athletes: [
        { data: [], error: null },
        { data: { legacy_player_profile_id: "ATH1" }, error: null },
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, { status: "already_synced", legacyProfileId: "ATH1" });
  });

  test("perfil archivado, pero el UPDATE de desarchivado falla -> unarchive_failed, no intenta vincular", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        {
          data: {
            id: "ATH1",
            professional_id: "PROF1",
            full_name: "Juan Perez",
            archived_at: "2026-01-01T00:00:00Z",
          },
          error: null,
        },
        { data: null, error: { message: "fallo real al desarchivar" } },
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, {
      status: "unarchive_failed",
      legacyProfileId: "ATH1",
      message: "fallo real al desarchivar",
    });
  });

  test("perfil nuevo creado y vinculado correctamente -> synced", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null }, // no existe perfil previo con ese id
        { data: null, error: null }, // sin colision en el primer invitation_code generado
        { data: null, error: null }, // INSERT exitoso (sin error)
      ],
      athletes: [{ data: [{ id: "ATH1" }], error: null }], // update afecto exactamente 1 fila
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, { status: "synced", legacyProfileId: "ATH1" });
  });

  test("usa el short_id entero de Core como texto en el INSERT, nunca lo deriva del UUID", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ],
      athletes: [{ data: [{ id: "ATH1" }], error: null }],
    });
    await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    const insertCall = (supabase as unknown as { writes: Array<{ table: string; method: string; payload: { short_id?: unknown } }> })
      .writes.find((w) => w.table === "player_profiles" && w.method === "insert");
    assert.equal(insertCall?.payload.short_id, "46");
    assert.notEqual(insertCall?.payload.short_id, deriveShortId("ATH1"));
  });

  test("sin short_id de Core disponible (null) -> crea el perfil con short_id = null, sin inventar ni derivar del UUID", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ],
      athletes: [{ data: [{ id: "ATH1" }], error: null }],
    });
    await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: null,
    });
    const insertCall = (supabase as unknown as { writes: Array<{ table: string; method: string; payload: { short_id?: unknown } }> })
      .writes.find((w) => w.table === "player_profiles" && w.method === "insert");
    assert.equal(insertCall?.payload.short_id, null);
  });

  test("perfil creado pero el vinculo no se confirma -> link_update_failed, nunca se marca como sincronizado", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: null },
      ],
      athletes: [
        { data: [], error: null }, // update afecto 0 filas
        { data: { legacy_player_profile_id: null }, error: null }, // y sigue sin vincular
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.equal(result.status, "link_update_failed");
    assert.equal(result.legacyProfileId, "ATH1");
  });

  test("colision real de invitation_code en el INSERT (ventana de carrera) -> reintenta y acaba creando el perfil", async () => {
    const collisionError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "player_profiles_invitation_code_key"',
    };
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null }, // sin perfil previo con ese id
        { data: null, error: null }, // pre-comprobacion: primer candidato aceptado
        { data: null, error: collisionError }, // INSERT intento 1: colision real
        { data: null, error: null }, // INSERT intento 2: exito con otro candidato
      ],
      athletes: [{ data: [{ id: "ATH1" }], error: null }],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, { status: "synced", legacyProfileId: "ATH1" });
  });

  test("colision real persistente -> agota los reintentos y crea el perfil con invitation_code = null", async () => {
    const collisionError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "player_profiles_invitation_code_key"',
    };
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null }, // sin perfil previo
        { data: null, error: null }, // pre-comprobacion aceptada
        { data: null, error: collisionError }, // intento 1 (retry=0): colision
        { data: null, error: collisionError }, // intento 2 (retry=1): colision
        { data: null, error: collisionError }, // intento 3 (retry=2): colision
        { data: null, error: collisionError }, // intento 4 (retry=3): colision -> se agota, siguiente va con null
        { data: null, error: null }, // intento 5: con invitation_code=null, exito
      ],
      athletes: [{ data: [{ id: "ATH1" }], error: null }],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, { status: "synced", legacyProfileId: "ATH1" });
  });

  test("la colision persiste incluso con invitation_code = null -> se trata como fallo real, no se reintenta sin fin", async () => {
    const collisionError = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "player_profiles_invitation_code_key"',
    };
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: collisionError },
        { data: null, error: collisionError },
        { data: null, error: collisionError },
        { data: null, error: collisionError },
        { data: null, error: { message: "fallo distinto incluso sin invitation_code" } }, // con null, sigue fallando
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, {
      status: "profile_create_failed",
      message: "fallo distinto incluso sin invitation_code",
    });
  });

  test("un 23505 que NO es de invitation_code (p.ej. la clave primaria) nunca se reintenta", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null },
        { data: null, error: null },
        {
          data: null,
          error: { code: "23505", message: 'duplicate key value violates unique constraint "player_profiles_pkey"' },
        },
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, {
      status: "profile_create_failed",
      message: 'duplicate key value violates unique constraint "player_profiles_pkey"',
    });
  });

  test("fallo real al insertar el perfil -> profile_create_failed con el mensaje real, no oculto", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: null, error: null },
        { data: null, error: null },
        { data: null, error: { message: "duplicate key value violates unique constraint" } },
      ],
    });
    const result = await syncLegacyProfile(supabase as never, {
      athleteId: "ATH1",
      fullName: "Juan Perez",
      authUserId: "AUTH1",
      shortId: 46,
    });
    assert.deepEqual(result, {
      status: "profile_create_failed",
      message: "duplicate key value violates unique constraint",
    });
  });
});

describe("archiveLegacyProfile", () => {
  test("recibe legacyProfileId directamente - nunca consulta core.athletes (no exige relacion activa)", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "LEGACY1", professional_id: "PROF1", archived_at: null }, error: null },
        { data: [{ id: "LEGACY1" }], error: null },
      ],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.deepEqual(result, { status: "archived", legacyProfileId: "LEGACY1" });
  });

  test("sin fila en public.users para este profesional -> legacy_professional_lookup_failed", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: null, error: null }],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.equal(result.status, "legacy_professional_lookup_failed");
  });

  test("la ficha legacy no existe (id ya no corresponde a ninguna fila) -> no_legacy_profile", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [{ data: null, error: null }],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.deepEqual(result, { status: "no_legacy_profile" });
  });

  test("la ficha legacy pertenece a OTRO profesional -> not_owned_by_this_professional, nunca se modifica", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "LEGACY1", professional_id: "OTRO_PROF", archived_at: null }, error: null },
      ],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.deepEqual(result, { status: "not_owned_by_this_professional", legacyProfileId: "LEGACY1" });
  });

  test("la ficha ya estaba archivada -> already_archived, no vuelve a escribir", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "LEGACY1", professional_id: "PROF1", archived_at: "2026-01-01T00:00:00Z" }, error: null },
      ],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.deepEqual(result, { status: "already_archived", legacyProfileId: "LEGACY1" });
  });

  test("ficha propia y sin archivar -> se archiva correctamente", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "LEGACY1", professional_id: "PROF1", archived_at: null }, error: null },
        { data: [{ id: "LEGACY1" }], error: null }, // UPDATE afecto 1 fila
      ],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.deepEqual(result, { status: "archived", legacyProfileId: "LEGACY1" });
  });

  test("carrera: otra llamada ya archivo la ficha entre la comprobacion y el UPDATE -> already_archived, no error", async () => {
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "LEGACY1", professional_id: "PROF1", archived_at: null }, error: null },
        { data: [], error: null }, // UPDATE afecto 0 filas (ya archivada por otra llamada)
      ],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.deepEqual(result, { status: "already_archived", legacyProfileId: "LEGACY1" });
  });

  test("reintento posterior: se puede volver a invocar mas tarde con el mismo legacyProfileId, sin ninguna relacion de Core involucrada", async () => {
    // Simula exactamente el escenario del punto 2: la relacion en Core ya
    // esta 'ended' (no se modela aqui porque esta funcion no la consulta
    // en ningun momento - esa es la prueba en si: ningun queue de
    // 'athletes'/'athlete_professional' hace falta para que funcione).
    const supabase = makeFakeSupabase({
      users: [{ data: { id: "PROF1" }, error: null }],
      player_profiles: [
        { data: { id: "LEGACY1", professional_id: "PROF1", archived_at: null }, error: null },
        { data: [{ id: "LEGACY1" }], error: null },
      ],
    });
    const result = await archiveLegacyProfile(supabase as never, {
      legacyProfileId: "LEGACY1",
      authUserId: "AUTH1",
    });
    assert.deepEqual(result, { status: "archived", legacyProfileId: "LEGACY1" });
  });
});
