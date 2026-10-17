/**
 * Pruebas aisladas de los 4 validadores de metricas que de verdad hacen
 * de puerta de entrada a la persistencia (isReactionTimeMetrics/
 * isSimpleReactionMetrics/isClickTargetMetrics/isVisualMemoryMetrics,
 * todos definidos aqui en types.ts) - test runner nativo de Node
 * (node:test + node:assert/strict), mismo patron exacto que
 * effectiveConfig.test.ts/resultRowMapping.test.ts.
 *
 * Por que AQUI y no en visual-lab/play/: submitPlayAttempt
 * (visual-lab/play/actions.ts) importa estos 4 guards literalmente desde
 * "@/components/orionPlay/types" (confirmado leyendo actions.ts), no los
 * redefine - este archivo (types.ts) es su unica fuente real, y no tiene
 * ningun import propio (confirmado), asi que es seguro probarlo
 * directamente sin ninguna extraccion. Existe un SEGUNDO conjunto de 4
 * guards con el mismo nombre en components/orionPlayV2/lib/types.ts
 * (copia para Milestone 2) - deliberadamente NO se prueba aqui: actions.ts
 * no los usa para decidir si persiste o no (los usa solo
 * ResultSummary.tsx de orionPlayV2, para elegir que renderer de
 * resultados mostrar, un uso de UI, no de fiabilidad de persistencia).
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en
 * effectiveConfig.test.ts: TS5097 - moduleResolution "bundler" rechaza la
 * extension .ts explicita en un import ESTATICO; un import() cuyo
 * specifier no es un string literal no se resuelve/comprueba en tiempo de
 * compilacion). Mismo coste ya documentado alli: el resultado se tipa
 * como `any` dentro de este archivo.
 *
 * Alcance: el contrato ENDURECIDO de los 4 guards (tras un analisis
 * estatico previo de los 4 ejercicios reales) - ahora exigen
 * `Number.isFinite` en todos los campos numericos que ya validaban (nunca
 * NaN/Infinity/-Infinity), que los elementos de `reactionTimes`/
 * `timesPerTarget` sean numeros finitos (array vacio sigue siendo valido:
 * ejecucion interrumpida sin ninguna respuesta/clic), y que
 * `isSimpleReactionMetrics` exija `config` con su forma real
 * (trialCount/minDelayMs/maxDelayMs numericos finitos, stimulusType
 * 'color'|'shape'). Deliberadamente NO se valida aqui `targetLog`/
 * `roundLog` (arrays de OBJETOS, no de numeros - fuera de alcance de este
 * cambio) ni se añade ninguna restriccion de rango/relacion entre campos
 * que el contrato existente no respalde ya. No conecta con Supabase, no
 * crea datos de prueba persistentes, no toca config_used/raw_data (eso ya
 * lo cubre resultRowMapping.test.ts).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

function omit(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}

const typesPath = "./types" + ".ts";
const {
  isReactionTimeMetrics,
  isSimpleReactionMetrics,
  isClickTargetMetrics,
  isVisualMemoryMetrics,
} = await import(typesPath);

// Primitivos/formas comunes que ningun guard deberia aceptar nunca -
// reutilizados en los 4 describe de abajo.
const NON_OBJECT_VALUES: Array<{ label: string; value: unknown }> = [
  { label: "undefined", value: undefined },
  { label: "null", value: null },
  { label: "un string", value: "metrics" },
  { label: "un numero", value: 42 },
  { label: "un boolean", value: true },
];

describe("isReactionTimeMetrics", () => {
  const valid = {
    reactionTimes: [300, 450, 600],
    correctResponses: 15,
    falseAlarms: 2,
    misses: 1,
    totalTrials: 20,
    accuracyPercent: 85,
  };

  test("acepta metricas validas completas", () => {
    assert.equal(isReactionTimeMetrics(valid), true);
  });

  test("acepta con campos extra desconocidos (el guard es permisivo, no exige forma exacta)", () => {
    assert.equal(isReactionTimeMetrics({ ...valid, exerciseId: "reaction-time", somethingElse: 1 }), true);
  });

  test("acepta reactionTimes vacio (Array.isArray no exige longitud minima)", () => {
    assert.equal(isReactionTimeMetrics({ ...valid, reactionTimes: [] }), true);
  });

  for (const { label, value } of NON_OBJECT_VALUES) {
    test(`rechaza ${label}`, () => {
      assert.equal(isReactionTimeMetrics(value), false);
    });
  }

  test("rechaza un array vacio como objeto raiz", () => {
    assert.equal(isReactionTimeMetrics([]), false);
  });

  test("rechaza un objeto vacio", () => {
    assert.equal(isReactionTimeMetrics({}), false);
  });

  const requiredFields = ["reactionTimes", "correctResponses", "falseAlarms", "misses", "totalTrials", "accuracyPercent"];
  for (const field of requiredFields) {
    test(`rechaza si falta '${field}'`, () => {
      assert.equal(isReactionTimeMetrics(omit(valid, field)), false);
    });
  }

  const wrongTypes: Record<string, unknown> = {
    reactionTimes: "no-es-un-array",
    correctResponses: "15",
    falseAlarms: "2",
    misses: null,
    totalTrials: [20],
    accuracyPercent: true,
  };
  for (const [field, wrongValue] of Object.entries(wrongTypes)) {
    test(`rechaza tipo incorrecto en '${field}'`, () => {
      assert.equal(isReactionTimeMetrics({ ...valid, [field]: wrongValue }), false);
    });
  }

  test("rechaza reactionTimes con elementos no numericos", () => {
    assert.equal(isReactionTimeMetrics({ ...valid, reactionTimes: ["no-numerico", null, {}] }), false);
  });

  test("rechaza reactionTimes con elementos numericos no finitos (NaN/Infinity/-Infinity)", () => {
    assert.equal(isReactionTimeMetrics({ ...valid, reactionTimes: [300, NaN] }), false);
    assert.equal(isReactionTimeMetrics({ ...valid, reactionTimes: [300, Infinity] }), false);
    assert.equal(isReactionTimeMetrics({ ...valid, reactionTimes: [300, -Infinity] }), false);
  });

  const numericFields = ["correctResponses", "falseAlarms", "misses", "totalTrials", "accuracyPercent"];
  for (const field of numericFields) {
    test(`rechaza NaN en '${field}'`, () => {
      assert.equal(isReactionTimeMetrics({ ...valid, [field]: NaN }), false);
    });
    test(`rechaza Infinity en '${field}'`, () => {
      assert.equal(isReactionTimeMetrics({ ...valid, [field]: Infinity }), false);
    });
  }

  test("rechaza una SimpleReactionMetrics valida (las formas no se solapan: le faltan correctResponses/falseAlarms/misses)", () => {
    const validSimpleReaction = {
      totalTrials: 20,
      validTrials: 16,
      omissions: 3,
      falseStarts: 1,
      reactionTimes: [250, 350],
      avgReactionTimeMs: 300,
      minReactionTimeMs: 250,
      maxReactionTimeMs: 350,
      medianReactionTimeMs: 300,
      config: { trialCount: 20, minDelayMs: 1500, maxDelayMs: 3000, stimulusType: "color" },
    };
    assert.equal(isReactionTimeMetrics(validSimpleReaction), false);
  });
});

describe("isSimpleReactionMetrics", () => {
  const valid = {
    totalTrials: 20,
    validTrials: 16,
    omissions: 3,
    falseStarts: 1,
    reactionTimes: [250, 350],
    avgReactionTimeMs: 300,
    minReactionTimeMs: 250,
    maxReactionTimeMs: 350,
    medianReactionTimeMs: 300,
    config: { trialCount: 20, minDelayMs: 1500, maxDelayMs: 3000, stimulusType: "color" },
  };

  test("acepta metricas validas completas (con config)", () => {
    assert.equal(isSimpleReactionMetrics(valid), true);
  });

  test("rechaza si falta 'config' (ahora exigido, igual que lo declara el tipo SimpleReactionMetrics)", () => {
    assert.equal(isSimpleReactionMetrics(omit(valid, "config")), false);
  });

  test("acepta con stimulusType='shape' (la otra opcion valida del tipo existente)", () => {
    assert.equal(
      isSimpleReactionMetrics({ ...valid, config: { ...valid.config, stimulusType: "shape" } }),
      true
    );
  });

  for (const { label, badConfig } of [
    { label: "config no es un objeto (string)", badConfig: "no-config" },
    { label: "config es null", badConfig: null },
    { label: "config es un array", badConfig: [valid.config] },
    { label: "config vacio", badConfig: {} },
    { label: "config sin trialCount", badConfig: omit(valid.config, "trialCount") },
    { label: "config sin minDelayMs", badConfig: omit(valid.config, "minDelayMs") },
    { label: "config sin maxDelayMs", badConfig: omit(valid.config, "maxDelayMs") },
    { label: "config sin stimulusType", badConfig: omit(valid.config, "stimulusType") },
    { label: "config.trialCount con tipo incorrecto", badConfig: { ...valid.config, trialCount: "20" } },
    { label: "config.minDelayMs con tipo incorrecto", badConfig: { ...valid.config, minDelayMs: "1500" } },
    { label: "config.maxDelayMs con tipo incorrecto", badConfig: { ...valid.config, maxDelayMs: null } },
    { label: "config.trialCount NaN", badConfig: { ...valid.config, trialCount: NaN } },
    { label: "config.minDelayMs Infinity", badConfig: { ...valid.config, minDelayMs: Infinity } },
    { label: "config.stimulusType con un valor no permitido", badConfig: { ...valid.config, stimulusType: "sound" } },
    { label: "config.stimulusType con tipo incorrecto", badConfig: { ...valid.config, stimulusType: 1 } },
  ]) {
    test(`rechaza ${label}`, () => {
      assert.equal(isSimpleReactionMetrics({ ...valid, config: badConfig }), false);
    });
  }

  test("acepta con campos extra desconocidos", () => {
    assert.equal(isSimpleReactionMetrics({ ...valid, exerciseId: "simple-reaction" }), true);
  });

  test("acepta reactionTimes vacio", () => {
    assert.equal(isSimpleReactionMetrics({ ...valid, reactionTimes: [] }), true);
  });

  for (const { label, value } of NON_OBJECT_VALUES) {
    test(`rechaza ${label}`, () => {
      assert.equal(isSimpleReactionMetrics(value), false);
    });
  }

  test("rechaza un array vacio como objeto raiz", () => {
    assert.equal(isSimpleReactionMetrics([]), false);
  });

  test("rechaza un objeto vacio", () => {
    assert.equal(isSimpleReactionMetrics({}), false);
  });

  // 'config' deliberadamente excluido de esta lista de campos PLANOS: su
  // ausencia/forma incorrecta ya se prueba en el bloque dedicado de arriba
  // (es un objeto anidado, no un campo plano comprobado con isFiniteNumber/
  // Array.isArray como el resto).
  const requiredFields = [
    "totalTrials",
    "validTrials",
    "omissions",
    "falseStarts",
    "reactionTimes",
    "avgReactionTimeMs",
    "minReactionTimeMs",
    "maxReactionTimeMs",
    "medianReactionTimeMs",
  ];
  for (const field of requiredFields) {
    test(`rechaza si falta '${field}'`, () => {
      assert.equal(isSimpleReactionMetrics(omit(valid, field)), false);
    });
  }

  const wrongTypes: Record<string, unknown> = {
    totalTrials: "20",
    validTrials: "16",
    omissions: null,
    falseStarts: [1],
    reactionTimes: 250,
    avgReactionTimeMs: "300",
    minReactionTimeMs: "250",
    maxReactionTimeMs: "350",
    medianReactionTimeMs: "300",
  };
  for (const [field, wrongValue] of Object.entries(wrongTypes)) {
    test(`rechaza tipo incorrecto en '${field}'`, () => {
      assert.equal(isSimpleReactionMetrics({ ...valid, [field]: wrongValue }), false);
    });
  }

  test("rechaza reactionTimes con elementos no numericos", () => {
    assert.equal(isSimpleReactionMetrics({ ...valid, reactionTimes: ["x", false] }), false);
  });

  test("rechaza reactionTimes con elementos numericos no finitos (NaN/Infinity/-Infinity)", () => {
    assert.equal(isSimpleReactionMetrics({ ...valid, reactionTimes: [250, NaN] }), false);
    assert.equal(isSimpleReactionMetrics({ ...valid, reactionTimes: [250, Infinity] }), false);
    assert.equal(isSimpleReactionMetrics({ ...valid, reactionTimes: [250, -Infinity] }), false);
  });

  const numericFields = [
    "totalTrials",
    "validTrials",
    "omissions",
    "falseStarts",
    "avgReactionTimeMs",
    "minReactionTimeMs",
    "maxReactionTimeMs",
    "medianReactionTimeMs",
  ];
  for (const field of numericFields) {
    test(`rechaza NaN en '${field}'`, () => {
      assert.equal(isSimpleReactionMetrics({ ...valid, [field]: NaN }), false);
    });
    test(`rechaza Infinity en '${field}'`, () => {
      assert.equal(isSimpleReactionMetrics({ ...valid, [field]: Infinity }), false);
    });
  }

  test("rechaza una ReactionTimeMetrics valida (las formas no se solapan: le faltan validTrials/omissions/falseStarts)", () => {
    const validReactionTime = {
      reactionTimes: [300, 450, 600],
      correctResponses: 15,
      falseAlarms: 2,
      misses: 1,
      totalTrials: 20,
      accuracyPercent: 85,
    };
    assert.equal(isSimpleReactionMetrics(validReactionTime), false);
  });
});

describe("isClickTargetMetrics", () => {
  const valid = {
    timesPerTarget: [400, 600],
    totalTimeMs: 1000,
    totalClicks: 2,
    errors: 1,
  };

  test("acepta metricas validas completas (forma V1 minima)", () => {
    assert.equal(isClickTargetMetrics(valid), true);
  });

  // Forma REAL que envia ClickTargetsExercise.tsx/actions.ts en
  // produccion (orionPlayV2, campos aditivos hits/accuracyPercent y el
  // log de transporte targetLog) - submitPlayAttempt valida el objeto
  // completo con este guard V1 antes de mapearlo: debe aceptarlo, los
  // campos aditivos no rompen el guard (ver comentario de
  // ClickTargetMetrics en orionPlayV2/lib/types.ts).
  test("acepta la forma extendida real de orionPlayV2 (hits/accuracyPercent/targetLog aditivos)", () => {
    assert.equal(
      isClickTargetMetrics({
        ...valid,
        hits: 1,
        accuracyPercent: 50,
        targetLog: [{ targetNumber: 1, reactionTimeMs: 400, outcome: "hit" }],
      }),
      true
    );
  });

  test("acepta timesPerTarget vacio", () => {
    assert.equal(isClickTargetMetrics({ ...valid, timesPerTarget: [] }), true);
  });

  for (const { label, value } of NON_OBJECT_VALUES) {
    test(`rechaza ${label}`, () => {
      assert.equal(isClickTargetMetrics(value), false);
    });
  }

  test("rechaza un array vacio como objeto raiz", () => {
    assert.equal(isClickTargetMetrics([]), false);
  });

  test("rechaza un objeto vacio", () => {
    assert.equal(isClickTargetMetrics({}), false);
  });

  const requiredFields = ["timesPerTarget", "totalTimeMs", "totalClicks", "errors"];
  for (const field of requiredFields) {
    test(`rechaza si falta '${field}'`, () => {
      assert.equal(isClickTargetMetrics(omit(valid, field)), false);
    });
  }

  const wrongTypes: Record<string, unknown> = {
    timesPerTarget: "no-es-un-array",
    totalTimeMs: "1000",
    totalClicks: null,
    errors: [1],
  };
  for (const [field, wrongValue] of Object.entries(wrongTypes)) {
    test(`rechaza tipo incorrecto en '${field}'`, () => {
      assert.equal(isClickTargetMetrics({ ...valid, [field]: wrongValue }), false);
    });
  }

  test("rechaza timesPerTarget con elementos no numericos", () => {
    assert.equal(isClickTargetMetrics({ ...valid, timesPerTarget: ["x", null] }), false);
  });

  test("rechaza timesPerTarget con elementos numericos no finitos (NaN/Infinity/-Infinity)", () => {
    assert.equal(isClickTargetMetrics({ ...valid, timesPerTarget: [400, NaN] }), false);
    assert.equal(isClickTargetMetrics({ ...valid, timesPerTarget: [400, Infinity] }), false);
    assert.equal(isClickTargetMetrics({ ...valid, timesPerTarget: [400, -Infinity] }), false);
  });

  const numericFields = ["totalTimeMs", "totalClicks", "errors"];
  for (const field of numericFields) {
    test(`rechaza NaN en '${field}'`, () => {
      assert.equal(isClickTargetMetrics({ ...valid, [field]: NaN }), false);
    });
    test(`rechaza Infinity en '${field}'`, () => {
      assert.equal(isClickTargetMetrics({ ...valid, [field]: Infinity }), false);
    });
  }

  test("rechaza una VisualMemoryMetrics valida (las formas no se solapan)", () => {
    const validVisualMemory = {
      correctSelections: 4,
      incorrectSelections: 1,
      missedTiles: 1,
      accuracyPercent: 80,
    };
    assert.equal(isClickTargetMetrics(validVisualMemory), false);
  });
});

describe("isVisualMemoryMetrics", () => {
  const valid = {
    correctSelections: 4,
    incorrectSelections: 1,
    missedTiles: 1,
    accuracyPercent: 80,
  };

  test("acepta metricas validas completas (forma V1 minima)", () => {
    assert.equal(isVisualMemoryMetrics(valid), true);
  });

  // Forma REAL que envia VisualMemoryExercise.tsx/actions.ts en
  // produccion (campo aditivo roundsCompleted y el log de transporte
  // roundLog) - mismo razonamiento que el test equivalente de
  // isClickTargetMetrics arriba.
  test("acepta la forma extendida real de orionPlayV2 (roundsCompleted/roundLog aditivos)", () => {
    assert.equal(
      isVisualMemoryMetrics({
        ...valid,
        roundsCompleted: 1,
        roundLog: [{ roundNumber: 1, rows: 4, cols: 4, patternCount: 5, correctSelections: 4, incorrectSelections: 1, missedTiles: 1, accuracyPercent: 80, succeeded: false }],
      }),
      true
    );
  });

  for (const { label, value } of NON_OBJECT_VALUES) {
    test(`rechaza ${label}`, () => {
      assert.equal(isVisualMemoryMetrics(value), false);
    });
  }

  test("rechaza un array vacio como objeto raiz", () => {
    assert.equal(isVisualMemoryMetrics([]), false);
  });

  test("rechaza un objeto vacio", () => {
    assert.equal(isVisualMemoryMetrics({}), false);
  });

  const requiredFields = ["correctSelections", "incorrectSelections", "missedTiles", "accuracyPercent"];
  for (const field of requiredFields) {
    test(`rechaza si falta '${field}'`, () => {
      assert.equal(isVisualMemoryMetrics(omit(valid, field)), false);
    });
  }

  const wrongTypes: Record<string, unknown> = {
    correctSelections: "4",
    incorrectSelections: null,
    missedTiles: [1],
    accuracyPercent: "80",
  };
  for (const [field, wrongValue] of Object.entries(wrongTypes)) {
    test(`rechaza tipo incorrecto en '${field}'`, () => {
      assert.equal(isVisualMemoryMetrics({ ...valid, [field]: wrongValue }), false);
    });
  }

  const numericFields = ["correctSelections", "incorrectSelections", "missedTiles", "accuracyPercent"];
  for (const field of numericFields) {
    test(`rechaza NaN en '${field}' (este guard no tiene ningun campo de tipo array que probar)`, () => {
      assert.equal(isVisualMemoryMetrics({ ...valid, [field]: NaN }), false);
    });
    test(`rechaza Infinity en '${field}'`, () => {
      assert.equal(isVisualMemoryMetrics({ ...valid, [field]: Infinity }), false);
    });
  }

  test("rechaza una ClickTargetMetrics valida (las formas no se solapan)", () => {
    const validClickTargets = {
      timesPerTarget: [400, 600],
      totalTimeMs: 1000,
      totalClicks: 2,
      errors: 1,
    };
    assert.equal(isVisualMemoryMetrics(validClickTargets), false);
  });
});
