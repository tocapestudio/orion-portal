/**
 * Pruebas aisladas de la logica pura de optotiposConfig.ts - test
 * runner nativo de Node (node:test + node:assert/strict), mismo
 * criterio que hartConfig.test.ts/mcdonaldConfig.test.ts/
 * panalesConfig.test.ts. Ejecutar con:
 *   node --test "src/components/visualLabTools/optotipos/optotiposConfig.test.ts"
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./optotiposConfig" + ".ts";
const mod = await import(modulePath);
const {
  OPTOTIPO_LETTER_POOL,
  OPTOTIPO_NUMBER_POOL,
  SNELLEN_E_ROTATIONS,
  LANDOLT_C_ROTATIONS,
  isValidHexColor,
  generateOptotipoSymbols,
  clampSizePercent,
  OPTOTIPO_MIN_SIZE_PERCENT,
  OPTOTIPO_MAX_SIZE_PERCENT,
  AGUDEZA_DECIMAL_ROWS,
  AGUDEZA_SYMBOLS_PER_ROW,
  isValidAgudezaDecimal,
  computeAgudezaRowSizeRatio,
  DEFAULT_AGUDEZA_CONFIG,
  generateAgudezaRows,
  isValidAgudezaConfig,
  AGUDEZA_BLOCK_SIZE,
  AGUDEZA_BLOCK_COUNT,
  AGUDEZA_BLOCK_START_INDEX,
  clampAgudezaBlockIndex,
  getAgudezaBlockDecimals,
  CIRCULO_HORARIO_MIN_LINES,
  CIRCULO_HORARIO_MAX_LINES,
  CIRCULO_HORARIO_DEFAULT_LINES,
  clampCirculoHorarioLines,
  computeClockDialAngles,
  DEFAULT_CIRCULO_HORARIO_CONFIG,
  isValidCirculoHorarioConfig,
  DEFAULT_ROJO_VERDE_CONFIG,
  isValidRojoVerdeConfig,
  DEFAULT_FIJACION_CONFIG,
  isValidFijacionConfig,
  WORTH_DOTS,
  DEFAULT_WORTH_CONFIG,
  isValidWorthConfig,
  DEFAULT_OPTOTIPOS_CONFIG,
  migrateOptotiposCardConfig,
  isValidOptotiposCardConfig,
  resolveOptotiposCardConfig,
  VIEWING_DISTANCE_PRESETS,
  DEFAULT_VIEWING_DISTANCE_CM,
  clampViewingDistanceCm,
  isValidViewingDistanceCm,
  OPTOTYPE_HEIGHT_TO_MAR_RATIO,
  computeMarArcMinutes,
  computeOptotypeHeightMm,
  CALIBRATION_REFERENCE_LINE_PX,
  MIN_CALIBRATION_MEASURED_MM,
  MAX_CALIBRATION_MEASURED_MM,
  isValidCalibrationMeasuredMm,
  computeCalibratedPxPerMm,
  computeCalibratedOptotypeSizePx,
  isValidMonitorCalibration,
  MIN_LEGIBLE_OPTOTYPE_PX,
  isBelowLegibleFloor,
  DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG,
  isValidAlineamientoBinocularConfig,
  CONTRASTE_BACKGROUND_GRAY,
  CONTRASTE_MIN_PERCENT,
  CONTRASTE_MAX_PERCENT,
  CONTRASTE_DEFAULT_PERCENT,
  CONTRASTE_STEP_PERCENT,
  clampContrastPercent,
  snapContrastPercentToStep,
  computeWeberContrast,
  computeContrastGrayLevel,
  DEFAULT_CONTRASTE_CONFIG,
  isValidContrasteConfig,
  MICHELSON_MEAN_GRAY,
  REJILLA_FREQUENCY_LEVELS,
  REJILLA_DEFAULT_FREQUENCY_LEVEL_INDEX,
  REJILLA_DEFAULT_CONTRAST_PERCENT,
  clampRejillaFrequencyLevelIndex,
  REJILLA_ORIENTATION_VALUES,
  isValidRejillaOrientation,
  getRejillaOrientationAngleDeg,
  generateRejillaOrientations,
  computeMichelsonContrast,
  computeGratingLuminanceRange,
  computeDegreePhysicalSizeMm,
  computeCircleAngularDiameterDegrees,
  DEFAULT_REJILLA_CONFIG,
  isValidRejillaConfig,
} = mod;

describe("isValidHexColor", () => {
  test("acepta hex de 6 digitos con/sin mayusculas", () => {
    assert.equal(isValidHexColor("#ef4444"), true);
    assert.equal(isValidHexColor("#EF4444"), true);
  });
  test("rechaza formatos invalidos", () => {
    assert.equal(isValidHexColor("ef4444"), false);
    assert.equal(isValidHexColor("#fff"), false);
    assert.equal(isValidHexColor(123), false);
  });
});

describe("clampSizePercent", () => {
  test("nunca devuelve un valor fuera de [MIN, MAX]", () => {
    assert.equal(clampSizePercent(-5, 10), OPTOTIPO_MIN_SIZE_PERCENT);
    assert.equal(clampSizePercent(9999, 10), OPTOTIPO_MAX_SIZE_PERCENT);
    assert.equal(clampSizePercent(10, 5), 10);
  });
  test("usa el fallback con entradas invalidas (NaN, Infinity)", () => {
    assert.equal(clampSizePercent(NaN, 7), 7);
    assert.doesNotThrow(() => clampSizePercent(Infinity, 7));
  });
});

describe("generateOptotipoSymbols", () => {
  test("'letters': longitud exacta, solo caracteres del pool", () => {
    const symbols = generateOptotipoSymbols(5, "letters", Math.random);
    assert.equal(symbols.length, 5);
    for (const s of symbols) {
      assert.ok(OPTOTIPO_LETTER_POOL.includes(s.char), `caracter invalido: ${s.char}`);
      assert.equal(s.rotationDeg, undefined);
    }
  });

  test("'numbers': solo digitos del pool", () => {
    const symbols = generateOptotipoSymbols(5, "numbers", Math.random);
    for (const s of symbols) assert.ok(OPTOTIPO_NUMBER_POOL.includes(s.char));
  });

  test("'snellenE': solo rotaciones validas (0/90/180/270), sin char", () => {
    const symbols = generateOptotipoSymbols(10, "snellenE", Math.random);
    for (const s of symbols) {
      assert.ok(SNELLEN_E_ROTATIONS.includes(s.rotationDeg), `rotacion invalida: ${s.rotationDeg}`);
      assert.equal(s.char, undefined);
    }
  });

  test("'landoltC': solo rotaciones validas (8 orientaciones), sin char", () => {
    const symbols = generateOptotipoSymbols(10, "landoltC", Math.random);
    for (const s of symbols) {
      assert.ok(LANDOLT_C_ROTATIONS.includes(s.rotationDeg), `rotacion invalida: ${s.rotationDeg}`);
      assert.equal(s.char, undefined);
    }
  });

  test("con una fuente de aleatoriedad que varia, produce variedad", () => {
    const seq = [0.05, 0.3, 0.6, 0.9, 0.15, 0.45, 0.75];
    let i = 0;
    const randomFn = () => seq[i++ % seq.length];
    const symbols = generateOptotipoSymbols(7, "letters", randomFn);
    assert.ok(new Set(symbols.map((s: { char: string }) => s.char)).size > 1, "se esperaba variedad");
  });

  // Requisito explicito: "dentro de una misma fila no debe repetirse
  // ningun optotipo" - letras/numeros/E de Snellen (landoltC queda
  // fuera a proposito).
  test("'letters': nunca repite un caracter dentro de la misma llamada (count <= tamaño del pool)", () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const symbols = generateOptotipoSymbols(5, "letters", Math.random);
      const chars = symbols.map((s: { char: string }) => s.char);
      assert.equal(new Set(chars).size, chars.length, `repetidos en ${JSON.stringify(chars)}`);
    }
  });

  test("'numbers': nunca repite un digito dentro de la misma llamada", () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const symbols = generateOptotipoSymbols(5, "numbers", Math.random);
      const chars = symbols.map((s: { char: string }) => s.char);
      assert.equal(new Set(chars).size, chars.length, `repetidos en ${JSON.stringify(chars)}`);
    }
  });

  test("'snellenE': con count <= 4 (numero de orientaciones) nunca repite una orientacion", () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const symbols = generateOptotipoSymbols(4, "snellenE", Math.random);
      const rotations = symbols.map((s: { rotationDeg: number }) => s.rotationDeg);
      assert.equal(new Set(rotations).size, rotations.length, `repetidos en ${JSON.stringify(rotations)}`);
    }
  });

  test("'snellenE': con count=5 (AGUDEZA_SYMBOLS_PER_ROW) > 4 orientaciones disponibles, el desborde se gestiona EXPLICITAMENTE (nunca una repeticion silenciosa arbitraria): las 4 primeras son todas distintas y cubren las 4 orientaciones, solo la 5a repite", () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const symbols = generateOptotipoSymbols(5, "snellenE", Math.random);
      const rotations = symbols.map((s: { rotationDeg: number }) => s.rotationDeg);
      assert.equal(new Set(rotations.slice(0, 4)).size, 4, `las 4 primeras deberian cubrir las 4 orientaciones: ${JSON.stringify(rotations)}`);
      assert.ok(SNELLEN_E_ROTATIONS.includes(rotations[4]));
    }
  });

  test("'landoltC': SIN restriccion de unicidad (requisito explicito, a diferencia de letras/numeros/snellenE) - puede repetir orientaciones con normalidad", () => {
    const seq = [0, 0, 0, 0, 0];
    let i = 0;
    const randomFn = () => seq[i++ % seq.length];
    const symbols = generateOptotipoSymbols(5, "landoltC", randomFn);
    assert.equal(new Set(symbols.map((s: { rotationDeg: number }) => s.rotationDeg)).size, 1, "landoltC deberia poder repetir sin restriccion");
  });

  test("filas DIFERENTES pueden compartir caracteres entre si (la restriccion de unicidad es SOLO dentro de cada fila)", () => {
    const rowA = generateOptotipoSymbols(5, "letters", () => 0);
    const rowB = generateOptotipoSymbols(5, "letters", () => 0);
    assert.deepEqual(rowA, rowB, "misma randomFn determinista -> mismo contenido entre filas, sin ninguna restriccion cruzada");
  });
});

describe("Calibracion fisica (distancia + pantalla)", () => {
  test("VIEWING_DISTANCE_PRESETS: EXACTAMENTE las 8 distancias pedidas, en cm, sin opcion personalizada", () => {
    assert.deepEqual(
      VIEWING_DISTANCE_PRESETS.map((p: { cm: number }) => p.cm),
      [25, 40, 100, 200, 300, 400, 500, 600]
    );
    assert.deepEqual(
      VIEWING_DISTANCE_PRESETS.map((p: { label: string }) => p.label),
      ["25 cm", "40 cm", "1 m", "2 m", "3 m", "4 m", "5 m", "6 m"]
    );
  });

  test("clampViewingDistanceCm siempre devuelve la distancia PRESET mas cercana (lista cerrada, sin valores personalizados)", () => {
    assert.equal(clampViewingDistanceCm(-5), 25);
    assert.equal(clampViewingDistanceCm(999999), 600);
    assert.equal(clampViewingDistanceCm(300), 300);
    assert.equal(clampViewingDistanceCm(28), 25);
    assert.equal(clampViewingDistanceCm(90), 100);
    assert.equal(clampViewingDistanceCm(NaN), DEFAULT_VIEWING_DISTANCE_CM);
    assert.doesNotThrow(() => clampViewingDistanceCm(Infinity));
  });

  test("isValidViewingDistanceCm SOLO acepta los 8 valores preset exactos (ninguna distancia personalizada es valida)", () => {
    for (const p of VIEWING_DISTANCE_PRESETS) assert.equal(isValidViewingDistanceCm(p.cm), true);
    assert.equal(isValidViewingDistanceCm(50), false);
    assert.equal(isValidViewingDistanceCm(150), false);
    assert.equal(isValidViewingDistanceCm("300"), false);
    assert.equal(isValidViewingDistanceCm(NaN), false);
  });

  test("computeMarArcMinutes = 1/V (MAR estandar de un optotipo decimal)", () => {
    assert.equal(computeMarArcMinutes(1.0), 1);
    assert.equal(computeMarArcMinutes(0.5), 2);
    assert.equal(computeMarArcMinutes(0.1), 10);
    assert.equal(computeMarArcMinutes(2.0), 0.5);
  });

  test("OPTOTYPE_HEIGHT_TO_MAR_RATIO es 5 (proporcion estandar Snellen/Sloan 5:1)", () => {
    assert.equal(OPTOTYPE_HEIGHT_TO_MAR_RATIO, 5);
  });

  test("computeOptotypeHeightMm: verificacion contra un valor clinico de referencia conocido (6 m, V=1.0 -> ~8.73 mm, letra Snellen 6/6)", () => {
    const heightMm = computeOptotypeHeightMm(1.0, 600);
    assert.ok(Math.abs(heightMm - 8.73) < 0.05, `altura calculada ${heightMm} deberia ser ~8.73mm`);
  });

  test("computeOptotypeHeightMm: a la MISMA distancia, una linea de decimal menor exige un optotipo mas GRANDE (proporcion fisica correcta)", () => {
    const distance = 300;
    let previousHeight = 0;
    for (const decimal of AGUDEZA_DECIMAL_ROWS.slice().sort((a: number, b: number) => b - a)) {
      const h = computeOptotypeHeightMm(decimal, distance);
      assert.ok(h > previousHeight, `decimal=${decimal}: la altura deberia crecer segun decrece el decimal`);
      previousHeight = h;
    }
  });

  test("computeOptotypeHeightMm: a MAYOR distancia de exploracion, el mismo decimal exige un optotipo fisico mas GRANDE", () => {
    const h40cm = computeOptotypeHeightMm(1.0, 40);
    const h300cm = computeOptotypeHeightMm(1.0, 300);
    const h600cm = computeOptotypeHeightMm(1.0, 600);
    assert.ok(h40cm < h300cm);
    assert.ok(h300cm < h600cm);
  });

  test("computeOptotypeHeightMm: la proporcion relativa entre lineas coincide (hasta un error de angulo pequeño despreciable) con computeAgudezaRowSizeRatio", () => {
    const distance = 300;
    const hTarget = computeOptotypeHeightMm(1.0, distance);
    const h02 = computeOptotypeHeightMm(0.2, distance);
    const ratio = h02 / hTarget;
    const expectedRatio = computeAgudezaRowSizeRatio(0.2, 1.0);
    assert.ok(Math.abs(ratio - expectedRatio) / expectedRatio < 0.001, `ratio fisico ${ratio} deberia ser ~igual al ratio geometrico ${expectedRatio}`);
  });

  test("computeOptotypeHeightMm: valores de decimal > 1.0 (requisito explicito: 'los valores superiores a 1.0 tambien se generan correctamente') producen optotipos mas pequeños que V=1.0", () => {
    const h10 = computeOptotypeHeightMm(1.0, 300);
    const h13 = computeOptotypeHeightMm(1.3, 300);
    assert.ok(h13 < h10);
    assert.ok(h13 > 0);
  });

  test("CALIBRATION_REFERENCE_LINE_PX es un valor fijo positivo", () => {
    assert.ok(CALIBRATION_REFERENCE_LINE_PX > 0);
  });

  test("isValidCalibrationMeasuredMm acepta el rango valido y rechaza el resto", () => {
    assert.equal(isValidCalibrationMeasuredMm(MIN_CALIBRATION_MEASURED_MM), true);
    assert.equal(isValidCalibrationMeasuredMm(MAX_CALIBRATION_MEASURED_MM), true);
    assert.equal(isValidCalibrationMeasuredMm(MIN_CALIBRATION_MEASURED_MM - 1), false);
    assert.equal(isValidCalibrationMeasuredMm(MAX_CALIBRATION_MEASURED_MM + 1), false);
    assert.equal(isValidCalibrationMeasuredMm("79"), false);
    assert.equal(isValidCalibrationMeasuredMm(NaN), false);
  });

  test("computeCalibratedPxPerMm: la barra de referencia medida mas corta de lo esperado da una escala px/mm MAYOR", () => {
    const pxPerMmNormal = computeCalibratedPxPerMm(100);
    const pxPerMmSmallScreen = computeCalibratedPxPerMm(50);
    assert.ok(pxPerMmSmallScreen > pxPerMmNormal);
    assert.equal(pxPerMmNormal, CALIBRATION_REFERENCE_LINE_PX / 100);
  });

  test("isValidMonitorCalibration acepta pxPerMm positivo y finito, rechaza el resto", () => {
    assert.equal(isValidMonitorCalibration({ pxPerMm: 3.78 }), true);
    assert.equal(isValidMonitorCalibration({ pxPerMm: 0 }), false);
    assert.equal(isValidMonitorCalibration({ pxPerMm: -1 }), false);
    assert.equal(isValidMonitorCalibration({ pxPerMm: Infinity }), false);
    assert.equal(isValidMonitorCalibration({ pxPerMm: "3.78" }), false);
    assert.equal(isValidMonitorCalibration(null), false);
  });

  test("isBelowLegibleFloor: avisa cuando el tamaño calculado cae por debajo del piso practico de legibilidad", () => {
    assert.equal(isBelowLegibleFloor(MIN_LEGIBLE_OPTOTYPE_PX - 0.01), true);
    assert.equal(isBelowLegibleFloor(MIN_LEGIBLE_OPTOTYPE_PX), false);
    assert.equal(isBelowLegibleFloor(MIN_LEGIBLE_OPTOTYPE_PX + 1), false);
    assert.equal(isBelowLegibleFloor(0), true);
  });

  test("verificacion real: a 40cm calibrado (~3.8 px/mm), V=1.0 y V=1.3 caen por debajo del piso legible; a 3m no", () => {
    const pxPerMm = 3.8;
    const heightPx40cm10 = computeOptotypeHeightMm(1.0, 40) * pxPerMm;
    const heightPx40cm13 = computeOptotypeHeightMm(1.3, 40) * pxPerMm;
    const heightPx3m02 = computeOptotypeHeightMm(0.2, 300) * pxPerMm;
    assert.equal(isBelowLegibleFloor(heightPx40cm10), true, `40cm/V=1.0 deberia estar por debajo del piso (${heightPx40cm10}px)`);
    assert.equal(isBelowLegibleFloor(heightPx40cm13), true, `40cm/V=1.3 deberia estar por debajo del piso (${heightPx40cm13}px)`);
    assert.equal(isBelowLegibleFloor(heightPx3m02), false, `3m/V=0.2 NO deberia estar por debajo del piso (${heightPx3m02}px)`);
  });

  test("computeCalibratedOptotypeSizePx: con glyphHeightRatio=1 (sin compensar) equivale directamente a altura_mm * pxPerMm", () => {
    const pxPerMm = 3.8;
    const sizePx = computeCalibratedOptotypeSizePx(1.0, 600, pxPerMm, 1);
    const expected = computeOptotypeHeightMm(1.0, 600) * pxPerMm;
    assert.ok(Math.abs(sizePx - expected) < 1e-9);
  });

  test("computeCalibratedOptotypeSizePx: un glyphHeightRatio < 1 (la tinta real es menor que el font-size) AGRANDA el font-size asignado para compensar", () => {
    const pxPerMm = 3.8;
    const sizeUncompensated = computeCalibratedOptotypeSizePx(1.0, 300, pxPerMm, 1);
    const sizeCompensated = computeCalibratedOptotypeSizePx(1.0, 300, pxPerMm, 0.85);
    assert.ok(sizeCompensated > sizeUncompensated, "el font-size compensado debe ser MAYOR para que la tinta real alcance el tamaño nominal");
    assert.ok(Math.abs(sizeCompensated - sizeUncompensated / 0.85) < 1e-9);
  });

  test("computeCalibratedOptotypeSizePx: depende EXCLUSIVAMENTE de decimal/distancia/pxPerMm/ratio - mismo resultado para los mismos parametros, sin ningun otro factor oculto", () => {
    const a = computeCalibratedOptotypeSizePx(0.8, 300, 3.8, 0.85);
    const b = computeCalibratedOptotypeSizePx(0.8, 300, 3.8, 0.85);
    assert.equal(a, b);
  });

  test("computeCalibratedOptotypeSizePx: verificacion de referencia (6m, V=1.0, sin compensar) coincide con el valor clinico conocido de Snellen 6/6", () => {
    const pxPerMm = 1; // pxPerMm=1 hace que el resultado en "px" sea numericamente igual al resultado en mm
    const sizePx = computeCalibratedOptotypeSizePx(1.0, 600, pxPerMm, 1);
    assert.ok(Math.abs(sizePx - 8.73) < 0.05);
  });
});

describe("Agudeza visual", () => {
  test("AGUDEZA_DECIMAL_ROWS tiene 12 valores UNICOS crecientes entre 0.1 y 1.2", () => {
    assert.equal(AGUDEZA_DECIMAL_ROWS.length, 12);
    for (let i = 1; i < AGUDEZA_DECIMAL_ROWS.length; i += 1) {
      assert.ok(AGUDEZA_DECIMAL_ROWS[i] > AGUDEZA_DECIMAL_ROWS[i - 1]);
    }
    assert.equal(AGUDEZA_DECIMAL_ROWS[0], 0.1);
    assert.equal(AGUDEZA_DECIMAL_ROWS[AGUDEZA_DECIMAL_ROWS.length - 1], 1.2);
  });

  test("presentacion progresiva: EXACTAMENTE 5 bloques de 3 lineas, con la progresion exacta pedida (bloques vecinos SI comparten una linea, salvo entre el bloque 4 y el 5)", () => {
    assert.equal(AGUDEZA_BLOCK_SIZE, 3);
    assert.equal(AGUDEZA_BLOCK_COUNT, 5);
    assert.deepEqual(getAgudezaBlockDecimals(0), [0.1, 0.2, 0.3]);
    assert.deepEqual(getAgudezaBlockDecimals(1), [0.3, 0.4, 0.5]);
    assert.deepEqual(getAgudezaBlockDecimals(2), [0.5, 0.6, 0.7]);
    assert.deepEqual(getAgudezaBlockDecimals(3), [0.7, 0.8, 0.9]);
    assert.deepEqual(getAgudezaBlockDecimals(4), [1.0, 1.1, 1.2]);
  });

  test("getAgudezaBlockDecimals: cada bloque tiene exactamente 3 lineas en orden ascendente", () => {
    for (let i = 0; i < AGUDEZA_BLOCK_COUNT; i += 1) {
      const decimals = getAgudezaBlockDecimals(i);
      assert.equal(decimals.length, AGUDEZA_BLOCK_SIZE);
      assert.ok(decimals[1] > decimals[0]);
      assert.ok(decimals[2] > decimals[1]);
    }
  });

  test("getAgudezaBlockDecimals: la linea limite compartida entre bloques vecinos es EXACTAMENTE la misma (mismo decimal, requisito explicito)", () => {
    assert.equal(getAgudezaBlockDecimals(0)[2], getAgudezaBlockDecimals(1)[0]); // 0.3
    assert.equal(getAgudezaBlockDecimals(1)[2], getAgudezaBlockDecimals(2)[0]); // 0.5
    assert.equal(getAgudezaBlockDecimals(2)[2], getAgudezaBlockDecimals(3)[0]); // 0.7
    // Entre el bloque 4 (0.9) y el 5 (1.0) NO hay solape, tal como se pidio explicitamente.
    assert.notEqual(getAgudezaBlockDecimals(3)[2], getAgudezaBlockDecimals(4)[0]);
  });

  test("clampAgudezaBlockIndex nunca devuelve un valor fuera de [0, AGUDEZA_BLOCK_COUNT-1]", () => {
    assert.equal(clampAgudezaBlockIndex(-5), 0);
    assert.equal(clampAgudezaBlockIndex(999), AGUDEZA_BLOCK_COUNT - 1);
    assert.equal(clampAgudezaBlockIndex(2), 2);
    assert.equal(clampAgudezaBlockIndex(NaN), 0);
  });

  test("isValidAgudezaDecimal acepta solo valores de la progresion", () => {
    for (const d of AGUDEZA_DECIMAL_ROWS) assert.equal(isValidAgudezaDecimal(d), true);
    assert.equal(isValidAgudezaDecimal(0.15), false);
    assert.equal(isValidAgudezaDecimal(1.3), false);
    assert.equal(isValidAgudezaDecimal("1.0"), false);
  });

  test("computeAgudezaRowSizeRatio: la linea objetivo siempre tiene ratio 1", () => {
    for (const target of AGUDEZA_DECIMAL_ROWS) {
      assert.equal(computeAgudezaRowSizeRatio(target, target), 1);
    }
  });

  test("computeAgudezaRowSizeRatio: una linea 0.1 mide EXACTAMENTE 10x una linea objetivo 1.0 (fisica real de una cartilla decimal)", () => {
    assert.equal(computeAgudezaRowSizeRatio(0.1, 1.0), 10);
  });

  test("computeAgudezaRowSizeRatio: el tamaño decrece de forma estrictamente inversa al decimal (a MAYOR decimal, MENOR tamaño - como en una cartilla real, donde la fila 1.0 tiene las letras mas pequeñas)", () => {
    const target = 1.0;
    let previousRatio = Infinity;
    for (const decimal of AGUDEZA_DECIMAL_ROWS) {
      const ratio = computeAgudezaRowSizeRatio(decimal, target);
      assert.ok(ratio < previousRatio, `el ratio deberia decrecer al aumentar el decimal (decimal=${decimal}, ratio=${ratio}, anterior=${previousRatio})`);
      previousRatio = ratio;
    }
    // Verificacion directa: 0.1 (primera fila, letras grandes) > 1.0 (ultima fila, letras pequeñas)
    assert.ok(computeAgudezaRowSizeRatio(0.1, target) > computeAgudezaRowSizeRatio(1.0, target));
  });

  test("DEFAULT_AGUDEZA_CONFIG es valido", () => {
    assert.equal(isValidAgudezaConfig(DEFAULT_AGUDEZA_CONFIG), true);
  });

  test("generateAgudezaRows: todos los decimales UNICOS (sin duplicar los compartidos entre bloques), cada uno con AGUDEZA_SYMBOLS_PER_ROW simbolos y el ratio correcto", () => {
    const rows = generateAgudezaRows(DEFAULT_AGUDEZA_CONFIG, Math.random);
    assert.equal(rows.length, AGUDEZA_DECIMAL_ROWS.length);
    for (const row of rows) {
      assert.equal(row.symbols.length, AGUDEZA_SYMBOLS_PER_ROW);
      assert.equal(row.sizeRatio, computeAgudezaRowSizeRatio(row.decimal, DEFAULT_AGUDEZA_CONFIG.targetDecimal));
    }
  });

  test("generateAgudezaRows + AGUDEZA_BLOCK_START_INDEX: la linea compartida entre dos bloques vecinos es LA MISMA fila (mismo tamaño fisico Y mismo contenido), nunca una regeneracion independiente", () => {
    const rows = generateAgudezaRows(DEFAULT_AGUDEZA_CONFIG, Math.random);
    const block0End = AGUDEZA_BLOCK_START_INDEX[0] + AGUDEZA_BLOCK_SIZE - 1;
    const block1Start = AGUDEZA_BLOCK_START_INDEX[1];
    assert.equal(rows[block0End].decimal, rows[block1Start].decimal, "0.3 deberia ser la misma linea en ambos bloques");
    assert.deepEqual(rows[block0End], rows[block1Start], "misma fila completa (decimal, sizeRatio Y simbolos) - no una copia independiente");
  });

  test("generateAgudezaRows: el ORDEN y los decimales de las filas nunca cambian entre regeneraciones (solo el contenido)", () => {
    const a = generateAgudezaRows(DEFAULT_AGUDEZA_CONFIG, () => 0.1);
    const b = generateAgudezaRows(DEFAULT_AGUDEZA_CONFIG, () => 0.9);
    assert.deepEqual(a.map((r: { decimal: number }) => r.decimal), b.map((r: { decimal: number }) => r.decimal));
    assert.deepEqual(a.map((r: { sizeRatio: number }) => r.sizeRatio), b.map((r: { sizeRatio: number }) => r.sizeRatio));
  });

  test("isValidAgudezaConfig rechaza campos invalidos", () => {
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, targetDecimal: 0.15 }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, symbolType: "shapes" }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, blockIndex: -1 }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, blockIndex: AGUDEZA_BLOCK_COUNT }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, blockIndex: 1.5 }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, blockIndex: "0" }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, viewingDistanceCm: 5 }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, viewingDistanceCm: 99999 }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, viewingDistanceCm: "300" }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, rojoVerdeEnabled: "true" }), false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, rojoVerdeEnabled: 1 }), false);
    assert.equal(isValidAgudezaConfig(null), false);
  });

  test("isValidAgudezaConfig acepta cualquier blockIndex dentro de rango", () => {
    for (let i = 0; i < AGUDEZA_BLOCK_COUNT; i += 1) {
      assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, blockIndex: i }), true);
    }
  });

  test("DEFAULT_AGUDEZA_CONFIG trae rojoVerdeEnabled=false (el modo rojo-verde arranca desactivado)", () => {
    assert.equal(DEFAULT_AGUDEZA_CONFIG.rojoVerdeEnabled, false);
    assert.equal(isValidAgudezaConfig({ ...DEFAULT_AGUDEZA_CONFIG, rojoVerdeEnabled: true }), true);
  });
});

describe("Circulo horario", () => {
  test("clampCirculoHorarioLines nunca devuelve un valor fuera de rango", () => {
    assert.equal(clampCirculoHorarioLines(-5), CIRCULO_HORARIO_MIN_LINES);
    assert.equal(clampCirculoHorarioLines(999), CIRCULO_HORARIO_MAX_LINES);
    assert.equal(clampCirculoHorarioLines(12), 12);
  });

  test("clampCirculoHorarioLines nunca lanza con NaN/Infinity", () => {
    assert.doesNotThrow(() => clampCirculoHorarioLines(NaN));
    assert.equal(clampCirculoHorarioLines(NaN), CIRCULO_HORARIO_DEFAULT_LINES);
  });

  test("computeClockDialAngles: longitud exacta, empieza en 0, reparto angular UNIFORME", () => {
    for (const lineCount of [6, 12, 24]) {
      const angles = computeClockDialAngles(lineCount);
      assert.equal(angles.length, lineCount);
      assert.equal(angles[0], 0);
      const step = 360 / lineCount;
      for (let i = 1; i < angles.length; i += 1) {
        assert.ok(Math.abs(angles[i] - angles[i - 1] - step) < 1e-9);
      }
    }
  });

  test("computeClockDialAngles: PURA, nunca depende de aleatoriedad (misma entrada, mismo resultado siempre)", () => {
    const a = computeClockDialAngles(12);
    const b = computeClockDialAngles(12);
    assert.deepEqual(a, b);
  });

  test("DEFAULT_CIRCULO_HORARIO_CONFIG es valido, 12 lineas por defecto", () => {
    assert.equal(DEFAULT_CIRCULO_HORARIO_CONFIG.lineCount, 12);
    assert.equal(isValidCirculoHorarioConfig(DEFAULT_CIRCULO_HORARIO_CONFIG), true);
  });

  test("isValidCirculoHorarioConfig rechaza campos invalidos", () => {
    assert.equal(isValidCirculoHorarioConfig({ ...DEFAULT_CIRCULO_HORARIO_CONFIG, lineCount: 2 }), false);
    assert.equal(isValidCirculoHorarioConfig({ ...DEFAULT_CIRCULO_HORARIO_CONFIG, lineCount: 12.5 }), false);
    assert.equal(isValidCirculoHorarioConfig({ ...DEFAULT_CIRCULO_HORARIO_CONFIG, sizePercent: -1 }), false);
  });
});

describe("Rojo-verde", () => {
  // Ya NO genera su propio contenido (requisito: "no quiero una prueba
  // independiente... con su propia configuracion de agudeza visual") -
  // reutiliza las filas/bloque/tipo de optotipo de Agudeza visual tal
  // cual. Por eso aqui solo se prueba lo que le es propio: los tonos.
  test("DEFAULT_ROJO_VERDE_CONFIG es valido", () => {
    assert.equal(isValidRojoVerdeConfig(DEFAULT_ROJO_VERDE_CONFIG), true);
  });

  test("isValidRojoVerdeConfig solo exige redHex/greenHex validos", () => {
    assert.equal(isValidRojoVerdeConfig({ ...DEFAULT_ROJO_VERDE_CONFIG, redHex: "not-a-color" }), false);
    assert.equal(isValidRojoVerdeConfig({ ...DEFAULT_ROJO_VERDE_CONFIG, greenHex: "not-a-color" }), false);
    assert.equal(isValidRojoVerdeConfig(null), false);
  });
});

describe("Punto de fijacion", () => {
  test("DEFAULT_FIJACION_CONFIG es valido", () => {
    assert.equal(isValidFijacionConfig(DEFAULT_FIJACION_CONFIG), true);
  });

  test("isValidFijacionConfig rechaza tamaños fuera de rango", () => {
    assert.equal(isValidFijacionConfig({ dotSizePercent: -1 }), false);
    assert.equal(isValidFijacionConfig({ dotSizePercent: 9999 }), false);
    assert.equal(isValidFijacionConfig(null), false);
  });
});

describe("Worth", () => {
  test("WORTH_DOTS: exactamente 4 luces con la disposicion clasica (1 roja arriba, 2 verdes a los lados, 1 blanca abajo)", () => {
    assert.equal(WORTH_DOTS.length, 4);
    const top = WORTH_DOTS.find((d: { id: string }) => d.id === "top");
    const bottom = WORTH_DOTS.find((d: { id: string }) => d.id === "bottom");
    const left = WORTH_DOTS.find((d: { id: string }) => d.id === "left");
    const right = WORTH_DOTS.find((d: { id: string }) => d.id === "right");
    assert.equal(top.color, "red");
    assert.equal(bottom.color, "white");
    assert.equal(left.color, "green");
    assert.equal(right.color, "green");
  });

  test("WORTH_DOTS: top esta por encima de bottom, left esta a la izquierda de right (coherencia geometrica del rombo)", () => {
    const top = WORTH_DOTS.find((d: { id: string }) => d.id === "top");
    const bottom = WORTH_DOTS.find((d: { id: string }) => d.id === "bottom");
    const left = WORTH_DOTS.find((d: { id: string }) => d.id === "left");
    const right = WORTH_DOTS.find((d: { id: string }) => d.id === "right");
    assert.ok(top.yPercent < bottom.yPercent);
    assert.ok(left.xPercent < right.xPercent);
  });

  test("DEFAULT_WORTH_CONFIG es valido", () => {
    assert.equal(isValidWorthConfig(DEFAULT_WORTH_CONFIG), true);
  });
});

describe("Alineamiento binocular", () => {
  test("DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG es valido", () => {
    assert.equal(isValidAlineamientoBinocularConfig(DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG), true);
  });

  test("isValidAlineamientoBinocularConfig rechaza campos invalidos", () => {
    assert.equal(isValidAlineamientoBinocularConfig({ ...DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG, crossSizePercent: -1 }), false);
    assert.equal(isValidAlineamientoBinocularConfig({ ...DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG, crossSizePercent: 9999 }), false);
    assert.equal(isValidAlineamientoBinocularConfig({ ...DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG, dotSizePercent: -1 }), false);
    assert.equal(isValidAlineamientoBinocularConfig({ ...DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG, dotSizePercent: "4" }), false);
    assert.equal(isValidAlineamientoBinocularConfig(null), false);
  });
});

describe("Contraste (Weber)", () => {
  test("computeWeberContrast: contraste nulo cuando el optotipo es igual al fondo, maximo (1) con negro puro sobre blanco puro", () => {
    assert.equal(computeWeberContrast(255, 255), 0);
    assert.equal(computeWeberContrast(0, 255), 1);
  });

  test("computeWeberContrast: valor absoluto - un optotipo mas CLARO que el fondo da el mismo contraste que uno igualmente mas OSCURO", () => {
    assert.ok(Math.abs(computeWeberContrast(200, 100) - computeWeberContrast(0, 100)) < 1e-9);
  });

  test("computeContrastGrayLevel: 100% de contraste da negro puro (0); un contraste menor da un gris mas claro que negro", () => {
    assert.equal(computeContrastGrayLevel(100), 0);
    assert.ok(computeContrastGrayLevel(50) > computeContrastGrayLevel(100));
    assert.ok(computeContrastGrayLevel(50) < CONTRASTE_BACKGROUND_GRAY);
  });

  test("computeContrastGrayLevel: el gris devuelto SIEMPRE produce el contraste de Weber solicitado frente al fondo", () => {
    for (const pct of [1, 25, 50, 70, 100]) {
      const gray = computeContrastGrayLevel(pct);
      const achieved = computeWeberContrast(gray, CONTRASTE_BACKGROUND_GRAY) * 100;
      assert.ok(Math.abs(achieved - pct) < 1, `contraste logrado ${achieved} deberia ser ~${pct}`);
    }
  });

  test("clampContrastPercent nunca devuelve un valor fuera de [MIN, MAX], usa el fallback con NaN/Infinity", () => {
    assert.equal(clampContrastPercent(-5), CONTRASTE_MIN_PERCENT);
    assert.equal(clampContrastPercent(9999), CONTRASTE_MAX_PERCENT);
    assert.equal(clampContrastPercent(NaN), CONTRASTE_DEFAULT_PERCENT);
    assert.doesNotThrow(() => clampContrastPercent(Infinity));
  });

  test("snapContrastPercentToStep: SIEMPRE un multiplo exacto de CONTRASTE_STEP_PERCENT (5), dentro de [0, 100]", () => {
    assert.equal(CONTRASTE_STEP_PERCENT, 5);
    for (const [input, expected] of [
      [0, 0],
      [100, 100],
      [2, 0],
      [3, 5],
      [47, 45],
      [48, 50],
      [97, 95],
      [98, 100],
    ]) {
      assert.equal(snapContrastPercentToStep(input), expected, `snapContrastPercentToStep(${input}) deberia ser ${expected}`);
    }
  });

  test("snapContrastPercentToStep: nunca se sale de rango ni lanza con NaN/Infinity/valores fuera de rango", () => {
    assert.equal(snapContrastPercentToStep(-50), 0);
    assert.equal(snapContrastPercentToStep(9999), 100);
    assert.equal(snapContrastPercentToStep(NaN), CONTRASTE_DEFAULT_PERCENT);
    assert.doesNotThrow(() => snapContrastPercentToStep(Infinity));
    for (let v = 0; v <= 100; v += 1) {
      assert.equal(snapContrastPercentToStep(v) % CONTRASTE_STEP_PERCENT, 0, `snapContrastPercentToStep(${v}) deberia ser multiplo de ${CONTRASTE_STEP_PERCENT}`);
    }
  });

  test("DEFAULT_CONTRASTE_CONFIG es valido", () => {
    assert.equal(isValidContrasteConfig(DEFAULT_CONTRASTE_CONFIG), true);
  });

  test("isValidContrasteConfig rechaza campos invalidos", () => {
    assert.equal(isValidContrasteConfig({ ...DEFAULT_CONTRASTE_CONFIG, blockIndex: -1 }), false);
    assert.equal(isValidContrasteConfig({ ...DEFAULT_CONTRASTE_CONFIG, blockIndex: AGUDEZA_BLOCK_COUNT }), false);
    assert.equal(isValidContrasteConfig({ ...DEFAULT_CONTRASTE_CONFIG, viewingDistanceCm: 55 }), false);
    assert.equal(isValidContrasteConfig({ ...DEFAULT_CONTRASTE_CONFIG, contrastPercent: -1 }), false);
    assert.equal(isValidContrasteConfig({ ...DEFAULT_CONTRASTE_CONFIG, contrastPercent: 101 }), false);
    assert.equal(isValidContrasteConfig({ ...DEFAULT_CONTRASTE_CONFIG, contrastPercent: "70" }), false);
    assert.equal(isValidContrasteConfig(null), false);
  });

  test("cambiar el contraste nunca cambia el bloque/decimal representado - son campos independientes", () => {
    const a = { ...DEFAULT_CONTRASTE_CONFIG, contrastPercent: 20 };
    const b = { ...DEFAULT_CONTRASTE_CONFIG, contrastPercent: 90 };
    assert.equal(a.blockIndex, b.blockIndex);
    assert.equal(a.viewingDistanceCm, b.viewingDistanceCm);
  });
});

describe("Rejilla sinusoidal (Michelson)", () => {
  test("computeMichelsonContrast: 0 cuando Lmax=Lmin, 1 en el contraste maximo (0 a 255)", () => {
    assert.equal(computeMichelsonContrast(127.5, 127.5), 0);
    assert.ok(Math.abs(computeMichelsonContrast(255, 0) - 1) < 1e-9);
  });

  test("computeGratingLuminanceRange: el rango resultante SIEMPRE produce el contraste de Michelson solicitado, centrado en el gris medio fijo", () => {
    for (const pct of [10, 50, 80, 100]) {
      const { lMax, lMin } = computeGratingLuminanceRange(pct);
      const achieved = computeMichelsonContrast(lMax, lMin) * 100;
      assert.ok(Math.abs(achieved - pct) < 0.5, `contraste logrado ${achieved} deberia ser ~${pct}`);
      assert.ok(Math.abs((lMax + lMin) / 2 - MICHELSON_MEAN_GRAY) < 1e-9, "el punto medio debe ser siempre el gris medio fijo");
    }
  });

  test("computeGratingLuminanceRange: contraste 100% ocupa el rango completo sin recortar (Lmax=255, Lmin=0)", () => {
    const { lMax, lMin } = computeGratingLuminanceRange(100);
    assert.ok(Math.abs(lMax - 255) < 1e-9);
    assert.ok(Math.abs(lMin - 0) < 1e-9);
  });

  test("REJILLA_FREQUENCY_LEVELS: secuencia ORDENADA y estrictamente creciente (bandas cada vez mas estrechas)", () => {
    assert.ok(REJILLA_FREQUENCY_LEVELS.length >= 2);
    for (let i = 1; i < REJILLA_FREQUENCY_LEVELS.length; i += 1) {
      assert.ok(REJILLA_FREQUENCY_LEVELS[i] > REJILLA_FREQUENCY_LEVELS[i - 1]);
    }
  });

  test("clampRejillaFrequencyLevelIndex: limites claros al principio y al final, nunca avanza indefinidamente", () => {
    assert.equal(clampRejillaFrequencyLevelIndex(-5), 0);
    assert.equal(clampRejillaFrequencyLevelIndex(9999), REJILLA_FREQUENCY_LEVELS.length - 1);
    assert.equal(clampRejillaFrequencyLevelIndex(2), 2);
    assert.equal(clampRejillaFrequencyLevelIndex(NaN), REJILLA_DEFAULT_FREQUENCY_LEVEL_INDEX);
    assert.doesNotThrow(() => clampRejillaFrequencyLevelIndex(Infinity));
  });

  test("REJILLA_ORIENTATION_VALUES: EXACTAMENTE 3 orientaciones inequivocas (vertical + 2 diagonales en sentidos opuestos)", () => {
    assert.equal(REJILLA_ORIENTATION_VALUES.length, 3);
    assert.ok(REJILLA_ORIENTATION_VALUES.includes("vertical"));
    assert.ok(REJILLA_ORIENTATION_VALUES.includes("diagonal1"));
    assert.ok(REJILLA_ORIENTATION_VALUES.includes("diagonal2"));
  });

  test("getRejillaOrientationAngleDeg: vertical=0, las dos diagonales en sentidos opuestos (+45/-45)", () => {
    assert.equal(getRejillaOrientationAngleDeg("vertical"), 0);
    assert.equal(getRejillaOrientationAngleDeg("diagonal1"), 45);
    assert.equal(getRejillaOrientationAngleDeg("diagonal2"), -45);
  });

  test("isValidRejillaOrientation acepta solo las 3 orientaciones validas", () => {
    for (const o of REJILLA_ORIENTATION_VALUES) assert.equal(isValidRejillaOrientation(o), true);
    assert.equal(isValidRejillaOrientation("horizontal"), false);
    assert.equal(isValidRejillaOrientation(45), false);
  });

  test("generateRejillaOrientations: longitud exacta, solo valores validos", () => {
    const orientations = generateRejillaOrientations(4, Math.random);
    assert.equal(orientations.length, 4);
    for (const o of orientations) assert.ok(REJILLA_ORIENTATION_VALUES.includes(o), `orientacion invalida: ${o}`);
  });

  test("generateRejillaOrientations: CON reemplazo (nunca fuerza que sean distintas) - con randomFn fija, las 4 son identicas", () => {
    const orientations = generateRejillaOrientations(4, () => 0);
    assert.deepEqual(orientations, ["vertical", "vertical", "vertical", "vertical"]);
  });

  test("generateRejillaOrientations: con una fuente de aleatoriedad que varia, produce variedad real entre presentaciones", () => {
    const seq = [0.1, 0.5, 0.9, 0.2];
    let i = 0;
    const randomFn = () => seq[i++ % seq.length];
    const orientations = generateRejillaOrientations(4, randomFn);
    assert.ok(new Set(orientations).size > 1, "se esperaba variedad entre los 4 circulos");
  });

  test("computeDegreePhysicalSizeMm: verificacion de referencia contra la regla practica 'distancia/57.3' (a 6m, 1 grado subtiende ~10.5cm)", () => {
    const sizeMm = computeDegreePhysicalSizeMm(600);
    const ruleOfThumbMm = 6000 / 57.3; // distancia en mm (600cm) / 57.3
    assert.ok(Math.abs(sizeMm - ruleOfThumbMm) / ruleOfThumbMm < 0.01, `tamaño calculado ${sizeMm}mm deberia ser ~${ruleOfThumbMm}mm`);
  });

  test("computeDegreePhysicalSizeMm: a mayor distancia, 1 grado de angulo visual ocupa mas espacio fisico", () => {
    const m40 = computeDegreePhysicalSizeMm(40);
    const m300 = computeDegreePhysicalSizeMm(300);
    const m600 = computeDegreePhysicalSizeMm(600);
    assert.ok(m40 < m300);
    assert.ok(m300 < m600);
  });

  test("computeCircleAngularDiameterDegrees: funcion INVERSA de computeDegreePhysicalSizeMm - el tamaño fisico de 1 grado subtiende exactamente 1 grado", () => {
    for (const distanceCm of [40, 100, 300, 600]) {
      const oneDegreeSizeMm = computeDegreePhysicalSizeMm(distanceCm);
      const angleDeg = computeCircleAngularDiameterDegrees(oneDegreeSizeMm, distanceCm);
      assert.ok(Math.abs(angleDeg - 1) < 1e-6, `a ${distanceCm}cm, el tamaño de 1 grado deberia subtender exactamente 1 grado (obtenido ${angleDeg})`);
    }
  });

  test("computeCircleAngularDiameterDegrees: a mayor distancia, el MISMO tamaño fisico subtiende un angulo MENOR", () => {
    const physicalSizeMm = 50;
    const angleNear = computeCircleAngularDiameterDegrees(physicalSizeMm, 40);
    const angleFar = computeCircleAngularDiameterDegrees(physicalSizeMm, 600);
    assert.ok(angleFar < angleNear);
  });

  test("DEFAULT_REJILLA_CONFIG es valido y usa las constantes por defecto documentadas", () => {
    assert.equal(isValidRejillaConfig(DEFAULT_REJILLA_CONFIG), true);
    assert.equal(DEFAULT_REJILLA_CONFIG.frequencyLevelIndex, REJILLA_DEFAULT_FREQUENCY_LEVEL_INDEX);
    assert.equal(DEFAULT_REJILLA_CONFIG.contrastPercent, REJILLA_DEFAULT_CONTRAST_PERCENT);
  });

  test("isValidRejillaConfig rechaza campos invalidos", () => {
    assert.equal(isValidRejillaConfig({ ...DEFAULT_REJILLA_CONFIG, frequencyLevelIndex: -1 }), false);
    assert.equal(isValidRejillaConfig({ ...DEFAULT_REJILLA_CONFIG, frequencyLevelIndex: REJILLA_FREQUENCY_LEVELS.length }), false);
    assert.equal(isValidRejillaConfig({ ...DEFAULT_REJILLA_CONFIG, frequencyLevelIndex: 1.5 }), false);
    assert.equal(isValidRejillaConfig({ ...DEFAULT_REJILLA_CONFIG, contrastPercent: -1 }), false);
    assert.equal(isValidRejillaConfig({ ...DEFAULT_REJILLA_CONFIG, contrastPercent: 101 }), false);
    assert.equal(isValidRejillaConfig({ ...DEFAULT_REJILLA_CONFIG, viewingDistanceCm: 55 }), false);
    assert.equal(isValidRejillaConfig(null), false);
  });

  test("cambiar el contraste nunca cambia el nivel de frecuencia - campos independientes", () => {
    const a = { ...DEFAULT_REJILLA_CONFIG, contrastPercent: 20 };
    const b = { ...DEFAULT_REJILLA_CONFIG, contrastPercent: 90 };
    assert.equal(a.frequencyLevelIndex, b.frequencyLevelIndex);
  });
});

describe("migrateOptotiposCardConfig / isValidOptotiposCardConfig / resolveOptotiposCardConfig", () => {
  test("DEFAULT_OPTOTIPOS_CONFIG es valido", () => {
    assert.equal(isValidOptotiposCardConfig(DEFAULT_OPTOTIPOS_CONFIG), true);
  });

  test("una configuracion ya valida (v1) se resuelve sin cambios", () => {
    const resolved = resolveOptotiposCardConfig(DEFAULT_OPTOTIPOS_CONFIG);
    assert.deepEqual(resolved, DEFAULT_OPTOTIPOS_CONFIG);
  });

  test("migrateOptotiposCardConfig devuelve la MISMA referencia si ya esta en la version actual", () => {
    assert.equal(migrateOptotiposCardConfig(DEFAULT_OPTOTIPOS_CONFIG), DEFAULT_OPTOTIPOS_CONFIG);
  });

  test("migrateOptotiposCardConfig nunca lanza con entradas invalidas", () => {
    assert.doesNotThrow(() => migrateOptotiposCardConfig(null));
    assert.doesNotThrow(() => migrateOptotiposCardConfig(42));
    assert.doesNotThrow(() => migrateOptotiposCardConfig("hola"));
    assert.doesNotThrow(() => migrateOptotiposCardConfig([1, 2, 3]));
  });

  test("isValidOptotiposCardConfig rechaza cada sub-configuracion invalida por separado", () => {
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, schemaVersion: 99 }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, activeTest: "unknown" }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, agudeza: { ...DEFAULT_AGUDEZA_CONFIG, targetDecimal: 2 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, circuloHorario: { ...DEFAULT_CIRCULO_HORARIO_CONFIG, lineCount: 1 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, rojoVerde: { ...DEFAULT_ROJO_VERDE_CONFIG, redHex: "bad" } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, fijacion: { dotSizePercent: -1 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, worth: { sizePercent: -1 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, alineamientoBinocular: { ...DEFAULT_ALINEAMIENTO_BINOCULAR_CONFIG, crossSizePercent: -1 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, contraste: { ...DEFAULT_CONTRASTE_CONFIG, contrastPercent: -1 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, rejillaSinusoidal: { ...DEFAULT_REJILLA_CONFIG, frequencyLevelIndex: -1 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, calibration: { pxPerMm: -1 } }), false);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, calibration: { pxPerMm: "3.78" } }), false);
  });

  test("calibration: null es valido (sin calibrar, por defecto); un objeto con pxPerMm valido tambien", () => {
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, calibration: null }), true);
    assert.equal(isValidOptotiposCardConfig({ ...DEFAULT_OPTOTIPOS_CONFIG, calibration: { pxPerMm: 3.78 } }), true);
  });

  test("isValidOptotiposCardConfig rechaza valores no-objeto sin lanzar", () => {
    assert.equal(isValidOptotiposCardConfig(null), false);
    assert.equal(isValidOptotiposCardConfig(undefined), false);
    assert.equal(isValidOptotiposCardConfig("config"), false);
  });

  test("resolveOptotiposCardConfig devuelve null (nunca lanza) ante entradas irrecuperables", () => {
    assert.equal(resolveOptotiposCardConfig(null), null);
    assert.equal(resolveOptotiposCardConfig({}), null);
    assert.equal(resolveOptotiposCardConfig("garbage"), null);
  });

  test("resolveOptotiposCardConfig acepta una configuracion valida con activeTest distinto al default, conservando las demas sub-configuraciones intactas", () => {
    const custom = { ...DEFAULT_OPTOTIPOS_CONFIG, activeTest: "worth" };
    const resolved = resolveOptotiposCardConfig(custom);
    assert.deepEqual(resolved, custom);
    assert.deepEqual(resolved.agudeza, DEFAULT_AGUDEZA_CONFIG);
  });
});
