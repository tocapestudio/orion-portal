/**
 * Pruebas de getBestHitTimeMs() - test runner nativo de Node
 * (node:test + node:assert/strict), mismo patron que
 * athletes.test.ts/selectedAthleteVerificationState.test.ts.
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en los
 * otros archivos de test de este proyecto: TS5097).
 *
 * Alcance: esta es la logica PURA del "mejor tiempo" (Mejora 2). NO
 * prueba que ResultsScreen/StoppedScreen lo rendericen correctamente
 * (componentes de React, no testeables aqui - no hay libreria de testing
 * de React instalada en este proyecto), ni la pausa configurable entre
 * targets (Mejora 1 - logica embebida en un useCallback de React, no
 * extraida a una funcion pura en esta tarea). Esa parte se ha verificado
 * por lectura completa del codigo, no por ejecucion automatizada.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./clickTargetsMetrics" + ".ts";
const { getBestHitTimeMs } = await import(modulePath);

describe("getBestHitTimeMs", () => {
  test("8. devuelve el minimo reactionTimeMs entre los aciertos, excluyendo fallos", () => {
    const records = [
      { reactionTimeMs: 500, outcome: "hit" },
      { reactionTimeMs: 120, outcome: "miss" }, // mas rapido, pero es fallo: debe excluirse
      { reactionTimeMs: 300, outcome: "hit" },
      { reactionTimeMs: 450, outcome: "hit" },
    ];
    assert.equal(getBestHitTimeMs(records), 300);
  });

  test("9. sin ningun acierto (solo fallos) -> null, nunca 0 ni Infinity", () => {
    const records = [
      { reactionTimeMs: 200, outcome: "miss" },
      { reactionTimeMs: 150, outcome: "miss" },
    ];
    assert.equal(getBestHitTimeMs(records), null);
  });

  test("array vacio -> null", () => {
    assert.equal(getBestHitTimeMs([]), null);
  });

  test("un unico acierto -> ese mismo valor", () => {
    assert.equal(getBestHitTimeMs([{ reactionTimeMs: 275, outcome: "hit" }]), 275);
  });

  test("un acierto con reactionTimeMs=0 se distingue de 'sin aciertos' (ambos son 0/null, nunca se confunden por el tipo de retorno)", () => {
    const result = getBestHitTimeMs([{ reactionTimeMs: 0, outcome: "hit" }]);
    assert.equal(result, 0);
    assert.notEqual(result, null);
  });

  test("no muta el array recibido", () => {
    const records = [
      { reactionTimeMs: 400, outcome: "hit" },
      { reactionTimeMs: 100, outcome: "hit" },
    ];
    const copy = records.map((r) => ({ ...r }));
    getBestHitTimeMs(records);
    assert.deepEqual(records, copy);
  });
});
