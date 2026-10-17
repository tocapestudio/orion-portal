/**
 * Pruebas aisladas de la logica pura de effectiveConfig.ts
 * (isValidEffectiveConfig/buildConfigUsed) - test runner nativo de Node
 * (node:test + node:assert/strict), sin instalar ningun framework.
 *
 * Deliberadamente SIN importar nada de actions.ts/Next.js/Supabase - este
 * archivo solo importa ./effectiveConfig.ts (modulo puro) y las
 * utilidades nativas de Node. Ejecutar con:
 *   node --test "src/app/(portal)/visual-lab/play/effectiveConfig.test.ts"
 * (usa el soporte nativo de TypeScript de Node 23.6+/24, sin instalar
 * ningun transpilador adicional).
 *
 * Import dinamico con ruta NO literal (ver mas abajo), en vez de un
 * `import ... from "./effectiveConfig.ts"` estatico: Node (ESM) exige la
 * extension `.ts` explicita para resolver el modulo en ejecucion, pero el
 * tsconfig de este proyecto (moduleResolution "bundler", sin
 * `allowImportingTsExtensions`) rechaza esa extension en un import
 * ESTATICO (TS5097). TypeScript solo resuelve/comprueba en tiempo de
 * compilacion los specifiers de `import()` que son un STRING LITERAL; al
 * construir la ruta en una variable, deja de intentar resolverlo y no
 * aplica esa comprobacion - sin tocar tsconfig.json, sin `@ts-nocheck`.
 *
 * COSTE real de esta tecnica (no ocultarlo): el resultado de
 * `await import(rutaNoLiteral)` se tipa como `any` - las funciones/
 * constantes desestructuradas de ahi (isValidEffectiveConfig,
 * buildConfigUsed, etc.) NO tienen firma comprobada por tsc dentro de
 * este archivo. Un uso incorrecto (num. de argumentos, tipo devuelto)
 * no se detectaria aqui en `tsc --noEmit`, solo al ejecutar las pruebas.
 * Es, aun asi, una perdida de tipado mas acotada que `@ts-nocheck`
 * (que desactivaba TODO el archivo, incluidos los asserts/helpers
 * propios) - el resto de este archivo (los 20 `test(...)`, `omit(...)`,
 * los objetos de configuracion) sigue comprobado normalmente.
 *
 * Alcance: solo la logica en memoria de estas dos funciones. No conecta
 * con Supabase, no valida metricas, no toca idempotencia ni persistencia
 * - eso sigue dependiendo de pruebas funcionales con un entorno Supabase
 * real (ver informes de fases anteriores).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Ruta construida (no un string literal) a proposito - ver el comentario
// de arriba: es lo que evita que tsc intente resolver/comprobar esta
// extension estaticamente.
const effectiveConfigPath = "./effectiveConfig" + ".ts";
const {
  REACTION_TIME_ACTIVITY_NAME,
  SIMPLE_REACTION_EXERCISE_ID,
  CLICK_TARGETS_ACTIVITY_NAME,
  VISUAL_MEMORY_ACTIVITY_NAME,
  REACTION_TIME_CONFIG_USED,
  SIMPLE_REACTION_CONFIG_USED,
  CLICK_TARGETS_CONFIG_USED,
  VISUAL_MEMORY_CONFIG_USED,
  isValidEffectiveConfig,
  buildConfigUsed,
} = await import(effectiveConfigPath);

// Configuraciones reales minimas, con los mismos nombres de campo que
// ExerciseConfig en ReactionTimeExercise.tsx/SimpleReactionExercise.tsx
// (ver esos archivos) - no se inventa ningun nombre de campo.
const validReactionTimeConfig = {
  endMode: "repetitions",
  totalTrials: 20,
  durationSeconds: 120,
  goDistribution: "random",
  goRatio: 0.7,
  intervalMinMs: 1500,
  intervalMaxMs: 3000,
  goColor: "#22c55e",
  noGoColor: "#ef4444",
  contrastPercent: 100,
  showFeedback: true,
};

// Devuelve una copia de `obj` sin la clave `key` - usado solo para
// construir, a partir de una config real valida, variantes incompletas
// que probar contra isValidEffectiveConfig (en vez de desestructurar y
// dejar un binding sin usar).
function omit(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const validSimpleReactionConfig = {
  endMode: "time",
  totalTrials: 20,
  durationSeconds: 120,
  intervalMinMs: 1500,
  intervalMaxMs: 3000,
  stimulusColor: "#22c55e",
  contrastPercent: 100,
  showFeedback: true,
};

// Mismos nombres de campo que ExerciseConfig en ClickTargetsExercise.tsx -
// notese que usa `targetCount`, no `totalTrials` (a diferencia de
// Reaction Time/Simple Reaction).
const validClickTargetsConfig = {
  endMode: "repetitions",
  targetCount: 15,
  durationSeconds: 120,
  targetSize: 32,
  targetColor: "#3b82f6",
  contrastPercent: 100,
  showFixation: false,
  showFeedback: true,
};

// Mismos nombres de campo que ExerciseConfig en VisualMemoryExercise.tsx -
// `endMode` admite un tercer valor ('progressive') que ningun otro
// ejercicio tiene, y no existe ningun campo de recuento de intentos
// llamado `totalTrials`/`targetCount`.
const validVisualMemoryConfig = {
  gridSize: 4,
  patternCount: 5,
  cellSize: "medium",
  memorizeTimeSec: 3,
  stimulusColor: "#3b82f6",
  contrastPercent: 100,
  endMode: "repetitions",
  repetitions: 5,
  durationSeconds: 120,
  showFixation: false,
  fixationDurationMs: 1000,
};

describe("isValidEffectiveConfig", () => {
  test("acepta una configuracion real valida de reaction-time", () => {
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, validReactionTimeConfig), true);
  });

  test("acepta una configuracion real valida de simple-reaction", () => {
    assert.equal(isValidEffectiveConfig(SIMPLE_REACTION_EXERCISE_ID, validSimpleReactionConfig), true);
  });

  test("rechaza undefined, null y primitivos", () => {
    for (const value of [undefined, null, "texto", 42, true]) {
      assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, value), false, `valor: ${String(value)}`);
    }
  });

  test("rechaza arrays, vacios o no", () => {
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, []), false);
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, ["a", "b"]), false);
  });

  test("rechaza un objeto vacio", () => {
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, {}), false);
  });

  test("rechaza config incompleta (falta un campo comun obligatorio)", () => {
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, omit(validReactionTimeConfig, "totalTrials")), false);
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, omit(validReactionTimeConfig, "durationSeconds")), false);
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, omit(validReactionTimeConfig, "endMode")), false);
  });

  test("rechaza tipos incorrectos en campos comunes", () => {
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, totalTrials: "20" }),
      false
    );
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, durationSeconds: true }),
      false
    );
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, endMode: 1 }),
      false
    );
  });

  test("rechaza NaN/Infinity/-Infinity en campos numericos", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      assert.equal(
        isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, totalTrials: bad }),
        false,
        `totalTrials=${bad}`
      );
      assert.equal(
        isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, durationSeconds: bad }),
        false,
        `durationSeconds=${bad}`
      );
    }
  });

  test("rechaza endMode no valido", () => {
    for (const bad of ["invalid", "", "REPETITIONS"]) {
      assert.equal(
        isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, endMode: bad }),
        false,
        `endMode="${bad}"`
      );
    }
  });

  test("rechaza colores con tipo incorrecto", () => {
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, goColor: 123 }),
      false
    );
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, noGoColor: null }),
      false
    );
    assert.equal(
      isValidEffectiveConfig(SIMPLE_REACTION_EXERCISE_ID, { ...validSimpleReactionConfig, stimulusColor: {} }),
      false
    );
  });

  test("rechaza colores vacios o solo espacios", () => {
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, goColor: "" }),
      false
    );
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, noGoColor: "   " }),
      false
    );
    assert.equal(
      isValidEffectiveConfig(SIMPLE_REACTION_EXERCISE_ID, { ...validSimpleReactionConfig, stimulusColor: "\t\n" }),
      false
    );
  });

  test("caso cruzado: config valida de simple-reaction pasada como reaction-time se rechaza", () => {
    // validSimpleReactionConfig tiene stimulusColor, no goColor/noGoColor.
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, validSimpleReactionConfig), false);
  });

  test("caso cruzado inverso: config valida de reaction-time pasada como simple-reaction se rechaza", () => {
    // validReactionTimeConfig no tiene stimulusColor.
    assert.equal(isValidEffectiveConfig(SIMPLE_REACTION_EXERCISE_ID, validReactionTimeConfig), false);
  });

  test("acepta una configuracion valida con campos adicionales desconocidos", () => {
    assert.equal(
      isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, { ...validReactionTimeConfig, unCampoFuturo: 42 }),
      true
    );
  });

  test("acepta una configuracion real valida de click-targets", () => {
    assert.equal(isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, validClickTargetsConfig), true);
  });

  test("acepta una configuracion real valida de visual-memory-precision, en sus 3 endMode", () => {
    assert.equal(isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, validVisualMemoryConfig), true);
    assert.equal(
      isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, { ...validVisualMemoryConfig, endMode: "time" }),
      true
    );
    assert.equal(
      isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, { ...validVisualMemoryConfig, endMode: "progressive" }),
      true
    );
  });

  test("rechaza click-targets incompleta (falta targetCount/durationSeconds/endMode/targetColor)", () => {
    assert.equal(isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, omit(validClickTargetsConfig, "targetCount")), false);
    assert.equal(isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, omit(validClickTargetsConfig, "durationSeconds")), false);
    assert.equal(isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, omit(validClickTargetsConfig, "endMode")), false);
    assert.equal(isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, omit(validClickTargetsConfig, "targetColor")), false);
  });

  test("rechaza visual-memory-precision incompleta (falta gridSize/durationSeconds/endMode/stimulusColor)", () => {
    assert.equal(isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, omit(validVisualMemoryConfig, "gridSize")), false);
    assert.equal(isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, omit(validVisualMemoryConfig, "durationSeconds")), false);
    assert.equal(isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, omit(validVisualMemoryConfig, "endMode")), false);
    assert.equal(isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, omit(validVisualMemoryConfig, "stimulusColor")), false);
  });

  test("rechaza endMode no valido en click-targets (no admite 'progressive')", () => {
    assert.equal(
      isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, { ...validClickTargetsConfig, endMode: "progressive" }),
      false
    );
  });

  test("rechaza endMode no valido en visual-memory-precision", () => {
    assert.equal(
      isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, { ...validVisualMemoryConfig, endMode: "invalido" }),
      false
    );
  });

  test("rechaza NaN/Infinity en campos numericos propios de click-targets/visual-memory-precision", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      assert.equal(
        isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, { ...validClickTargetsConfig, targetCount: bad }),
        false,
        `targetCount=${bad}`
      );
      assert.equal(
        isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, { ...validVisualMemoryConfig, gridSize: bad }),
        false,
        `gridSize=${bad}`
      );
    }
  });

  test("rechaza colores vacios o solo espacios en click-targets/visual-memory-precision", () => {
    assert.equal(
      isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, { ...validClickTargetsConfig, targetColor: "" }),
      false
    );
    assert.equal(
      isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, { ...validVisualMemoryConfig, stimulusColor: "   " }),
      false
    );
  });

  test("caso cruzado: ninguna config de click-targets/visual-memory-precision/reaction-time/simple-reaction es valida para otro exerciseId", () => {
    // click-targets no tiene totalTrials/goColor/noGoColor/stimulusColor.
    assert.equal(isValidEffectiveConfig(REACTION_TIME_ACTIVITY_NAME, validClickTargetsConfig), false);
    assert.equal(isValidEffectiveConfig(SIMPLE_REACTION_EXERCISE_ID, validClickTargetsConfig), false);
    // visual-memory-precision no tiene targetCount/targetColor.
    assert.equal(isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, validVisualMemoryConfig), false);
    // reaction-time no tiene targetCount/targetColor ni gridSize/stimulusColor.
    assert.equal(isValidEffectiveConfig(CLICK_TARGETS_ACTIVITY_NAME, validReactionTimeConfig), false);
    assert.equal(isValidEffectiveConfig(VISUAL_MEMORY_ACTIVITY_NAME, validReactionTimeConfig), false);
  });
});

describe("buildConfigUsed", () => {
  test("configuracion valida de reaction-time: incluye exerciseId y configVersion:1", () => {
    const result = buildConfigUsed(REACTION_TIME_ACTIVITY_NAME, validReactionTimeConfig);
    assert.deepEqual(result, { ...validReactionTimeConfig, exerciseId: REACTION_TIME_ACTIVITY_NAME, configVersion: 1 });
  });

  test("configuracion valida de simple-reaction: incluye exerciseId y configVersion:1", () => {
    const result = buildConfigUsed(SIMPLE_REACTION_EXERCISE_ID, validSimpleReactionConfig);
    assert.deepEqual(result, { ...validSimpleReactionConfig, exerciseId: SIMPLE_REACTION_EXERCISE_ID, configVersion: 1 });
  });

  test("exerciseId y configVersion del resultado prevalecen sobre los del objeto de entrada", () => {
    const configConValoresFalsos = { ...validReactionTimeConfig, exerciseId: "otro-ejercicio", configVersion: 999 };
    const result = buildConfigUsed(REACTION_TIME_ACTIVITY_NAME, configConValoresFalsos) as Record<string, unknown>;
    assert.equal(result.exerciseId, REACTION_TIME_ACTIVITY_NAME);
    assert.equal(result.configVersion, 1);
  });

  test("fallback exacto de reaction-time cuando la configuracion es invalida (sin configVersion)", () => {
    for (const invalida of [undefined, null, [], {}, "texto"]) {
      const result = buildConfigUsed(REACTION_TIME_ACTIVITY_NAME, invalida as never);
      assert.deepEqual(result, REACTION_TIME_CONFIG_USED);
      assert.equal(Object.prototype.hasOwnProperty.call(result, "configVersion"), false);
    }
  });

  test("fallback exacto de simple-reaction cuando la configuracion es invalida (sin configVersion, con su propio exerciseId embebido)", () => {
    const result = buildConfigUsed(SIMPLE_REACTION_EXERCISE_ID, undefined) as Record<string, unknown>;
    assert.deepEqual(result, SIMPLE_REACTION_CONFIG_USED);
    assert.equal(result.exerciseId, SIMPLE_REACTION_EXERCISE_ID);
    assert.equal(Object.prototype.hasOwnProperty.call(result, "configVersion"), false);
  });

  test("las constantes de fallback no se alteran tras multiples llamadas invalidas", () => {
    const snapshotReactionTime = { ...REACTION_TIME_CONFIG_USED };
    const snapshotSimpleReaction = { ...SIMPLE_REACTION_CONFIG_USED };

    buildConfigUsed(REACTION_TIME_ACTIVITY_NAME, {});
    buildConfigUsed(REACTION_TIME_ACTIVITY_NAME, [] as never);
    buildConfigUsed(SIMPLE_REACTION_EXERCISE_ID, null as never);
    buildConfigUsed(SIMPLE_REACTION_EXERCISE_ID, "texto" as never);

    assert.deepEqual(REACTION_TIME_CONFIG_USED, snapshotReactionTime);
    assert.deepEqual(SIMPLE_REACTION_CONFIG_USED, snapshotSimpleReaction);
  });

  test("configuracion valida de click-targets: incluye exerciseId y configVersion:1", () => {
    const result = buildConfigUsed(CLICK_TARGETS_ACTIVITY_NAME, validClickTargetsConfig);
    assert.deepEqual(result, { ...validClickTargetsConfig, exerciseId: CLICK_TARGETS_ACTIVITY_NAME, configVersion: 1 });
  });

  test("configuracion valida de visual-memory-precision: incluye exerciseId y configVersion:1", () => {
    const result = buildConfigUsed(VISUAL_MEMORY_ACTIVITY_NAME, validVisualMemoryConfig);
    assert.deepEqual(result, { ...validVisualMemoryConfig, exerciseId: VISUAL_MEMORY_ACTIVITY_NAME, configVersion: 1 });
  });

  test("fallback exacto de click-targets/visual-memory-precision cuando la configuracion es invalida (sin configVersion)", () => {
    for (const invalida of [undefined, null, [], {}, "texto"]) {
      const resultCt = buildConfigUsed(CLICK_TARGETS_ACTIVITY_NAME, invalida as never);
      assert.deepEqual(resultCt, CLICK_TARGETS_CONFIG_USED);
      assert.equal(Object.prototype.hasOwnProperty.call(resultCt, "configVersion"), false);

      const resultVm = buildConfigUsed(VISUAL_MEMORY_ACTIVITY_NAME, invalida as never);
      assert.deepEqual(resultVm, VISUAL_MEMORY_CONFIG_USED);
      assert.equal(Object.prototype.hasOwnProperty.call(resultVm, "configVersion"), false);
    }
  });

  test("fallback de click-targets/visual-memory-precision tambien se usa si se envia una config valida de otro ejercicio", () => {
    // validReactionTimeConfig no tiene targetCount/targetColor ni gridSize/stimulusColor
    // - isValidEffectiveConfig lo rechaza para estos dos exerciseId, asi que debe caer al fallback propio.
    const resultCt = buildConfigUsed(CLICK_TARGETS_ACTIVITY_NAME, validReactionTimeConfig);
    assert.deepEqual(resultCt, CLICK_TARGETS_CONFIG_USED);
    const resultVm = buildConfigUsed(VISUAL_MEMORY_ACTIVITY_NAME, validReactionTimeConfig);
    assert.deepEqual(resultVm, VISUAL_MEMORY_CONFIG_USED);
  });
});
