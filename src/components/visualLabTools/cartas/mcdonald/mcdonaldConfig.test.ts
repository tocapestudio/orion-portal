/**
 * Pruebas aisladas de la logica pura de mcdonaldConfig.ts - test runner
 * nativo de Node (node:test + node:assert/strict), mismo criterio que
 * hartConfig.test.ts. Ejecutar con:
 *   node --test "src/components/visualLabTools/cartas/mcdonald/mcdonaldConfig.test.ts"
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Import dinamico con ruta NO literal (mismo motivo documentado en los
// demas archivos de test de este proyecto: TS5097 con moduleResolution
// "bundler" en un import ESTATICO con extension .ts explicita).
const modulePath = "./mcdonaldConfig" + ".ts";
const mod = await import(modulePath);
const {
  DEFAULT_MCDONALD_CONFIG,
  MCDONALD_NEUTRAL_COLOR,
  MCDONALD_MIN_RINGS,
  MCDONALD_MAX_RINGS,
  MCDONALD_DEFAULT_RINGS,
  MCDONALD_MIN_ROTATION_RPM,
  MCDONALD_MAX_ROTATION_RPM,
  MCDONALD_DEFAULT_ROTATION_RPM,
  MCDONALD_PROGRESSIVE_SCALE_MIN,
  MCDONALD_PROGRESSIVE_SCALE_MAX,
  isValidHexColor,
  computeRingPosition,
  computeRingDefinitions,
  computeTotalStimuli,
  computeStimulusRingGeometry,
  clampRingCount,
  generateMcDonaldContent,
  generateBalancedRedGreenFlags,
  resolveMcDonaldColors,
  generateMcDonaldStimuli,
  migrateMcDonaldCardConfig,
  isValidMcDonaldCardConfig,
  resolveMcDonaldCardConfig,
  clampRotationRpm,
  rpmToRadiansPerMs,
  computeRotationAngleRad,
  resolveRingSizeScale,
} = mod;

// Catalogos LOCALES para el test, deliberadamente SIN importar
// stimulusConfig.ts (mismo criterio que hartConfig.test.ts).
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const NUMBERS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const MIXED = [...LETTERS, ...NUMBERS];

describe("DEFAULT_MCDONALD_CONFIG", () => {
  test("3 anillos, contenido letras, color neutro, tamaños medianos", () => {
    assert.equal(DEFAULT_MCDONALD_CONFIG.ringCount, MCDONALD_DEFAULT_RINGS);
    assert.equal(DEFAULT_MCDONALD_CONFIG.ringCount, 3);
    assert.equal(DEFAULT_MCDONALD_CONFIG.content, "letters");
    assert.equal(DEFAULT_MCDONALD_CONFIG.colorMode, "neutral");
    assert.equal(DEFAULT_MCDONALD_CONFIG.charSize, "md");
    assert.equal(DEFAULT_MCDONALD_CONFIG.cardSize, "md");
  });

  test("tamaño de caracteres PROGRESIVO por defecto, estatico, sentido horario, velocidad por defecto", () => {
    // 'progressive' (no 'uniform') es el valor inicial deliberado: el
    // usuario sigue pudiendo cambiar a 'uniform' manualmente (ver el
    // propio McDonaldCharSizeMode, que conserva ambos valores), pero la
    // primera vez que se accede a McDonald sin configuracion previa debe
    // mostrarse en modo progresivo.
    assert.equal(DEFAULT_MCDONALD_CONFIG.charSizeMode, "progressive");
    assert.equal(DEFAULT_MCDONALD_CONFIG.motionMode, "static");
    assert.equal(DEFAULT_MCDONALD_CONFIG.rotationDirection, "clockwise");
    assert.equal(DEFAULT_MCDONALD_CONFIG.rotationSpeedRpm, MCDONALD_DEFAULT_ROTATION_RPM);
  });

  test("es una configuracion valida por si misma", () => {
    assert.equal(isValidMcDonaldCardConfig(DEFAULT_MCDONALD_CONFIG), true);
  });
});

describe("clampRingCount", () => {
  test("nunca devuelve un valor fuera de [MIN, MAX]", () => {
    assert.equal(clampRingCount(-5), MCDONALD_MIN_RINGS);
    assert.equal(clampRingCount(0), MCDONALD_MIN_RINGS);
    assert.equal(clampRingCount(999), MCDONALD_MAX_RINGS);
    assert.equal(clampRingCount(3), 3);
  });

  test("redondea valores no enteros", () => {
    assert.equal(clampRingCount(2.4), 2);
    assert.equal(clampRingCount(2.6), 3);
  });

  test("nunca lanza con entradas invalidas (NaN, Infinity)", () => {
    assert.doesNotThrow(() => clampRingCount(NaN));
    assert.doesNotThrow(() => clampRingCount(Infinity));
    assert.equal(clampRingCount(NaN), MCDONALD_DEFAULT_RINGS);
  });
});

describe("computeRingDefinitions (numero de anillos configurable, 1 a 5)", () => {
  for (const n of [1, 2, 3, 4, 5]) {
    test(`ringCount=${n}: genera EXACTAMENTE ${n} anillo(s)`, () => {
      assert.equal(computeRingDefinitions(n).length, n);
    });

    test(`ringCount=${n}: radios estrictamente crecientes (o un unico anillo) y dentro de [MIN, MAX]`, () => {
      const defs = computeRingDefinitions(n);
      const radii = defs.map((r: { radiusPercent: number }) => r.radiusPercent);
      for (const r of radii) {
        assert.ok(r >= 15 && r <= 43, `radio fuera de [15,43]: ${r}`);
      }
      for (let i = 1; i < radii.length; i += 1) {
        assert.ok(radii[i] > radii[i - 1], `radio del anillo ${i} no es mayor que el anterior (ringCount=${n})`);
      }
    });

    test(`ringCount=${n}: el radio maximo deja margen hasta el borde del contenedor (no recorta el caracter)`, () => {
      const defs = computeRingDefinitions(n);
      const maxRadius = Math.max(...defs.map((r: { radiusPercent: number }) => r.radiusPercent));
      assert.ok(maxRadius < 50, `el anillo exterior toca o sobrepasa el borde del contenedor (50%): ${maxRadius}`);
    });

    test(`ringCount=${n}: separacion radial suficiente entre anillos consecutivos (>=5 puntos porcentuales)`, () => {
      const defs = computeRingDefinitions(n);
      for (let i = 1; i < defs.length; i += 1) {
        const gap = defs[i].radiusPercent - defs[i - 1].radiusPercent;
        assert.ok(gap >= 5, `separacion radial insuficiente entre anillos ${i - 1} y ${i} (ringCount=${n}): ${gap}`);
      }
    });

    test(`ringCount=${n}: cantidades crecientes (o un unico anillo), progresion aritmetica 6/10/14/18/22`, () => {
      const defs = computeRingDefinitions(n);
      const expectedCounts = [6, 10, 14, 18, 22].slice(0, n);
      assert.deepEqual(defs.map((r: { count: number }) => r.count), expectedCounts);
    });

    test(`ringCount=${n}: densidad angular (arco por estimulo) razonable en todos los anillos (sin apretarse demasiado)`, () => {
      const defs = computeRingDefinitions(n);
      for (const ring of defs) {
        const arcLength = (2 * Math.PI * ring.radiusPercent) / ring.count;
        assert.ok(arcLength > 8, `arco por estimulo demasiado pequeño (ringCount=${n}): ${arcLength}`);
      }
    });
  }

  test("ringCount=3 (valor por defecto) reproduce EXACTAMENTE la geometria previa a esta ampliacion (15/29/43, 6/10/14)", () => {
    const defs = computeRingDefinitions(3);
    assert.deepEqual(defs, [
      { radiusPercent: 15, count: 6 },
      { radiusPercent: 29, count: 10 },
      { radiusPercent: 43, count: 14 },
    ]);
  });

  test("ringCount=1 usa un radio intermedio (ni pegado al centro ni al borde)", () => {
    const defs = computeRingDefinitions(1);
    assert.equal(defs.length, 1);
    assert.ok(defs[0].radiusPercent > 15 && defs[0].radiusPercent < 43);
  });

  test("clampa valores fuera de rango sin lanzar (0, 999, NaN)", () => {
    assert.doesNotThrow(() => computeRingDefinitions(0));
    assert.doesNotThrow(() => computeRingDefinitions(999));
    assert.doesNotThrow(() => computeRingDefinitions(NaN));
    assert.equal(computeRingDefinitions(0).length, MCDONALD_MIN_RINGS);
    assert.equal(computeRingDefinitions(999).length, MCDONALD_MAX_RINGS);
  });
});

describe("computeTotalStimuli", () => {
  test("es la suma exacta de las cantidades de computeRingDefinitions, para 1 a 5 anillos", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const expected = computeRingDefinitions(n).reduce((sum: number, r: { count: number }) => sum + r.count, 0);
      assert.equal(computeTotalStimuli(n), expected);
    }
  });

  test("ringCount=3 (defecto): 30 estimulos (6+10+14)", () => {
    assert.equal(computeTotalStimuli(3), 30);
  });
});

describe("resolveRingSizeScale (modos de tamaño de caracteres)", () => {
  test("'uniform': siempre devuelve 1, para cualquier anillo y cualquier ringCount", () => {
    for (const ringCount of [1, 2, 3, 4, 5]) {
      for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
        assert.equal(resolveRingSizeScale("uniform", ringIndex, ringCount), 1);
      }
    }
  });

  test("'progressive' con ringCount=1: EQUIVALENTE a 'uniform' (devuelve 1, no hay interior/exterior que distinguir)", () => {
    assert.equal(resolveRingSizeScale("progressive", 0, 1), 1);
    assert.equal(resolveRingSizeScale("uniform", 0, 1), resolveRingSizeScale("progressive", 0, 1));
  });

  for (const ringCount of [2, 3, 4, 5]) {
    test(`'progressive' con ringCount=${ringCount}: estrictamente creciente de interior a exterior`, () => {
      const scales = Array.from({ length: ringCount }, (_, i) => resolveRingSizeScale("progressive", i, ringCount));
      for (let i = 1; i < scales.length; i += 1) {
        assert.ok(scales[i] > scales[i - 1], `anillo ${i} no es mayor que el anillo ${i - 1} (ringCount=${ringCount})`);
      }
    });

    test(`'progressive' con ringCount=${ringCount}: interior=MIN, exterior=MAX exactos`, () => {
      assert.equal(resolveRingSizeScale("progressive", 0, ringCount), MCDONALD_PROGRESSIVE_SCALE_MIN);
      assert.equal(resolveRingSizeScale("progressive", ringCount - 1, ringCount), MCDONALD_PROGRESSIVE_SCALE_MAX);
    });
  }
});

describe("clampRotationRpm", () => {
  test("nunca devuelve un valor fuera de [MIN, MAX]", () => {
    assert.equal(clampRotationRpm(-5), MCDONALD_MIN_ROTATION_RPM);
    assert.equal(clampRotationRpm(9999), MCDONALD_MAX_ROTATION_RPM);
    assert.equal(clampRotationRpm(2), 2);
  });

  test("nunca lanza con entradas invalidas (NaN, Infinity)", () => {
    assert.doesNotThrow(() => clampRotationRpm(NaN));
    assert.doesNotThrow(() => clampRotationRpm(Infinity));
    assert.equal(clampRotationRpm(NaN), MCDONALD_DEFAULT_ROTATION_RPM);
  });
});

describe("rpmToRadiansPerMs / computeRotationAngleRad (velocidad <-> periodo de rotacion)", () => {
  test("1 rpm equivale a 2*PI radianes tras 60000ms (una vuelta completa en un minuto)", () => {
    const radPerMs = rpmToRadiansPerMs(1);
    assert.ok(Math.abs(radPerMs * 60000 - 2 * Math.PI) < 1e-9);
  });

  test("tras el PERIODO exacto de una vuelta (60000/rpm ms), el angulo acumulado es una vuelta completa (2*PI en valor absoluto)", () => {
    for (const rpm of [0.5, 2, 6]) {
      const periodMs = 60000 / rpm;
      const angle = computeRotationAngleRad(rpm, periodMs, "clockwise");
      assert.ok(Math.abs(Math.abs(angle) - 2 * Math.PI) < 1e-6, `rpm=${rpm}`);
    }
  });

  test("sentido horario produce angulo POSITIVO, antihorario produce angulo NEGATIVO", () => {
    assert.ok(computeRotationAngleRad(2, 1000, "clockwise") > 0);
    assert.ok(computeRotationAngleRad(2, 1000, "counterclockwise") < 0);
  });

  test("mismo rpm/tiempo, sentidos opuestos -> angulos exactamente opuestos", () => {
    const cw = computeRotationAngleRad(3, 500, "clockwise");
    const ccw = computeRotationAngleRad(3, 500, "counterclockwise");
    assert.equal(cw, -ccw);
  });

  test("elapsedMs=0 siempre produce angulo 0, cualquiera que sea rpm/direccion", () => {
    // === (no assert.equal/strictEqual) a proposito: con direction
    // "counterclockwise" el resultado matematico es -0, que es
    // IGUAL a 0 con == y === (y visualmente identico, sin rotacion),
    // pero distinto con la comparacion SameValue que usa assert/strict.
    assert.ok(computeRotationAngleRad(6, 0, "clockwise") === 0);
    assert.ok(computeRotationAngleRad(0.5, 0, "counterclockwise") === 0);
  });

  test("es ACUMULABLE: la suma de incrementos por fotograma equivale al angulo de todo el intervalo", () => {
    const rpm = 2;
    const direction = "clockwise";
    const total = computeRotationAngleRad(rpm, 1000, direction);
    const sumaIncrementos =
      computeRotationAngleRad(rpm, 250, direction) +
      computeRotationAngleRad(rpm, 250, direction) +
      computeRotationAngleRad(rpm, 250, direction) +
      computeRotationAngleRad(rpm, 250, direction);
    assert.ok(Math.abs(total - sumaIncrementos) < 1e-9);
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

describe("computeRingPosition", () => {
  test("todas las posiciones de un anillo estan EXACTAMENTE a `radiusPercent` del centro (50,50)", () => {
    for (const count of [6, 10, 14, 18, 22]) {
      for (let i = 0; i < count; i += 1) {
        const { xPercent, yPercent } = computeRingPosition(30, i, count);
        const distance = Math.hypot(xPercent - 50, yPercent - 50);
        assert.ok(Math.abs(distance - 30) < 1e-9, `distancia incorrecta en indice ${i}/${count}: ${distance}`);
      }
    }
  });

  test("el indice 0 queda arriba del centro (12 en punto)", () => {
    const { xPercent, yPercent } = computeRingPosition(20, 0, 8);
    assert.ok(Math.abs(xPercent - 50) < 1e-9);
    assert.ok(yPercent < 50);
  });

  test("reparto angular UNIFORME: el angulo entre indices consecutivos es siempre 2*PI/count, para distintos tamaños de anillo", () => {
    for (const count of [6, 10, 14, 18, 22]) {
      const radius = 25;
      const angleOf = (i: number) => {
        const { xPercent, yPercent } = computeRingPosition(radius, i, count);
        return Math.atan2(yPercent - 50, xPercent - 50);
      };
      const expectedStep = (2 * Math.PI) / count;
      for (let i = 1; i < count; i += 1) {
        let diff = angleOf(i) - angleOf(i - 1);
        if (diff < 0) diff += 2 * Math.PI;
        assert.ok(Math.abs(diff - expectedStep) < 1e-9, `paso angular incorrecto en indice ${i} (count=${count})`);
      }
    }
  });

  test("nunca lanza con count=1 (un unico estimulo en el anillo)", () => {
    assert.doesNotThrow(() => computeRingPosition(20, 0, 1));
  });

  test("extraAngleRad por defecto (ausente) se comporta EXACTAMENTE igual que extraAngleRad=0 (compatibilidad con la fase estatica)", () => {
    for (let i = 0; i < 6; i += 1) {
      const a = computeRingPosition(20, i, 6);
      const b = computeRingPosition(20, i, 6, 0);
      assert.deepEqual(a, b);
    }
  });

  test("extraAngleRad desplaza el anillo COMPLETO sin alterar el radio (conservacion del radio durante la rotacion, tambien con mas de 3 anillos)", () => {
    for (const extraAngleRad of [0.3, Math.PI / 2, Math.PI, -1.7]) {
      for (const count of [6, 18, 22]) {
        for (let i = 0; i < count; i += 1) {
          const { xPercent, yPercent } = computeRingPosition(29, i, count, extraAngleRad);
          const distance = Math.hypot(xPercent - 50, yPercent - 50);
          assert.ok(Math.abs(distance - 29) < 1e-9, `radio alterado con extraAngleRad=${extraAngleRad}, count=${count}, indice ${i}`);
        }
      }
    }
  });

  test("extraAngleRad=PI mueve el punto a la posicion EXACTAMENTE opuesta (reflejo por el centro)", () => {
    const base = computeRingPosition(25, 0, 8, 0);
    const opuesto = computeRingPosition(25, 0, 8, Math.PI);
    assert.ok(Math.abs(opuesto.xPercent - (100 - base.xPercent)) < 1e-9);
    assert.ok(Math.abs(opuesto.yPercent - (100 - base.yPercent)) < 1e-9);
  });

  test("extraAngleRad=2*PI (una vuelta completa) devuelve EXACTAMENTE la misma posicion que extraAngleRad=0", () => {
    const base = computeRingPosition(25, 2, 8, 0);
    const vueltaCompleta = computeRingPosition(25, 2, 8, 2 * Math.PI);
    assert.ok(Math.abs(base.xPercent - vueltaCompleta.xPercent) < 1e-9);
    assert.ok(Math.abs(base.yPercent - vueltaCompleta.yPercent) < 1e-9);
  });
});

describe("computeStimulusRingGeometry", () => {
  for (const n of [1, 2, 3, 4, 5]) {
    test(`ringCount=${n}: longitud exacta computeTotalStimuli(${n})`, () => {
      assert.equal(computeStimulusRingGeometry(n).length, computeTotalStimuli(n));
    });

    test(`ringCount=${n}: respeta el orden y los limites de computeRingDefinitions (anillo por anillo)`, () => {
      const defs = computeRingDefinitions(n);
      const geometry = computeStimulusRingGeometry(n);
      let offset = 0;
      defs.forEach((ring: { radiusPercent: number; count: number }) => {
        for (let i = 0; i < ring.count; i += 1) {
          const geo = geometry[offset + i];
          assert.equal(geo.radiusPercent, ring.radiusPercent);
          assert.equal(geo.indexInRing, i);
          assert.equal(geo.countInRing, ring.count);
        }
        offset += ring.count;
      });
    });
  }
});

describe("generateMcDonaldContent", () => {
  test("longitud exacta igual a la suma de counts de ringDefinitions", () => {
    const defs = computeRingDefinitions(3);
    const content = generateMcDonaldContent(defs, LETTERS, Math.random);
    assert.equal(content.length, computeTotalStimuli(3));
  });

  test("contenido 'letters' usa solo letras A-Z", () => {
    const content = generateMcDonaldContent(computeRingDefinitions(3), LETTERS, Math.random);
    for (const c of content) assert.ok(/^[A-Z]$/.test(c), `estimulo invalido: ${c}`);
  });

  test("contenido 'numbers' usa solo digitos 0-9", () => {
    const content = generateMcDonaldContent(computeRingDefinitions(3), NUMBERS, Math.random);
    for (const c of content) assert.ok(/^[0-9]$/.test(c), `estimulo invalido: ${c}`);
  });

  test("contenido 'mixed' usa SOLO letras y/o digitos (ambos catalogos combinados)", () => {
    const content = generateMcDonaldContent(computeRingDefinitions(3), MIXED, Math.random);
    for (const c of content) assert.ok(/^[A-Z0-9]$/.test(c), `estimulo invalido: ${c}`);
  });

  test("nunca lanza con un pool vacio", () => {
    assert.doesNotThrow(() => generateMcDonaldContent(computeRingDefinitions(3), [], Math.random));
  });

  // Variedad: con una fuente de aleatoriedad que VARIA (nunca un valor
  // constante), la carta debe mostrar mas de un caracter distinto cuando
  // hay suficientes posiciones - DETERMINISTA (randomFn controlado por
  // secuencia, no Math.random) para evitar una prueba probabilistica
  // fragil. Cubre letras/numeros/mixto, pedido explicitamente.
  for (const [label, pool] of [
    ["letters", LETTERS],
    ["numbers", NUMBERS],
    ["mixed", MIXED],
  ] as const) {
    test(`contenido '${label}': con una fuente de aleatoriedad que varia, produce VARIEDAD (mas de un caracter distinto) en 30 estimulos`, () => {
      // Secuencia ciclica de fracciones DISTINTAS - cada llamada a
      // randomFn() devuelve un valor diferente al anterior, garantizando
      // (de forma deterministica, no probabilistica) que
      // pickStimulusContent no elige siempre el mismo indice del pool.
      const seq = [0.01, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 0.2, 0.5, 0.8];
      let i = 0;
      const randomFn = () => seq[i++ % seq.length];
      const content = generateMcDonaldContent(computeRingDefinitions(3), pool, randomFn);
      const distinct = new Set(content);
      assert.ok(distinct.size > 1, `se esperaba variedad, pero todos los estimulos son iguales: ${JSON.stringify(content)}`);
    });
  }

  // Caso DEGENERADO documentado explicitamente (no un comportamiento
  // deseado, sino la prueba de que el sintoma reportado - "todos los
  // caracteres son la letra A" - tiene una causa identificable y
  // reproducible): un randomFn CONSTANTE en 0 hace que
  // pickStimulusContent elija SIEMPRE el indice 0 del pool para los 30
  // estimulos. Esto es exactamente lo que ocurria en la primera carga de
  // McDonaldClient.tsx, cuyo placeholder de hidratacion usaba
  // `randomFn = () => 0` y, tras un cambio posterior que elimino el
  // useEffect que lo sustituia por contenido real al montar, ese
  // placeholder quedaba visible indefinidamente (bug corregido en esta
  // tarea, en McDonaldClient.tsx: se añadio un useEffect de montaje que
  // regenera con Math.random).
  test("caso degenerado documentado: randomFn CONSTANTE en 0 produce el MISMO caracter (pool[0]) en los 30 estimulos - la causa raiz exacta del sintoma 'todo son A'", () => {
    const content = generateMcDonaldContent(computeRingDefinitions(3), LETTERS, () => 0);
    assert.ok(content.every((c: string) => c === LETTERS[0]));
    assert.equal(new Set(content).size, 1);
  });

  test("funciona para cualquier numero de anillos (1 a 5)", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const content = generateMcDonaldContent(computeRingDefinitions(n), LETTERS, Math.random);
      assert.equal(content.length, computeTotalStimuli(n));
    }
  });
});

describe("generateBalancedRedGreenFlags", () => {
  test("exactamente ceil(N/2) true (rojo) y floor(N/2) false (verde), para distintos totales de estimulos (1 a 5 anillos)", () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const total = computeTotalStimuli(n);
      const flags = generateBalancedRedGreenFlags(total, Math.random);
      assert.equal(flags.length, total);
      assert.equal(flags.filter(Boolean).length, Math.ceil(total / 2));
      assert.equal(flags.filter((f: boolean) => !f).length, Math.floor(total / 2));
    }
  });

  test("N=1: un unico rojo", () => {
    assert.deepEqual(generateBalancedRedGreenFlags(1, Math.random), [true]);
  });

  test("N=0: array vacio, nunca lanza", () => {
    assert.deepEqual(generateBalancedRedGreenFlags(0, Math.random), []);
  });

  test("el shuffle SI reordena con una secuencia de randomFn que varia", () => {
    let i = 0;
    const seq = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6];
    const randomFn = () => seq[i++ % seq.length];
    const flags = generateBalancedRedGreenFlags(8, randomFn);
    assert.notDeepEqual(flags, [true, true, true, true, false, false, false, false]);
  });
});

describe("resolveMcDonaldColors", () => {
  const total = computeTotalStimuli(3);

  test("'neutral': todos los estimulos con MCDONALD_NEUTRAL_COLOR", () => {
    const colors = resolveMcDonaldColors("neutral", "#ff0000", "#00ff00", total, Math.random);
    assert.ok(colors.every((c: string) => c === MCDONALD_NEUTRAL_COLOR));
  });

  test("'monochromeRed': todos los estimulos con redHex", () => {
    const colors = resolveMcDonaldColors("monochromeRed", "#ff0000", "#00ff00", total, Math.random);
    assert.ok(colors.every((c: string) => c === "#ff0000"));
  });

  test("'monochromeGreen': todos los estimulos con greenHex", () => {
    const colors = resolveMcDonaldColors("monochromeGreen", "#ff0000", "#00ff00", total, Math.random);
    assert.ok(colors.every((c: string) => c === "#00ff00"));
  });

  test("'redGreen': distribucion equilibrada exacta entre redHex/greenHex", () => {
    const colors = resolveMcDonaldColors("redGreen", "#ff0000", "#00ff00", total, Math.random);
    assert.equal(colors.filter((c: string) => c === "#ff0000").length, Math.ceil(total / 2));
    assert.equal(colors.filter((c: string) => c === "#00ff00").length, Math.floor(total / 2));
  });
});

describe("generateMcDonaldStimuli", () => {
  test("con una fuente de aleatoriedad que varia, el CONTENIDO muestra variedad (mas de un caracter distinto) - no un sintoma tipo 'todo son A'", () => {
    const seq = [0.02, 0.18, 0.33, 0.47, 0.61, 0.76, 0.91, 0.22, 0.58, 0.84];
    let i = 0;
    const randomFn = () => seq[i++ % seq.length];
    const stimuli = generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, LETTERS, randomFn);
    const distinctContent = new Set(stimuli.map((s: { content: string }) => s.content));
    assert.ok(distinctContent.size > 1, `se esperaba variedad, pero todos los estimulos tienen el mismo contenido: ${JSON.stringify(stimuli.map((s: { content: string }) => s.content))}`);
  });

  test("regenerar (randomFn distinto) produce una combinacion de CONTENIDO distinta cuando es posible, conservando posiciones/anillos", () => {
    const seqA = [0.05, 0.2, 0.4, 0.6, 0.8, 0.1, 0.3, 0.5, 0.7, 0.9];
    const seqB = [0.95, 0.75, 0.55, 0.35, 0.15, 0.85, 0.65, 0.45, 0.25, 0.05];
    let i = 0;
    const randomFnA = () => seqA[i++ % seqA.length];
    i = 0;
    const randomFnB = () => seqB[i++ % seqB.length];
    const a = generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, LETTERS, randomFnA);
    const b = generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, LETTERS, randomFnB);
    const contentA = a.map((s: { content: string }) => s.content);
    const contentB = b.map((s: { content: string }) => s.content);
    assert.notDeepEqual(contentA, contentB, "regenerar con una fuente de aleatoriedad distinta deberia cambiar el contenido");
    // Las posiciones/anillos (geometria) NUNCA cambian entre regeneraciones.
    for (let idx = 0; idx < a.length; idx += 1) {
      assert.equal(a[idx].xPercent, b[idx].xPercent);
      assert.equal(a[idx].yPercent, b[idx].yPercent);
      assert.equal(a[idx].ring, b[idx].ring);
    }
  });

  test("longitud exacta igual a computeTotalStimuli(config.ringCount), con contenido/color coherentes (redGreen)", () => {
    const config = { ...DEFAULT_MCDONALD_CONFIG, colorMode: "redGreen", redHex: "#ff0000", greenHex: "#00ff00" };
    const stimuli = generateMcDonaldStimuli(config, LETTERS, Math.random);
    assert.equal(stimuli.length, computeTotalStimuli(config.ringCount));
    const reds = stimuli.filter((s: { color: string }) => s.color === "#ff0000").length;
    const greens = stimuli.filter((s: { color: string }) => s.color === "#00ff00").length;
    assert.equal(reds, Math.ceil(stimuli.length / 2));
    assert.equal(greens, Math.floor(stimuli.length / 2));
    for (const s of stimuli) assert.ok(/^[A-Z]$/.test(s.content));
  });

  test("asigna el indice de anillo correcto respetando el orden de computeRingDefinitions(config.ringCount)", () => {
    const stimuli = generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, LETTERS, Math.random);
    const defs = computeRingDefinitions(DEFAULT_MCDONALD_CONFIG.ringCount);
    let offset = 0;
    defs.forEach((ring: { count: number }, ringIndex: number) => {
      for (let i = 0; i < ring.count; i += 1) {
        assert.equal(stimuli[offset + i].ring, ringIndex);
      }
      offset += ring.count;
    });
  });

  test("todas las posiciones quedan dentro del contenedor (0-100 en x e y)", () => {
    const stimuli = generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, LETTERS, Math.random);
    for (const s of stimuli) {
      assert.ok(s.xPercent >= 0 && s.xPercent <= 100, `xPercent fuera de rango: ${s.xPercent}`);
      assert.ok(s.yPercent >= 0 && s.yPercent <= 100, `yPercent fuera de rango: ${s.yPercent}`);
    }
  });

  test("la POSICION no cambia entre regeneraciones con el MISMO ringCount (solo depende de computeRingDefinitions, nunca de randomFn)", () => {
    const a = generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, LETTERS, () => 0.1);
    const b = generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, LETTERS, () => 0.9);
    for (let i = 0; i < a.length; i += 1) {
      assert.equal(a[i].xPercent, b[i].xPercent);
      assert.equal(a[i].yPercent, b[i].yPercent);
    }
  });

  test("ignora por completo charSizeMode/motionMode/rotationDirection/rotationSpeedRpm/charSize/cardSize - mismo randomFn, mismo resultado exacto aunque esos campos difieran (ningun cambio de tamaño o movimiento debe disparar una regeneracion de contenido/color)", () => {
    const configA = { ...DEFAULT_MCDONALD_CONFIG, charSizeMode: "uniform", motionMode: "static", rotationDirection: "clockwise", rotationSpeedRpm: 1, charSize: "sm", cardSize: "sm" };
    const configB = { ...DEFAULT_MCDONALD_CONFIG, charSizeMode: "progressive", motionMode: "dynamic", rotationDirection: "counterclockwise", rotationSpeedRpm: 5, charSize: "lg", cardSize: "lg" };
    let i = 0;
    const seq = [0.1, 0.5, 0.9, 0.3, 0.7];
    const randomFn = () => seq[i++ % seq.length];
    i = 0;
    const a = generateMcDonaldStimuli(configA, LETTERS, randomFn);
    i = 0;
    const b = generateMcDonaldStimuli(configB, LETTERS, randomFn);
    assert.deepEqual(a, b);
  });

  for (const n of [1, 2, 3, 4, 5]) {
    test(`ringCount=${n}: genera exactamente computeTotalStimuli(${n}) estimulos, todos con anillo valido (0..${n - 1}) y posicion compatible con rotacion dinamica (extraAngleRad conserva el radio)`, () => {
      const config = { ...DEFAULT_MCDONALD_CONFIG, ringCount: n };
      const stimuli = generateMcDonaldStimuli(config, LETTERS, Math.random);
      assert.equal(stimuli.length, computeTotalStimuli(n));
      for (const s of stimuli) {
        assert.ok(s.ring >= 0 && s.ring < n, `indice de anillo fuera de rango: ${s.ring}`);
      }
      // Compatibilidad con el motor de rotacion dinamica: recalcular la
      // posicion de cada estimulo con un extraAngleRad (simulando un
      // fotograma de rotacion) debe seguir conservando su radio exacto -
      // "mantener todos los caracteres en posicion vertical, tambien
      // durante la rotacion dinamica" se traduce, a nivel de geometria
      // pura, en que la rotacion SOLO desplaza el punto (nunca introduce
      // un angulo de orientacion del caracter) y nunca cambia el radio.
      const geometry = computeStimulusRingGeometry(n);
      for (let i = 0; i < stimuli.length; i += 1) {
        const geo = geometry[i];
        const rotated = computeRingPosition(geo.radiusPercent, geo.indexInRing, geo.countInRing, 1.234);
        const distance = Math.hypot(rotated.xPercent - 50, rotated.yPercent - 50);
        assert.ok(Math.abs(distance - geo.radiusPercent) < 1e-9, `radio alterado durante rotacion simulada (ringCount=${n}, estimulo ${i})`);
      }
    });

    test(`ringCount=${n}: tamaño uniforme produce el MISMO factor de escala para todos los anillos presentes`, () => {
      const scales = Array.from({ length: n }, (_, ringIndex) => resolveRingSizeScale("uniform", ringIndex, n));
      assert.ok(scales.every((s: number) => s === 1), `modo uniforme deberia dar 1 en todos los anillos (ringCount=${n})`);
    });

    test(`ringCount=${n}: tamaño progresivo - el anillo exterior es el mayor y el interior el menor (o equivalentes si n=1)`, () => {
      const interior = resolveRingSizeScale("progressive", 0, n);
      const exterior = resolveRingSizeScale("progressive", n - 1, n);
      if (n === 1) {
        assert.equal(interior, exterior);
        assert.equal(interior, 1);
      } else {
        assert.ok(exterior > interior, `el exterior deberia ser mayor que el interior (ringCount=${n})`);
      }
    });
  }
});

describe("migrateMcDonaldCardConfig / isValidMcDonaldCardConfig / resolveMcDonaldCardConfig", () => {
  test("una configuracion ya valida (v1) se resuelve sin cambios", () => {
    const resolved = resolveMcDonaldCardConfig(DEFAULT_MCDONALD_CONFIG);
    assert.deepEqual(resolved, DEFAULT_MCDONALD_CONFIG);
  });

  test("migrateMcDonaldCardConfig devuelve la MISMA referencia si ya esta en la version actual", () => {
    assert.equal(migrateMcDonaldCardConfig(DEFAULT_MCDONALD_CONFIG), DEFAULT_MCDONALD_CONFIG);
  });

  test("migrateMcDonaldCardConfig nunca lanza con entradas invalidas (null, numero, string, array)", () => {
    assert.doesNotThrow(() => migrateMcDonaldCardConfig(null));
    assert.doesNotThrow(() => migrateMcDonaldCardConfig(42));
    assert.doesNotThrow(() => migrateMcDonaldCardConfig("hola"));
    assert.doesNotThrow(() => migrateMcDonaldCardConfig([1, 2, 3]));
    assert.doesNotThrow(() => migrateMcDonaldCardConfig(undefined));
  });

  test("isValidMcDonaldCardConfig rechaza cada campo invalido por separado", () => {
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, schemaVersion: 99 }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, ringCount: MCDONALD_MIN_RINGS - 1 }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, ringCount: MCDONALD_MAX_RINGS + 1 }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, ringCount: 2.5 }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, ringCount: "3" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, ringCount: NaN }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, content: "shapes" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, colorMode: "rainbow" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, redHex: "not-a-color" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, greenHex: "not-a-color" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, charSize: "xxl" }), false);
    // "xl" SI es un charSize valido (nuevo nivel maximo ampliado), pero
    // cardSize sigue teniendo solo 3 niveles (sm/md/lg) - control
    // independiente, sin ampliar (requisito explicito de esta tarea).
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, cardSize: "xl" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, charSizeMode: "random" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, motionMode: "animated" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, rotationDirection: "diagonal" }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, rotationSpeedRpm: MCDONALD_MIN_ROTATION_RPM - 0.01 }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, rotationSpeedRpm: MCDONALD_MAX_ROTATION_RPM + 0.01 }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, rotationSpeedRpm: NaN }), false);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, rotationSpeedRpm: "2" }), false);
  });

  test("isValidMcDonaldCardConfig acepta los limites exactos de ringCount y rotationSpeedRpm (inclusive)", () => {
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, ringCount: MCDONALD_MIN_RINGS }), true);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, ringCount: MCDONALD_MAX_RINGS }), true);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, rotationSpeedRpm: MCDONALD_MIN_ROTATION_RPM }), true);
    assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, rotationSpeedRpm: MCDONALD_MAX_ROTATION_RPM }), true);
  });

  test("isValidMcDonaldCardConfig acepta los 5 niveles de charSize, incluidos los 2 nuevos extremos ('xs'/'xl')", () => {
    for (const charSize of ["xs", "sm", "md", "lg", "xl"]) {
      assert.equal(isValidMcDonaldCardConfig({ ...DEFAULT_MCDONALD_CONFIG, charSize }), true, `charSize=${charSize}`);
    }
  });

  test("isValidMcDonaldCardConfig rechaza valores no-objeto sin lanzar", () => {
    assert.equal(isValidMcDonaldCardConfig(null), false);
    assert.equal(isValidMcDonaldCardConfig(undefined), false);
    assert.equal(isValidMcDonaldCardConfig("config"), false);
    assert.equal(isValidMcDonaldCardConfig(42), false);
  });

  test("resolveMcDonaldCardConfig devuelve null (nunca lanza) ante entradas irrecuperables", () => {
    assert.equal(resolveMcDonaldCardConfig(null), null);
    assert.equal(resolveMcDonaldCardConfig({}), null);
    assert.equal(resolveMcDonaldCardConfig({ foo: "bar" }), null);
    assert.equal(resolveMcDonaldCardConfig("garbage"), null);
  });

  test("resolveMcDonaldCardConfig acepta una configuracion valida con parametros distintos al default, incluido ringCount", () => {
    const custom = {
      ...DEFAULT_MCDONALD_CONFIG,
      ringCount: 5,
      content: "mixed",
      colorMode: "redGreen",
      charSize: "lg",
      cardSize: "sm",
      charSizeMode: "progressive",
      motionMode: "dynamic",
      rotationDirection: "counterclockwise",
      rotationSpeedRpm: 4.5,
    };
    const resolved = resolveMcDonaldCardConfig(custom);
    assert.deepEqual(resolved, custom);
  });
});
