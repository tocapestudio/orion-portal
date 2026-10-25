/**
 * Pruebas aisladas de la logica pura de hartConfig.ts - test runner
 * nativo de Node (node:test + node:assert/strict), mismo criterio que
 * stimulusConfig.test.ts/oculomotorConfig.test.ts. Ejecutar con:
 *   node --test "src/components/visualLabTools/cartas/hart/hartConfig.test.ts"
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Import dinamico con ruta NO literal (mismo motivo documentado en los
// demas archivos de test de este proyecto: TS5097 con moduleResolution
// "bundler" en un import ESTATICO con extension .ts explicita).
const modulePath = "./hartConfig" + ".ts";
const mod = await import(modulePath);
const {
  DEFAULT_HART_CONFIG,
  HART_MIN_ROWS,
  HART_MAX_ROWS,
  HART_MIN_COLUMNS,
  HART_MAX_COLUMNS,
  HART_NEUTRAL_COLOR,
  isValidHartDimensions,
  clampHartRows,
  clampHartColumns,
  isValidHexColor,
  generateHartGrid,
  generateBalancedRedGreenFlags,
  resolveHartCellColors,
  generateHartCells,
  migrateHartCardConfig,
  isValidHartCardConfig,
  resolveHartCardConfig,
} = mod;

// Catalogos LOCALES para el test, deliberadamente SIN importar
// stimulusConfig.ts (hartConfig.ts no depende de ningun catalogo propio,
// ver el comentario de cabecera del modulo - generateHartGrid/
// generateHartCells reciben el pool como parametro, igual criterio aqui).
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const MIXED = [...LETTERS, ...NUMBERS];

describe("DEFAULT_HART_CONFIG", () => {
  test("4 filas x 8 columnas, contenido letras, color neutro, cerca, tamaño mediano", () => {
    assert.equal(DEFAULT_HART_CONFIG.rows, 4);
    assert.equal(DEFAULT_HART_CONFIG.columns, 8);
    assert.equal(DEFAULT_HART_CONFIG.content, "letters");
    assert.equal(DEFAULT_HART_CONFIG.colorMode, "neutral");
    assert.equal(DEFAULT_HART_CONFIG.presentation, "near");
    assert.equal(DEFAULT_HART_CONFIG.size, "md");
  });

  test("es una configuracion valida por si misma", () => {
    assert.equal(isValidHartCardConfig(DEFAULT_HART_CONFIG), true);
  });
});

describe("isValidHartDimensions / clampHartRows / clampHartColumns", () => {
  test("acepta los limites exactos (inclusive)", () => {
    assert.equal(isValidHartDimensions(HART_MIN_ROWS, HART_MIN_COLUMNS), true);
    assert.equal(isValidHartDimensions(HART_MAX_ROWS, HART_MAX_COLUMNS), true);
  });

  test("rechaza justo por debajo/por encima de los limites", () => {
    assert.equal(isValidHartDimensions(HART_MIN_ROWS - 1, 4), false);
    assert.equal(isValidHartDimensions(HART_MAX_ROWS + 1, 4), false);
    assert.equal(isValidHartDimensions(4, HART_MIN_COLUMNS - 1), false);
    assert.equal(isValidHartDimensions(4, HART_MAX_COLUMNS + 1), false);
  });

  test("rechaza valores no enteros", () => {
    assert.equal(isValidHartDimensions(4.5, 8), false);
    assert.equal(isValidHartDimensions(4, 8.5), false);
  });

  test("clampHartRows/clampHartColumns nunca devuelven un valor fuera de rango", () => {
    assert.equal(clampHartRows(-5), HART_MIN_ROWS);
    assert.equal(clampHartRows(9999), HART_MAX_ROWS);
    assert.equal(clampHartRows(4), 4);
    assert.equal(clampHartColumns(0), HART_MIN_COLUMNS);
    assert.equal(clampHartColumns(9999), HART_MAX_COLUMNS);
    assert.equal(clampHartColumns(8), 8);
  });

  test("clampHartRows/clampHartColumns nunca lanzan con entradas invalidas (NaN, Infinity)", () => {
    assert.doesNotThrow(() => clampHartRows(NaN));
    assert.doesNotThrow(() => clampHartRows(Infinity));
    assert.equal(clampHartRows(NaN), HART_MIN_ROWS);
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

describe("generateHartGrid", () => {
  test("longitud exacta rows*columns, para varias combinaciones", () => {
    for (const [rows, columns] of [[1, 1], [4, 8], [10, 12], [2, 3]]) {
      const grid = generateHartGrid(rows, columns, LETTERS, () => 0.5);
      assert.equal(grid.length, rows * columns);
    }
  });

  test("contenido 'letters' usa solo letras A-Z", () => {
    const grid = generateHartGrid(4, 8, LETTERS, Math.random);
    for (const cell of grid) assert.ok(/^[A-Z]$/.test(cell), `celda invalida: ${cell}`);
  });

  test("contenido 'numbers' usa solo digitos 0-9", () => {
    const grid = generateHartGrid(4, 8, NUMBERS, Math.random);
    for (const cell of grid) assert.ok(/^[0-9]$/.test(cell), `celda invalida: ${cell}`);
  });

  test("contenido 'mixed' usa SOLO letras y/o digitos (ambos catalogos combinados)", () => {
    const grid = generateHartGrid(4, 8, MIXED, Math.random);
    for (const cell of grid) assert.ok(/^[A-Z0-9]$/.test(cell), `celda invalida: ${cell}`);
  });

  test("evita repetir la celda INMEDIATA a la izquierda cuando el pool tiene alternativas", () => {
    // randomFn fijo en 0 fuerza "elegir siempre el primer candidato" - si
    // el filtrado de vecino funciona, nunca debe repetirse horizontalmente.
    const grid = generateHartGrid(3, 6, LETTERS, () => 0);
    for (let r = 0; r < 3; r += 1) {
      for (let c = 1; c < 6; c += 1) {
        const i = r * 6 + c;
        assert.notEqual(grid[i], grid[i - 1], `repeticion horizontal en fila ${r}, columna ${c}`);
      }
    }
  });

  test("rejillas de 1 columna (sin vecino horizontal posible) nunca lanzan", () => {
    assert.doesNotThrow(() => generateHartGrid(5, 1, LETTERS, Math.random));
    const grid = generateHartGrid(5, 1, LETTERS, Math.random);
    assert.equal(grid.length, 5);
  });

  test("rejilla minima 1x1 nunca lanza", () => {
    assert.doesNotThrow(() => generateHartGrid(1, 1, MIXED, Math.random));
  });

  test("rejilla maxima (10x12) nunca lanza ni bloquea (sin bucle infinito)", () => {
    assert.doesNotThrow(() => generateHartGrid(HART_MAX_ROWS, HART_MAX_COLUMNS, NUMBERS, Math.random));
  });
});

describe("generateBalancedRedGreenFlags", () => {
  test("exactamente ceil(N/2) true (rojo) y floor(N/2) false (verde), N par", () => {
    const flags = generateBalancedRedGreenFlags(32, Math.random);
    assert.equal(flags.length, 32);
    assert.equal(flags.filter(Boolean).length, 16);
    assert.equal(flags.filter((f: boolean) => !f).length, 16);
  });

  test("exactamente ceil(N/2) true y floor(N/2) false, N impar (el sobrante va a rojo)", () => {
    const flags = generateBalancedRedGreenFlags(7, Math.random);
    assert.equal(flags.filter(Boolean).length, 4);
    assert.equal(flags.filter((f: boolean) => !f).length, 3);
  });

  test("N=1: un unico rojo", () => {
    const flags = generateBalancedRedGreenFlags(1, Math.random);
    assert.deepEqual(flags, [true]);
  });

  test("N=0: array vacio, nunca lanza", () => {
    assert.deepEqual(generateBalancedRedGreenFlags(0, Math.random), []);
  });

  test("con el MISMO randomFn (determinista), el resultado es reproducible", () => {
    let i = 0;
    const seq = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.8, 0.4];
    const randomFn = () => seq[i++ % seq.length];
    i = 0;
    const a = generateBalancedRedGreenFlags(8, randomFn);
    i = 0;
    const b = generateBalancedRedGreenFlags(8, randomFn);
    assert.deepEqual(a, b);
  });

  test("el shuffle SI reordena con una secuencia de randomFn que varia (no deja [rojo...,verde...] sin tocar)", () => {
    // Un randomFn CONSTANTE hace que cada paso de Durstenfeld sea un
    // autointercambio (j siempre = i), sin reordenar nada - por eso aqui
    // se usa una secuencia que VARIA entre llamadas, no un valor fijo.
    let i = 0;
    const seq = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6];
    const randomFn = () => seq[i++ % seq.length];
    const flags = generateBalancedRedGreenFlags(8, randomFn);
    assert.notDeepEqual(flags, [true, true, true, true, false, false, false, false]);
  });
});

describe("resolveHartCellColors", () => {
  test("'neutral': todas las celdas con HART_NEUTRAL_COLOR", () => {
    const colors = resolveHartCellColors("neutral", "#ef4444", "#22c55e", 10, Math.random);
    assert.ok(colors.every((c: string) => c === HART_NEUTRAL_COLOR));
  });

  test("'monochromeRed': todas las celdas con redHex", () => {
    const colors = resolveHartCellColors("monochromeRed", "#ff0000", "#00ff00", 10, Math.random);
    assert.ok(colors.every((c: string) => c === "#ff0000"));
  });

  test("'monochromeGreen': todas las celdas con greenHex", () => {
    const colors = resolveHartCellColors("monochromeGreen", "#ff0000", "#00ff00", 10, Math.random);
    assert.ok(colors.every((c: string) => c === "#00ff00"));
  });

  test("'redGreen': distribucion equilibrada exacta entre redHex/greenHex", () => {
    const colors = resolveHartCellColors("redGreen", "#ff0000", "#00ff00", 9, Math.random);
    assert.equal(colors.filter((c: string) => c === "#ff0000").length, 5);
    assert.equal(colors.filter((c: string) => c === "#00ff00").length, 4);
  });
});

describe("generateHartCells", () => {
  test("longitud y color coherentes con la configuracion (redGreen, N impar)", () => {
    const config = { ...DEFAULT_HART_CONFIG, rows: 3, columns: 3, colorMode: "redGreen", redHex: "#ff0000", greenHex: "#00ff00" };
    const cells = generateHartCells(config, LETTERS, Math.random);
    assert.equal(cells.length, 9);
    const reds = cells.filter((c: { color: string }) => c.color === "#ff0000").length;
    const greens = cells.filter((c: { color: string }) => c.color === "#00ff00").length;
    assert.equal(reds, 5);
    assert.equal(greens, 4);
    for (const cell of cells) assert.ok(/^[A-Z]$/.test(cell.content));
  });
});

describe("migrateHartCardConfig / isValidHartCardConfig / resolveHartCardConfig", () => {
  test("una configuracion ya valida (v1) se resuelve sin cambios", () => {
    const resolved = resolveHartCardConfig(DEFAULT_HART_CONFIG);
    assert.deepEqual(resolved, DEFAULT_HART_CONFIG);
  });

  test("migrateHartCardConfig devuelve la MISMA referencia si ya esta en la version actual", () => {
    assert.equal(migrateHartCardConfig(DEFAULT_HART_CONFIG), DEFAULT_HART_CONFIG);
  });

  test("migrateHartCardConfig nunca lanza con entradas invalidas (null, numero, string, array)", () => {
    assert.doesNotThrow(() => migrateHartCardConfig(null));
    assert.doesNotThrow(() => migrateHartCardConfig(42));
    assert.doesNotThrow(() => migrateHartCardConfig("hola"));
    assert.doesNotThrow(() => migrateHartCardConfig([1, 2, 3]));
    assert.doesNotThrow(() => migrateHartCardConfig(undefined));
  });

  test("isValidHartCardConfig rechaza cada campo invalido por separado", () => {
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, schemaVersion: 99 }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, rows: 0 }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, columns: 999 }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, content: "shapes" }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, colorMode: "rainbow" }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, redHex: "not-a-color" }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, greenHex: "not-a-color" }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, presentation: "medium" }), false);
    assert.equal(isValidHartCardConfig({ ...DEFAULT_HART_CONFIG, size: "xl" }), false);
  });

  test("isValidHartCardConfig rechaza valores no-objeto sin lanzar", () => {
    assert.equal(isValidHartCardConfig(null), false);
    assert.equal(isValidHartCardConfig(undefined), false);
    assert.equal(isValidHartCardConfig("config"), false);
    assert.equal(isValidHartCardConfig(42), false);
  });

  test("resolveHartCardConfig devuelve null (nunca lanza) ante entradas irrecuperables", () => {
    assert.equal(resolveHartCardConfig(null), null);
    assert.equal(resolveHartCardConfig({}), null);
    assert.equal(resolveHartCardConfig({ foo: "bar" }), null);
    assert.equal(resolveHartCardConfig("garbage"), null);
  });

  test("resolveHartCardConfig acepta una configuracion valida con parametros distintos al default", () => {
    const custom = { ...DEFAULT_HART_CONFIG, rows: 2, columns: 5, content: "mixed", colorMode: "redGreen" };
    const resolved = resolveHartCardConfig(custom);
    assert.deepEqual(resolved, custom);
  });
});
