/**
 * Pruebas aisladas de la logica pura de panalesConfig.ts - test runner
 * nativo de Node (node:test + node:assert/strict), mismo criterio que
 * hartConfig.test.ts/mcdonaldConfig.test.ts. Ejecutar con:
 *   node --test "src/components/visualLabTools/cartas/panales/panalesConfig.test.ts"
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./panalesConfig" + ".ts";
const mod = await import(modulePath);
const {
  DEFAULT_PANALES_CONFIG,
  PANALES_MIN_ROWS,
  PANALES_MAX_ROWS,
  PANALES_MIN_COLUMNS,
  PANALES_MAX_COLUMNS,
  PANALES_DEFAULT_ROWS,
  PANALES_DEFAULT_RED,
  PANALES_DEFAULT_BLUE,
  isValidHexColor,
  isValidPanalesDimensions,
  clampPanalesRows,
  clampPanalesColumns,
  computeHexGridLayout,
  generatePanalesContent,
  generateBalancedRedBlueFlags,
  resolvePanalesCellColor,
  generatePanalesCells,
  migratePanalesCardConfig,
  isValidPanalesCardConfig,
  resolvePanalesCardConfig,
} = mod;

describe("DEFAULT_PANALES_CONFIG", () => {
  test("8 filas x 8 columnas, tamaño mediano, colores por defecto", () => {
    assert.equal(DEFAULT_PANALES_CONFIG.rows, 8);
    assert.equal(DEFAULT_PANALES_CONFIG.columns, 8);
    assert.equal(DEFAULT_PANALES_CONFIG.cellSize, "md");
    assert.equal(DEFAULT_PANALES_CONFIG.redHex, PANALES_DEFAULT_RED);
    assert.equal(DEFAULT_PANALES_CONFIG.blueHex, PANALES_DEFAULT_BLUE);
  });

  test("es una configuracion valida por si misma", () => {
    assert.equal(isValidPanalesCardConfig(DEFAULT_PANALES_CONFIG), true);
  });
});

describe("isValidHexColor", () => {
  test("acepta hex de 6 digitos con/sin mayusculas", () => {
    assert.equal(isValidHexColor("#ef4444"), true);
    assert.equal(isValidHexColor("#EF4444"), true);
  });

  test("rechaza formatos invalidos", () => {
    assert.equal(isValidHexColor("ef4444"), false);
    assert.equal(isValidHexColor("#fff"), false);
    assert.equal(isValidHexColor("red"), false);
    assert.equal(isValidHexColor(""), false);
    assert.equal(isValidHexColor(123), false);
  });
});

describe("isValidPanalesDimensions / clampPanalesRows / clampPanalesColumns", () => {
  test("acepta los limites exactos (inclusive)", () => {
    assert.equal(isValidPanalesDimensions(PANALES_MIN_ROWS, PANALES_MIN_COLUMNS), true);
    assert.equal(isValidPanalesDimensions(PANALES_MAX_ROWS, PANALES_MAX_COLUMNS), true);
  });

  test("rechaza justo por debajo/por encima de los limites", () => {
    assert.equal(isValidPanalesDimensions(PANALES_MIN_ROWS - 1, 8), false);
    assert.equal(isValidPanalesDimensions(PANALES_MAX_ROWS + 1, 8), false);
    assert.equal(isValidPanalesDimensions(8, PANALES_MIN_COLUMNS - 1), false);
    assert.equal(isValidPanalesDimensions(8, PANALES_MAX_COLUMNS + 1), false);
  });

  test("rechaza valores no enteros", () => {
    assert.equal(isValidPanalesDimensions(8.5, 8), false);
    assert.equal(isValidPanalesDimensions(8, 8.5), false);
  });

  test("clampPanalesRows/clampPanalesColumns nunca devuelven un valor fuera de rango", () => {
    assert.equal(clampPanalesRows(-5), PANALES_MIN_ROWS);
    assert.equal(clampPanalesRows(9999), PANALES_MAX_ROWS);
    assert.equal(clampPanalesRows(8), 8);
    assert.equal(clampPanalesColumns(0), PANALES_MIN_COLUMNS);
    assert.equal(clampPanalesColumns(9999), PANALES_MAX_COLUMNS);
    assert.equal(clampPanalesColumns(8), 8);
  });

  test("clampPanalesRows/clampPanalesColumns nunca lanzan con entradas invalidas (NaN, Infinity)", () => {
    assert.doesNotThrow(() => clampPanalesRows(NaN));
    assert.doesNotThrow(() => clampPanalesRows(Infinity));
    assert.equal(clampPanalesRows(NaN), PANALES_DEFAULT_ROWS);
  });
});

describe("computeHexGridLayout", () => {
  for (const [rows, columns] of [
    [3, 3],
    [8, 8],
    [12, 14],
    [3, 14],
    [12, 3],
  ]) {
    test(`rows=${rows}, columns=${columns}: genera EXACTAMENTE rows*columns celdas`, () => {
      const layout = computeHexGridLayout(rows, columns);
      assert.equal(layout.cells.length, rows * columns);
    });

    test(`rows=${rows}, columns=${columns}: cada celda tiene indices row/col validos y unicos`, () => {
      const layout = computeHexGridLayout(rows, columns);
      const seen = new Set<string>();
      for (const cell of layout.cells) {
        assert.ok(cell.row >= 0 && cell.row < rows);
        assert.ok(cell.col >= 0 && cell.col < columns);
        const key = `${cell.row}-${cell.col}`;
        assert.ok(!seen.has(key), `celda duplicada: ${key}`);
        seen.add(key);
      }
    });

    test(`rows=${rows}, columns=${columns}: todas las celdas quedan DENTRO del contenedor (considerando el propio tamaño del hexagono)`, () => {
      const layout = computeHexGridLayout(rows, columns);
      const halfW = layout.hexWidthPercent / 2;
      const halfH = layout.hexHeightPercent / 2;
      for (const cell of layout.cells) {
        assert.ok(cell.xPercent - halfW >= -1e-6, `celda ${cell.row},${cell.col} se sale por la izquierda`);
        assert.ok(cell.xPercent + halfW <= 100 + 1e-6, `celda ${cell.row},${cell.col} se sale por la derecha`);
        assert.ok(cell.yPercent - halfH >= -1e-6, `celda ${cell.row},${cell.col} se sale por arriba`);
        assert.ok(cell.yPercent + halfH <= 100 + 1e-6, `celda ${cell.row},${cell.col} se sale por abajo`);
      }
    });

    test(`rows=${rows}, columns=${columns}: containerAspectRatio es positivo y finito`, () => {
      const layout = computeHexGridLayout(rows, columns);
      assert.ok(Number.isFinite(layout.containerAspectRatio));
      assert.ok(layout.containerAspectRatio > 0);
    });
  }

  test("filas impares estan desplazadas horizontalmente respecto a las filas pares (patron de panal)", () => {
    const layout = computeHexGridLayout(4, 5);
    const firstOfRow = (row: number) => layout.cells.find((c: { row: number; col: number }) => c.row === row && c.col === 0);
    const evenRowX = firstOfRow(0).xPercent;
    const oddRowX = firstOfRow(1).xPercent;
    assert.ok(Math.abs(oddRowX - evenRowX) > 1, `las filas pares/impares deberian estar desplazadas, pero estan casi alineadas (${evenRowX} vs ${oddRowX})`);
  });

  test("todas las celdas de una misma fila comparten exactamente la misma yPercent", () => {
    const layout = computeHexGridLayout(5, 6);
    for (let row = 0; row < 5; row += 1) {
      const ys = layout.cells.filter((c: { row: number }) => c.row === row).map((c: { yPercent: number }) => c.yPercent);
      const allEqual = ys.every((y: number) => Math.abs(y - ys[0]) < 1e-9);
      assert.ok(allEqual, `fila ${row} tiene celdas con yPercent distinto: ${JSON.stringify(ys)}`);
    }
  });

  test("las filas estan ordenadas de arriba a abajo (yPercent creciente con el indice de fila)", () => {
    const layout = computeHexGridLayout(6, 4);
    const yOfRow = (row: number) => layout.cells.find((c: { row: number; col: number }) => c.row === row && c.col === 0).yPercent;
    for (let row = 1; row < 6; row += 1) {
      assert.ok(yOfRow(row) > yOfRow(row - 1), `fila ${row} no esta por debajo de la fila ${row - 1}`);
    }
  });

  test("clampa filas/columnas fuera de rango sin lanzar", () => {
    assert.doesNotThrow(() => computeHexGridLayout(0, 0));
    assert.doesNotThrow(() => computeHexGridLayout(999, 999));
    assert.equal(computeHexGridLayout(0, 0).cells.length, PANALES_MIN_ROWS * PANALES_MIN_COLUMNS);
  });
});

describe("generatePanalesContent", () => {
  test("longitud exacta rows*columns", () => {
    const content = generatePanalesContent(8, 8, Math.random);
    assert.equal(content.length, 64);
  });

  test("usa solo numeros 1-9 (nunca 0)", () => {
    const content = generatePanalesContent(8, 8, Math.random);
    for (const c of content) assert.ok(/^[1-9]$/.test(c), `estimulo invalido: ${c}`);
  });

  test("con una fuente de aleatoriedad que varia, produce variedad (mas de un numero distinto)", () => {
    const seq = [0.05, 0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7, 0.9];
    let i = 0;
    const randomFn = () => seq[i++ % seq.length];
    const content = generatePanalesContent(8, 8, randomFn);
    assert.ok(new Set(content).size > 1, "se esperaba variedad, pero todos los estimulos son iguales");
  });

  test("nunca lanza en los limites minimo/maximo", () => {
    assert.doesNotThrow(() => generatePanalesContent(PANALES_MIN_ROWS, PANALES_MIN_COLUMNS, Math.random));
    assert.doesNotThrow(() => generatePanalesContent(PANALES_MAX_ROWS, PANALES_MAX_COLUMNS, Math.random));
  });
});

describe("generateBalancedRedBlueFlags", () => {
  test("exactamente ceil(N/2) true (rojo) y floor(N/2) false (azul), N par", () => {
    const flags = generateBalancedRedBlueFlags(64, Math.random);
    assert.equal(flags.length, 64);
    assert.equal(flags.filter(Boolean).length, 32);
    assert.equal(flags.filter((f: boolean) => !f).length, 32);
  });

  test("exactamente ceil(N/2) true y floor(N/2) false, N impar (el sobrante va a rojo)", () => {
    const flags = generateBalancedRedBlueFlags(9, Math.random);
    assert.equal(flags.filter(Boolean).length, 5);
    assert.equal(flags.filter((f: boolean) => !f).length, 4);
  });

  test("N=0: array vacio, nunca lanza", () => {
    assert.deepEqual(generateBalancedRedBlueFlags(0, Math.random), []);
  });

  test("el shuffle SI reordena con una secuencia de randomFn que varia", () => {
    let i = 0;
    const seq = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6];
    const randomFn = () => seq[i++ % seq.length];
    const flags = generateBalancedRedBlueFlags(8, randomFn);
    assert.notDeepEqual(flags, [true, true, true, true, false, false, false, false]);
  });
});

describe("resolvePanalesCellColor", () => {
  test("isRed=true devuelve redHex, isRed=false devuelve blueHex", () => {
    assert.equal(resolvePanalesCellColor(true, "#ff0000", "#0000ff"), "#ff0000");
    assert.equal(resolvePanalesCellColor(false, "#ff0000", "#0000ff"), "#0000ff");
  });
});

describe("generatePanalesCells", () => {
  test("longitud exacta rows*columns, contenido/marca coherentes", () => {
    const cells = generatePanalesCells(DEFAULT_PANALES_CONFIG, Math.random);
    assert.equal(cells.length, 64);
    for (const cell of cells) {
      assert.ok(/^[1-9]$/.test(cell.content));
      assert.equal(typeof cell.isRed, "boolean");
    }
  });

  test("distribucion roja/azul equilibrada exacta", () => {
    const cells = generatePanalesCells(DEFAULT_PANALES_CONFIG, Math.random);
    const red = cells.filter((c: { isRed: boolean }) => c.isRed).length;
    const blue = cells.filter((c: { isRed: boolean }) => !c.isRed).length;
    assert.equal(red, 32);
    assert.equal(blue, 32);
  });

  test("la POSICION no cambia entre regeneraciones (solo depende de rows/columns, nunca de randomFn)", () => {
    const a = generatePanalesCells(DEFAULT_PANALES_CONFIG, () => 0.1);
    const b = generatePanalesCells(DEFAULT_PANALES_CONFIG, () => 0.9);
    for (let i = 0; i < a.length; i += 1) {
      assert.equal(a[i].xPercent, b[i].xPercent);
      assert.equal(a[i].yPercent, b[i].yPercent);
      assert.equal(a[i].row, b[i].row);
      assert.equal(a[i].col, b[i].col);
    }
  });

  test("ignora cellSize/redHex/blueHex por completo (mismo randomFn, mismo resultado aunque esos campos difieran) - la generacion nunca 'sortea' el color, solo la marca roja/azul", () => {
    const configA = { ...DEFAULT_PANALES_CONFIG, cellSize: "sm", redHex: "#111111", blueHex: "#222222" };
    const configB = { ...DEFAULT_PANALES_CONFIG, cellSize: "lg", redHex: "#ff00ff", blueHex: "#00ffff" };
    let i = 0;
    const seq = [0.1, 0.5, 0.9, 0.3, 0.7];
    const randomFn = () => seq[i++ % seq.length];
    i = 0;
    const a = generatePanalesCells(configA, randomFn);
    i = 0;
    const b = generatePanalesCells(configB, randomFn);
    assert.deepEqual(a, b);
  });

  test("regenerar (randomFn distinto) produce una combinacion de contenido/marca distinta cuando es posible", () => {
    const seqA = [0.05, 0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7, 0.9];
    const seqB = [0.95, 0.75, 0.55, 0.35, 0.15, 0.85, 0.65, 0.45, 0.25, 0.05];
    let i = 0;
    const randomFnA = () => seqA[i++ % seqA.length];
    i = 0;
    const randomFnB = () => seqB[i++ % seqB.length];
    const a = generatePanalesCells(DEFAULT_PANALES_CONFIG, randomFnA);
    const b = generatePanalesCells(DEFAULT_PANALES_CONFIG, randomFnB);
    assert.notDeepEqual(a.map((c: { content: string }) => c.content), b.map((c: { content: string }) => c.content));
  });

  test("cambiar redHex/blueHex NUNCA cambia el contenido ni la marca roja/azul de ninguna celda (solo el color resuelto, via resolvePanalesCellColor, cambia)", () => {
    const base = generatePanalesCells(DEFAULT_PANALES_CONFIG, () => 0.42);
    const customColors = generatePanalesCells({ ...DEFAULT_PANALES_CONFIG, redHex: "#123456", blueHex: "#abcdef" }, () => 0.42);
    assert.deepEqual(base, customColors);
  });
});

describe("migratePanalesCardConfig / isValidPanalesCardConfig / resolvePanalesCardConfig", () => {
  test("una configuracion ya valida (v1) se resuelve sin cambios", () => {
    const resolved = resolvePanalesCardConfig(DEFAULT_PANALES_CONFIG);
    assert.deepEqual(resolved, DEFAULT_PANALES_CONFIG);
  });

  test("migratePanalesCardConfig devuelve la MISMA referencia si ya esta en la version actual", () => {
    assert.equal(migratePanalesCardConfig(DEFAULT_PANALES_CONFIG), DEFAULT_PANALES_CONFIG);
  });

  test("migratePanalesCardConfig nunca lanza con entradas invalidas (null, numero, string, array)", () => {
    assert.doesNotThrow(() => migratePanalesCardConfig(null));
    assert.doesNotThrow(() => migratePanalesCardConfig(42));
    assert.doesNotThrow(() => migratePanalesCardConfig("hola"));
    assert.doesNotThrow(() => migratePanalesCardConfig([1, 2, 3]));
    assert.doesNotThrow(() => migratePanalesCardConfig(undefined));
  });

  test("isValidPanalesCardConfig rechaza cada campo invalido por separado", () => {
    assert.equal(isValidPanalesCardConfig({ ...DEFAULT_PANALES_CONFIG, schemaVersion: 99 }), false);
    assert.equal(isValidPanalesCardConfig({ ...DEFAULT_PANALES_CONFIG, rows: 0 }), false);
    assert.equal(isValidPanalesCardConfig({ ...DEFAULT_PANALES_CONFIG, columns: 999 }), false);
    assert.equal(isValidPanalesCardConfig({ ...DEFAULT_PANALES_CONFIG, cellSize: "xl" }), false);
    assert.equal(isValidPanalesCardConfig({ ...DEFAULT_PANALES_CONFIG, redHex: "not-a-color" }), false);
    assert.equal(isValidPanalesCardConfig({ ...DEFAULT_PANALES_CONFIG, blueHex: "not-a-color" }), false);
  });

  test("isValidPanalesCardConfig rechaza valores no-objeto sin lanzar", () => {
    assert.equal(isValidPanalesCardConfig(null), false);
    assert.equal(isValidPanalesCardConfig(undefined), false);
    assert.equal(isValidPanalesCardConfig("config"), false);
    assert.equal(isValidPanalesCardConfig(42), false);
  });

  test("resolvePanalesCardConfig devuelve null (nunca lanza) ante entradas irrecuperables", () => {
    assert.equal(resolvePanalesCardConfig(null), null);
    assert.equal(resolvePanalesCardConfig({}), null);
    assert.equal(resolvePanalesCardConfig({ foo: "bar" }), null);
    assert.equal(resolvePanalesCardConfig("garbage"), null);
  });

  test("resolvePanalesCardConfig acepta una configuracion valida con parametros distintos al default", () => {
    const custom = { ...DEFAULT_PANALES_CONFIG, rows: 6, columns: 10, cellSize: "lg", redHex: "#aa0000", blueHex: "#0000aa" };
    const resolved = resolvePanalesCardConfig(custom);
    assert.deepEqual(resolved, custom);
  });
});
