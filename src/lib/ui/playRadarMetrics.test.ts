import assert from "node:assert/strict";
import { describe, test } from "node:test";

const mappingPath = "./playRadarMetrics" + ".ts";
const { computePlayRadarAxes, computeRadarPolygonPoints, describePlayRadarAxes, REQUIRED_RADAR_AXES } =
  await import(mappingPath);

function result(overrides: Partial<{
  exerciseId: string | null;
  accuracyPercent: number | null;
  totalTrials: number | null;
  reactionTimeMs: number | null;
  errorsCount: number | null;
  configUsed: Record<string, unknown> | null;
}>) {
  return {
    exerciseId: null,
    accuracyPercent: null,
    totalTrials: null,
    reactionTimeMs: null,
    errorsCount: null,
    configUsed: null,
    ...overrides,
  };
}

function clickTargetsResult(reactionTimeMs: number, targetSize: number, contrastPercent: number) {
  return result({
    exerciseId: "click-targets",
    reactionTimeMs,
    configUsed: { targetSize, contrastPercent },
  });
}

function byKey(axes: { key: string; score: number }[], key: string) {
  return axes.find((a) => a.key === key);
}

describe("computePlayRadarAxes — Reacción (simple-reaction, reactionTimeMs)", () => {
  test("promedia reactionTimeMs SOLO de simple-reaction - menor tiempo, mayor score", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "simple-reaction", reactionTimeMs: 150 }),
      result({ exerciseId: "simple-reaction", reactionTimeMs: 1000 }),
    ]);
    // Promedio de score(150)=100 y score(1000)=0 -> 50.
    assert.equal(byKey(axes, "simple-reaction-speed")!.score, 50);
  });

  test("ignora reactionTimeMs de OTROS ejercicios (p.ej. reaction-time/Go-No-Go)", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "reaction-time", reactionTimeMs: 150 }),
    ]);
    assert.equal(byKey(axes, "simple-reaction-speed"), undefined);
  });

  test("ausente si simple-reaction nunca tiene reactionTimeMs real", () => {
    const axes = computePlayRadarAxes([result({ exerciseId: "simple-reaction", reactionTimeMs: null })]);
    assert.equal(byKey(axes, "simple-reaction-speed"), undefined);
  });

  test("valores fuera del rango de referencia se recortan, nunca producen score negativo o >100", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "simple-reaction", reactionTimeMs: 50 }),
      result({ exerciseId: "simple-reaction", reactionTimeMs: 5000 }),
    ]);
    const score = byKey(axes, "simple-reaction-speed")!.score;
    assert.ok(score >= 0 && score <= 100);
  });
});

describe("computePlayRadarAxes — Go / No Go (reaction-time, accuracyPercent)", () => {
  test("promedia accuracyPercent SOLO de reaction-time (Go/No Go)", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "reaction-time", accuracyPercent: 80 }),
      result({ exerciseId: "reaction-time", accuracyPercent: 60 }),
    ]);
    assert.equal(byKey(axes, "go-no-go-accuracy")!.score, 70);
  });

  test("ignora accuracyPercent de otros ejercicios (nunca mezcla ejercicios en un eje)", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "reaction-time", accuracyPercent: 80 }),
      clickTargetsResult(900, 32, 100),
    ]);
    assert.equal(byKey(axes, "go-no-go-accuracy")!.score, 80);
  });

  test("ausente si Go/No Go nunca se jugó", () => {
    const axes = computePlayRadarAxes([clickTargetsResult(500, 32, 100)]);
    assert.equal(byKey(axes, "go-no-go-accuracy"), undefined);
  });
});

describe("computePlayRadarAxes — Memoria visual (visual-memory-precision, accuracyPercent)", () => {
  test("promedia accuracyPercent SOLO de visual-memory-precision", () => {
    const axes = computePlayRadarAxes([result({ exerciseId: "visual-memory-precision", accuracyPercent: 55 })]);
    assert.equal(byKey(axes, "visual-memory-accuracy")!.score, 55);
  });

  test("ausente si el deportista nunca jugó Memoria Visual", () => {
    const axes = computePlayRadarAxes([result({ exerciseId: "simple-reaction", reactionTimeMs: 300 })]);
    assert.equal(byKey(axes, "visual-memory-accuracy"), undefined);
  });
});

describe("computePlayRadarAxes — Click Targets (escala absoluta y fija 0-2000ms)", () => {
  test("0 ms (mejor limite) produce score 100", () => {
    const axes = computePlayRadarAxes([clickTargetsResult(0, 32, 100)]);
    assert.equal(byKey(axes, "click-targets-speed")!.score, 100);
  });

  test("2000 ms (peor limite) produce score 0", () => {
    const axes = computePlayRadarAxes([clickTargetsResult(2000, 32, 100)]);
    assert.equal(byKey(axes, "click-targets-speed")!.score, 0);
  });

  test("tiempos superiores a 2000ms tambien reciben score 0 (recortado, nunca negativo)", () => {
    const axes = computePlayRadarAxes([clickTargetsResult(5000, 32, 100)]);
    assert.equal(byKey(axes, "click-targets-speed")!.score, 0);
  });

  test("valor intermedio se normaliza linealmente (1000ms -> score 50, el punto medio exacto de 0-2000)", () => {
    const axes = computePlayRadarAxes([clickTargetsResult(1000, 32, 100)]);
    assert.equal(byKey(axes, "click-targets-speed")!.score, 50);
  });

  test("ya NO reutiliza el rango 150-1000 de Reacción: 150ms aqui NO es el mejor posible (score 92.5, no 100)", () => {
    const axes = computePlayRadarAxes([clickTargetsResult(150, 32, 100)]);
    assert.equal(byKey(axes, "click-targets-speed")!.score, 92.5);
  });

  test("menor tiempo medio = mayor score (direccion correcta, se promedia dentro del grupo comparable)", () => {
    const axes = computePlayRadarAxes([
      clickTargetsResult(200, 32, 100),
      clickTargetsResult(400, 32, 100),
    ]);
    // Promedio 300ms -> clamp(300,0,2000)=300, ratio=300/2000=0.15, score=85.
    assert.equal(byKey(axes, "click-targets-speed")!.score, 85);
  });

  test("tiempos negativos se consideran invalidos y se excluyen del promedio (nunca generan un score negativo ni distorsionan la media)", () => {
    const withNegative = computePlayRadarAxes([
      clickTargetsResult(-50, 32, 100),
      clickTargetsResult(400, 32, 100),
    ]);
    const withoutNegative = computePlayRadarAxes([clickTargetsResult(400, 32, 100)]);
    assert.equal(
      byKey(withNegative, "click-targets-speed")!.score,
      byKey(withoutNegative, "click-targets-speed")!.score
    );
  });

  test("si TODOS los tiempos del grupo mas grande son invalidos (negativos/no finitos), el eje se omite - nunca inventa un valor", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "click-targets", reactionTimeMs: -1, configUsed: { targetSize: 32, contrastPercent: 100 } }),
      result({ exerciseId: "click-targets", reactionTimeMs: Number.NaN, configUsed: { targetSize: 32, contrastPercent: 100 } }),
    ]);
    assert.equal(byKey(axes, "click-targets-speed"), undefined);
  });

  test("independencia del historial individual: dos 'deportistas' con la misma media y configuracion obtienen EXACTAMENTE el mismo score", () => {
    const athleteA = computePlayRadarAxes([
      clickTargetsResult(300, 32, 100),
      clickTargetsResult(500, 32, 100),
    ]);
    // Mismo promedio (400ms), mismo config, pero un historial de sesiones
    // completamente distinto (3 sesiones en vez de 2, valores distintos).
    const athleteB = computePlayRadarAxes([
      clickTargetsResult(100, 32, 100),
      clickTargetsResult(400, 32, 100),
      clickTargetsResult(700, 32, 100),
    ]);
    assert.equal(byKey(athleteA, "click-targets-speed")!.score, byKey(athleteB, "click-targets-speed")!.score);
  });

  test("ya NO usa accuracyPercent (se sustituyo por tiempo) - una sesion solo con precision no basta", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "click-targets", accuracyPercent: 95, reactionTimeMs: null }),
    ]);
    assert.equal(byKey(axes, "click-targets-speed"), undefined);
  });

  test("ausente si el deportista nunca jugó Click Targets", () => {
    const axes = computePlayRadarAxes([result({ exerciseId: "simple-reaction", reactionTimeMs: 300 })]);
    assert.equal(byKey(axes, "click-targets-speed"), undefined);
  });

  test("comparabilidad: solo promedia el grupo con MAS sesiones del mismo tamaño/contraste de objetivo", () => {
    const axes = computePlayRadarAxes([
      // Grupo mayoritario: objetivo grande (32px/100%) - 2 sesiones.
      clickTargetsResult(200, 32, 100),
      clickTargetsResult(300, 32, 100),
      // Outlier: objetivo pequeño (16px/50%) - 1 sola sesion, mucho mas
      // lenta - NO debe contaminar la media si se ignora correctamente.
      clickTargetsResult(5000, 16, 50),
    ]);
    // Si mezclara los 3 valores, la media seria mucho peor. Solo debe
    // promediar 200 y 300 -> 250.
    const own = [clickTargetsResult(200, 32, 100), clickTargetsResult(300, 32, 100)];
    const expectedScore = computePlayRadarAxes(own).find((a: { key: string }) => a.key === "click-targets-speed");
    assert.equal(byKey(axes, "click-targets-speed")!.score, expectedScore!.score);
  });

  test("sesiones sin targetSize/contrastPercent en config_used (captura invalida/historico antiguo) se agrupan entre si como 'unknown'", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "click-targets", reactionTimeMs: 400, configUsed: { fallback: true } }),
      result({ exerciseId: "click-targets", reactionTimeMs: 600, configUsed: null }),
    ]);
    // Ambas caen en el mismo grupo "unknown|unknown" (2 sesiones, el
    // grupo mas grande posible aqui) -> promedio de 400 y 600 = 500.
    const expected = computePlayRadarAxes([
      result({ exerciseId: "click-targets", reactionTimeMs: 400 }),
      result({ exerciseId: "click-targets", reactionTimeMs: 600 }),
    ]).find((a: { key: string }) => a.key === "click-targets-speed");
    assert.equal(byKey(axes, "click-targets-speed")!.score, expected!.score);
  });
});

describe("computePlayRadarAxes — sin historial", () => {
  test("array vacio produce 0 ejes (nunca inventa ninguno)", () => {
    assert.deepEqual(computePlayRadarAxes([]), []);
  });

  test("cada eje usa EXCLUSIVAMENTE su propio ejercicio incluso con historial mixto completo", () => {
    const axes = computePlayRadarAxes([
      result({ exerciseId: "simple-reaction", reactionTimeMs: 150 }),
      result({ exerciseId: "reaction-time", accuracyPercent: 100 }),
      result({ exerciseId: "visual-memory-precision", accuracyPercent: 40 }),
      clickTargetsResult(0, 32, 100),
    ]);
    assert.equal(axes.length, 4);
    assert.equal(byKey(axes, "simple-reaction-speed")!.score, 100);
    assert.equal(byKey(axes, "go-no-go-accuracy")!.score, 100);
    assert.equal(byKey(axes, "visual-memory-accuracy")!.score, 40);
    assert.equal(byKey(axes, "click-targets-speed")!.score, 100);
  });
});

describe("computeRadarPolygonPoints", () => {
  test("score 100 coloca el vertice exactamente a `radius` del centro", () => {
    const [point] = computeRadarPolygonPoints([100], 110, 110, 80);
    const distance = Math.hypot(point.x - 110, point.y - 110);
    assert.ok(Math.abs(distance - 80) < 1e-9);
  });

  test("score 0 coloca el vertice exactamente en el centro", () => {
    const [point] = computeRadarPolygonPoints([0], 110, 110, 80);
    assert.ok(Math.abs(point.x - 110) < 1e-9);
    assert.ok(Math.abs(point.y - 110) < 1e-9);
  });

  test("el primer eje apunta hacia arriba (angulo -90°): mismo x que el centro, y menor", () => {
    const [point] = computeRadarPolygonPoints([100], 110, 110, 80);
    assert.ok(Math.abs(point.x - 110) < 1e-9);
    assert.ok(point.y < 110);
  });

  test("reparte N ejes uniformemente (4 ejes -> 90° entre cada uno)", () => {
    const points = computeRadarPolygonPoints([100, 100, 100, 100], 0, 0, 10);
    // El 2do eje (90° horario desde arriba) deberia quedar a la derecha del centro.
    assert.ok(points[1].x > 0);
    assert.ok(Math.abs(points[1].y - 0) < 1e-9);
  });

  test("labelRadius distinto de radius solo afecta la posicion de la etiqueta, no la del vertice de datos", () => {
    const [point] = computeRadarPolygonPoints([50], 0, 0, 80, 120);
    const vertexDistance = Math.hypot(point.x, point.y);
    const labelDistance = Math.hypot(point.labelX, point.labelY);
    assert.ok(Math.abs(vertexDistance - 40) < 1e-9);
    assert.ok(Math.abs(labelDistance - 120) < 1e-9);
  });

  test("labelX/labelY NUNCA dependen del score (incluido score=0) - siempre a labelRadius fijo del centro", () => {
    // Mismo eje (angulo), 3 scores muy distintos (incluido el caso
    // critico score=0, que colapsaba el vertice de datos en el centro):
    // la etiqueta debe quedar en la MISMA posicion en los 3 casos.
    const [atScore0] = computeRadarPolygonPoints([0], 50, 50, 30, 45);
    const [atScore50] = computeRadarPolygonPoints([50], 50, 50, 30, 45);
    const [atScore100] = computeRadarPolygonPoints([100], 50, 50, 30, 45);

    assert.equal(atScore0.labelX, atScore50.labelX);
    assert.equal(atScore0.labelY, atScore50.labelY);
    assert.equal(atScore0.labelX, atScore100.labelX);
    assert.equal(atScore0.labelY, atScore100.labelY);

    // Pero el vertice de datos (x/y) SI depende del score - confirma que
    // son dos coordenadas distintas, no que ambas quedaron fijas por
    // error. (Angulo -90°: x no varia para este eje en concreto, por
    // eso se comprueba y, que es la coordenada que SI cambia con r).
    assert.notEqual(atScore0.y, atScore100.y);
  });
});

describe("REQUIRED_RADAR_AXES", () => {
  test("es 3 (minimo geometrico de un poligono interpretable)", () => {
    assert.equal(REQUIRED_RADAR_AXES, 3);
  });
});

describe("describePlayRadarAxes", () => {
  test("describe los 4 ejes SIEMPRE, disponibles o no (nunca omite ninguno, a diferencia de computePlayRadarAxes)", () => {
    const statuses = describePlayRadarAxes([]);
    assert.equal(statuses.length, 4);
    assert.ok(statuses.every((s: { available: boolean }) => s.available === false));
  });

  test("marca available=true exactamente para los ejes que computePlayRadarAxes SI devuelve", () => {
    const results = [
      result({ exerciseId: "simple-reaction", reactionTimeMs: 300 }),
      clickTargetsResult(400, 32, 100),
    ];
    const axes = computePlayRadarAxes(results);
    const statuses = describePlayRadarAxes(results);

    const availableKeys = new Set(axes.map((a: { key: string }) => a.key));
    for (const status of statuses) {
      assert.equal(status.available, availableKeys.has(status.key));
    }
    // Exactamente los 2 ejercicios jugados quedan disponibles.
    assert.equal(statuses.filter((s: { available: boolean }) => s.available).length, 2);
  });

  test("cada estado identifica el exerciseId real del que depende, para señalar que ejercicio falta completar", () => {
    const statuses = describePlayRadarAxes([]);
    const byExercise = new Map(statuses.map((s: { exerciseId: string; key: string }) => [s.exerciseId, s.key]));
    assert.equal(byExercise.get("simple-reaction"), "simple-reaction-speed");
    assert.equal(byExercise.get("reaction-time"), "go-no-go-accuracy");
    assert.equal(byExercise.get("visual-memory-precision"), "visual-memory-accuracy");
    assert.equal(byExercise.get("click-targets"), "click-targets-speed");
  });
});
