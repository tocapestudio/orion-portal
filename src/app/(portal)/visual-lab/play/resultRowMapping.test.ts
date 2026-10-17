/**
 * Pruebas aisladas de la logica pura de resultRowMapping.ts
 * (buildReactionTimeResultRow/buildSimpleReactionResultRow/
 * buildClickTargetsResultRow/buildVisualMemoryResultRow) - test runner
 * nativo de Node (node:test + node:assert/strict), sin instalar ningun
 * framework. Mismo patron exacto que effectiveConfig.test.ts.
 *
 * Deliberadamente SIN importar nada de actions.ts/Next.js/Supabase - este
 * archivo solo importa ./resultRowMapping.ts (modulo puro) y las
 * utilidades nativas de Node. Ejecutar con:
 *   node --test "src/app/(portal)/visual-lab/play/resultRowMapping.test.ts"
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en
 * effectiveConfig.test.ts: TS5097 - moduleResolution "bundler" rechaza la
 * extension .ts explicita en un import ESTATICO, pero no la comprueba en
 * un import() cuyo specifier no es un string literal). Mismo coste
 * documentado alli: el resultado se tipa como `any` dentro de este
 * archivo.
 *
 * Alcance: la transformacion en memoria de metricas ya validadas a la
 * forma de fila de core.results, MAS la validacion propia de targetLog/
 * roundLog (isValidTargetLog/isValidRoundLog) - la unica comprobacion que
 * existe hoy sobre el contenido de esas dos propiedades de transporte,
 * ya que ni isClickTargetMetrics/isVisualMemoryMetrics (types.ts, con su
 * propio test en types.test.ts) ni el cast de actions.ts las miran nunca.
 * No conecta con Supabase, no toca idempotencia ni persistencia real -
 * eso sigue dependiendo de pruebas funcionales con un entorno Supabase
 * real (ver informes de fases anteriores).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Mismo helper que effectiveConfig.test.ts, para construir variantes de
// `metrics` sin la propiedad de transporte (targetLog/roundLog) sin dejar
// un binding destructurado sin usar.
function omit(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const resultRowMappingPath = "./resultRowMapping" + ".ts";
const {
  buildReactionTimeResultRow,
  buildSimpleReactionResultRow,
  buildClickTargetsResultRow,
  buildVisualMemoryResultRow,
  isValidTargetLog,
  isValidRoundLog,
} = await import(resultRowMappingPath);

const SESSION_ACTIVITY_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

describe("buildReactionTimeResultRow", () => {
  const metrics = {
    reactionTimes: [300, 400, 500],
    correctResponses: 15,
    falseAlarms: 2,
    misses: 1,
    totalTrials: 20,
    accuracyPercent: 85,
  };

  test("mapea las columnas canonicas directamente desde metrics", () => {
    const row = buildReactionTimeResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.session_activity_id, SESSION_ACTIVITY_ID);
    assert.equal(row.source, "manual");
    assert.equal(row.accuracy_percent, metrics.accuracyPercent);
    assert.equal(row.total_trials, metrics.totalTrials);
    assert.equal(row.created_by, USER_ID);
  });

  test("reaction_time_ms es la media (redondeada) de reactionTimes", () => {
    const row = buildReactionTimeResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.reaction_time_ms, 400); // (300+400+500)/3 = 400
  });

  test("reaction_time_ms es null (no 0) si reactionTimes esta vacio", () => {
    const row = buildReactionTimeResultRow(SESSION_ACTIVITY_ID, { ...metrics, reactionTimes: [] }, USER_ID);
    assert.equal(row.reaction_time_ms, null);
  });

  test("errors_count = falseAlarms + misses", () => {
    const row = buildReactionTimeResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.errors_count, 3);
  });

  test("metrics (jsonb) conserva el objeto completo y añade exerciseId='reaction-time'", () => {
    const row = buildReactionTimeResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.metrics, { ...metrics, exerciseId: "reaction-time" });
  });

  test("no tiene columna raw_data (este ejercicio no registra log por ensayo)", () => {
    const row = buildReactionTimeResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal("raw_data" in row, false);
  });
});

describe("buildSimpleReactionResultRow", () => {
  const metrics = {
    totalTrials: 20,
    validTrials: 16,
    omissions: 3,
    falseStarts: 1,
    reactionTimes: [250, 350],
    avgReactionTimeMs: 300,
    minReactionTimeMs: 250,
    maxReactionTimeMs: 350,
    medianReactionTimeMs: 300,
    config: { trialCount: 20, minDelayMs: 1500, maxDelayMs: 3000, stimulusType: "color" as const },
  };

  test("accuracy_percent = validTrials / totalTrials * 100", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.accuracy_percent, 80); // 16/20*100
  });

  test("accuracy_percent es 0 (no NaN) cuando totalTrials es 0", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, { ...metrics, totalTrials: 0, validTrials: 0 }, USER_ID);
    assert.equal(row.accuracy_percent, 0);
  });

  test("reaction_time_ms usa avgReactionTimeMs cuando hubo reactionTimes", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.reaction_time_ms, 300);
  });

  test("reaction_time_ms es null (no 0) si reactionTimes esta vacio", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, { ...metrics, reactionTimes: [] }, USER_ID);
    assert.equal(row.reaction_time_ms, null);
  });

  test("errors_count = omissions + falseStarts (sin mezclar falseAlarms/misses de Go/No Go)", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.errors_count, 4);
  });

  test("total_trials usa metrics.totalTrials directamente", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.total_trials, 20);
  });

  test("metrics (jsonb) conserva el objeto completo y añade exerciseId='simple-reaction'", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.metrics, { ...metrics, exerciseId: "simple-reaction" });
  });

  test("la FORMA de metrics no se solapa con ReactionTimeMetrics (sin correctResponses/falseAlarms/misses)", () => {
    const row = buildSimpleReactionResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal("correctResponses" in row.metrics, false);
    assert.equal("falseAlarms" in row.metrics, false);
    assert.equal("misses" in row.metrics, false);
  });
});

describe("buildClickTargetsResultRow", () => {
  const targetLog = [
    { targetNumber: 1, reactionTimeMs: 400, outcome: "hit" as const },
    { targetNumber: 2, reactionTimeMs: 600, outcome: "miss" as const },
  ];
  const metrics = {
    timesPerTarget: [400, 600],
    totalTimeMs: 1000,
    totalClicks: 2,
    errors: 1,
    hits: 1,
    accuracyPercent: 50,
    targetLog,
  };

  test("mapea las columnas canonicas desde los agregados ya calculados", () => {
    const row = buildClickTargetsResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.accuracy_percent, 50);
    assert.equal(row.total_trials, 2); // totalClicks
    assert.equal(row.errors_count, 1);
    assert.equal(row.created_by, USER_ID);
  });

  test("reaction_time_ms es la media (redondeada) de timesPerTarget", () => {
    const row = buildClickTargetsResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.reaction_time_ms, 500); // (400+600)/2
  });

  test("reaction_time_ms es null si timesPerTarget esta vacio", () => {
    const row = buildClickTargetsResultRow(SESSION_ACTIVITY_ID, { ...metrics, timesPerTarget: [] }, USER_ID);
    assert.equal(row.reaction_time_ms, null);
  });

  test("targetLog se separa de metrics y se guarda tal cual en raw_data", () => {
    const row = buildClickTargetsResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.raw_data, { targetLog });
    assert.equal("targetLog" in row.metrics, false);
  });

  test("metrics (jsonb) conserva los agregados y añade exerciseId='click-targets'", () => {
    const row = buildClickTargetsResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.metrics, { ...omit(metrics, "targetLog"), exerciseId: "click-targets" });
  });

  test("raw_data es null (no {targetLog: undefined}) cuando targetLog esta ausente", () => {
    const row = buildClickTargetsResultRow(SESSION_ACTIVITY_ID, omit(metrics, "targetLog"), USER_ID);
    assert.equal(row.raw_data, null);
  });

  test("lanza un error explicito si targetLog esta presente pero mal formado (en vez de guardarlo o degradarlo a null)", () => {
    assert.throws(
      () => buildClickTargetsResultRow(SESSION_ACTIVITY_ID, { ...metrics, targetLog: [{ targetNumber: 1 }] }, USER_ID),
      /targetLog/
    );
  });

  test("mantiene el formato exacto de raw_data para un targetLog valido (sin cambios respecto al comportamiento anterior)", () => {
    const row = buildClickTargetsResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.raw_data, { targetLog });
  });
});

describe("isValidTargetLog", () => {
  const validElement = { targetNumber: 1, reactionTimeMs: 400, outcome: "hit" };

  test("acepta un array vacio", () => {
    assert.equal(isValidTargetLog([]), true);
  });

  test("acepta un array con elementos bien formados ('hit' y 'miss')", () => {
    assert.equal(
      isValidTargetLog([validElement, { targetNumber: 2, reactionTimeMs: 600, outcome: "miss" }]),
      true
    );
  });

  test("acepta elementos con campos adicionales desconocidos", () => {
    assert.equal(isValidTargetLog([{ ...validElement, somethingElse: "x" }]), true);
  });

  for (const { label, value } of [
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "un string", value: "targetLog" },
    { label: "un numero", value: 42 },
    { label: "un objeto (no array)", value: {} },
  ]) {
    test(`rechaza ${label} en vez de un array`, () => {
      assert.equal(isValidTargetLog(value), false);
    });
  }

  for (const { label, value } of [
    { label: "null", value: null },
    { label: "un string", value: "x" },
    { label: "un numero", value: 1 },
  ]) {
    test(`rechaza un array cuyo elemento es ${label} (no un objeto)`, () => {
      assert.equal(isValidTargetLog([value]), false);
    });
  }

  const requiredFields = ["targetNumber", "reactionTimeMs", "outcome"];
  for (const field of requiredFields) {
    test(`rechaza un elemento sin '${field}'`, () => {
      assert.equal(isValidTargetLog([omit(validElement, field)]), false);
    });
  }

  const wrongTypes: Record<string, unknown> = {
    targetNumber: "1",
    reactionTimeMs: "400",
    outcome: "fail",
  };
  for (const [field, wrongValue] of Object.entries(wrongTypes)) {
    test(`rechaza tipo/valor incorrecto en '${field}'`, () => {
      assert.equal(isValidTargetLog([{ ...validElement, [field]: wrongValue }]), false);
    });
  }

  test("rechaza NaN en targetNumber/reactionTimeMs", () => {
    assert.equal(isValidTargetLog([{ ...validElement, targetNumber: NaN }]), false);
    assert.equal(isValidTargetLog([{ ...validElement, reactionTimeMs: NaN }]), false);
  });

  test("rechaza Infinity/-Infinity en targetNumber/reactionTimeMs", () => {
    assert.equal(isValidTargetLog([{ ...validElement, targetNumber: Infinity }]), false);
    assert.equal(isValidTargetLog([{ ...validElement, reactionTimeMs: -Infinity }]), false);
  });

  test("rechaza outcome con un valor distinto de 'hit'/'miss'", () => {
    assert.equal(isValidTargetLog([{ ...validElement, outcome: "success" }]), false);
  });
});

describe("buildVisualMemoryResultRow", () => {
  const roundLog = [
    {
      roundNumber: 1,
      rows: 4,
      cols: 4,
      patternCount: 5,
      correctSelections: 4,
      incorrectSelections: 1,
      missedTiles: 1,
      accuracyPercent: 80,
      succeeded: false,
    },
  ];
  const metrics = {
    correctSelections: 4,
    incorrectSelections: 1,
    missedTiles: 1,
    accuracyPercent: 80,
    roundsCompleted: 1,
    roundLog,
  };

  test("mapea las columnas canonicas desde los agregados ya calculados", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.accuracy_percent, 80);
    assert.equal(row.created_by, USER_ID);
  });

  test("total_trials = roundsCompleted", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.total_trials, 1);
  });

  test("reaction_time_ms es SIEMPRE null (este ejercicio no mide tiempo de respuesta)", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.reaction_time_ms, null);
  });

  test("errors_count = incorrectSelections + missedTiles", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.equal(row.errors_count, 2);
  });

  test("roundLog se separa de metrics y se guarda tal cual en raw_data", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.raw_data, { roundLog });
    assert.equal("roundLog" in row.metrics, false);
  });

  test("metrics (jsonb) conserva los agregados y añade exerciseId='visual-memory-precision'", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.metrics, { ...omit(metrics, "roundLog"), exerciseId: "visual-memory-precision" });
  });

  test("raw_data es null (no {roundLog: undefined}) cuando roundLog esta ausente", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, omit(metrics, "roundLog"), USER_ID);
    assert.equal(row.raw_data, null);
  });

  test("lanza un error explicito si roundLog esta presente pero mal formado (en vez de guardarlo o degradarlo a null)", () => {
    assert.throws(
      () => buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, { ...metrics, roundLog: [{ roundNumber: 1 }] }, USER_ID),
      /roundLog/
    );
  });

  test("mantiene el formato exacto de raw_data para un roundLog valido (sin cambios respecto al comportamiento anterior)", () => {
    const row = buildVisualMemoryResultRow(SESSION_ACTIVITY_ID, metrics, USER_ID);
    assert.deepEqual(row.raw_data, { roundLog });
  });
});

describe("isValidRoundLog", () => {
  const validElement = {
    roundNumber: 1,
    rows: 4,
    cols: 4,
    patternCount: 5,
    correctSelections: 4,
    incorrectSelections: 1,
    missedTiles: 1,
    accuracyPercent: 80,
    succeeded: false,
  };

  test("acepta un array vacio", () => {
    assert.equal(isValidRoundLog([]), true);
  });

  test("acepta un array con elementos bien formados (succeeded true y false)", () => {
    assert.equal(isValidRoundLog([validElement, { ...validElement, roundNumber: 2, succeeded: true }]), true);
  });

  test("acepta elementos con campos adicionales desconocidos", () => {
    assert.equal(isValidRoundLog([{ ...validElement, somethingElse: "x" }]), true);
  });

  for (const { label, value } of [
    { label: "null", value: null },
    { label: "undefined", value: undefined },
    { label: "un string", value: "roundLog" },
    { label: "un numero", value: 42 },
    { label: "un objeto (no array)", value: {} },
  ]) {
    test(`rechaza ${label} en vez de un array`, () => {
      assert.equal(isValidRoundLog(value), false);
    });
  }

  for (const { label, value } of [
    { label: "null", value: null },
    { label: "un string", value: "x" },
    { label: "un numero", value: 1 },
  ]) {
    test(`rechaza un array cuyo elemento es ${label} (no un objeto)`, () => {
      assert.equal(isValidRoundLog([value]), false);
    });
  }

  const requiredFields = [
    "roundNumber",
    "rows",
    "cols",
    "patternCount",
    "correctSelections",
    "incorrectSelections",
    "missedTiles",
    "accuracyPercent",
    "succeeded",
  ];
  for (const field of requiredFields) {
    test(`rechaza un elemento sin '${field}'`, () => {
      assert.equal(isValidRoundLog([omit(validElement, field)]), false);
    });
  }

  const wrongTypes: Record<string, unknown> = {
    roundNumber: "1",
    rows: "4",
    cols: "4",
    patternCount: "5",
    correctSelections: "4",
    incorrectSelections: "1",
    missedTiles: "1",
    accuracyPercent: "80",
    succeeded: "false",
  };
  for (const [field, wrongValue] of Object.entries(wrongTypes)) {
    test(`rechaza tipo incorrecto en '${field}'`, () => {
      assert.equal(isValidRoundLog([{ ...validElement, [field]: wrongValue }]), false);
    });
  }

  const numericFields = [
    "roundNumber",
    "rows",
    "cols",
    "patternCount",
    "correctSelections",
    "incorrectSelections",
    "missedTiles",
    "accuracyPercent",
  ];
  for (const field of numericFields) {
    test(`rechaza NaN en '${field}'`, () => {
      assert.equal(isValidRoundLog([{ ...validElement, [field]: NaN }]), false);
    });
    test(`rechaza Infinity en '${field}'`, () => {
      assert.equal(isValidRoundLog([{ ...validElement, [field]: Infinity }]), false);
    });
  }
});
