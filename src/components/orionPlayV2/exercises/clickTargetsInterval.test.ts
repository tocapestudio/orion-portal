/**
 * Pruebas de resolveIntervalMs()/migrateLegacyIntervalConfig() - test
 * runner nativo de Node (node:test + node:assert/strict), mismo patron
 * que clickTargetsMetrics.test.ts/athletes.test.ts.
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en los
 * otros archivos de test de este proyecto: TS5097).
 *
 * Alcance: logica PURA de los 3 modos de pausa y de la migracion de
 * configuraciones antiguas. NO prueba el control de ConfigScreen ni que
 * handleContainerClick llame a resolveIntervalMs() en el momento
 * correcto (React, no testeable aqui - mismo limite ya documentado para
 * el resto de orionPlayV2) - esa parte se verifica por lectura de
 * codigo, no por ejecucion automatizada.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./clickTargetsInterval" + ".ts";
const {
  resolveIntervalMs,
  migrateLegacyIntervalConfig,
  LEGACY_FIXED_INTERVAL_DEFAULT_MS,
  INTERVAL_MIN_MS,
  INTERVAL_MAX_MS,
} = await import(modulePath);

describe("resolveIntervalMs", () => {
  test("modo 'immediate' -> siempre 0, sin importar fixedIntervalMs/randomIntervalMinMs/MaxMs", () => {
    const config = { intervalMode: "immediate", fixedIntervalMs: 999, randomIntervalMinMs: 500, randomIntervalMaxMs: 2000 };
    assert.equal(resolveIntervalMs(config), 0);
  });

  test("modo 'fixed' -> siempre fixedIntervalMs, sin importar el generador aleatorio", () => {
    const config = { intervalMode: "fixed", fixedIntervalMs: 1234, randomIntervalMinMs: 0, randomIntervalMaxMs: 0 };
    assert.equal(resolveIntervalMs(config, () => { throw new Error("no deberia llamarse a random() en modo fixed"); }), 1234);
  });

  test("modo 'random' -> dentro de [min, max], ambos inclusive (random()=0 -> min exacto)", () => {
    const config = { intervalMode: "random", fixedIntervalMs: 0, randomIntervalMinMs: 500, randomIntervalMaxMs: 2000 };
    assert.equal(resolveIntervalMs(config, () => 0), 500);
  });

  test("modo 'random' -> random()=0.999999 se queda en max, nunca lo supera (redondeo hacia abajo)", () => {
    const config = { intervalMode: "random", fixedIntervalMs: 0, randomIntervalMinMs: 500, randomIntervalMaxMs: 2000 };
    assert.equal(resolveIntervalMs(config, () => 0.999999), 2000);
  });

  test("modo 'random' -> genera un valor NUEVO en cada llamada, no cachea (inyectando random() creciente)", () => {
    const config = { intervalMode: "random", fixedIntervalMs: 0, randomIntervalMinMs: 0, randomIntervalMaxMs: 1000 };
    let call = 0;
    const randomSecuencial = () => [0, 0.5, 1 - 1e-9][call++];
    assert.equal(resolveIntervalMs(config, randomSecuencial), 0);
    assert.equal(resolveIntervalMs(config, randomSecuencial), 500);
    assert.equal(resolveIntervalMs(config, randomSecuencial), 1000);
  });

  test("modo 'random' con min>max en la entrada (no deberia pasar con la UI real) -> se normaliza, nunca lanza ni sale de rango", () => {
    const config = { intervalMode: "random", fixedIntervalMs: 0, randomIntervalMinMs: 2000, randomIntervalMaxMs: 500 };
    const result = resolveIntervalMs(config, () => 0.5);
    assert.ok(result >= 500 && result <= 2000);
  });
});

describe("migrateLegacyIntervalConfig", () => {
  test("config legacy con interTargetDelayMs=0 -> intervalMode='immediate', sin el campo legacy", () => {
    const result = migrateLegacyIntervalConfig({ endMode: "repetitions", interTargetDelayMs: 0 });
    assert.deepEqual(result, { endMode: "repetitions", intervalMode: "immediate", fixedIntervalMs: LEGACY_FIXED_INTERVAL_DEFAULT_MS });
  });

  test("config legacy con interTargetDelayMs=1200 -> intervalMode='fixed', preserva el valor real del usuario (no el default)", () => {
    const result = migrateLegacyIntervalConfig({ interTargetDelayMs: 1200 });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: 1200 });
  });

  test("config ya en el nuevo modelo (tiene intervalMode) -> se devuelve exactamente igual, no se vuelve a migrar", () => {
    const already = { intervalMode: "random", randomIntervalMinMs: 100, randomIntervalMaxMs: 300 };
    assert.deepEqual(migrateLegacyIntervalConfig(already), already);
  });

  test("objeto sin interTargetDelayMs ni intervalMode -> se devuelve igual, sin inventar nada", () => {
    const other = { endMode: "time", durationSeconds: 60 };
    assert.deepEqual(migrateLegacyIntervalConfig(other), other);
  });

  test("entrada no-objeto (null) -> se devuelve igual, sin lanzar", () => {
    assert.equal(migrateLegacyIntervalConfig(null), null);
  });

  test("interTargetDelayMs negativo (legacy invalido) -> fallback a LEGACY_FIXED_INTERVAL_DEFAULT_MS en modo 'fixed', nunca negativo", () => {
    const result = migrateLegacyIntervalConfig({ interTargetDelayMs: -500 });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: LEGACY_FIXED_INTERVAL_DEFAULT_MS });
  });

  test("interTargetDelayMs por encima del limite de la UI (5000) -> se recorta a INTERVAL_MAX_MS, el valor efectivo nunca difiere del slider", () => {
    const result = migrateLegacyIntervalConfig({ interTargetDelayMs: 5000 });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: INTERVAL_MAX_MS });
  });

  test("interTargetDelayMs exactamente en el limite inferior admitido tras recorte (1 ms, el minimo >0 posible) -> se preserva sin recortar", () => {
    const result = migrateLegacyIntervalConfig({ interTargetDelayMs: 1 });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: 1 });
  });

  test("interTargetDelayMs exactamente en el limite superior admitido (INTERVAL_MAX_MS, 2000) -> se preserva sin recortar", () => {
    const result = migrateLegacyIntervalConfig({ interTargetDelayMs: INTERVAL_MAX_MS });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: INTERVAL_MAX_MS });
  });

  test("intervalMode corrupto/no reconocido (p.ej. 'foo') -> fallback seguro a 'fixed', NUNCA se interpreta como 'random'", () => {
    const result = migrateLegacyIntervalConfig({ intervalMode: "foo", randomIntervalMinMs: 100, randomIntervalMaxMs: 300 });
    assert.equal(result.intervalMode, "fixed");
    assert.equal(result.fixedIntervalMs, LEGACY_FIXED_INTERVAL_DEFAULT_MS);
  });

  test("intervalMode corrupto pero con fixedIntervalMs numerico ya presente -> se conserva ese valor (recortado), no el default", () => {
    const result = migrateLegacyIntervalConfig({ intervalMode: "bogus", fixedIntervalMs: 1500 });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: 1500 });
  });

  test("intervalMode corrupto con fixedIntervalMs fuera de rango -> tambien se recorta en este camino", () => {
    const result = migrateLegacyIntervalConfig({ intervalMode: "bogus", fixedIntervalMs: 9999 });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: INTERVAL_MAX_MS });
  });

  test("intervalMode=null (no es ninguno de los 3 validos) -> mismo fallback seguro a 'fixed'", () => {
    const result = migrateLegacyIntervalConfig({ intervalMode: null });
    assert.deepEqual(result, { intervalMode: "fixed", fixedIntervalMs: LEGACY_FIXED_INTERVAL_DEFAULT_MS });
  });

  test("los 3 modos validos siguen pasando intactos (immediate/fixed/random), el fallback NUNCA se aplica a datos correctos", () => {
    for (const mode of ["immediate", "fixed", "random"]) {
      const config = { intervalMode: mode, fixedIntervalMs: 800, randomIntervalMinMs: 500, randomIntervalMaxMs: 2000 };
      assert.deepEqual(migrateLegacyIntervalConfig(config), config);
    }
  });

  test("INTERVAL_MIN_MS/INTERVAL_MAX_MS son 0 y 2000 (mismo rango que los sliders de ConfigScreen)", () => {
    assert.equal(INTERVAL_MIN_MS, 0);
    assert.equal(INTERVAL_MAX_MS, 2000);
  });

  // Nota sobre el bug de "configuracion bloqueada" corregido junto a estas
  // pruebas: la causa real era que ClickTargetsExercise.tsx pasaba
  // `validateConfig` a useExerciseFlow como funcion INLINE, creando una
  // referencia nueva en cada render y reactivando sin fin el efecto de
  // carga de useExerciseFlow.ts (que entonces reaplicaba continuamente el
  // ultimo valor guardado en localStorage, impidiendo editar). El arreglo
  // (ver validateClickTargetsConfig en ClickTargetsExercise.tsx) es
  // declarar esa funcion a nivel de modulo para que su referencia sea
  // SIEMPRE la misma entre renders - una garantia estructural de JS (una
  // function declaration de nivel de modulo tiene una unica instancia
  // durante toda la vida del modulo), no algo que un test de esta funcion
  // pueda ejercitar sin una libreria de renderizado de React (no instalada
  // en este proyecto, y no se añade aqui). Lo que SI es razonable probar
  // sin esa infraestructura es que la logica que esa funcion envuelve
  // (migrateLegacyIntervalConfig) es determinista - si no lo fuera, incluso
  // con una referencia estable, cada llamada repetida del efecto podria
  // seguir produciendo un resultado distinto y manifestar un sintoma
  // parecido.
  test("es determinista: misma entrada -> mismo resultado (deep-equal) en llamadas repetidas, sin importar cuantas veces se invoque", () => {
    const legacyInput = { endMode: "repetitions", interTargetDelayMs: 1200, targetColor: "#ff0000" };
    const first = migrateLegacyIntervalConfig(legacyInput);
    const second = migrateLegacyIntervalConfig(legacyInput);
    const third = migrateLegacyIntervalConfig(legacyInput);
    assert.deepEqual(first, second);
    assert.deepEqual(second, third);
  });
});
