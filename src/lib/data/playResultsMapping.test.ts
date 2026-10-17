/**
 * Pruebas aisladas de la logica pura de playResultsMapping.ts
 * (mapPlayResultRow/groupResultsByExercise/getExerciseRecord) - test
 * runner nativo de Node (node:test + node:assert/strict), mismo patron
 * exacto que effectiveConfig.test.ts/resultRowMapping.test.ts/types.test.ts.
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en los
 * otros archivos de test de este proyecto: TS5097).
 *
 * Alcance: solo la transformacion/agregacion en memoria de resultados ya
 * leidos - no conecta con Supabase, no ejecuta ninguna consulta, no
 * valida RLS ni autenticacion (eso vive en playResults.ts y no es
 * testeable con node:test, mismas razones ya documentadas para
 * actions.ts en este proyecto).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const mappingPath = "./playResultsMapping" + ".ts";
const { mapPlayResultRow, groupResultsByExercise, getExerciseRecord, getExerciseRecordBreakdown } =
  await import(mappingPath);

const BASE_ROW = {
  id: "11111111-1111-1111-1111-111111111111",
  generated_at: "2026-10-13T10:00:00.000Z",
  accuracy_percent: 85,
  total_trials: 20,
  reaction_time_ms: 400,
  errors_count: 3,
  metrics: { exerciseId: "reaction-time", accuracyPercent: 85 },
  raw_data: null,
};

// ============ mapPlayResultRow ============

describe("mapPlayResultRow", () => {
  test("mapea las columnas canonicas sin transformarlas", () => {
    const result = mapPlayResultRow(BASE_ROW, null);
    assert.equal(result.id, BASE_ROW.id);
    assert.equal(result.generatedAt, BASE_ROW.generated_at);
    assert.equal(result.accuracyPercent, 85);
    assert.equal(result.totalTrials, 20);
    assert.equal(result.reactionTimeMs, 400);
    assert.equal(result.errorsCount, 3);
  });

  test("extrae exerciseId de metrics.exerciseId (nunca de activity_catalog_id)", () => {
    assert.equal(mapPlayResultRow(BASE_ROW, null).exerciseId, "reaction-time");
  });

  test("exerciseId es null si metrics no lleva ese campo o no es un objeto (defensivo)", () => {
    for (const malformed of [{ accuracyPercent: 85 }, null, undefined, "x", 42, []]) {
      const row = { ...BASE_ROW, metrics: malformed };
      assert.equal(mapPlayResultRow(row, null).exerciseId, null);
    }
  });

  test("conserva el objeto metrics completo tal cual", () => {
    assert.deepEqual(mapPlayResultRow(BASE_ROW, null).metrics, BASE_ROW.metrics);
  });

  test("configUsed se reenvia tal cual, incluido null", () => {
    const config = { maxTrials: 20, goColor: "#22c55e" };
    assert.deepEqual(mapPlayResultRow(BASE_ROW, config).configUsed, config);
    assert.equal(mapPlayResultRow(BASE_ROW, null).configUsed, null);
  });

  test("targetLog/roundLog son null cuando raw_data es null", () => {
    const result = mapPlayResultRow(BASE_ROW, null);
    assert.equal(result.targetLog, null);
    assert.equal(result.roundLog, null);
  });

  test("targetLog/roundLog son null cuando raw_data no tiene ninguno de los dos", () => {
    const row = { ...BASE_ROW, raw_data: { somethingElse: [1, 2, 3] } };
    const result = mapPlayResultRow(row, null);
    assert.equal(result.targetLog, null);
    assert.equal(result.roundLog, null);
  });

  test("targetLog se extrae y valida cuando tiene la forma esperada (Click Targets)", () => {
    const targetLog = [
      { targetNumber: 1, reactionTimeMs: 400, outcome: "hit" },
      { targetNumber: 2, reactionTimeMs: 600, outcome: "miss" },
    ];
    const row = { ...BASE_ROW, metrics: { exerciseId: "click-targets" }, raw_data: { targetLog } };
    assert.deepEqual(mapPlayResultRow(row, null).targetLog, targetLog);
  });

  test("targetLog es null (no se confia) si algun elemento no tiene la forma esperada", () => {
    const row = {
      ...BASE_ROW,
      raw_data: { targetLog: [{ targetNumber: 1, reactionTimeMs: 400, outcome: "hit" }, { targetNumber: 2 }] },
    };
    assert.equal(mapPlayResultRow(row, null).targetLog, null);
  });

  test("un targetLog vacio es un array real, distinto de null (hubo ejecucion, 0 clics)", () => {
    const row = { ...BASE_ROW, raw_data: { targetLog: [] } };
    assert.deepEqual(mapPlayResultRow(row, null).targetLog, []);
  });

  test("roundLog se extrae y valida cuando tiene la forma esperada (Visual Memory)", () => {
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
    const row = { ...BASE_ROW, metrics: { exerciseId: "visual-memory-precision" }, raw_data: { roundLog } };
    assert.deepEqual(mapPlayResultRow(row, null).roundLog, roundLog);
  });

  test("roundLog es null si falta un campo obligatorio en algun elemento", () => {
    const row = { ...BASE_ROW, raw_data: { roundLog: [{ roundNumber: 1, rows: 4 }] } };
    assert.equal(mapPlayResultRow(row, null).roundLog, null);
  });

  test("acepta columnas canonicas nulas (esquema real nullable)", () => {
    const row = { ...BASE_ROW, accuracy_percent: null, total_trials: null, reaction_time_ms: null, errors_count: null };
    const result = mapPlayResultRow(row, null);
    assert.equal(result.accuracyPercent, null);
    assert.equal(result.totalTrials, null);
    assert.equal(result.reactionTimeMs, null);
    assert.equal(result.errorsCount, null);
  });
});

// ============ groupResultsByExercise ============

function makeResult(overrides: Record<string, unknown>) {
  return {
    id: "r",
    generatedAt: "2026-01-01T00:00:00.000Z",
    exerciseId: "reaction-time",
    accuracyPercent: 80,
    totalTrials: 20,
    reactionTimeMs: 400,
    errorsCount: 2,
    metrics: {},
    configUsed: null,
    targetLog: null,
    roundLog: null,
    ...overrides,
  };
}

describe("groupResultsByExercise", () => {
  test("agrupa por exerciseId, no por ningun otro campo", () => {
    const results = [
      makeResult({ id: "a", exerciseId: "reaction-time" }),
      makeResult({ id: "b", exerciseId: "simple-reaction" }),
      makeResult({ id: "c", exerciseId: "reaction-time" }),
    ];
    const groups = groupResultsByExercise(results);
    assert.equal(groups.length, 2);
    const rt = groups.find((g: { exerciseId: string }) => g.exerciseId === "reaction-time");
    assert.equal(rt.results.length, 2);
  });

  test("excluye resultados sin exerciseId identificable (nunca inventa un grupo 'desconocido')", () => {
    const results = [makeResult({ id: "a", exerciseId: null }), makeResult({ id: "b", exerciseId: "click-targets" })];
    const groups = groupResultsByExercise(results);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].exerciseId, "click-targets");
  });

  test("solo incluye ejercicios con al menos un resultado - no rellena los 4 del catalogo", () => {
    const groups = groupResultsByExercise([makeResult({ exerciseId: "click-targets" })]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].exerciseId, "click-targets");
  });

  test("dentro de cada grupo, ordena los resultados del mas reciente al mas antiguo", () => {
    const results = [
      makeResult({ id: "old", generatedAt: "2026-01-01T00:00:00.000Z" }),
      makeResult({ id: "new", generatedAt: "2026-06-01T00:00:00.000Z" }),
      makeResult({ id: "mid", generatedAt: "2026-03-01T00:00:00.000Z" }),
    ];
    const groups = groupResultsByExercise(results);
    assert.deepEqual(
      groups[0].results.map((r: { id: string }) => r.id),
      ["new", "mid", "old"]
    );
  });

  test("ordena los GRUPOS por la ejecucion mas reciente de cada uno, de mas a menos reciente", () => {
    const results = [
      makeResult({ id: "a", exerciseId: "reaction-time", generatedAt: "2026-01-01T00:00:00.000Z" }),
      makeResult({ id: "b", exerciseId: "click-targets", generatedAt: "2026-06-01T00:00:00.000Z" }),
    ];
    const groups = groupResultsByExercise(results);
    assert.deepEqual(
      groups.map((g: { exerciseId: string }) => g.exerciseId),
      ["click-targets", "reaction-time"]
    );
  });

  test("array vacio produce 0 grupos", () => {
    assert.deepEqual(groupResultsByExercise([]), []);
  });
});

// ============ getExerciseRecord ============

describe("getExerciseRecord — simple-reaction (menor media de reaccion valida)", () => {
  test("elige la sesion con menor reactionTimeMs entre las que cumplen el minimo de intentos validos", () => {
    const results = [
      makeResult({ id: "slow", exerciseId: "simple-reaction", reactionTimeMs: 400, metrics: { validTrials: 10 } }),
      makeResult({ id: "fast", exerciseId: "simple-reaction", reactionTimeMs: 300, metrics: { validTrials: 8 } }),
    ];
    const record = getExerciseRecord("simple-reaction", results);
    assert.equal(record.result.id, "fast");
    assert.match(record.headline, /300 ms/);
  });

  test("descarta sesiones con pocos intentos validos (no comparables) aunque sean 'rapidas'", () => {
    const results = [
      makeResult({ id: "lucky", exerciseId: "simple-reaction", reactionTimeMs: 100, metrics: { validTrials: 1 } }),
      makeResult({ id: "real", exerciseId: "simple-reaction", reactionTimeMs: 350, metrics: { validTrials: 18 } }),
    ];
    const record = getExerciseRecord("simple-reaction", results);
    assert.equal(record.result.id, "real");
  });

  test("devuelve null si ninguna sesion tiene datos suficientes", () => {
    const results = [makeResult({ exerciseId: "simple-reaction", reactionTimeMs: 100, metrics: { validTrials: 1 } })];
    assert.equal(getExerciseRecord("simple-reaction", results), null);
  });
});

describe("getExerciseRecord — reaction-time (precision primero, tiempo solo desempata)", () => {
  test("una sesion mas precisa gana aunque sea mas lenta", () => {
    const results = [
      makeResult({ id: "fast-sloppy", exerciseId: "reaction-time", accuracyPercent: 70, reactionTimeMs: 250 }),
      makeResult({ id: "slow-precise", exerciseId: "reaction-time", accuracyPercent: 95, reactionTimeMs: 450 }),
    ];
    const record = getExerciseRecord("reaction-time", results);
    assert.equal(record.result.id, "slow-precise");
  });

  test("entre sesiones de igual precision maxima, el tiempo de reaccion desempata", () => {
    const results = [
      makeResult({ id: "a", exerciseId: "reaction-time", accuracyPercent: 90, reactionTimeMs: 400 }),
      makeResult({ id: "b", exerciseId: "reaction-time", accuracyPercent: 90, reactionTimeMs: 300 }),
    ];
    const record = getExerciseRecord("reaction-time", results);
    assert.equal(record.result.id, "b");
  });

  test("devuelve null si ninguna sesion tiene accuracyPercent", () => {
    const results = [makeResult({ exerciseId: "reaction-time", accuracyPercent: null })];
    assert.equal(getExerciseRecord("reaction-time", results), null);
  });
});

describe("getExerciseRecord — click-targets (precision primero, tiempo total solo si comparable)", () => {
  test("usa el tiempo total para desempatar cuando el numero de intentos coincide", () => {
    const results = [
      makeResult({ id: "a", exerciseId: "click-targets", accuracyPercent: 90, totalTrials: 15, metrics: { totalTimeMs: 9000 } }),
      makeResult({ id: "b", exerciseId: "click-targets", accuracyPercent: 90, totalTrials: 15, metrics: { totalTimeMs: 7000 } }),
    ];
    const record = getExerciseRecord("click-targets", results);
    assert.equal(record.result.id, "b");
  });

  test("NO usa el tiempo total si el numero de intentos no coincide (no comparable)", () => {
    const results = [
      makeResult({ id: "a", exerciseId: "click-targets", accuracyPercent: 90, totalTrials: 10, metrics: { totalTimeMs: 3000 } }),
      makeResult({ id: "b", exerciseId: "click-targets", accuracyPercent: 90, totalTrials: 30, metrics: { totalTimeMs: 20000 } }),
    ];
    const record = getExerciseRecord("click-targets", results);
    // Sin criterio de desempate fiable: se queda con el primero del empate, no con el de menor tiempo bruto.
    assert.equal(record.result.id, "a");
  });
});

describe("getExerciseRecord — visual-memory-precision (precision primero, rondas desempata)", () => {
  test("a igual precision, mas rondas completadas gana", () => {
    const results = [
      makeResult({ id: "fewer", exerciseId: "visual-memory-precision", accuracyPercent: 85, totalTrials: 3 }),
      makeResult({ id: "more", exerciseId: "visual-memory-precision", accuracyPercent: 85, totalTrials: 6 }),
    ];
    const record = getExerciseRecord("visual-memory-precision", results);
    assert.equal(record.result.id, "more");
  });
});

describe("getExerciseRecord — ejercicio desconocido", () => {
  test("devuelve null para cualquier exerciseId fuera de los 4 conocidos", () => {
    assert.equal(getExerciseRecord("unknown-exercise", [makeResult({})]), null);
  });
});

// ============ getExerciseRecordBreakdown ============

function byLabel(entries: { label: string; value: string }[], label: string) {
  return entries.find((e) => e.label === label);
}

describe("getExerciseRecordBreakdown — reaction-time/simple-reaction (3 indicadores independientes)", () => {
  test("distingue 'Mejor media de sesión' de 'Intento más rápido' (indicadores distintos, nunca confundidos)", () => {
    const results = [
      makeResult({
        id: "a",
        exerciseId: "simple-reaction",
        reactionTimeMs: 300,
        accuracyPercent: 80,
        metrics: { validTrials: 10, reactionTimes: [250, 320, 330] },
      }),
    ];
    const entries = getExerciseRecordBreakdown("simple-reaction", results);
    const avg = byLabel(entries, "Mejor media de sesión");
    const fastest = byLabel(entries, "Intento más rápido");
    assert.equal(avg!.value, "300 ms");
    assert.equal(fastest!.value, "250 ms");
  });

  test("'Intento más rápido' escanea TODO el historial, no solo la sesion con mejor media", () => {
    const results = [
      makeResult({
        id: "mediocre-pero-con-un-intento-rapido",
        exerciseId: "reaction-time",
        reactionTimeMs: 500,
        accuracyPercent: 60,
        metrics: { reactionTimes: [120, 800] },
      }),
      makeResult({
        id: "buena-media",
        exerciseId: "reaction-time",
        reactionTimeMs: 300,
        accuracyPercent: 90,
        metrics: { reactionTimes: [290, 310] },
      }),
    ];
    const entries = getExerciseRecordBreakdown("reaction-time", results);
    assert.equal(byLabel(entries, "Intento más rápido")!.value, "120 ms");
  });

  test("'Mejor media de sesión' exige el umbral minimo de intentos validos (no aparece si nadie lo cumple)", () => {
    const results = [
      makeResult({ exerciseId: "reaction-time", reactionTimeMs: 100, accuracyPercent: 100, metrics: { validTrials: 1, reactionTimes: [100] } }),
    ];
    const entries = getExerciseRecordBreakdown("reaction-time", results);
    assert.equal(byLabel(entries, "Mejor media de sesión"), undefined);
    // 'Intento más rápido' SI aparece: no comparte el umbral de la media.
    assert.equal(byLabel(entries, "Intento más rápido")!.value, "100 ms");
  });

  test("'Mejor precisión' es independiente de los otros dos indicadores", () => {
    const results = [
      makeResult({ exerciseId: "reaction-time", accuracyPercent: 77, reactionTimeMs: null, metrics: {} }),
    ];
    const entries = getExerciseRecordBreakdown("reaction-time", results);
    assert.equal(byLabel(entries, "Mejor precisión")!.value, "77% de precisión");
  });

  test("array vacio produce una lista vacia (sin inventar ningun indicador)", () => {
    assert.deepEqual(getExerciseRecordBreakdown("reaction-time", []), []);
  });
});

describe("getExerciseRecordBreakdown — click-targets", () => {
  test("'Mejor tiempo total' solo compara sesiones con el MISMO total_trials (comparables)", () => {
    const results = [
      makeResult({ id: "10a", exerciseId: "click-targets", accuracyPercent: 90, totalTrials: 10, metrics: { totalTimeMs: 9000 } }),
      makeResult({ id: "10b", exerciseId: "click-targets", accuracyPercent: 85, totalTrials: 10, metrics: { totalTimeMs: 7000 } }),
      makeResult({ id: "30-outlier", exerciseId: "click-targets", accuracyPercent: 99, totalTrials: 30, metrics: { totalTimeMs: 1000 } }),
    ];
    const entries = getExerciseRecordBreakdown("click-targets", results);
    // El grupo de 10 intentos tiene 2 sesiones (comparable); el de 30 solo 1 (no comparable) - se ignora aunque su tiempo sea menor.
    const best = byLabel(entries, "Mejor tiempo total (10 objetivos)");
    assert.equal(best!.value, "7000 ms");
  });

  test("sin ningun grupo de 2+ sesiones comparables, el indicador de tiempo total no aparece", () => {
    const results = [
      makeResult({ id: "a", exerciseId: "click-targets", accuracyPercent: 90, totalTrials: 10, metrics: { totalTimeMs: 9000 } }),
      makeResult({ id: "b", exerciseId: "click-targets", accuracyPercent: 85, totalTrials: 20, metrics: { totalTimeMs: 7000 } }),
    ];
    const entries = getExerciseRecordBreakdown("click-targets", results);
    assert.equal(entries.some((e: { label: string }) => e.label.startsWith("Mejor tiempo total")), false);
  });

  test("'Acierto más rápido' solo considera outcome='hit' (descarta fallos rapidos)", () => {
    const results = [
      makeResult({
        exerciseId: "click-targets",
        accuracyPercent: 50,
        targetLog: [
          { targetNumber: 1, reactionTimeMs: 100, outcome: "miss" },
          { targetNumber: 2, reactionTimeMs: 400, outcome: "hit" },
        ],
      }),
    ];
    const entries = getExerciseRecordBreakdown("click-targets", results);
    assert.equal(byLabel(entries, "Acierto más rápido")!.value, "400 ms");
  });

  test("sin targetLog en ningun resultado, 'Acierto más rápido' no aparece", () => {
    const results = [makeResult({ exerciseId: "click-targets", accuracyPercent: 80, targetLog: null })];
    const entries = getExerciseRecordBreakdown("click-targets", results);
    assert.equal(byLabel(entries, "Acierto más rápido"), undefined);
  });
});

describe("getExerciseRecordBreakdown — visual-memory-precision", () => {
  test("'Mayor complejidad superada' solo cuenta rondas con succeeded=true", () => {
    const results = [
      makeResult({
        exerciseId: "visual-memory-precision",
        accuracyPercent: 80,
        totalTrials: 2,
        roundLog: [
          { roundNumber: 1, rows: 4, cols: 4, patternCount: 9, correctSelections: 5, incorrectSelections: 4, missedTiles: 0, accuracyPercent: 55, succeeded: false },
          { roundNumber: 2, rows: 4, cols: 4, patternCount: 5, correctSelections: 5, incorrectSelections: 0, missedTiles: 0, accuracyPercent: 100, succeeded: true },
        ],
      }),
    ];
    const entries = getExerciseRecordBreakdown("visual-memory-precision", results);
    // patternCount=9 NO cuenta (succeeded=false), aunque sea mayor que 5.
    assert.equal(byLabel(entries, "Mayor complejidad superada")!.value, "5 elementos");
  });

  test("sin roundLog en ningun resultado, 'Mayor complejidad superada' no aparece (nunca se inventa)", () => {
    const results = [makeResult({ exerciseId: "visual-memory-precision", accuracyPercent: 80, roundLog: null })];
    const entries = getExerciseRecordBreakdown("visual-memory-precision", results);
    assert.equal(byLabel(entries, "Mayor complejidad superada"), undefined);
  });

  test("'Más rondas en una sesión' usa total_trials (=roundsCompleted)", () => {
    const results = [
      makeResult({ id: "a", exerciseId: "visual-memory-precision", accuracyPercent: 80, totalTrials: 3 }),
      makeResult({ id: "b", exerciseId: "visual-memory-precision", accuracyPercent: 70, totalTrials: 7 }),
    ];
    const entries = getExerciseRecordBreakdown("visual-memory-precision", results);
    assert.equal(byLabel(entries, "Más rondas en una sesión")!.value, "7 rondas");
  });

  test("nunca incluye ningun indicador de tiempo (este ejercicio no mide tiempo)", () => {
    const results = [makeResult({ exerciseId: "visual-memory-precision", accuracyPercent: 80 })];
    const entries = getExerciseRecordBreakdown("visual-memory-precision", results);
    assert.equal(entries.some((e: { value: string }) => e.value.includes("ms")), false);
  });
});

describe("getExerciseRecordBreakdown — ejercicio desconocido", () => {
  test("devuelve una lista vacia", () => {
    assert.deepEqual(getExerciseRecordBreakdown("unknown-exercise", [makeResult({})]), []);
  });
});
