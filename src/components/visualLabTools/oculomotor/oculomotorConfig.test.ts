/**
 * Pruebas aisladas de la logica pura de oculomotorConfig.ts - test
 * runner nativo de Node (node:test + node:assert/strict), mismo
 * criterio que stimulusGenerator/stimulusConfig.test.ts. Ejecutar con:
 *   node --test "src/components/visualLabTools/oculomotor/oculomotorConfig.test.ts"
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Import dinamico con ruta NO literal (mismo motivo documentado en los
// demas archivos de test de este proyecto: TS5097 con moduleResolution
// "bundler" en un import ESTATICO con extension .ts explicita).
const modulePath = "./oculomotorConfig" + ".ts";
const mod = await import(modulePath);
const {
  DEFAULT_OCULOMOTOR_CONFIG,
  PURSUIT_SPEED_PRESETS_MS,
  SACCADE_INTERVAL_PRESETS_MS,
  RANDOM_AMPLITUDE_MIN_PERCENT,
  resolveTimingMs,
  resolveAmplitudePercent,
  computePursuitPoint,
  getSaccadeWaypoints,
  computeNextSaccadePosition,
  isDurationComplete,
  PURSUIT_ELEMENT_CHANGE_INTERVAL_MS,
  shouldChangePursuitElement,
  pickNextRandomElement,
  canStartOculomotorExercise,
  getSelectedStimulusElements,
  resolveInitialStimulusElement,
  RANDOM_WALK_MIN_STEP,
  RANDOM_WALK_MAX_STEP,
  RANDOM_WALK_MAX_TURN_RAD,
  pickNextRandomWalkWaypoint,
  catmullRomPoint,
  resolveRandomWalkSegmentDurationMs,
} = mod;

function isWithinUnit(p: { x: number; y: number }): boolean {
  return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}

describe("DEFAULT_OCULOMOTOR_CONFIG", () => {
  test("empieza en modalidad 'pursuit', duracion manual", () => {
    assert.equal(DEFAULT_OCULOMOTOR_CONFIG.modality, "pursuit");
    assert.equal(DEFAULT_OCULOMOTOR_CONFIG.duration.mode, "manual");
  });

  test("el area de trabajo por defecto esta dentro del rango valido 25-75", () => {
    assert.ok(DEFAULT_OCULOMOTOR_CONFIG.pursuit.workArea.amplitudePercent >= 25);
    assert.ok(DEFAULT_OCULOMOTOR_CONFIG.pursuit.workArea.amplitudePercent <= 75);
    assert.ok(DEFAULT_OCULOMOTOR_CONFIG.saccade.workArea.amplitudePercent >= 25);
    assert.ok(DEFAULT_OCULOMOTOR_CONFIG.saccade.workArea.amplitudePercent <= 75);
  });
});

describe("resolveTimingMs", () => {
  test("modo 'preset' devuelve exactamente el valor de la tabla de presets pasada", () => {
    assert.equal(
      resolveTimingMs({ mode: "preset", preset: "slow", valueMs: 1, minMs: 1, maxMs: 1 }, PURSUIT_SPEED_PRESETS_MS),
      PURSUIT_SPEED_PRESETS_MS.slow
    );
    assert.equal(
      resolveTimingMs({ mode: "preset", preset: "fast", valueMs: 1, minMs: 1, maxMs: 1 }, SACCADE_INTERVAL_PRESETS_MS),
      SACCADE_INTERVAL_PRESETS_MS.fast
    );
  });

  test("las tablas de presets de pursuit y saccades son DISTINTAS (no comparten los mismos valores numericos)", () => {
    assert.notDeepEqual(PURSUIT_SPEED_PRESETS_MS, SACCADE_INTERVAL_PRESETS_MS);
  });

  test("modo 'adjustable' devuelve exactamente valueMs", () => {
    assert.equal(resolveTimingMs({ mode: "adjustable", valueMs: 3456, preset: "slow", minMs: 1, maxMs: 2 }, PURSUIT_SPEED_PRESETS_MS), 3456);
  });

  test("modo 'random' esta acotado entre minMs y maxMs (ambos extremos incluidos)", () => {
    const cfg = { mode: "random", valueMs: 0, preset: "slow", minMs: 500, maxMs: 1500 };
    for (const r of [0, 0.5, 0.999]) {
      const v = resolveTimingMs(cfg, PURSUIT_SPEED_PRESETS_MS, () => r);
      assert.ok(v >= 500 && v <= 1500, `fuera de rango: ${v}`);
    }
  });

  test("modo 'random' funciona igual si minMs/maxMs estan invertidos", () => {
    const cfg = { mode: "random", valueMs: 0, preset: "slow", minMs: 1500, maxMs: 500 };
    const v = resolveTimingMs(cfg, PURSUIT_SPEED_PRESETS_MS, () => 0);
    assert.equal(v, 500);
  });
});

describe("resolveAmplitudePercent", () => {
  test("'fullscreen' siempre devuelve 100, ignorando amplitudePercent", () => {
    assert.equal(resolveAmplitudePercent({ mode: "fullscreen", amplitudePercent: 25 }), 100);
    assert.equal(resolveAmplitudePercent({ mode: "fullscreen", amplitudePercent: 75 }), 100);
  });

  test("'reduced' devuelve exactamente el valor configurado", () => {
    assert.equal(resolveAmplitudePercent({ mode: "reduced", amplitudePercent: 40 }), 40);
  });

  test("'random' esta acotado entre RANDOM_AMPLITUDE_MIN_PERCENT y el valor configurado (techo del sorteo)", () => {
    const cfg = { mode: "random", amplitudePercent: 75 };
    for (const r of [0, 0.5, 0.999]) {
      const v = resolveAmplitudePercent(cfg, () => r);
      assert.ok(v >= RANDOM_AMPLITUDE_MIN_PERCENT && v <= 75, `fuera de rango: ${v}`);
    }
  });

  test("'random' con randomFn()=0 devuelve el minimo fijo; con 1, el techo configurado", () => {
    const cfg = { mode: "random", amplitudePercent: 60 };
    assert.equal(resolveAmplitudePercent(cfg, () => 0), RANDOM_AMPLITUDE_MIN_PERCENT);
    assert.equal(resolveAmplitudePercent(cfg, () => 1), 60);
  });
});

describe("computePursuitPoint — patrones continuos (horizontal/vertical/circular/curved)", () => {
  test("horizontal: oscila en X, Y siempre en el centro (0.5)", () => {
    for (const phase of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) {
      const p = computePursuitPoint("horizontal", phase, 0.5);
      assert.equal(p.y, 0.5);
      assert.ok(isWithinUnit(p));
    }
  });

  test("vertical: oscila en Y, X siempre en el centro (0.5)", () => {
    for (const phase of [0, 0.1, 0.25, 0.5, 0.75, 0.99]) {
      const p = computePursuitPoint("vertical", phase, 0.5);
      assert.equal(p.x, 0.5);
      assert.ok(isWithinUnit(p));
    }
  });

  test("horizontal: fase 0 esta en el centro exacto (sin(0)=0)", () => {
    const p = computePursuitPoint("horizontal", 0, 0.5);
    assert.equal(p.x, 0.5);
  });

  test("horizontal: fase 0.25 esta en el extremo derecho (amplitud/2 desde el centro)", () => {
    const p = computePursuitPoint("horizontal", 0.25, 0.6);
    assert.ok(Math.abs(p.x - (0.5 + 0.3)) < 1e-9);
  });

  test("circular: siempre a distancia constante r del centro (describe un circulo)", () => {
    const r = 0.3;
    for (const phase of [0, 0.2, 0.4, 0.6, 0.8]) {
      const p = computePursuitPoint("circular", phase, r * 2);
      const dist = Math.hypot(p.x - 0.5, p.y - 0.5);
      assert.ok(Math.abs(dist - r) < 1e-9, `distancia inesperada: ${dist}`);
    }
  });

  test("curved: nunca sale del area 0..1 y no coincide con un circulo exacto (forma distinta)", () => {
    const pts = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((ph) => computePursuitPoint("curved", ph, 0.6));
    for (const p of pts) assert.ok(isWithinUnit(p));
  });

  test("fase fuera de [0,1) se normaliza igual que su equivalente dentro de rango (bucle continuo)", () => {
    const a = computePursuitPoint("horizontal", 0.3, 0.5);
    const b = computePursuitPoint("horizontal", 1.3, 0.5);
    const c = computePursuitPoint("horizontal", -0.7, 0.5);
    assert.ok(Math.abs(a.x - b.x) < 1e-9);
    assert.ok(Math.abs(a.x - c.x) < 1e-9);
  });
});

describe("computePursuitPoint — patrones de figura (h/cross) con vertices compartidos", () => {
  test("'h': en fase 0 esta exactamente en el primer vertice (arriba-izquierda)", () => {
    const p = computePursuitPoint("h", 0, 0.6);
    assert.ok(Math.abs(p.x - 0.2) < 1e-9);
    assert.ok(Math.abs(p.y - 0.2) < 1e-9);
  });

  test("'cross': recorre las 2 diagonales completas, siempre dentro del area", () => {
    for (const phase of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) {
      const p = computePursuitPoint("cross", phase, 0.6);
      assert.ok(isWithinUnit(p));
    }
  });

  test("'h' es un bucle CERRADO: la fase justo antes de completar el ciclo se aproxima de vuelta al primer vertice", () => {
    const start = computePursuitPoint("h", 0, 0.6);
    const almostEnd = computePursuitPoint("h", 0.999, 0.6);
    assert.ok(Math.hypot(start.x - almostEnd.x, start.y - almostEnd.y) < 0.05);
  });
});

describe("pickNextRandomWalkWaypoint — paseo aleatorio continuo del patron 'random'", () => {
  function sequence(randomFn: () => number, steps: number) {
    let point = { x: 0, y: 0 };
    let angle = 0;
    const points = [point];
    const angles = [angle];
    for (let i = 0; i < steps; i += 1) {
      const next = pickNextRandomWalkWaypoint(point, angle, randomFn);
      point = next.point;
      angle = next.angle;
      points.push(point);
      angles.push(angle);
    }
    return { points, angles };
  }

  test("respeta SIEMPRE el area de trabajo (radio <= 1 desde el centro), para muchas semillas distintas", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      let i = 0;
      const randomFn = () => {
        i += 1;
        return (seed * 0.137 + i * 0.071) % 1;
      };
      const { points } = sequence(randomFn, 60);
      for (const p of points) {
        const dist = Math.sqrt(p.x * p.x + p.y * p.y);
        assert.ok(dist <= 1 + 1e-9, `radio fuera de rango: ${dist}`);
      }
    }
  });

  test("el giro entre tramos consecutivos nunca excede RANDOM_WALK_MAX_TURN_RAD", () => {
    const randomFn = (() => {
      let i = 0;
      const values = [0, 0.01, 0.99, 0.5, 0.02, 0.98, 0.33, 0.66];
      return () => values[i++ % values.length];
    })();
    const { angles } = sequence(randomFn, 40);
    for (let i = 1; i < angles.length; i += 1) {
      const turn = Math.abs(angles[i] - angles[i - 1]);
      assert.ok(turn <= RANDOM_WALK_MAX_TURN_RAD + 1e-9, `giro excesivo: ${turn}`);
    }
  });

  test("el paso entre waypoints esta acotado a [RANDOM_WALK_MIN_STEP, RANDOM_WALK_MAX_STEP] mientras no choque con el borde del area", () => {
    // randomFn()=0.5 para el giro (turn=0, sin desviacion) mantiene el
    // paseo lejos del borde durante los primeros tramos, asi el paso no
    // se ve afectado por el reescalado al borde.
    let point = { x: 0, y: 0 };
    let angle = 0;
    for (let i = 0; i < 3; i += 1) {
      const r = i / 3;
      const next = pickNextRandomWalkWaypoint(point, angle, () => (i % 2 === 0 ? 0.5 : r));
      const step = Math.hypot(next.point.x - point.x, next.point.y - point.y);
      assert.ok(step >= RANDOM_WALK_MIN_STEP - 1e-9 && step <= RANDOM_WALK_MAX_STEP + 1e-9, `paso fuera de rango: ${step}`);
      point = next.point;
      angle = next.angle;
    }
  });

  test("nunca se repite un patron corto fijo: 2 semillas distintas producen secuencias distintas", () => {
    const { points: a } = sequence(() => 0.3, 15);
    const { points: b } = sequence(() => 0.8, 15);
    assert.notDeepEqual(a, b);
  });

  test("con muchos pasos, el paseo cubre una porcion amplia del area (no colapsa a una region pequeña)", () => {
    let i = 0;
    const randomFn = () => {
      i += 1;
      return (i * 0.6180339887) % 1; // secuencia bien distribuida (razon aurea)
    };
    const { points } = sequence(randomFn, 200);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const spreadY = Math.max(...ys) - Math.min(...ys);
    assert.ok(spreadX > 0.8, `dispersion en X insuficiente: ${spreadX}`);
    assert.ok(spreadY > 0.8, `dispersion en Y insuficiente: ${spreadY}`);
  });
});

describe("catmullRomPoint — continuidad entre tramos", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 0.3, y: 0.1 };
  const p2 = { x: 0.6, y: -0.2 };
  const p3 = { x: 1, y: 0.4 };

  test("t=0 cae EXACTAMENTE en p1, t=1 cae EXACTAMENTE en p2 (interpolacion, no aproximacion)", () => {
    const start = catmullRomPoint(p0, p1, p2, p3, 0);
    const end = catmullRomPoint(p0, p1, p2, p3, 1);
    assert.ok(Math.abs(start.x - p1.x) < 1e-9 && Math.abs(start.y - p1.y) < 1e-9);
    assert.ok(Math.abs(end.x - p2.x) < 1e-9 && Math.abs(end.y - p2.y) < 1e-9);
  });

  test("la union entre 2 tramos consecutivos coincide exactamente (continuidad de POSICION)", () => {
    const p4 = { x: 1.3, y: 0.1 };
    const endOfSegment1 = catmullRomPoint(p0, p1, p2, p3, 1);
    const startOfSegment2 = catmullRomPoint(p1, p2, p3, p4, 0);
    assert.ok(Math.abs(endOfSegment1.x - startOfSegment2.x) < 1e-9);
    assert.ok(Math.abs(endOfSegment1.y - startOfSegment2.y) < 1e-9);
  });

  test("valores intermedios de t producen puntos distintos de los extremos (curva real, no un salto)", () => {
    const mid = catmullRomPoint(p0, p1, p2, p3, 0.5);
    assert.notDeepEqual(mid, p1);
    assert.notDeepEqual(mid, p2);
  });
});

describe("resolveRandomWalkSegmentDurationMs", () => {
  test("proporcional a la longitud del tramo (el doble de longitud, el doble de duracion)", () => {
    const short = resolveRandomWalkSegmentDurationMs(0.5, 4000);
    const long = resolveRandomWalkSegmentDurationMs(1, 4000);
    assert.ok(Math.abs(long - short * 2) < 1e-9);
  });

  test("respeta un minimo (nunca una duracion casi nula para un tramo diminuto)", () => {
    const duration = resolveRandomWalkSegmentDurationMs(0.0001, 4000);
    assert.ok(duration >= 150);
  });

  test("a mayor resolvedCycleMs (velocidad configurada mas lenta), mayor duracion del mismo tramo", () => {
    const fast = resolveRandomWalkSegmentDurationMs(0.5, 2000);
    const slow = resolveRandomWalkSegmentDurationMs(0.5, 8000);
    assert.ok(slow > fast);
  });
});

describe("getSaccadeWaypoints / computeNextSaccadePosition — patrones deterministas", () => {
  test("horizontal tiene exactamente 2 puntos (izquierda/derecha)", () => {
    const wp = getSaccadeWaypoints("horizontal", 0.6);
    assert.equal(wp.length, 2);
    assert.ok(wp[0].x < wp[1].x);
  });

  test("'diagonal' usa SOLO una diagonal (2 puntos) - distinto de 'x' (4 puntos, ambas diagonales)", () => {
    const diag = getSaccadeWaypoints("diagonal", 0.6);
    const x = getSaccadeWaypoints("x", 0.6);
    assert.equal(diag.length, 2);
    assert.equal(x.length, 4);
  });

  test("'h' de saccades usa los MISMOS vertices que 'h' de pursuit (geometria compartida)", () => {
    const saccadeH = getSaccadeWaypoints("h", 0.6);
    const pursuitFirstPoint = computePursuitPoint("h", 0, 0.6);
    assert.deepEqual(saccadeH[0], pursuitFirstPoint);
  });

  test("la secuencia determinista es COHERENTE y REPRODUCIBLE: recorre los vertices en orden fijo, en bucle", () => {
    const pattern = "horizontal";
    let prevIndex = -1;
    const seenPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const { point, index } = computeNextSaccadePosition(pattern, prevIndex, 0.6);
      seenPoints.push(point);
      prevIndex = index;
    }
    // 2 vertices -> alterna 1,0,1,0,1 (indices 0 y 1 por turnos)
    assert.deepEqual(seenPoints[0], seenPoints[2]);
    assert.deepEqual(seenPoints[1], seenPoints[3]);
    assert.deepEqual(seenPoints[0], seenPoints[4]);
  });

  test("el salto es DISCRETO: computeNextSaccadePosition nunca devuelve un punto intermedio entre 2 vertices", () => {
    const wp = getSaccadeWaypoints("horizontal", 0.6);
    const { point } = computeNextSaccadePosition("horizontal", -1, 0.6);
    assert.ok(wp.some((w: { x: number; y: number }) => w.x === point.x && w.y === point.y));
  });

  test("todas las posiciones devueltas estan dentro del area de trabajo (0..1)", () => {
    for (const pattern of ["horizontal", "vertical", "diagonal", "h", "x"] as const) {
      let prevIndex = -1;
      for (let i = 0; i < 8; i++) {
        const { point, index } = computeNextSaccadePosition(pattern, prevIndex, 0.6);
        assert.ok(isWithinUnit(point), `${pattern} fuera de rango: ${JSON.stringify(point)}`);
        prevIndex = index;
      }
    }
  });
});

describe("computeNextSaccadePosition — patron 'random'", () => {
  test("cada posicion esta acotada por la amplitud configurada", () => {
    let prevIndex = -1;
    for (let i = 0; i < 30; i++) {
      const { point, index } = computeNextSaccadePosition("random", prevIndex, 0.4, () => i / 30);
      assert.ok(isWithinUnit(point));
      assert.ok(Math.abs(point.x - 0.5) <= 0.2 + 1e-9);
      assert.ok(Math.abs(point.y - 0.5) <= 0.2 + 1e-9);
      prevIndex = index;
    }
  });

  test("el indice es simplemente un contador creciente (no referencia ninguna lista de vertices)", () => {
    const { index: i1 } = computeNextSaccadePosition("random", -1, 0.5, () => 0.5);
    const { index: i2 } = computeNextSaccadePosition("random", i1, 0.5, () => 0.5);
    assert.equal(i1, 0);
    assert.equal(i2, 1);
  });
});

describe("isDurationComplete", () => {
  test("modo 'manual' nunca finaliza por si solo, sea cual sea el tiempo transcurrido", () => {
    assert.equal(isDurationComplete(0, { mode: "manual", timedMs: 1000 }), false);
    assert.equal(isDurationComplete(999999, { mode: "manual", timedMs: 1000 }), false);
  });

  test("modo 'timed' finaliza exactamente al alcanzar timedMs (inclusive), no antes", () => {
    assert.equal(isDurationComplete(999, { mode: "timed", timedMs: 1000 }), false);
    assert.equal(isDurationComplete(1000, { mode: "timed", timedMs: 1000 }), true);
    assert.equal(isDurationComplete(1500, { mode: "timed", timedMs: 1000 }), true);
  });
});

describe("shouldChangePursuitElement", () => {
  test("false mientras no se alcanza PURSUIT_ELEMENT_CHANGE_INTERVAL_MS", () => {
    assert.equal(shouldChangePursuitElement(0), false);
    assert.equal(shouldChangePursuitElement(PURSUIT_ELEMENT_CHANGE_INTERVAL_MS - 1), false);
  });

  test("true exactamente al alcanzar el intervalo (inclusive), y despues", () => {
    assert.equal(shouldChangePursuitElement(PURSUIT_ELEMENT_CHANGE_INTERVAL_MS), true);
    assert.equal(shouldChangePursuitElement(PURSUIT_ELEMENT_CHANGE_INTERVAL_MS + 5000), true);
  });
});

describe("pickNextRandomElement", () => {
  const colors = ["#ef4444", "#3b82f6", "#ffeb3b", "#22c55e"];
  const letters = ["A", "B", "C"];

  test("nunca repite el elemento anterior cuando hay alternativas, en ninguna muestra de randomFn (colores)", () => {
    for (let i = 0; i < 100; i += 1) {
      const r = i / 100;
      const next = pickNextRandomElement(colors, "#ef4444", () => r);
      assert.notEqual(next, "#ef4444");
      assert.ok(colors.includes(next));
    }
  });

  test("funciona igual para letras (generico sobre string[], no especifico de color)", () => {
    for (let i = 0; i < 50; i += 1) {
      const next = pickNextRandomElement(letters, "A", () => i / 50);
      assert.notEqual(next, "A");
      assert.ok(letters.includes(next));
    }
  });

  test("sin elemento anterior (primera eleccion), puede devolver cualquiera de la seleccion", () => {
    const first = pickNextRandomElement(colors, null, () => 0);
    assert.equal(first, colors[0]);
    const last = pickNextRandomElement(colors, null, () => 0.999);
    assert.equal(last, colors[colors.length - 1]);
  });

  test("con un solo elemento seleccionado, lo devuelve aunque coincida con el anterior (no hay alternativa)", () => {
    const single = ["#ef4444"];
    assert.equal(pickNextRandomElement(single, "#ef4444", () => 0.5), "#ef4444");
  });

  test("con seleccion vacia, devuelve el anterior como respaldo (nunca lanza)", () => {
    assert.equal(pickNextRandomElement([], "#3b82f6", () => 0.5), "#3b82f6");
    assert.equal(pickNextRandomElement([], null, () => 0.5), "");
  });

  test("distribuye entre TODOS los elementos restantes (no se queda fijo en uno solo tras excluir el anterior)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < colors.length; i += 1) {
      seen.add(pickNextRandomElement(colors, "#ef4444", () => i / colors.length));
    }
    assert.deepEqual([...seen].sort(), ["#22c55e", "#3b82f6", "#ffeb3b"]);
  });
});

describe("getSelectedStimulusElements", () => {
  const base = DEFAULT_OCULOMOTOR_CONFIG.stimulus;

  test("devuelve el array correcto segun el type activo", () => {
    assert.deepEqual(getSelectedStimulusElements({ ...base, type: "colorCircle", colorElements: ["#ef4444", "#3b82f6"] }), [
      "#ef4444",
      "#3b82f6",
    ]);
    assert.deepEqual(getSelectedStimulusElements({ ...base, type: "letter", letterElements: ["A", "B"] }), ["A", "B"]);
    assert.deepEqual(getSelectedStimulusElements({ ...base, type: "number", numberElements: ["1"] }), ["1"]);
    assert.deepEqual(getSelectedStimulusElements({ ...base, type: "symbol", symbolElements: ["star"] }), ["star"]);
  });

  test("blackOnWhite/whiteOnBlack siempre devuelven [] (sin contenido seleccionable)", () => {
    assert.deepEqual(getSelectedStimulusElements({ ...base, type: "blackOnWhite", colorElements: ["#ef4444"] }), []);
    assert.deepEqual(getSelectedStimulusElements({ ...base, type: "whiteOnBlack", colorElements: ["#ef4444"] }), []);
  });

  test("ignora los arrays de OTRAS categorias (p.ej. type=letter con colorElements lleno no afecta)", () => {
    assert.deepEqual(
      getSelectedStimulusElements({ ...base, type: "letter", letterElements: ["Z"], colorElements: ["#ef4444", "#3b82f6", "#ffeb3b"] }),
      ["Z"]
    );
  });
});

describe("resolveInitialStimulusElement", () => {
  const base = DEFAULT_OCULOMOTOR_CONFIG.stimulus;

  test("devuelve el PRIMERO de los seleccionados, deterministico", () => {
    assert.equal(resolveInitialStimulusElement({ ...base, type: "colorCircle", colorElements: ["#3b82f6", "#ef4444"] }), "#3b82f6");
  });

  test("null si no hay ninguno seleccionado", () => {
    assert.equal(resolveInitialStimulusElement({ ...base, type: "colorCircle", colorElements: [] }), null);
  });

  test("null para blackOnWhite/whiteOnBlack (sin seleccion posible)", () => {
    assert.equal(resolveInitialStimulusElement({ ...base, type: "blackOnWhite" }), null);
  });
});

describe("canStartOculomotorExercise", () => {
  const base = DEFAULT_OCULOMOTOR_CONFIG.stimulus;

  test("1 elemento seleccionado: puede arrancar (fijo)", () => {
    assert.equal(canStartOculomotorExercise({ ...base, type: "colorCircle", colorElements: ["#ef4444"] }), true);
  });

  test("2+ elementos seleccionados: puede arrancar (aleatorio)", () => {
    assert.equal(canStartOculomotorExercise({ ...base, type: "colorCircle", colorElements: ["#ef4444", "#3b82f6"] }), true);
  });

  test("0 elementos seleccionados: NO puede arrancar", () => {
    assert.equal(canStartOculomotorExercise({ ...base, type: "colorCircle", colorElements: [] }), false);
    assert.equal(canStartOculomotorExercise({ ...base, type: "letter", letterElements: [] }), false);
    assert.equal(canStartOculomotorExercise({ ...base, type: "number", numberElements: [] }), false);
    assert.equal(canStartOculomotorExercise({ ...base, type: "symbol", symbolElements: [] }), false);
  });

  test("blackOnWhite/whiteOnBlack siempre pueden arrancar (sin seleccion que validar)", () => {
    assert.equal(canStartOculomotorExercise({ ...base, type: "blackOnWhite", colorElements: [] }), true);
    assert.equal(canStartOculomotorExercise({ ...base, type: "whiteOnBlack", colorElements: [] }), true);
  });
});
