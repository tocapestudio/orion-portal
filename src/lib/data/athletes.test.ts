/**
 * Pruebas de getMyActiveAthleteIds() - test runner nativo de Node
 * (node:test + node:assert/strict), mismo patron exacto que
 * legacyProfileSync.test.ts (fake minimo de query builder de Supabase).
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en los
 * otros archivos de test de este proyecto: TS5097).
 *
 * Alcance y limite deliberado: getMyActiveAthleteIds() vive en
 * ./athleteOwnership.ts precisamente porque es la UNICA pieza de esta
 * logica sin ningun import en tiempo de ejecucion de Next.js/Supabase
 * (solo `import type`, erasure total) - por eso es la unica que se
 * puede probar aqui con un fake. athletes.ts (de donde se re-exporta)
 * importa createClient() a nivel de modulo (acoplado a next/headers),
 * igual que playResults.ts/actions.ts - exactamente la misma
 * limitacion ya documentada en playResultsMapping.test.ts ("no es
 * testeable con node:test"), no una limitacion nueva introducida aqui.
 *
 * Como las tres funciones corregidas (getAthleteById en athletes.ts,
 * getSelectedAthleteIfAccessible en selectedAthlete.actions.ts y
 * getAthletePlayResults en playResults.ts) delegan la decision de
 * autorizacion ENTERAMENTE a getMyActiveAthleteIds() (comprueban
 * `athleteIds.includes(id)` sobre su resultado, sin ninguna otra
 * condicion ni distincion de rol), probar a fondo esta funcion cubre la
 * logica de seguridad real que comparten las tres - lo que queda sin
 * cubrir aqui es solo el cableado de Next.js (sesion/cookies), no la
 * decision de autorizacion en si.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./athleteOwnership" + ".ts";
const { getMyActiveAthleteIds } = await import(modulePath);

/**
 * Fake minimo de un query builder de Supabase: select/eq devuelven
 * siempre `this` (permite encadenar), `.then()` resuelve con la
 * respuesta enlatada. Cada llamada a `.eq(columna, valor)` se registra
 * en `eqCalls` en el orden real en que el codigo las hizo - esto
 * permite comprobar que la consulta real pide exactamente
 * professional_id=X y status='active', no solo que el resultado final
 * tenga la forma esperada (un fake que ignorase los argumentos de
 * `.eq()` no detectaria una regresion que quitase el filtro de status).
 */
function makeFakeSupabase(response: { data?: unknown; error?: unknown }) {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];
  function from(table: string) {
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        eqCalls.push({ table, column, value });
        return chain;
      },
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data: response.data ?? null, error: response.error ?? null }),
    };
    return chain;
  }
  return { from, eqCalls };
}

describe("getMyActiveAthleteIds", () => {
  test("1. profesional con relacion activa -> el athlete_id aparece", async () => {
    const supabase = makeFakeSupabase({ data: [{ athlete_id: "ATH-ACTIVO" }], error: null });
    const ids = await getMyActiveAthleteIds(supabase as never, "PRO1");
    assert.deepEqual(ids, ["ATH-ACTIVO"]);
  });

  test("2. profesional sin ninguna relacion con el atleta -> no aparece (array vacio)", async () => {
    const supabase = makeFakeSupabase({ data: [], error: null });
    const ids = await getMyActiveAthleteIds(supabase as never, "PRO1");
    assert.deepEqual(ids, []);
  });

  test("3. la consulta real siempre filtra por professional_id Y status='active', en ese orden - nunca otra condicion", async () => {
    const supabase = makeFakeSupabase({ data: [], error: null });
    await getMyActiveAthleteIds(supabase as never, "PRO-XYZ");
    assert.deepEqual(supabase.eqCalls, [
      { table: "athlete_professional", column: "professional_id", value: "PRO-XYZ" },
      { table: "athlete_professional", column: "status", value: "active" },
    ]);
  });

  test("4. el filtro no depende de ningun rol: la funcion nunca recibe ni consulta roles - un admin sin relacion activa obtiene exactamente el mismo resultado vacio que cualquier otro profesional sin relacion", async () => {
    const supabase = makeFakeSupabase({ data: [], error: null });
    const ids = await getMyActiveAthleteIds(supabase as never, "CUENTA-CON-ROL-ADMIN");
    assert.deepEqual(ids, []);
    // La unica columna de identidad usada es professional_id - nunca se
    // consulta ni se pasa ningun rol a esta funcion.
    assert.ok(!supabase.eqCalls.some((c) => c.column.toLowerCase().includes("role")));
  });

  test("5. data null sin error (defensivo) -> array vacio, no undefined ni excepcion", async () => {
    const supabase = makeFakeSupabase({ data: null, error: null });
    const ids = await getMyActiveAthleteIds(supabase as never, "PRO1");
    assert.deepEqual(ids, []);
  });

  test("7. fallo real de la consulta -> lanza, NUNCA se convierte en array vacio silencioso", async () => {
    const supabase = makeFakeSupabase({ data: null, error: { message: "connection failed" } });
    await assert.rejects(
      () => getMyActiveAthleteIds(supabase as never, "PRO1"),
      (err: unknown) => {
        assert.deepEqual(err, { message: "connection failed" });
        return true;
      }
    );
  });
});
