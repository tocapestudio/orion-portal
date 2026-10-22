/**
 * Pruebas aisladas de la logica pura de stimulusConfig.ts - test runner
 * nativo de Node (node:test + node:assert/strict), mismo patron exacto
 * que reactionTimeStimulus.test.ts.
 *
 * Ejecutar con:
 *   node --test "src/components/visualLabTools/stimulusGenerator/stimulusConfig.test.ts"
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en los
 * demas archivos de test de este proyecto: TS5097 con moduleResolution
 * "bundler" en un import ESTATICO con extension .ts explicita).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./stimulusConfig" + ".ts";
const { isValidStimulusGeneratorConfig, pickRandomStimulus, computeNextIntervalMs, DEFAULT_STIMULUS_CONFIG } =
  await import(modulePath);

describe("isValidStimulusGeneratorConfig", () => {
  test("acepta la configuracion por defecto", () => {
    assert.equal(isValidStimulusGeneratorConfig(DEFAULT_STIMULUS_CONFIG), true);
  });

  test("rechaza null/undefined/no-objeto", () => {
    assert.equal(isValidStimulusGeneratorConfig(null), false);
    assert.equal(isValidStimulusGeneratorConfig(undefined), false);
    assert.equal(isValidStimulusGeneratorConfig("texto"), false);
    assert.equal(isValidStimulusGeneratorConfig(42), false);
  });

  test("rechaza stimulusType desconocido", () => {
    assert.equal(isValidStimulusGeneratorConfig({ ...DEFAULT_STIMULUS_CONFIG, stimulusType: "sonidos" }), false);
  });

  test("rechaza intervalMode desconocido", () => {
    assert.equal(isValidStimulusGeneratorConfig({ ...DEFAULT_STIMULUS_CONFIG, intervalMode: "aleatorio" }), false);
  });

  test("rechaza valores de intervalo no finitos, cero o negativos", () => {
    assert.equal(isValidStimulusGeneratorConfig({ ...DEFAULT_STIMULUS_CONFIG, intervalMs: NaN }), false);
    assert.equal(isValidStimulusGeneratorConfig({ ...DEFAULT_STIMULUS_CONFIG, intervalMs: 0 }), false);
    assert.equal(isValidStimulusGeneratorConfig({ ...DEFAULT_STIMULUS_CONFIG, intervalMs: -100 }), false);
    assert.equal(isValidStimulusGeneratorConfig({ ...DEFAULT_STIMULUS_CONFIG, intervalMinMs: Infinity }), false);
  });

  test("acepta cada combinacion valida de stimulusType/intervalMode", () => {
    for (const stimulusType of ["colors", "numbers", "letters", "shapes"]) {
      for (const intervalMode of ["fixed", "random"]) {
        assert.equal(
          isValidStimulusGeneratorConfig({ ...DEFAULT_STIMULUS_CONFIG, stimulusType, intervalMode }),
          true
        );
      }
    }
  });
});

describe("pickRandomStimulus", () => {
  test("randomFn()=0 devuelve siempre el primer elemento del pool", () => {
    assert.equal(pickRandomStimulus("colors", () => 0), "#ef4444");
    assert.equal(pickRandomStimulus("numbers", () => 0), "0");
  });

  test("randomFn() muy cercano a 1 no se sale del pool (sin lanzar)", () => {
    const value = pickRandomStimulus("shapes", () => 0.999999);
    assert.ok(["circle", "square", "triangle", "star"].includes(value));
  });

  test("randomFn()=1 exacto (caso de borde inyectado, nunca real) no se sale del pool", () => {
    const value = pickRandomStimulus("letters", () => 1);
    assert.ok(typeof value === "string" && value.length === 1);
  });

  test("con Math.random real, siempre devuelve un valor del pool correspondiente", () => {
    for (let i = 0; i < 200; i++) {
      assert.ok(["0","1","2","3","4","5","6","7","8","9"].includes(pickRandomStimulus("numbers")));
    }
  });

  test("dos llamadas sucesivas sin randomFn fija pueden dar valores distintos (sin memoria)", () => {
    const values = new Set();
    for (let i = 0; i < 50; i++) values.add(pickRandomStimulus("colors"));
    assert.ok(values.size > 1, "50 sorteos deberian producir mas de un color distinto");
  });
});

describe("computeNextIntervalMs", () => {
  test("modo 'fixed' devuelve siempre intervalMs, ignora min/max", () => {
    assert.equal(
      computeNextIntervalMs({ intervalMode: "fixed", intervalMs: 1500, intervalMinMs: 1, intervalMaxMs: 2 }),
      1500
    );
  });

  test("modo 'random' con randomFn()=0 devuelve el minimo exacto", () => {
    assert.equal(
      computeNextIntervalMs(
        { intervalMode: "random", intervalMs: 999, intervalMinMs: 1000, intervalMaxMs: 3000 },
        () => 0
      ),
      1000
    );
  });

  test("modo 'random' con randomFn() muy cercano a 1 se acerca al maximo sin superarlo", () => {
    const value = computeNextIntervalMs(
      { intervalMode: "random", intervalMs: 999, intervalMinMs: 1000, intervalMaxMs: 3000 },
      () => 0.999999
    );
    assert.ok(value < 3000 && value > 2999);
  });

  test("modo 'random' funciona igual si intervalMinMs/intervalMaxMs llegan invertidos", () => {
    const value = computeNextIntervalMs(
      { intervalMode: "random", intervalMs: 999, intervalMinMs: 3000, intervalMaxMs: 1000 },
      () => 0
    );
    assert.equal(value, 1000);
  });

  test("con Math.random real, el resultado siempre cae dentro de [min, max]", () => {
    for (let i = 0; i < 200; i++) {
      const value = computeNextIntervalMs({ intervalMode: "random", intervalMs: 0, intervalMinMs: 500, intervalMaxMs: 1500 });
      assert.ok(value >= 500 && value < 1500, `valor ${value} fuera de rango`);
    }
  });
});
