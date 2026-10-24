/**
 * Pruebas aisladas de la logica pura de stimulusConfig.ts - test runner
 * nativo de Node (node:test + node:assert/strict), mismo criterio que
 * effectiveConfig.test.ts (Play). Ejecutar con:
 *   node --test "src/components/visualLabTools/stimulusGenerator/stimulusConfig.test.ts"
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Import dinamico con ruta NO literal (mismo motivo documentado en los
// demas archivos de test de este proyecto: TS5097 con moduleResolution
// "bundler" en un import ESTATICO con extension .ts explicita).
const modulePath = "./stimulusConfig" + ".ts";
const mod = await import(modulePath);
const {
  DEFAULT_STIMULUS_CONFIG,
  BASE_COLOR_PALETTE,
  BASE_ELEMENTS,
  BASE_NUMBERS,
  BASE_LETTERS,
  isValidStimulusGeneratorConfig,
  migrateStimulusGeneratorConfig,
  resolveStimulusGeneratorConfig,
  getActiveCategories,
  canStartGenerator,
  pickRandomStimulus,
  computeNextIntervalMs,
  computeNextPresentationStep,
  summarizeColorsCategory,
  summarizeSymbolCategory,
} = mod;

function cloneDefault() {
  return structuredClone(DEFAULT_STIMULUS_CONFIG);
}

describe("isValidStimulusGeneratorConfig", () => {
  test("acepta DEFAULT_STIMULUS_CONFIG", () => {
    assert.equal(isValidStimulusGeneratorConfig(DEFAULT_STIMULUS_CONFIG), true);
  });

  test("rechaza null/undefined/primitivos", () => {
    assert.equal(isValidStimulusGeneratorConfig(null), false);
    assert.equal(isValidStimulusGeneratorConfig(undefined), false);
    assert.equal(isValidStimulusGeneratorConfig("x"), false);
    assert.equal(isValidStimulusGeneratorConfig(42), false);
  });

  test("rechaza la forma del incremento anterior (stimulusType unico, sin categories)", () => {
    assert.equal(
      isValidStimulusGeneratorConfig({
        stimulusType: "colors",
        intervalMode: "fixed",
        intervalMs: 2000,
        intervalMinMs: 1000,
        intervalMaxMs: 3000,
      }),
      false
    );
  });

  test("rechaza si falta alguna de las 4 categorias", () => {
    const cfg = cloneDefault();
    delete cfg.categories.shapes;
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
  });

  test("rechaza background/colorMode fuera de los valores permitidos", () => {
    const cfg = cloneDefault();
    cfg.categories.numbers.background = "green";
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
    const cfg2 = cloneDefault();
    cfg2.categories.letters.colorMode = "gradient";
    assert.equal(isValidStimulusGeneratorConfig(cfg2), false);
  });

  test("rechaza size fuera de sm/md/lg", () => {
    const cfg = cloneDefault();
    cfg.size = "xl";
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
  });

  test("rechaza intervalMs <= 0", () => {
    const cfg = cloneDefault();
    cfg.intervalMs = 0;
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
  });

  test("rechaza elements que no sea array de strings", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.elements = [1, 2, 3];
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
  });
});

describe("isValidStimulusGeneratorConfig — colores personalizados (3er incremento)", () => {
  test("acepta un color hex personalizado (fuera de las paletas fijas) en `color`", () => {
    const cfg = cloneDefault();
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.color = "#123abc";
    assert.equal(isValidStimulusGeneratorConfig(cfg), true);
  });

  test("acepta varios colores personalizados en `palette`", () => {
    const cfg = cloneDefault();
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.colorMode = "palette";
    cfg.categories.letters.palette = ["#123abc", "#abcdef", "#fedcba"];
    assert.equal(isValidStimulusGeneratorConfig(cfg), true);
  });

  test("acepta colores personalizados como `elements` de la categoria 'colors'", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.elements = ["#123abc", "#abcdef"];
    assert.equal(isValidStimulusGeneratorConfig(cfg), true);
  });

  test("rechaza `color` con formato invalido (nombre de color, hex de 3 cifras, sin #)", () => {
    for (const bad of ["red", "#fff", "123abc", "#gggggg", ""]) {
      const cfg = cloneDefault();
      cfg.categories.numbers.color = bad;
      assert.equal(isValidStimulusGeneratorConfig(cfg), false, `deberia rechazar color=${JSON.stringify(bad)}`);
    }
  });

  test("rechaza `palette` si CUALQUIER color de la lista es invalido (no solo si todos lo son)", () => {
    const cfg = cloneDefault();
    cfg.categories.shapes.palette = ["#123abc", "no-es-un-color"];
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
  });

  test("rechaza `elements` de 'colors' con un color de formato invalido", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.elements = ["#123abc", "azul"];
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
  });

  test("acepta mayusculas en el hex (case-insensitive)", () => {
    const cfg = cloneDefault();
    cfg.categories.numbers.color = "#ABCDEF";
    assert.equal(isValidStimulusGeneratorConfig(cfg), true);
  });
});

describe("isValidStimulusGeneratorConfig — compatibilidad con configuraciones ya guardadas", () => {
  test("DEFAULT_STIMULUS_CONFIG del incremento anterior (con solo las paletas fijas) sigue siendo valida TRAS migrar", () => {
    // Snapshot independiente (no referencia BASE_COLOR_PALETTE/
    // SYMBOL_COLOR_OPTIONS actuales) para simular fielmente un JSON ya
    // guardado en localStorage por una version anterior de la app, tal
    // como quedaria tras `JSON.parse(JSON.stringify(...))` - nunca se
    // asume que el modulo actual y el JSON persistido evolucionan juntos.
    //
    // 6o incremento: a esta forma (anterior a displayMode/background en
    // "colors") la validacion DIRECTA la rechaza correctamente ahora - lo
    // nuevo es que `migrateStimulusGeneratorConfig` la repara antes de
    // validar (ver el describe "Colores: modo de presentacion" mas abajo
    // para el detalle de esa funcion) - aqui solo se confirma el
    // resultado final tras ese paso, igual que lo haria
    // loadStoredConfig/getStimulusGeneratorDefaultConfig en el cliente.
    const persisted = {
      categories: {
        colors: { enabled: true, elements: ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"] },
        numbers: {
          enabled: false,
          elements: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
          background: "white",
          colorMode: "fixed",
          color: "#10203f",
          palette: ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
        },
        letters: {
          enabled: true,
          elements: ["A", "B", "C"],
          background: "black",
          colorMode: "palette",
          color: "#ffffff",
          palette: ["#10203f", "#ffffff", "#ef4444"],
        },
        shapes: {
          enabled: false,
          elements: ["circle", "square", "triangle", "star"],
          background: "white",
          colorMode: "fixed",
          color: "#10203f",
          palette: ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
        },
      },
      size: "md",
      intervalMode: "random",
      intervalMs: 2000,
      intervalMinMs: 1000,
      intervalMaxMs: 3000,
    };
    assert.equal(isValidStimulusGeneratorConfig(persisted), false);
    const migrated = migrateStimulusGeneratorConfig(persisted);
    assert.equal(isValidStimulusGeneratorConfig(migrated), true);
    assert.equal(migrated.categories.colors.displayMode, "fullscreen");
    assert.equal(migrated.categories.colors.background, "white");
    // La seleccion real (3 letras, no las 26) se conserva intacta.
    assert.deepEqual(migrated.categories.letters.elements, ["A", "B", "C"]);
  });

  test("una configuracion guardada del PRIMER incremento (stimulusType unico) sigue cayendo a DEFAULT_STIMULUS_CONFIG, nunca lanza", () => {
    const persisted = { stimulusType: "letters", intervalMode: "fixed", intervalMs: 1500, intervalMinMs: 1000, intervalMaxMs: 2000 };
    assert.equal(isValidStimulusGeneratorConfig(persisted), false);
  });
});

describe("getActiveCategories / canStartGenerator", () => {
  test("DEFAULT_STIMULUS_CONFIG solo tiene 'colors' activa", () => {
    const active = getActiveCategories(DEFAULT_STIMULUS_CONFIG);
    assert.deepEqual(active.map((c: { id: string }) => c.id), ["colors"]);
    assert.equal(canStartGenerator(DEFAULT_STIMULUS_CONFIG), true);
  });

  test("una categoria activada pero sin elementos NO cuenta como activa", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.elements = [];
    assert.equal(getActiveCategories(cfg).length, 0);
    assert.equal(canStartGenerator(cfg), false);
  });

  test("varias categorias combinadas aparecen todas en el orden colors->numbers->letters->shapes", () => {
    const cfg = cloneDefault();
    cfg.categories.numbers.enabled = true;
    cfg.categories.shapes.enabled = true;
    const active = getActiveCategories(cfg);
    assert.deepEqual(active.map((c: { id: string }) => c.id), ["colors", "numbers", "shapes"]);
  });

  test("sin ninguna categoria activa, canStartGenerator es false", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    assert.equal(canStartGenerator(cfg), false);
  });
});

describe("pickRandomStimulus", () => {
  test("null si no hay ninguna categoria activa (nunca inventa un estimulo)", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    assert.equal(pickRandomStimulus(cfg, () => 0.5), null);
  });

  test("categoria 'colors': value y renderColor son el mismo color, fondo blanco fijo", () => {
    const stim = pickRandomStimulus(DEFAULT_STIMULUS_CONFIG, () => 0);
    assert.equal(stim.category, "colors");
    assert.equal(stim.value, BASE_COLOR_PALETTE[0]);
    assert.equal(stim.renderColor, BASE_COLOR_PALETTE[0]);
    assert.equal(stim.background, "white");
  });

  test("categoria simbolo con colorMode='fixed': renderColor es siempre `color`, nunca cambia con el sorteo", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.color = "#112233";
    const a = pickRandomStimulus(cfg, () => 0);
    const b = pickRandomStimulus(cfg, () => 0.99);
    assert.equal(a.renderColor, "#112233");
    assert.equal(b.renderColor, "#112233");
  });

  test("categoria simbolo con colorMode='palette': renderColor sale de `palette`, no de `color`", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.colorMode = "palette";
    cfg.categories.letters.palette = ["#aaaaaa", "#bbbbbb"];
    cfg.categories.letters.color = "#000000";
    const stim = pickRandomStimulus(cfg, () => 0.9);
    assert.equal(stim.renderColor, "#bbbbbb");
  });

  test("colorMode='palette' con palette vacia: usa `color` como respaldo, nunca lanza", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.shapes.enabled = true;
    cfg.categories.shapes.colorMode = "palette";
    cfg.categories.shapes.palette = [];
    cfg.categories.shapes.color = "#101828";
    const stim = pickRandomStimulus(cfg, () => 0.5);
    assert.equal(stim.renderColor, "#101828");
  });

  test("reparto EQUILIBRADO entre categorias activas: con 2 categorias activas, randomFn()=0.49 elige la primera y 0.51 la segunda (no ponderado por nº de elementos)", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = true; // 6 elementos
    cfg.categories.numbers.enabled = true; // 10 elementos
    cfg.categories.numbers.elements = [...BASE_NUMBERS];
    let call = 0;
    const seq = [0.49, 0, 0.51, 0];
    const randomFn = () => seq[call++];
    const first = pickRandomStimulus(cfg, randomFn);
    const second = pickRandomStimulus(cfg, randomFn);
    assert.equal(first.category, "colors");
    assert.equal(second.category, "numbers");
  });

  test("solo saca elementos dentro de `elements` (subconjunto configurado), nunca fuera de el", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.elements = ["A", "B"];
    for (let i = 0; i < 20; i++) {
      const stim = pickRandomStimulus(cfg, () => i / 20);
      assert.ok(["A", "B"].includes(stim.value), `valor inesperado: ${stim.value}`);
    }
  });
});

describe("computeNextIntervalMs (sin cambios respecto al primer incremento)", () => {
  test("modo fijo devuelve siempre intervalMs", () => {
    assert.equal(computeNextIntervalMs({ intervalMode: "fixed", intervalMs: 1234, intervalMinMs: 1, intervalMaxMs: 2 }), 1234);
  });

  test("modo aleatorio esta acotado entre min y max", () => {
    const cfg = { intervalMode: "random", intervalMs: 0, intervalMinMs: 500, intervalMaxMs: 1500 };
    for (const r of [0, 0.5, 0.999]) {
      const v = computeNextIntervalMs(cfg, () => r);
      assert.ok(v >= 500 && v <= 1500, `fuera de rango: ${v}`);
    }
  });
});

describe("Paleta de colores — 9 presets unificados, amarillo vs naranja (4o/7o/8o/11o incremento)", () => {
  test("BASE_COLOR_PALETTE tiene exactamente 9 colores en el orden pedido: rojo/azul/amarillo/verde/naranja/morado/rosa/negro/blanco, sin duplicados", () => {
    assert.equal(BASE_COLOR_PALETTE.length, 9);
    assert.equal(new Set(BASE_COLOR_PALETTE).size, 9);
    assert.deepEqual([...BASE_COLOR_PALETTE], ["#ef4444", "#3b82f6", "#ffeb3b", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#10203f", "#ffffff"]);
  });

  test("11o incremento: el orden visual es ESTABLE e independiente de la seleccion - BASE_ELEMENTS.colors es la MISMA referencia que BASE_COLOR_PALETTE (ningun componente guarda una copia propia que pudiera reordenarse por separado)", () => {
    assert.equal(BASE_ELEMENTS.colors, BASE_COLOR_PALETTE);
    // Mutar `elements`/`palette` de una configuracion (seleccionar o
    // deseleccionar colores) nunca puede alterar este array: es
    // `readonly` y ninguna funcion de este modulo lo reescribe - los
    // selectores de Colores/Letras/Numeros/Formas en
    // StimulusGeneratorClient.tsx siempre recorren `presets` (esta misma
    // lista) con `.map()` directo, nunca ordenado/filtrado por cual este
    // seleccionado.
    const beforeOrder = [...BASE_COLOR_PALETTE];
    const cfg = cloneDefault();
    cfg.categories.colors.elements = ["#ffffff", "#ef4444"]; // seleccion en orden distinto al de la paleta
    assert.deepEqual([...BASE_COLOR_PALETTE], beforeOrder);
  });

  test("el orden es coherente entre Colores y las paletas de Letras/Numeros/Formas porque las 4 comparten la MISMA constante (no 4 copias que pudieran divergir)", () => {
    // Antes del 8o incremento existian 2 listas (BASE_COLOR_PALETTE para
    // "colors", SYMBOL_COLOR_OPTIONS para las otras 3); ahora solo hay
    // una, asi que la coherencia de orden esta garantizada por
    // construccion, no por mantener 2 listas sincronizadas a mano.
    assert.equal(BASE_ELEMENTS.colors, BASE_COLOR_PALETTE);
  });

  test("negro y blanco son parte de la MISMA lista unica que el resto - ya no existe una segunda constante aparte para simbolos", () => {
    assert.ok(BASE_COLOR_PALETTE.includes("#10203f")); // negro
    assert.ok(BASE_COLOR_PALETTE.includes("#ffffff")); // blanco
    assert.equal(mod.SYMBOL_COLOR_OPTIONS, undefined); // retirada: ya no aporta nada distinto de BASE_COLOR_PALETTE
  });

  test("BASE_COLOR_PALETTE incluye el amarillo limon #ffeb3b (ya NO el #eab308 original, sustituido por ser demasiado parecido al naranja)", () => {
    assert.ok(BASE_COLOR_PALETTE.includes("#ffeb3b"));
    assert.ok(!BASE_COLOR_PALETTE.includes("#eab308"));
  });

  test("naranja (#f59e0b) y amarillo (#ffeb3b) son valores distintos, ambos presentes", () => {
    assert.ok(BASE_COLOR_PALETTE.includes("#f59e0b"));
    assert.ok(BASE_COLOR_PALETTE.includes("#ffeb3b"));
    assert.notEqual("#f59e0b", "#ffeb3b");
  });

  test("el amarillo es seleccionable como color fijo y sorteable desde una paleta, igual que cualquier otro color", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.colorMode = "fixed";
    cfg.categories.numbers.color = "#ffeb3b";
    assert.equal(pickRandomStimulus(cfg, () => 0).renderColor, "#ffeb3b");

    cfg.categories.numbers.colorMode = "palette";
    cfg.categories.numbers.palette = ["#ffeb3b"];
    assert.equal(pickRandomStimulus(cfg, () => 0).renderColor, "#ffeb3b");
  });

  test("ningun color se excluye por formar poco contraste - sigue siendo una lista hex normal", () => {
    // No existe ninguna logica de "descartar colores de bajo contraste" en
    // este modulo - esta prueba documenta esa ausencia deliberada: un
    // color de bajo contraste sigue siendo una entrada hex valida mas,
    // nunca filtrada automaticamente.
    assert.equal(isValidStimulusGeneratorConfig({ ...cloneDefault(), categories: { ...cloneDefault().categories, numbers: { ...cloneDefault().categories.numbers, enabled: true, background: "white", colorMode: "fixed", color: "#ffeb3b" } } }), true);
  });

  test("una configuracion antigua que guardo el amarillo ORIGINAL (#eab308, ya retirado de los presets) sigue siendo un color valido - nunca se sustituye automaticamente", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = true;
    cfg.categories.colors.elements = ["#eab308"]; // color historico, ya no es un preset ofrecido
    assert.equal(isValidStimulusGeneratorConfig(cfg), true);
    assert.deepEqual(cfg.categories.colors.elements, ["#eab308"]);
  });
});

describe("summarizeColorsCategory / summarizeSymbolCategory (4o incremento, categorias plegables)", () => {
  test("categoria desactivada -> 'Desactivada'", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    assert.equal(summarizeColorsCategory(cfg.categories.colors), "Desactivada");
    cfg.categories.numbers.enabled = false;
    assert.equal(summarizeSymbolCategory(cfg.categories.numbers), "Desactivada");
  });

  test("categoria activada sin elementos -> mensaje especifico, no un recuento de 0", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = true;
    cfg.categories.colors.elements = [];
    assert.equal(summarizeColorsCategory(cfg.categories.colors), "Sin colores seleccionados");
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.elements = [];
    assert.equal(summarizeSymbolCategory(cfg.categories.numbers), "Sin elementos seleccionados");
  });

  test("colors: cuenta en singular/plural correctamente", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = true;
    cfg.categories.colors.elements = ["#ef4444"];
    assert.equal(summarizeColorsCategory(cfg.categories.colors), "1 color seleccionado");
    cfg.categories.colors.elements = ["#ef4444", "#22c55e"];
    assert.equal(summarizeColorsCategory(cfg.categories.colors), "2 colores seleccionados");
  });

  test("symbol: incluye elementos, fondo y modo de color en el resumen", () => {
    const cfg = cloneDefault();
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.elements = ["A", "B", "C"];
    cfg.categories.letters.background = "black";
    cfg.categories.letters.colorMode = "fixed";
    const summary = summarizeSymbolCategory(cfg.categories.letters);
    assert.ok(summary.includes("A, B, C"), summary);
    assert.ok(summary.includes("fondo negro"), summary);
    assert.ok(summary.includes("color fijo"), summary);
  });

  test("symbol en modo paleta: el resumen indica el NUMERO de colores de la paleta, no el color fijo", () => {
    const cfg = cloneDefault();
    cfg.categories.shapes.enabled = true;
    cfg.categories.shapes.elements = ["circle", "square"];
    cfg.categories.shapes.colorMode = "palette";
    cfg.categories.shapes.palette = ["#ef4444", "#22c55e", "#3b82f6"];
    const summary = summarizeSymbolCategory(cfg.categories.shapes);
    assert.ok(summary.includes("paleta de 3 colores"), summary);
  });

  test("symbol con muchos elementos: el resumen se trunca con un contador '+N más', nunca una lista interminable", () => {
    const cfg = cloneDefault();
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.elements = ["0", "1", "2", "3", "4", "5", "6", "7"];
    const summary = summarizeSymbolCategory(cfg.categories.numbers);
    assert.ok(summary.includes("+2 más"), summary);
    assert.ok(!summary.includes("7"), summary);
  });
});

describe("Estado inicial por defecto: solo 'colors' activa (5o/6o incremento)", () => {
  test("DEFAULT_STIMULUS_CONFIG tiene exactamente colors=activa, numbers/letters/shapes=inactivas", () => {
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.colors.enabled, true);
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.numbers.enabled, false);
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.letters.enabled, false);
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.shapes.enabled, false);
  });

  test("9o incremento: por defecto solo rojo/azul/amarillo/verde quedan seleccionados, en ese orden exacto", () => {
    assert.deepEqual(DEFAULT_STIMULUS_CONFIG.categories.colors.elements, ["#ef4444", "#3b82f6", "#ffeb3b", "#22c55e"]);
  });

  test("naranja/morado/rosa/negro/blanco NO estan seleccionados por defecto, pero siguen disponibles en la paleta completa (BASE_COLOR_PALETTE, en su posicion fija del 11o incremento)", () => {
    const unselectedByDefault = ["#f59e0b", "#8b5cf6", "#ec4899", "#10203f", "#ffffff"];
    for (const hex of unselectedByDefault) {
      assert.ok(!DEFAULT_STIMULUS_CONFIG.categories.colors.elements.includes(hex), `${hex} no deberia estar preseleccionado`);
      assert.ok(BASE_COLOR_PALETTE.includes(hex), `${hex} deberia seguir disponible en la paleta`);
    }
    assert.deepEqual([...BASE_COLOR_PALETTE], ["#ef4444", "#3b82f6", "#ffeb3b", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#10203f", "#ffffff"]);
  });

  test("los 4 colores por defecto son seleccionables/sorteables al iniciar sin tocar nada, y los 5 restantes siguen siendo seleccionables manualmente (misma lista de presets)", () => {
    // Arranca con el default tal cual: el sorteo solo puede devolver uno
    // de los 4 preseleccionados.
    for (let i = 0; i < 4; i++) {
      const stim = pickRandomStimulus(DEFAULT_STIMULUS_CONFIG, () => i / 4);
      assert.ok(DEFAULT_STIMULUS_CONFIG.categories.colors.elements.includes(stim.value));
    }
    // Seleccionar manualmente uno de los 5 restantes (p.ej. naranja) los
    // añade a `elements` sin tocar los 4 ya preseleccionados - mismo
    // mecanismo de alternar pertenencia ya usado por la UI.
    const cfg = cloneDefault();
    cfg.categories.colors.elements = [...cfg.categories.colors.elements, "#f59e0b"];
    assert.equal(cfg.categories.colors.elements.length, 5);
    assert.ok(cfg.categories.colors.elements.includes("#f59e0b"));
    assert.deepEqual(cfg.categories.colors.elements.slice(0, 4), ["#ef4444", "#3b82f6", "#ffeb3b", "#22c55e"]);
  });

  test("una configuracion predeterminada/antigua YA guardada con una seleccion de colores distinta no se ve afectada por este cambio de default", () => {
    const stored = cloneDefault();
    stored.categories.colors.elements = ["#8b5cf6", "#ec4899"]; // seleccion propia del profesional, distinta del nuevo default
    const resolved = resolveStimulusGeneratorConfig(stored);
    assert.notEqual(resolved, null);
    assert.deepEqual(resolved.categories.colors.elements, ["#8b5cf6", "#ec4899"]);
  });

  test("10o incremento - caso real confirmado en produccion: un predeterminado guardado con una seleccion de colores propia SIGUE ganando al nuevo DEFAULT_STIMULUS_CONFIG de 4 colores, aunque las categorias activas coincidan", () => {
    // Lectura de solo lectura real contra core.tool_presets (tool_type=
    // 'stimulus_generator'): existe una fila ('name'='default',
    // creada 2026-10-23 23:45, nunca actualizada despues) con
    // categories.colors.elements = ["#22c55e","#8b5cf6","#ec4899","#ffeb3b"]
    // (verde/morado/rosa/amarillo) - casi seguro, residuo de probar
    // manualmente el indicador de seleccion de color en una pasada
    // anterior, ANTES de que existiera el pedido de "4 colores por
    // defecto". `colors.enabled` de esa fila YA era correcto (true,
    // igual que las demas categorias en false) - por eso el intento
    // anterior de "arreglar la seleccion de colores" cambiando solo
    // DEFAULT_STIMULUS_CONFIG no tuvo ningun efecto visible: la
    // precedencia (predeterminado guardado > localStorage > default)
    // ya funcionaba exactamente como se diseño, y ese predeterminado
    // SIEMPRE gana. No es un bug de codigo - esta prueba fija ese
    // comportamiento como el esperado, usando los valores reales
    // encontrados.
    const realStoredPreset = cloneDefault();
    realStoredPreset.categories.colors.elements = ["#22c55e", "#8b5cf6", "#ec4899", "#ffeb3b"];
    const resolved = resolveStimulusGeneratorConfig(realStoredPreset);
    assert.notEqual(resolved, null);
    // Se recupera TAL CUAL - nunca sustituido por los 4 colores del
    // nuevo default (rojo/azul/amarillo/verde), por mucho que
    // DEFAULT_STIMULUS_CONFIG cambie.
    assert.deepEqual(resolved.categories.colors.elements, ["#22c55e", "#8b5cf6", "#ec4899", "#ffeb3b"]);
    assert.notDeepEqual(resolved.categories.colors.elements, DEFAULT_STIMULUS_CONFIG.categories.colors.elements);
  });

  test("se puede iniciar (canStartGenerator) con el default sin tocar nada - solo colors aporta", () => {
    assert.equal(canStartGenerator(DEFAULT_STIMULUS_CONFIG), true);
    assert.deepEqual(
      getActiveCategories(DEFAULT_STIMULUS_CONFIG).map((c: { id: string }) => c.id),
      ["colors"]
    );
  });

  test("activar letters/numbers/shapes despues no modifica ningun otro ajuste ya presente", () => {
    const cfg = cloneDefault();
    const lettersBefore = structuredClone(cfg.categories.letters);
    cfg.categories.letters.enabled = true;
    // Todo lo demas de 'letters' (elements/background/colorMode/color/palette)
    // sigue siendo exactamente lo mismo que antes de activarla.
    const after = structuredClone(cfg.categories.letters);
    delete after.enabled;
    delete lettersBefore.enabled;
    assert.deepEqual(after, lettersBefore);
    // Y las demas categorias (incluida 'colors', ya activa) no cambian.
    assert.equal(cfg.categories.colors.enabled, true);
    assert.equal(cfg.categories.numbers.enabled, false);
    assert.equal(cfg.categories.shapes.enabled, false);
  });
});

describe("Colores: modo de presentacion fullscreen/square (6o incremento)", () => {
  test("DEFAULT_STIMULUS_CONFIG usa 'fullscreen' (comportamiento historico)", () => {
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.colors.displayMode, "fullscreen");
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.colors.background, "white");
  });

  test("isValidStimulusGeneratorConfig exige displayMode/background validos en 'colors'", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.displayMode = "diagonal";
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
    const cfg2 = cloneDefault();
    cfg2.categories.colors.background = "verde";
    assert.equal(isValidStimulusGeneratorConfig(cfg2), false);
  });

  test("persistencia: 'square' con fondo negro se guarda y se valida tal cual (round-trip JSON)", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.displayMode = "square";
    cfg.categories.colors.background = "black";
    const roundTripped = JSON.parse(JSON.stringify(cfg));
    assert.equal(isValidStimulusGeneratorConfig(roundTripped), true);
    assert.equal(roundTripped.categories.colors.displayMode, "square");
    assert.equal(roundTripped.categories.colors.background, "black");
  });

  test("pickRandomStimulus: 'fullscreen' no lleva colorsDisplayMode='square' en el resultado", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.displayMode = "fullscreen";
    const stim = pickRandomStimulus(cfg, () => 0);
    assert.equal(stim.colorsDisplayMode, "fullscreen");
  });

  test("pickRandomStimulus: 'square' se refleja en el resultado junto con el fondo configurado", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.displayMode = "square";
    cfg.categories.colors.background = "black";
    const stim = pickRandomStimulus(cfg, () => 0);
    assert.equal(stim.colorsDisplayMode, "square");
    assert.equal(stim.background, "black");
    // El color sorteado (value/renderColor) no cambia por el modo de
    // presentacion - sigue siendo exactamente el mismo mecanismo.
    assert.equal(stim.value, BASE_COLOR_PALETTE[0]);
    assert.equal(stim.renderColor, BASE_COLOR_PALETTE[0]);
  });

  test("el modo de presentacion de 'colors' NO afecta a otras categorias ni al reparto entre categorias activas", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.displayMode = "square";
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.elements = [...BASE_NUMBERS];
    let call = 0;
    const seq = [0.49, 0, 0.51, 0];
    const randomFn = () => seq[call++];
    const first = pickRandomStimulus(cfg, randomFn);
    const second = pickRandomStimulus(cfg, randomFn);
    assert.equal(first.category, "colors");
    assert.equal(second.category, "numbers");
    assert.equal(second.colorsDisplayMode, undefined);
  });

  test("migrateStimulusGeneratorConfig rellena displayMode/background con el valor compatible ('fullscreen'/'white') si faltan", () => {
    const old = {
      ...cloneDefault(),
      categories: {
        ...cloneDefault().categories,
        colors: { enabled: true, elements: [...BASE_COLOR_PALETTE] }, // sin displayMode ni background - forma del 4o/5o incremento
      },
    };
    assert.equal(isValidStimulusGeneratorConfig(old), false); // sin migrar, se rechaza
    const migrated = migrateStimulusGeneratorConfig(old);
    assert.equal(isValidStimulusGeneratorConfig(migrated), true);
    assert.equal(migrated.categories.colors.displayMode, "fullscreen");
    assert.equal(migrated.categories.colors.background, "white");
    // El resto de la configuracion (incluidos los `elements` ya elegidos)
    // se conserva INTACTO - la migracion nunca pierde la seleccion.
    assert.deepEqual(migrated.categories.colors.elements, [...BASE_COLOR_PALETTE]);
    assert.deepEqual(migrated.categories.letters, old.categories.letters);
  });

  test("migrateStimulusGeneratorConfig no toca nada si displayMode/background ya son validos", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.displayMode = "square";
    cfg.categories.colors.background = "black";
    const migrated = migrateStimulusGeneratorConfig(cfg);
    assert.equal(migrated, cfg); // misma referencia - no se reconstruye nada innecesariamente
  });

  test("migrateStimulusGeneratorConfig con un valor que no es un objeto lo devuelve tal cual, sin lanzar", () => {
    assert.equal(migrateStimulusGeneratorConfig(null), null);
    assert.equal(migrateStimulusGeneratorConfig("x"), "x");
    assert.equal(migrateStimulusGeneratorConfig(undefined), undefined);
  });
});

describe("Letras: abecedario completo A-Z (6o incremento)", () => {
  test("BASE_LETTERS tiene exactamente las 26 letras A-Z, sin Ñ ni acentos, sin duplicados", () => {
    assert.equal(BASE_LETTERS.length, 26);
    const expected = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    assert.deepEqual([...BASE_LETTERS].sort(), [...expected].sort());
    assert.equal(new Set(BASE_LETTERS).size, 26);
    assert.ok(!BASE_LETTERS.includes("Ñ"));
  });

  test("todas las 26 letras se pueden seleccionar individualmente (elements admite cualquier subconjunto)", () => {
    const cfg = cloneDefault();
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.elements = [...BASE_LETTERS];
    assert.equal(isValidStimulusGeneratorConfig(cfg), true);
    assert.equal(cfg.categories.letters.elements.length, 26);
  });

  test("seleccionar todas y luego desmarcar algunas deja exactamente el resto, sin perder nada", () => {
    const all = [...BASE_LETTERS];
    const withoutVowels = all.filter((l) => !["A", "E", "I", "O", "U"].includes(l));
    assert.equal(withoutVowels.length, 21);
    assert.ok(!withoutVowels.includes("A"));
    assert.ok(withoutVowels.includes("B"));
  });

  test("una configuracion antigua con un SUBCONJUNTO de las 13 letras originales sigue siendo valida y conserva exactamente esa seleccion", () => {
    const cfg = cloneDefault();
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.elements = ["A", "B", "F", "X"]; // subconjunto de la lista ANTIGUA (13 letras)
    assert.equal(isValidStimulusGeneratorConfig(cfg), true);
    assert.deepEqual(cfg.categories.letters.elements, ["A", "B", "F", "X"]);
  });

  test("pickRandomStimulus con las 26 letras seleccionadas: el sorteo nunca produce una letra fuera del conjunto, sin sesgo hacia ninguna posicion", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.elements = [...BASE_LETTERS];
    const seen = new Set();
    for (let i = 0; i < 26; i++) {
      // (i + 0.5) / 26, no i / 26: evita el caso de borde de punto
      // flotante donde (25 / 26) * 26 redondea a 24.999999999999996 en
      // vez de 25 exacto, haciendo que la ultima letra (Z) nunca salga -
      // un problema de esta prueba, no de pickRandomStimulus (con
      // Math.random() real, un valor continuo, ese borde exacto no se da).
      const stim = pickRandomStimulus(cfg, () => (i + 0.5) / 26);
      assert.ok(BASE_LETTERS.includes(stim.value), `letra fuera del conjunto: ${stim.value}`);
      seen.add(stim.value);
    }
    // Con un barrido uniforme de randomFn(), las 26 letras deberian
    // aparecer todas al menos una vez - ninguna queda inalcanzable.
    assert.equal(seen.size, 26);
  });

  test("pickRandomStimulus con un subconjunto PEQUEÑO de las 26 letras nunca saca nada fuera de el (sin duplicar logica de sorteo)", () => {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.elements = ["G", "K", "Z"]; // letras NUEVAS de esta ampliacion, antes no existian
    for (let i = 0; i < 30; i++) {
      const stim = pickRandomStimulus(cfg, () => i / 30);
      assert.ok(["G", "K", "Z"].includes(stim.value), `valor inesperado: ${stim.value}`);
    }
  });
});

describe("resolveStimulusGeneratorConfig: precedencia de configuraciones almacenadas (7o/8o incremento)", () => {
  // Investigacion del "estado inicial muestra las 4 categorias activas":
  // auditado el codigo del cliente (loadStoredConfig/el efecto que llama
  // a getStimulusGeneratorDefaultConfig) - ningun `setConfig` muta
  // `DEFAULT_STIMULUS_CONFIG` (todos usan spread inmutable), asi que NO
  // hay ninguna mutacion accidental del default compartido.
  //
  // 8o incremento: confirmado con una lectura de solo lectura directa de
  // core.tool_presets en produccion que el predeterminado YA guardado
  // tiene colors=activa / numbers=letters=shapes=inactivas - es decir,
  // ES el comportamiento correcto, y NO es la fuente de "4 activas". La
  // unica brecha real que quedaba era un destello visual (la carga
  // sincrona de localStorage se pinta un instante antes de que la
  // consulta asincrona a la BD resuelva) - cerrada en
  // StimulusGeneratorClient.tsx con `presetLoadState` (no se pinta la
  // etapa 'config' hasta que esa consulta termina), no con ningun cambio
  // aqui: esta funcion y su precedencia ya eran correctas, confirmado de
  // nuevo por estas pruebas.
  test("con DEFAULT_STIMULUS_CONFIG tal cual, solo 'colors' queda activa (nunca las 4)", () => {
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.colors.enabled, true);
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.numbers.enabled, false);
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.letters.enabled, false);
    assert.equal(DEFAULT_STIMULUS_CONFIG.categories.shapes.enabled, false);
  });

  test("una configuracion almacenada valida con las 4 categorias activas se recupera TAL CUAL - resolveStimulusGeneratorConfig no la 'corrige' hacia el default", () => {
    const stored = cloneDefault();
    stored.categories.numbers.enabled = true;
    stored.categories.letters.enabled = true;
    stored.categories.shapes.enabled = true;
    const resolved = resolveStimulusGeneratorConfig(stored);
    assert.notEqual(resolved, null);
    assert.equal(resolved.categories.colors.enabled, true);
    assert.equal(resolved.categories.numbers.enabled, true);
    assert.equal(resolved.categories.letters.enabled, true);
    assert.equal(resolved.categories.shapes.enabled, true);
  });

  test("una configuracion almacenada INVALIDA (JSON corrupto/ajeno) devuelve null - el llamador cae a DEFAULT_STIMULUS_CONFIG, nunca a un objeto a medias", () => {
    assert.equal(resolveStimulusGeneratorConfig({ foo: "bar" }), null);
    assert.equal(resolveStimulusGeneratorConfig(null), null);
    assert.equal(resolveStimulusGeneratorConfig("no es un objeto"), null);
  });

  test("una configuracion almacenada del 5o/6o incremento (sin transitionMode) se migra y se recupera con 'continuous', conservando el resto intacto", () => {
    const stored = { ...cloneDefault() };
    delete stored.transitionMode;
    stored.categories.letters.enabled = true;
    stored.categories.letters.elements = ["A", "B"];
    const resolved = resolveStimulusGeneratorConfig(stored);
    assert.notEqual(resolved, null);
    assert.equal(resolved.transitionMode, "continuous");
    assert.equal(resolved.categories.letters.enabled, true);
    assert.deepEqual(resolved.categories.letters.elements, ["A", "B"]);
  });

  test("una configuracion predeterminada guardada que YA tiene solo 'colors' activa (como la confirmada en produccion) se recupera exactamente igual - no hay ninguna 'correccion' oculta que la altere", () => {
    const stored = cloneDefault(); // colors=activa, resto=inactivas, igual que DEFAULT_STIMULUS_CONFIG
    const resolved = resolveStimulusGeneratorConfig(stored);
    assert.notEqual(resolved, null);
    assert.equal(resolved.categories.colors.enabled, true);
    assert.equal(resolved.categories.numbers.enabled, false);
    assert.equal(resolved.categories.letters.enabled, false);
    assert.equal(resolved.categories.shapes.enabled, false);
  });
});

describe("transitionMode: validacion y migracion (7o incremento)", () => {
  test("DEFAULT_STIMULUS_CONFIG usa 'continuous' (comportamiento historico)", () => {
    assert.equal(DEFAULT_STIMULUS_CONFIG.transitionMode, "continuous");
  });

  test("isValidStimulusGeneratorConfig exige un transitionMode valido", () => {
    const cfg = cloneDefault();
    cfg.transitionMode = "parpadeante";
    assert.equal(isValidStimulusGeneratorConfig(cfg), false);
    const cfg2 = cloneDefault();
    delete cfg2.transitionMode;
    assert.equal(isValidStimulusGeneratorConfig(cfg2), false);
  });

  test("migrateStimulusGeneratorConfig rellena transitionMode='continuous' si falta, sin tocar nada mas", () => {
    const old = cloneDefault();
    delete old.transitionMode;
    old.categories.numbers.enabled = true;
    const migrated = migrateStimulusGeneratorConfig(old);
    assert.equal(isValidStimulusGeneratorConfig(migrated), true);
    assert.equal(migrated.transitionMode, "continuous");
    assert.equal(migrated.categories.numbers.enabled, true);
  });

  test("migrateStimulusGeneratorConfig migra displayMode/background de colors Y transitionMode a la vez si ambos faltan, en una sola pasada", () => {
    const old = {
      ...cloneDefault(),
      categories: { ...cloneDefault().categories, colors: { enabled: true, elements: ["#ef4444"] } },
    };
    delete old.transitionMode;
    const migrated = migrateStimulusGeneratorConfig(old);
    assert.equal(isValidStimulusGeneratorConfig(migrated), true);
    assert.equal(migrated.categories.colors.displayMode, "fullscreen");
    assert.equal(migrated.categories.colors.background, "white");
    assert.equal(migrated.transitionMode, "continuous");
  });

  test("migrateStimulusGeneratorConfig no reconstruye nada si transitionMode ya es valido", () => {
    const cfg = cloneDefault();
    const migrated = migrateStimulusGeneratorConfig(cfg);
    assert.equal(migrated, cfg);
  });
});

describe("computeNextPresentationStep: transicion 'Pantalla vacía' (7o incremento)", () => {
  function configWith(overrides: Record<string, unknown>) {
    const cfg = cloneDefault();
    cfg.categories.colors.enabled = false;
    return Object.assign(cfg, overrides);
  }

  test("transitionMode='continuous': siempre devuelve 'stimulus', nunca 'blank', sea cual sea el paso anterior", () => {
    const cfg = configWith({ transitionMode: "continuous" });
    cfg.categories.letters.enabled = true;
    const first = computeNextPresentationStep(cfg, null, () => 0);
    assert.equal(first.phase, "stimulus");
    const second = computeNextPresentationStep(cfg, first, () => 0);
    assert.equal(second.phase, "stimulus");
  });

  test("transitionMode='blank': el PRIMER paso (previousStep=null) siempre es 'stimulus', nunca empieza en blanco", () => {
    const cfg = configWith({ transitionMode: "blank" });
    cfg.categories.letters.enabled = true;
    const first = computeNextPresentationStep(cfg, null, () => 0);
    assert.equal(first.phase, "stimulus");
    assert.notEqual(first.stimulus, null);
  });

  test("transitionMode='blank': alterna estimulo -> vacio -> estimulo -> vacio...", () => {
    const cfg = configWith({ transitionMode: "blank" });
    cfg.categories.letters.enabled = true;
    const steps = [];
    let prev = null;
    for (let i = 0; i < 6; i++) {
      prev = computeNextPresentationStep(cfg, prev, () => 0);
      steps.push(prev.phase);
    }
    assert.deepEqual(steps, ["stimulus", "blank", "stimulus", "blank", "stimulus", "blank"]);
  });

  test("la fase 'blank' nunca lleva un estimulo real (stimulus=null) - no es un estimulo ficticio que pueda guardarse ni sesgar el sorteo", () => {
    const cfg = configWith({ transitionMode: "blank" });
    cfg.categories.letters.enabled = true;
    const stimStep = computeNextPresentationStep(cfg, null, () => 0);
    const blankStep = computeNextPresentationStep(cfg, stimStep, () => 0);
    assert.equal(blankStep.phase, "blank");
    assert.equal(blankStep.stimulus, null);
  });

  test("duracion: en modo fijo, el paso de estimulo Y el de vacio usan el MISMO intervalo configurado (sin esperas adicionales inventadas)", () => {
    const cfg = configWith({ transitionMode: "blank", intervalMode: "fixed", intervalMs: 1234 });
    cfg.categories.letters.enabled = true;
    const stimStep = computeNextPresentationStep(cfg, null, () => 0.5);
    const blankStep = computeNextPresentationStep(cfg, stimStep, () => 0.5);
    assert.equal(stimStep.durationMs, 1234);
    assert.equal(blankStep.durationMs, 1234);
  });

  test("duracion: en modo aleatorio, cada paso (estimulo y vacio) sortea su PROPIA duracion de forma independiente", () => {
    const cfg = configWith({ transitionMode: "blank", intervalMode: "random", intervalMinMs: 1000, intervalMaxMs: 2000 });
    cfg.categories.letters.enabled = true;
    const stimStep = computeNextPresentationStep(cfg, null, () => 0);
    const blankStep = computeNextPresentationStep(cfg, stimStep, () => 1);
    assert.equal(stimStep.durationMs, 1000); // randomFn()=0 -> el minimo
    assert.equal(blankStep.durationMs, 2000); // randomFn()=1 -> el maximo
  });

  test("fondo durante 'blank' tras numeros/letras/formas: el fondo CONFIGURADO de esa categoria, no un valor generico", () => {
    const cfg = configWith({ transitionMode: "blank" });
    cfg.categories.letters.enabled = true;
    cfg.categories.letters.background = "black";
    const stimStep = computeNextPresentationStep(cfg, null, () => 0);
    assert.equal(stimStep.stimulus.category, "letters");
    const blankStep = computeNextPresentationStep(cfg, stimStep, () => 0);
    assert.equal(blankStep.background, "black");
  });

  test("fondo durante 'blank' tras 'colors' en modo 'square': el fondo EXTERIOR configurado (el cuadrado ya esta oculto porque stimulus=null)", () => {
    const cfg = configWith({ transitionMode: "blank" });
    cfg.categories.colors.enabled = true;
    cfg.categories.colors.displayMode = "square";
    cfg.categories.colors.background = "black";
    const stimStep = computeNextPresentationStep(cfg, null, () => 0);
    assert.equal(stimStep.stimulus.category, "colors");
    assert.equal(stimStep.stimulus.colorsDisplayMode, "square");
    const blankStep = computeNextPresentationStep(cfg, stimStep, () => 0);
    assert.equal(blankStep.background, "black");
    assert.equal(blankStep.stimulus, null);
  });

  test("fondo durante 'blank' tras 'colors' en modo 'fullscreen': fondo neutro documentado (blanco), NUNCA el ultimo color mostrado (no se confunde con otro estimulo)", () => {
    const cfg = configWith({ transitionMode: "blank" });
    cfg.categories.colors.enabled = true;
    cfg.categories.colors.displayMode = "fullscreen";
    cfg.categories.colors.elements = ["#ef4444"]; // rojo - NO debe aparecer como fondo del vacio
    const stimStep = computeNextPresentationStep(cfg, null, () => 0);
    assert.equal(stimStep.stimulus.value, "#ef4444");
    const blankStep = computeNextPresentationStep(cfg, stimStep, () => 0);
    assert.equal(blankStep.background, "white");
    assert.notEqual(blankStep.background, "#ef4444");
  });

  test("sin ninguna categoria activa, devuelve null en cualquier modo (nunca un paso inventado) - mismo criterio que pickRandomStimulus", () => {
    const cfgContinuous = configWith({ transitionMode: "continuous" });
    assert.equal(computeNextPresentationStep(cfgContinuous, null), null);
    const cfgBlank = configWith({ transitionMode: "blank" });
    assert.equal(computeNextPresentationStep(cfgBlank, null), null);
  });

  test("cambiar entre intervalo fijo y aleatorio a mitad de secuencia se refleja en el SIGUIENTE paso calculado, sin arrastrar el modo anterior", () => {
    const cfg = configWith({ transitionMode: "continuous", intervalMode: "fixed", intervalMs: 500 });
    cfg.categories.letters.enabled = true;
    const first = computeNextPresentationStep(cfg, null, () => 0.5);
    assert.equal(first.durationMs, 500);
    cfg.intervalMode = "random";
    cfg.intervalMinMs = 100;
    cfg.intervalMaxMs = 900;
    const second = computeNextPresentationStep(cfg, first, () => 0.5);
    assert.equal(second.durationMs, 500); // (100+900)/2
  });

  test("el reparto entre categorias activas durante 'stimulus' sigue siendo uniforme - 'blank' no participa en ese sorteo ni lo altera", () => {
    const cfg = configWith({ transitionMode: "blank" });
    cfg.categories.numbers.enabled = true;
    cfg.categories.numbers.elements = [...BASE_NUMBERS];
    cfg.categories.letters.enabled = true;
    // getActiveCategories itera SYMBOL_CATEGORY_IDS en orden fijo
    // ["numbers","letters","shapes"] - con las dos activas, el orden del
    // pool es [numbers, letters]. intervalMode sigue en 'fixed' (valor
    // por defecto de cloneDefault), asi que computeNextIntervalMs NO
    // consume ninguna llamada a randomFn - solo pickRandomStimulus la usa
    // (2 llamadas: categoria + elemento). Secuencia:
    // stimulus(numbers,0.49) -> blank(sin consumo) -> stimulus(letters,0.51)
    const seq = [0.49, 0, 0.51, 0];
    let call = 0;
    const randomFn = () => seq[call++];
    const s1 = computeNextPresentationStep(cfg, null, randomFn);
    const b1 = computeNextPresentationStep(cfg, s1, randomFn);
    const s2 = computeNextPresentationStep(cfg, b1, randomFn);
    assert.equal(s1.stimulus.category, "numbers");
    assert.equal(b1.phase, "blank");
    assert.equal(s2.stimulus.category, "letters");
  });
});
