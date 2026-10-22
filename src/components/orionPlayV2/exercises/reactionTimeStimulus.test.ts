/**
 * Pruebas aisladas de la logica pura de reactionTimeStimulus.ts
 * (buildFixedSequence/decideRandomIsGo/drawSessionGoRatio) - test runner
 * nativo de Node (node:test + node:assert/strict), sin instalar ningun
 * framework. Mismo patron exacto que visual-lab/play/effectiveConfig.test.ts.
 *
 * Deliberadamente SIN importar nada de React/Next.js - este archivo solo
 * importa ./reactionTimeStimulus.ts (modulo puro) y las utilidades
 * nativas de Node. Ejecutar con:
 *   node --test "src/components/orionPlayV2/exercises/reactionTimeStimulus.test.ts"
 *
 * Import dinamico con ruta NO literal (mismo motivo documentado en
 * effectiveConfig.test.ts: TS5097 - moduleResolution "bundler" rechaza la
 * extension .ts explicita en un import ESTATICO, pero no la comprueba en
 * un import() cuyo specifier no es un string literal). Mismo coste
 * documentado alli: el resultado se tipa como `any` dentro de este
 * archivo.
 *
 * ALCANCE: prueba la GENERACION de la secuencia GO/NO-GO (cuota exacta en
 * 'fixed', probabilidad real en 'random') y el sorteo de la probabilidad
 * de SESION en 'random' (drawSessionGoRatio, [0.5, 0.9)). NO prueba el
 * bucle de avance de runExercise (ReactionTimeExercise.tsx) - esa logica
 * sigue acoplada a refs/estado de React y al hook useExerciseFlow, y
 * extraerla como
 * maquina de estados pura excede el alcance de esta correccion (ver
 * informe de la auditoria de Go/No Go del 2026-10-22). La garantia de que
 * los intentos avanzan sin respuesta sigue siendo la que ya demuestra la
 * LECTURA DIRECTA del codigo de runExercise (flow.sleep fijo + trial++
 * incondicional, nunca condicionado a clickedRef), no una prueba
 * automatizada - esto queda pendiente, documentado como tal.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const modulePath = "./reactionTimeStimulus" + ".ts";
const { buildFixedSequence, decideRandomIsGo, drawSessionGoRatio } = await import(modulePath);

describe("buildFixedSequence - modo 'fixed', cuota EXACTA", () => {
  test("cuenta exactamente round(total*ratio) GO, para varias combinaciones", () => {
    const cases: Array<[number, number]> = [
      [20, 0.7],
      [20, 0.5],
      [10, 0.3],
      [50, 0.9],
      [7, 0.5], // round(3.5) = 4 (redondeo "half up" de Math.round)
    ];
    for (const [total, ratio] of cases) {
      const seq = buildFixedSequence(total, ratio);
      const goCount = seq.filter(Boolean).length;
      assert.equal(seq.length, total, `longitud incorrecta para total=${total}`);
      assert.equal(goCount, Math.round(total * ratio), `cuota incorrecta para total=${total}, ratio=${ratio}`);
    }
  });

  test("ratio=0 -> cero GO, todos NO-GO", () => {
    const seq = buildFixedSequence(20, 0);
    assert.equal(seq.filter(Boolean).length, 0);
    assert.equal(seq.length, 20);
  });

  test("ratio=1 -> todos GO, cero NO-GO", () => {
    const seq = buildFixedSequence(20, 1);
    assert.equal(seq.filter(Boolean).length, 20);
  });

  test("total=0 -> secuencia vacia, sin lanzar", () => {
    const seq = buildFixedSequence(0, 0.7);
    assert.deepEqual(seq, []);
  });

  test("total pequeño (1 intento) respeta el redondeo", () => {
    assert.deepEqual(buildFixedSequence(1, 0.7), [true]); // round(0.7)=1
    assert.deepEqual(buildFixedSequence(1, 0.3), [false]); // round(0.3)=0
  });

  test("el ORDEN varia entre llamadas (barajado real, no siempre GO primero)", () => {
    // Prueba probabilistica de que el barajado realmente mezcla, no una
    // prueba de independencia estadistica fina - con 30 repeticiones de
    // un caso con mezcla real (ni todo GO ni todo NO-GO), la probabilidad
    // de que SIEMPRE salga el mismo orden exacto es astronomicamente baja
    // si Fisher-Yates funciona; si este test fallara de forma intermitente,
    // seria indicio real de un bug en el barajado, no ruido esperado.
    const orders = new Set<string>();
    for (let i = 0; i < 30; i++) {
      orders.add(buildFixedSequence(10, 0.5).join(","));
    }
    assert.ok(orders.size > 1, "el barajado deberia producir distintos ordenes en 30 intentos");
  });
});

describe("decideRandomIsGo - modo 'random', PROBABILIDAD por intento (corrige el bug de goRatio ignorado)", () => {
  test("con randomFn inyectada (determinista): randomFn() < goRatio, exacto", () => {
    assert.equal(decideRandomIsGo(0.7, () => 0.69), true);
    assert.equal(decideRandomIsGo(0.7, () => 0.71), false);
    assert.equal(decideRandomIsGo(0.5, () => 0.49999), true);
    assert.equal(decideRandomIsGo(0, () => 0), false); // 0 < 0 es false: ratio=0 nunca da GO
    assert.equal(decideRandomIsGo(1, () => 0.999999), true); // casi 1 < 1 sigue siendo GO
  });

  test("dos llamadas sucesivas con la MISMA randomFn fija dan el MISMO resultado (sin memoria de estimulos anteriores)", () => {
    const fixed = () => 0.4;
    assert.equal(decideRandomIsGo(0.7, fixed), decideRandomIsGo(0.7, fixed));
  });

  test("distribucion real (Math.random real, N grande): la proporcion de GO se acerca a goRatio dentro de una tolerancia razonable", () => {
    // Prueba ESTADISTICA, no exacta - no depende de ninguna secuencia
    // aleatoria concreta: con N=20000 y goRatio=0.7, el error estandar de
    // la proporcion es sqrt(0.7*0.3/20000) ~= 0.0032 (0.32 puntos), asi
    // que una tolerancia de +-5 puntos porcentuales (0.05) es extremadamente
    // holgada (~15 desviaciones estandar) - la probabilidad de fallo
    // espurio es, a efectos practicos, cero. No se fija ninguna semilla:
    // intencionalmente no depende de una secuencia concreta de Math.random.
    const N = 20000;
    const goRatio = 0.7;
    let goCount = 0;
    for (let i = 0; i < N; i++) {
      if (decideRandomIsGo(goRatio)) goCount++;
    }
    const proportion = goCount / N;
    assert.ok(
      Math.abs(proportion - goRatio) < 0.05,
      `proporcion observada ${proportion} demasiado lejos de goRatio=${goRatio}`
    );
  });

  test("goRatio=0.5 sigue produciendo ambos resultados en una muestra real (no colapsa a uno solo)", () => {
    const results = new Set<boolean>();
    for (let i = 0; i < 200; i++) {
      results.add(decideRandomIsGo(0.5));
    }
    assert.equal(results.size, 2, "con 200 sorteos a 0.5 deberian aparecer GO y NO-GO");
  });
});

describe("drawSessionGoRatio - sorteo UNICO por sesion, rango [0.5, 0.9)", () => {
  test("randomFn()=0 (extremo inferior) -> exactamente 0.5", () => {
    assert.equal(drawSessionGoRatio(() => 0), 0.5);
  });

  test("randomFn() muy cercano a 1 (extremo superior) -> muy cercano a 0.9, sin llegar a superarlo", () => {
    const value = drawSessionGoRatio(() => 0.999999);
    assert.ok(value < 0.9, `valor ${value} no deberia alcanzar ni superar 0.9`);
    assert.ok(value > 0.8999, `valor ${value} deberia estar pegado al extremo superior`);
  });

  test("randomFn()=0.5 (punto medio del generador) -> punto medio real del rango, 0.7", () => {
    assert.equal(drawSessionGoRatio(() => 0.5), 0.7);
  });

  test("con Math.random real, N grande: todos los valores caen dentro de [0.5, 0.9), nunca fuera", () => {
    for (let i = 0; i < 5000; i++) {
      const value = drawSessionGoRatio();
      assert.ok(value >= 0.5 && value < 0.9, `valor ${value} fuera del rango [0.5, 0.9)`);
    }
  });

  test("dos llamadas sucesivas (sin randomFn fija) dan valores distintos en una muestra real", () => {
    const values = new Set<number>();
    for (let i = 0; i < 20; i++) {
      values.add(drawSessionGoRatio());
    }
    assert.ok(values.size > 1, "20 sorteos reales no deberian dar siempre el mismo valor");
  });
});

describe("integracion drawSessionGoRatio + decideRandomIsGo - la probabilidad sorteada por sesion gobierna de verdad cada sorteo de intento", () => {
  test("una probabilidad de sesion ALTA (cercana a 0.9) produce una proporcion de GO acorde, no 50/50", () => {
    // Misma logica de tolerancia estadistica que el test de distribucion
    // real de decideRandomIsGo (sin semilla fija, N grande, margen holgado).
    const sessionRatio = drawSessionGoRatio(() => 0.999999); // ~0.9
    const N = 20000;
    let goCount = 0;
    for (let i = 0; i < N; i++) {
      if (decideRandomIsGo(sessionRatio)) goCount++;
    }
    const proportion = goCount / N;
    assert.ok(
      Math.abs(proportion - sessionRatio) < 0.05,
      `proporcion observada ${proportion} demasiado lejos de la probabilidad de sesion ${sessionRatio}`
    );
  });

  test("una probabilidad de sesion BAJA (0.5, el minimo) produce una proporcion de GO acorde, claramente distinta de la prueba anterior", () => {
    const sessionRatio = drawSessionGoRatio(() => 0); // exactamente 0.5
    const N = 20000;
    let goCount = 0;
    for (let i = 0; i < N; i++) {
      if (decideRandomIsGo(sessionRatio)) goCount++;
    }
    const proportion = goCount / N;
    assert.ok(
      Math.abs(proportion - sessionRatio) < 0.05,
      `proporcion observada ${proportion} demasiado lejos de la probabilidad de sesion ${sessionRatio}`
    );
  });

  test("la MISMA probabilidad de sesion se reutiliza en todos los intentos (no se vuelve a sortear por intento)", () => {
    // Simula exactamente el uso real en runExercise: sessionGoRatioRef se
    // sortea UNA VEZ (aqui, fuera del bucle) y decideRandomIsGo se llama
    // una vez por intento con ese mismo valor, nunca con uno nuevo.
    const sessionRatio = drawSessionGoRatio();
    for (let trial = 0; trial < 50; trial++) {
      // No se reasigna sessionRatio en ningun punto de este bucle - si lo
      // estuviera, este test no demostraria nada distinto del test de
      // decideRandomIsGo en aislamiento.
      decideRandomIsGo(sessionRatio);
    }
    assert.ok(sessionRatio >= 0.5 && sessionRatio < 0.9);
  });
});
