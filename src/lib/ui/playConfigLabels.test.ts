/**
 * Pruebas aisladas de playConfigLabels.ts (formatConfigUsed) - test
 * runner nativo de Node (node:test + node:assert/strict), mismo patron
 * del resto de pruebas de este proyecto. Import dinamico con ruta NO
 * literal (TS5097, mismo motivo documentado en los demas *.test.ts).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./playConfigLabels" + ".ts";
const { formatConfigUsed } = await import(modulePath);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fields viene de un import() dinamico (ver mas arriba, mismo motivo TS5097), tipado como `any` por construccion.
function byKey(fields: any[], key: string): any {
  return fields.find((f) => f.key === key);
}

describe("formatConfigUsed — campos reales de Go/No Go (ReactionTimeExercise.tsx)", () => {
  const config = {
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
    exerciseId: "reaction-time",
    configVersion: 1,
  };

  test("etiqueta endMode/totalTrials/duracion correctamente", () => {
    const fields = formatConfigUsed(config);
    assert.equal(byKey(fields, "endMode").value, "Por repeticiones");
    assert.equal(byKey(fields, "totalTrials").label, "Intentos configurados");
    assert.equal(byKey(fields, "totalTrials").value, "20");
    assert.equal(byKey(fields, "durationSeconds").value, "120 s");
  });

  test("goRatio se muestra como porcentaje (proporcion, no percentil)", () => {
    assert.equal(byKey(formatConfigUsed(config), "goRatio").value, "70 %");
  });

  test("goColor/noGoColor reconocidos muestran el nombre en español Y la muestra de color", () => {
    const fields = formatConfigUsed(config);
    const go = byKey(fields, "goColor");
    assert.equal(go.value, "Verde");
    assert.equal(go.colorSwatch, "#22c55e");
    const noGo = byKey(fields, "noGoColor");
    assert.equal(noGo.value, "Rojo");
    assert.equal(noGo.colorSwatch, "#ef4444");
  });

  test("exerciseId/configVersion se ocultan (bookkeeping interno, nunca se muestran)", () => {
    const fields = formatConfigUsed(config);
    assert.equal(byKey(fields, "exerciseId"), undefined);
    assert.equal(byKey(fields, "configVersion"), undefined);
  });
});

describe("formatConfigUsed — campos reales de Click Targets (ClickTargetsExercise.tsx)", () => {
  const config = {
    endMode: "time",
    targetCount: 15,
    durationSeconds: 120,
    targetSize: 32,
    targetColor: "#3b82f6",
    contrastPercent: 100,
    showFixation: false,
    showFeedback: true,
  };

  test("targetCount se etiqueta como 'Repeticiones configuradas' (igual que en la propia pantalla del ejercicio)", () => {
    assert.equal(byKey(formatConfigUsed(config), "targetCount").label, "Repeticiones configuradas");
  });

  test("targetSize incluye unidad px", () => {
    assert.equal(byKey(formatConfigUsed(config), "targetSize").value, "32 px");
  });

  test("targetColor reconocido -> nombre + swatch", () => {
    const field = byKey(formatConfigUsed(config), "targetColor");
    assert.equal(field.value, "Azul");
    assert.equal(field.colorSwatch, "#3b82f6");
  });

  test("showFixation/showFeedback booleanos -> Sí/No", () => {
    const fields = formatConfigUsed(config);
    assert.equal(byKey(fields, "showFixation").value, "No");
    assert.equal(byKey(fields, "showFeedback").value, "Sí");
  });
});

describe("formatConfigUsed — campos reales de Visual Memory Precision (VisualMemoryExercise.tsx)", () => {
  const config = {
    gridSize: 4,
    patternCount: 5,
    cellSize: "medium",
    memorizeTimeSec: 3,
    stimulusColor: "#3b82f6",
    contrastPercent: 100,
    endMode: "progressive",
    repetitions: 5,
    durationSeconds: 120,
    showFixation: false,
    fixationDurationMs: 1000,
  };

  test("endMode admite 'progressive' (unico ejercicio que lo tiene)", () => {
    assert.equal(byKey(formatConfigUsed(config), "endMode").value, "Progresivo");
  });

  test("cellSize se traduce a español", () => {
    assert.equal(byKey(formatConfigUsed(config), "cellSize").value, "Mediana");
  });

  test("memorizeTimeSec/fixationDurationMs usan la unidad correcta (s vs ms)", () => {
    const fields = formatConfigUsed(config);
    assert.equal(byKey(fields, "memorizeTimeSec").value, "3 s");
    assert.equal(byKey(fields, "fixationDurationMs").value, "1000 ms");
  });
});

describe("formatConfigUsed — fallbacks fijos de effectiveConfig.ts (nombres de campo distintos)", () => {
  test("REACTION_TIME_CONFIG_USED: maxTrials/waitMinMs/waitMaxMs/goStimulusTimeoutMs/noGoDisplayMs", () => {
    const config = {
      maxTrials: 20,
      waitMinMs: 1500,
      waitMaxMs: 3000,
      goStimulusTimeoutMs: 1000,
      noGoDisplayMs: 2000,
    };
    const fields = formatConfigUsed(config);
    assert.equal(byKey(fields, "maxTrials").value, "20");
    assert.equal(byKey(fields, "waitMinMs").value, "1500 ms");
    assert.equal(byKey(fields, "goStimulusTimeoutMs").label, "Tiempo máximo de respuesta (GO)");
    assert.equal(byKey(fields, "noGoDisplayMs").value, "2000 ms");
  });

  test("CLICK_TARGETS_CONFIG_USED/VISUAL_MEMORY_CONFIG_USED: solo fallback+exerciseId, ambos ocultos -> lista vacia", () => {
    assert.deepEqual(formatConfigUsed({ fallback: true, exerciseId: "click-targets" }), []);
  });
});

describe("formatConfigUsed — casos generales", () => {
  test("objeto vacio produce una lista vacia", () => {
    assert.deepEqual(formatConfigUsed({}), []);
  });

  test("una clave sin etiqueta conocida usa una etiqueta tecnica legible (camelCase -> palabras) y su valor en bruto", () => {
    const fields = formatConfigUsed({ colorDefaultsVersion: 1 });
    assert.equal(fields.length, 1);
    // camelCase ya capitaliza cada palabra siguiente por construccion
    // (colorDefaultsVersion -> "color Defaults Version" tras insertar
    // espacios) - el resultado es Title Case, no frase en minusculas.
    assert.equal(fields[0].label, "Color Defaults Version");
    assert.equal(fields[0].value, "1");
    assert.equal(fields[0].colorSwatch, null);
  });

  test("un color hex fuera de la paleta conocida muestra el propio hex (nunca un nombre inventado), con swatch igualmente", () => {
    const fields = formatConfigUsed({ goColor: "#123abc" });
    assert.equal(fields[0].value, "#123abc");
    assert.equal(fields[0].colorSwatch, "#123abc");
  });

  test("un valor de tipo inesperado para un campo conocido cae a representacion generica, no rompe ni inventa", () => {
    const fields = formatConfigUsed({ endMode: 42 });
    assert.equal(fields[0].label, "End Mode");
    assert.equal(fields[0].value, "42");
  });

  test("null/undefined se muestran como '—', nunca como 'null'/'undefined' en texto", () => {
    const fields = formatConfigUsed({ someUnknownField: null });
    assert.equal(fields[0].value, "—");
  });
});
