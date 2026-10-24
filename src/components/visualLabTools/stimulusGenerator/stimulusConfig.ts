/**
 * Logica PURA del Generador de estimulos (ORION Tools) - tipos,
 * configuracion por defecto, validacion y generacion del siguiente
 * estimulo/intervalo. Sin ningun import de React/Next.js/Supabase, mismo
 * patron ya establecido en visual-lab/play/reactionTimeStimulus.ts, para
 * poder probarla con node --test.
 *
 * 2o incremento (categorias combinables, ver diseño funcional aprobado):
 * ya NO hay un `stimulusType` unico excluyente - las 4 categorias
 * (colores/numeros/letras/formas) se activan independientemente, y el
 * CONTENIDO (que elementos puede sacar cada categoria) se separa de la
 * APARIENCIA (fondo blanco/negro + color del simbolo, fijo o sorteado de
 * una paleta) - "colors" es la unica categoria sin esa dimension de
 * apariencia propia, porque su contenido YA ES un color.
 *
 * Reglas de inhibicion/interferencia (p.ej. "responder solo a un color"):
 * siguen fuera de alcance, igual que en el primer incremento - no se
 * añade ningun campo reservado vacio para ellas. El punto de extension
 * natural para el futuro es `getActiveCategories`/`pickRandomStimulus`:
 * una regla futura seria un filtro/transformacion sobre ese mismo pool,
 * sin rehacer este modulo.
 */

export type CategoryId = "colors" | "numbers" | "letters" | "shapes";
export type IntervalMode = "fixed" | "random";
export type StimulusSize = "sm" | "md" | "lg";
export type SymbolBackground = "white" | "black";
export type SymbolColorMode = "fixed" | "palette";
/** 6o incremento: como se presenta la categoria "colors" -
 * 'fullscreen' (comportamiento historico, sin cambios: el color ocupa
 * toda la superficie disponible) o 'square' (un cuadrado centrado sobre
 * `ColorsCategoryConfig.background`, a la misma escala que
 * numeros/letras/formas). Solo tiene sentido para "colors" - las demas
 * categorias ya se presentan como "una caja con fondo", equivalente
 * conceptualmente a 'square'. */
export type ColorsDisplayMode = "fullscreen" | "square";
/** 7o incremento: transicion GLOBAL entre estimulos, compartida por las
 * 4 categorias - 'continuous' (historico: el siguiente estimulo
 * sustituye al anterior sin ningun hueco) o 'blank' (cada estimulo
 * desaparece, hay un periodo sin nada visible, y despues aparece el
 * siguiente). Vive al mismo nivel que `size`/`intervalMode` (no dentro
 * de `categories`) porque afecta a la secuencia completa, nunca a una
 * categoria en particular. */
export type TransitionMode = "continuous" | "blank";

/**
 * Paleta principal - UNICA fuente para: elementos seleccionables de la
 * categoria "colors", Y opciones de color de simbolo/paleta de
 * numeros/letras/formas. Antes existia una segunda constante
 * (SYMBOL_COLOR_OPTIONS) que añadia negro/blanco SOLO para simbolos -
 * 8o incremento: se unifica en una unica lista de 9 colores directos
 * usada IDENTICA en las 4 categorias, para que el diseño de la paleta
 * sea coherente en todas - SYMBOL_COLOR_OPTIONS se retira (ya no aporta
 * nada distinto de esta).
 *
 * 11o incremento: ORDEN final pedido explicitamente - rojo/azul/
 * amarillo/verde/naranja/morado/rosa/negro/blanco (los 4 primeros
 * coinciden con la seleccion por defecto de "colors", ver
 * DEFAULT_STIMULUS_CONFIG mas abajo, pero el ORDEN de esta lista es
 * independiente de cual este seleccionado - ver ColorListEditor/
 * SingleColorPicker en StimulusGeneratorClient.tsx: ambos recorren
 * `presets` en este orden fijo SIEMPRE, nunca segun que este
 * seleccionado, asi que la fila nunca se reorganiza al marcar/
 * desmarcar un color).
 *
 * "Negro" usa "#10203f" (el mismo tono navy oscuro ya usado en el resto
 * de la identidad de ORION, ver orion-navy-950 en globals.css) en vez de
 * "#000000" puro - consistente con que ORION nunca usa negro puro en su
 * paleta de marca; ya era el valor de "negro" en incrementos anteriores,
 * sin cambios.
 *
 * Historial de amarillo: 4o incremento añadio "#eab308"; 7o incremento
 * lo sustituyo por "#ffeb3b" (amarillo limon, mas distinguible del
 * naranja "#f59e0b"). Ninguno de estos cambios de PRESETS afecta a una
 * configuracion ya guardada que contenga un hex antiguo como color
 * fijo/de paleta/elemento - sigue siendo un hex valido
 * (isValidHexColor no exige pertenencia a esta lista), nunca se sustituye
 * automaticamente.
 */
export const BASE_COLOR_PALETTE: readonly string[] = [
  "#ef4444", // rojo
  "#3b82f6", // azul
  "#ffeb3b", // amarillo
  "#22c55e", // verde
  "#f59e0b", // naranja
  "#8b5cf6", // morado
  "#ec4899", // rosa
  "#10203f", // negro
  "#ffffff", // blanco
];

export const BASE_NUMBERS: readonly string[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
/** 6o incremento: abecedario completo A-Z (antes solo 13 letras). Pura
 * ampliacion del conjunto de ELEMENTOS DISPONIBLES - no afecta a ninguna
 * seleccion ya guardada (una `elements` persistida sigue siendo el mismo
 * subconjunto exacto, solo cambia cuantas opciones hay para añadir mas;
 * ver isValidSymbolCategoryConfig, que nunca comprobo pertenencia a esta
 * lista, solo que sea un array de strings) ni al sorteo (pickRandomStimulus
 * ya elegia uniformemente entre `elements.length` elementos, sea cual
 * sea ese numero). Sin Ñ ni acentos en este incremento, segun lo pedido. */
export const BASE_LETTERS: readonly string[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];
export const BASE_SHAPES: readonly string[] = ["circle", "square", "triangle", "star"];

export const BASE_ELEMENTS: Record<CategoryId, readonly string[]> = {
  colors: BASE_COLOR_PALETTE,
  numbers: BASE_NUMBERS,
  letters: BASE_LETTERS,
  shapes: BASE_SHAPES,
};

export const CATEGORY_IDS: readonly CategoryId[] = ["colors", "numbers", "letters", "shapes"];
const SYMBOL_CATEGORY_IDS: readonly Exclude<CategoryId, "colors">[] = ["numbers", "letters", "shapes"];

/** "colors": su CONTENIDO (`elements`) ya ES el color - a diferencia de
 * numbers/letters/shapes, no tiene color de simbolo ni modo de color
 * propio. SI tiene `background` (6o incremento) porque, a diferencia del
 * resto de su "apariencia", el fondo exterior SOLO es visible/relevante
 * en `displayMode==='square'` (en 'fullscreen' el color ocupa toda la
 * superficie, no hay fondo exterior que mostrar). */
export interface ColorsCategoryConfig {
  enabled: boolean;
  elements: string[];
  /** 'fullscreen' (historico) o 'square' (6o incremento). */
  displayMode: ColorsDisplayMode;
  /** Solo relevante si displayMode==='square'. */
  background: SymbolBackground;
}

/** "numbers"/"letters"/"shapes": contenido (`elements`, subconjunto de
 * BASE_ELEMENTS[id]) + apariencia (fondo, y color de simbolo fijo o
 * sorteado de `palette`). */
export interface SymbolCategoryConfig {
  enabled: boolean;
  elements: string[];
  background: SymbolBackground;
  colorMode: SymbolColorMode;
  /** Usado si colorMode==='fixed', y como fallback seguro si
   * colorMode==='palette' pero `palette` esta vacia (ver pickRandomStimulus). */
  color: string;
  /** Usada si colorMode==='palette'. */
  palette: string[];
}

export interface StimulusGeneratorConfig {
  categories: {
    colors: ColorsCategoryConfig;
    numbers: SymbolCategoryConfig;
    letters: SymbolCategoryConfig;
    shapes: SymbolCategoryConfig;
  };
  size: StimulusSize;
  intervalMode: IntervalMode;
  /** Usado solo si intervalMode === 'fixed'. */
  intervalMs: number;
  /** Usados solo si intervalMode === 'random'. */
  intervalMinMs: number;
  intervalMaxMs: number;
  /** 7o incremento - ver ColorsDisplayMode/TransitionMode arriba. */
  transitionMode: TransitionMode;
}

const DEFAULT_SYMBOL_CATEGORY: Omit<SymbolCategoryConfig, "elements" | "enabled"> = {
  background: "white",
  colorMode: "fixed",
  color: "#10203f",
  palette: [...BASE_COLOR_PALETTE],
};

/** Por defecto solo "colors" esta activa (pedido explicitamente: estado
 * inicial = solo Colores activa, Letras/Numeros/Formas disponibles pero
 * inactivas hasta que el profesional las active) - numbers/letters/shapes
 * ya llevan su configuracion de apariencia lista (fondo blanco, simbolo
 * en negro) para que activarlas sin tocar nada mas de un resultado
 * coherente desde el primer momento. Este default SOLO se usa cuando no
 * hay ninguna configuracion predeterminada guardada (core.tool_presets)
 * ni ningun valor valido en localStorage - ver loadStoredConfig/
 * getStimulusGeneratorDefaultConfig en StimulusGeneratorClient.tsx: una
 * configuracion ya guardada (antigua o predeterminada) SIEMPRE tiene
 * prioridad sobre este valor, nunca se sustituye por el.
 *
 * 9o incremento: "colors.elements" por defecto pasa de los 9 presets
 * completos a solo 4 (rojo/azul/amarillo/verde, en ese orden exacto,
 * pedido explicitamente) - los otros 5 (naranja/morado/rosa/negro/
 * blanco) siguen en BASE_COLOR_PALETTE (la paleta completa, sin cambios
 * de orden ni de valores) y siguen siendo seleccionables manualmente
 * desde la fila de 9 presets, simplemente no vienen premarcados. Este
 * cambio SOLO toca el valor por defecto - una configuracion predeterminada
 * o antigua ya guardada sigue teniendo prioridad absoluta (ver parrafo de
 * arriba), nunca se ve afectada por esto. */
export const DEFAULT_STIMULUS_CONFIG: StimulusGeneratorConfig = {
  categories: {
    colors: { enabled: true, elements: ["#ef4444", "#3b82f6", "#ffeb3b", "#22c55e"], displayMode: "fullscreen", background: "white" },
    numbers: { enabled: false, elements: [...BASE_NUMBERS], ...DEFAULT_SYMBOL_CATEGORY, palette: [...BASE_COLOR_PALETTE] },
    letters: { enabled: false, elements: [...BASE_LETTERS], ...DEFAULT_SYMBOL_CATEGORY, palette: [...BASE_COLOR_PALETTE] },
    shapes: { enabled: false, elements: [...BASE_SHAPES], ...DEFAULT_SYMBOL_CATEGORY, palette: [...BASE_COLOR_PALETTE] },
  },
  size: "md",
  intervalMode: "fixed",
  intervalMs: 2000,
  intervalMinMs: 1000,
  intervalMaxMs: 3000,
  transitionMode: "continuous",
};

export const STIMULUS_GENERATOR_STORAGE_KEY = "tools_stimulusGenerator_defaults";

const INTERVAL_MODES: readonly IntervalMode[] = ["fixed", "random"];
const SIZES: readonly StimulusSize[] = ["sm", "md", "lg"];
const BACKGROUNDS: readonly SymbolBackground[] = ["white", "black"];
const COLOR_MODES: readonly SymbolColorMode[] = ["fixed", "palette"];
const COLORS_DISPLAY_MODES: readonly ColorsDisplayMode[] = ["fullscreen", "square"];
const TRANSITION_MODES: readonly TransitionMode[] = ["continuous", "blank"];

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

/** 3er incremento (selector de color libre): antes solo se comprobaba
 * `typeof === "string"` para `color`/`palette`/`elements` de "colors" -
 * suficiente cuando esos valores solo podian venir de la paleta fija
 * (BASE_COLOR_PALETTE, siempre hex de 6 cifras).
 * Ahora que un color puede venir de un `<input type="color">` libre,
 * conviene comprobar la FORMA real (hex de 6 cifras) en vez de aceptar
 * cualquier string - sigue siendo retrocompatible: todo lo que la app
 * pudo haber guardado antes YA cumplia este formato, nunca lo invalida. */
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isValidHexColor(v: unknown): v is string {
  return typeof v === "string" && HEX_COLOR_RE.test(v);
}

function isHexColorArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isValidHexColor);
}

function isValidColorsCategoryConfig(v: unknown): v is ColorsCategoryConfig {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  // "colors": sus `elements` SON colores (ver comentario del tipo) - se
  // valida como tal, a diferencia de `elements` de las otras categorias
  // (digitos/letras/formas, ver isValidSymbolCategoryConfig: contenido,
  // no color, sigue validandose solo como isStringArray).
  if (typeof c.enabled !== "boolean") return false;
  if (!isHexColorArray(c.elements)) return false;
  if (typeof c.displayMode !== "string" || !COLORS_DISPLAY_MODES.includes(c.displayMode as ColorsDisplayMode)) return false;
  if (typeof c.background !== "string" || !BACKGROUNDS.includes(c.background as SymbolBackground)) return false;
  return true;
}

function isValidSymbolCategoryConfig(v: unknown): v is SymbolCategoryConfig {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Record<string, unknown>;
  if (typeof c.enabled !== "boolean") return false;
  if (!isStringArray(c.elements)) return false;
  if (typeof c.background !== "string" || !BACKGROUNDS.includes(c.background as SymbolBackground)) return false;
  if (typeof c.colorMode !== "string" || !COLOR_MODES.includes(c.colorMode as SymbolColorMode)) return false;
  if (!isValidHexColor(c.color)) return false;
  if (!isHexColorArray(c.palette)) return false;
  return true;
}

/**
 * 6o incremento: `displayMode`/`background` de "colors", y 7o incremento:
 * `transitionMode` de nivel superior, son campos NUEVOS y REQUERIDOS en
 * el tipo - una configuracion guardada ANTES de cada incremento
 * (localStorage o core.tool_presets) nunca los tendra. A diferencia de
 * la ampliacion de BASE_LETTERS (que no necesita ninguna migracion: una
 * `elements` ya guardada sigue siendo valida tal cual), aqui SI hace
 * falta rellenar el valor por defecto compatible con el comportamiento
 * historico ('fullscreen'/'white' para colors, 'continuous' para la
 * transicion) ANTES de validar - si no, `isValidStimulusGeneratorConfig`
 * rechazaria (por diseño, campo ausente) una configuracion predeterminada
 * que el profesional guardo hace un instante, perdiendo TODA su
 * seleccion (colores/letras/numeros/formas), no solo el campo nuevo.
 * Cada migracion solo toca su propio campo - el resto del objeto se
 * devuelve sin tocar, y se devuelve la MISMA referencia de entrada si
 * ninguna de las dos hace falta (evita clonar innecesariamente una
 * configuracion que ya esta al dia).
 */
export function migrateStimulusGeneratorConfig(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const v = value as Record<string, unknown>;
  let next: Record<string, unknown> = v;

  if (typeof v.categories === "object" && v.categories !== null) {
    const cats = v.categories as Record<string, unknown>;
    if (typeof cats.colors === "object" && cats.colors !== null) {
      const colors = cats.colors as Record<string, unknown>;
      const hasValidDisplayMode =
        typeof colors.displayMode === "string" && COLORS_DISPLAY_MODES.includes(colors.displayMode as ColorsDisplayMode);
      const hasValidBackground = typeof colors.background === "string" && BACKGROUNDS.includes(colors.background as SymbolBackground);
      if (!hasValidDisplayMode || !hasValidBackground) {
        next = {
          ...next,
          categories: {
            ...cats,
            colors: {
              ...colors,
              displayMode: hasValidDisplayMode ? colors.displayMode : "fullscreen",
              background: hasValidBackground ? colors.background : "white",
            },
          },
        };
      }
    }
  }

  const hasValidTransitionMode =
    typeof next.transitionMode === "string" && TRANSITION_MODES.includes(next.transitionMode as TransitionMode);
  if (!hasValidTransitionMode) {
    next = { ...next, transitionMode: "continuous" };
  }

  return next;
}

/**
 * Validacion MINIMA de la configuracion recuperada de localStorage (mismo
 * criterio que validateConfig en useExerciseFlow: si falla, se descarta
 * y se usa DEFAULT_STIMULUS_CONFIG en su lugar - nunca se confia en un
 * valor sin comprobar su forma real). Una configuracion del primer
 * incremento (`stimulusType` unico, sin `categories`) no pasa esta
 * validacion y cae al nuevo default - no hace falta migrarla, es solo un
 * cache de "ultimos valores usados", nunca datos persistidos de verdad.
 *
 * IMPORTANTE (6o incremento): los llamadores deben pasar el valor por
 * `migrateStimulusGeneratorConfig` ANTES de esta funcion (ver ese
 * comentario) - esta funcion en si NO rellena nada, solo comprueba.
 */
export function isValidStimulusGeneratorConfig(value: unknown): value is StimulusGeneratorConfig {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.categories !== "object" || v.categories === null) return false;
  const cats = v.categories as Record<string, unknown>;
  if (!isValidColorsCategoryConfig(cats.colors)) return false;
  if (!isValidSymbolCategoryConfig(cats.numbers)) return false;
  if (!isValidSymbolCategoryConfig(cats.letters)) return false;
  if (!isValidSymbolCategoryConfig(cats.shapes)) return false;
  if (typeof v.size !== "string" || !SIZES.includes(v.size as StimulusSize)) return false;
  if (typeof v.intervalMode !== "string" || !INTERVAL_MODES.includes(v.intervalMode as IntervalMode)) return false;
  if (typeof v.intervalMs !== "number" || !Number.isFinite(v.intervalMs) || v.intervalMs <= 0) return false;
  if (typeof v.intervalMinMs !== "number" || !Number.isFinite(v.intervalMinMs) || v.intervalMinMs <= 0) return false;
  if (typeof v.intervalMaxMs !== "number" || !Number.isFinite(v.intervalMaxMs) || v.intervalMaxMs <= 0) return false;
  if (typeof v.transitionMode !== "string" || !TRANSITION_MODES.includes(v.transitionMode as TransitionMode)) return false;
  return true;
}

/**
 * 7o incremento: envoltorio de un unico paso ("migrar, luego validar")
 * - movido aqui desde StimulusGeneratorClient.tsx (donde vivia como
 * funcion local) porque es logica PURA, sin ninguna dependencia de
 * React/DOM, y es exactamente lo que decide la PRECEDENCIA entre una
 * configuracion predeterminada guardada (core.tool_presets), una
 * configuracion antigua en localStorage, y DEFAULT_STIMULUS_CONFIG -
 * moverla aqui permite probarla con node --test (ver "Investiga por
 * que..." del 7o incremento: sin esto, esa precedencia solo se podia
 * verificar leyendo el codigo del cliente, nunca con una prueba
 * automatizada real). Usada por loadStoredConfig (localStorage) y por el
 * efecto que llama a getStimulusGeneratorDefaultConfig (BD) en el
 * cliente - en ambos casos, null significa "nada aprovechable aqui",
 * dejando que el llamador decida su propio respaldo
 * (DEFAULT_STIMULUS_CONFIG, o simplemente no sobrescribir lo que ya
 * habia).
 */
export function resolveStimulusGeneratorConfig(raw: unknown): StimulusGeneratorConfig | null {
  const migrated = migrateStimulusGeneratorConfig(raw);
  return isValidStimulusGeneratorConfig(migrated) ? migrated : null;
}

export interface ActiveColorsCategory {
  id: "colors";
  elements: readonly string[];
  displayMode: ColorsDisplayMode;
  background: SymbolBackground;
}
export interface ActiveSymbolCategory {
  id: Exclude<CategoryId, "colors">;
  elements: readonly string[];
  background: SymbolBackground;
  colorMode: SymbolColorMode;
  color: string;
  palette: readonly string[];
}
export type ActiveCategory = ActiveColorsCategory | ActiveSymbolCategory;

/**
 * Categorias que de verdad pueden aparecer: activadas Y con al menos un
 * elemento seleccionado (una categoria activada sin elementos no aporta
 * nada al sorteo - se trata igual que si estuviera desactivada, nunca
 * provoca un pool vacio por sorpresa). Usado tanto para el sorteo
 * (pickRandomStimulus) como para decidir si se puede pulsar "Iniciar"
 * (canStartGenerator).
 */
export function getActiveCategories(config: StimulusGeneratorConfig): ActiveCategory[] {
  const result: ActiveCategory[] = [];
  const { colors } = config.categories;
  if (colors.enabled && colors.elements.length > 0) {
    result.push({ id: "colors", elements: colors.elements, displayMode: colors.displayMode, background: colors.background });
  }
  for (const id of SYMBOL_CATEGORY_IDS) {
    const cat = config.categories[id];
    if (cat.enabled && cat.elements.length > 0) {
      result.push({
        id,
        elements: cat.elements,
        background: cat.background,
        colorMode: cat.colorMode,
        color: cat.color,
        palette: cat.palette,
      });
    }
  }
  return result;
}

export function canStartGenerator(config: StimulusGeneratorConfig): boolean {
  return getActiveCategories(config).length > 0;
}

export interface GeneratedStimulus {
  category: CategoryId;
  /** El elemento sorteado (digito/letra/id de forma/color hex). */
  value: string;
  /** Color YA resuelto con el que pintar el simbolo - para "colors" es
   * siempre igual a `value` (el contenido ya es el color). */
  renderColor: string;
  /** Fondo exterior - para "colors" solo relevante si
   * `colorsDisplayMode==='square'` (ver ese campo); para las demas
   * categorias es el fondo configurado de esa categoria. */
  background: SymbolBackground;
  /** Solo presente si category==='colors' - como presentarlo (ver
   * ColorsDisplayMode). Ausente (undefined) para las demas categorias,
   * que no tienen esta dimension. */
  colorsDisplayMode?: ColorsDisplayMode;
}

/**
 * Sortea el siguiente estimulo en DOS pasos, tal como se aprobo: 1)
 * elegir una categoria ACTIVA con probabilidad UNIFORME entre categorias
 * (nunca ponderada por cuantos elementos tenga cada una - si no, una
 * categoria con mas elementos seleccionados apareceria mas a menudo sin
 * que el profesional lo haya pedido), 2) sortear despues un elemento
 * dentro de esa categoria. Devuelve null si no hay ninguna categoria
 * activa (ver canStartGenerator) - nunca un estimulo inventado.
 */
export function pickRandomStimulus(
  config: StimulusGeneratorConfig,
  randomFn: () => number = Math.random
): GeneratedStimulus | null {
  const active = getActiveCategories(config);
  if (active.length === 0) return null;

  const categoryIdx = Math.min(Math.floor(randomFn() * active.length), active.length - 1);
  const category = active[categoryIdx];

  const elementIdx = Math.min(Math.floor(randomFn() * category.elements.length), category.elements.length - 1);
  const value = category.elements[elementIdx];

  if (category.id === "colors") {
    return { category: "colors", value, renderColor: value, background: category.background, colorsDisplayMode: category.displayMode };
  }

  // colorMode==='palette' con `palette` vacia (configuracion rara, p.ej.
  // el profesional quito todas las opciones de la paleta sin volver a
  // 'fixed'): se usa `color` como respaldo seguro, nunca un sorteo sobre
  // un array vacio.
  let renderColor = category.color;
  if (category.colorMode === "palette" && category.palette.length > 0) {
    const colorIdx = Math.min(Math.floor(randomFn() * category.palette.length), category.palette.length - 1);
    renderColor = category.palette[colorIdx];
  }
  return { category: category.id, value, renderColor, background: category.background };
}

/**
 * Calcula el intervalo ANTES del siguiente estimulo - fijo, o sorteado
 * uniformemente entre intervalMinMs/intervalMaxMs (mismo patron que el
 * intervalo entre estimulos de Go/No Go, sin reutilizar ese codigo: es
 * una herramienta distinta, con su propia configuracion). Sin cambios
 * respecto al primer incremento.
 */
export function computeNextIntervalMs(
  config: Pick<StimulusGeneratorConfig, "intervalMode" | "intervalMs" | "intervalMinMs" | "intervalMaxMs">,
  randomFn: () => number = Math.random
): number {
  if (config.intervalMode === "fixed") return config.intervalMs;
  const lo = Math.min(config.intervalMinMs, config.intervalMaxMs);
  const hi = Math.max(config.intervalMinMs, config.intervalMaxMs);
  return lo + randomFn() * (hi - lo);
}

/** Fondo neutro de espera para "colors" en modo 'fullscreen' durante la
 * fase vacia (7o incremento) - esa combinacion no tiene un `background`
 * propio con el que pintar la espera (en 'fullscreen' el color ocupa
 * toda la pantalla, no hay fondo exterior independiente) y NO debe
 * reutilizar el ultimo color mostrado (se confundiria con otro estimulo
 * de color, justo lo que se pidio evitar). DECISION DOCUMENTADA: blanco,
 * por ser el mismo valor por defecto que ya usa `background` en el resto
 * del generador (modo 'square' de colors y el fondo por defecto de
 * numeros/letras/formas) - mantiene un criterio consistente en toda la
 * herramienta en vez de introducir un tercer color neutro distinto. */
const BLANK_FULLSCREEN_COLORS_BACKGROUND: SymbolBackground = "white";

export interface PresentationStep {
  /** 'stimulus': hay un estimulo real que mostrar (`stimulus` no nulo).
   * 'blank': fase sin ningun estimulo visible (`stimulus` es null) -
   * NUNCA se guarda ni participa en el sorteo, es puramente de
   * presentacion (ver comentario de computeNextPresentationStep). */
  phase: "stimulus" | "blank";
  stimulus: GeneratedStimulus | null;
  /** Fondo a pintar mientras dura este paso - para 'stimulus' coincide
   * con `stimulus.background`; para 'blank' es el fondo "de espera"
   * calculado (ver computeNextPresentationStep). */
  background: SymbolBackground;
  /** Cuanto dura ESTE paso (ms) antes de pasar al siguiente - ya
   * resuelto (si intervalMode==='random', ya sorteado para este paso
   * concreto, no se vuelve a sortear al mostrarlo). */
  durationMs: number;
}

/**
 * 7o incremento: decide el SIGUIENTE paso de la secuencia (que mostrar y
 * durante cuanto tiempo), dado el paso anterior (o `null` en el primer
 * paso de la ejecucion). Logica PURA y testeable, separada a proposito
 * de cualquier `setTimeout`/estado de React (ver StimulusGeneratorClient
 * .tsx, que solo encadena llamadas a esta funcion en un bucle) - la fase
 * vacia es un ESTADO DE PRESENTACION, nunca un "estimulo ficticio": no
 * pasa por pickRandomStimulus, no tiene `category`/`value`, y por tanto
 * no puede guardarse como actividad ni sesgar el sorteo real.
 *
 * TEMPORIZACION, decision explicita (transitionMode==='blank'):
 * - `intervalMode`/`intervalMs`/`intervalMinMs`/`intervalMaxMs` CONSERVAN
 *   su interpretacion actual ("cuanto dura cada paso antes del
 *   siguiente") - no se inventa un segundo campo de duracion. En modo
 *   'blank', ESE MISMO intervalo (recalculado independientemente para
 *   cada paso si el modo es 'random', igual que ya ocurria) se usa TANTO
 *   para cuanto tiempo se ve el estimulo COMO para cuanto dura la fase
 *   vacia que le sigue - sin introducir ninguna espera adicional no
 *   pedida, sin dividir el intervalo en sub-duraciones arbitrarias.
 * - Secuencia resultante: estimulo (dura `interval`) -> vacio (dura otro
 *   `interval`) -> estimulo -> vacio -> ... Siempre EMPIEZA mostrando un
 *   estimulo (previousStep=null cae en la rama "mostrar estimulo"),
 *   nunca en blanco.
 * - transitionMode==='continuous': sin cambios respecto al incremento
 *   anterior - siempre devuelve un paso 'stimulus', nunca 'blank'.
 *
 * FONDO durante la fase vacia: el de la categoria/configuracion del
 * estimulo que ACABA de desaparecer (numeros/letras/formas: su
 * `background` configurado; colors en modo 'square': el `background`
 * exterior configurado, con el cuadrado ya oculto porque `stimulus` es
 * null; colors en modo 'fullscreen': el fondo neutro documentado en
 * BLANK_FULLSCREEN_COLORS_BACKGROUND, nunca el ultimo color mostrado).
 */
export function computeNextPresentationStep(
  config: StimulusGeneratorConfig,
  previousStep: PresentationStep | null,
  randomFn: () => number = Math.random
): PresentationStep | null {
  const shouldShowBlank = config.transitionMode === "blank" && previousStep?.phase === "stimulus";

  if (shouldShowBlank) {
    const prevStimulus = previousStep.stimulus;
    const background =
      prevStimulus && prevStimulus.category === "colors" && prevStimulus.colorsDisplayMode === "fullscreen"
        ? BLANK_FULLSCREEN_COLORS_BACKGROUND
        : (prevStimulus?.background ?? "white");
    return { phase: "blank", stimulus: null, background, durationMs: computeNextIntervalMs(config, randomFn) };
  }

  const stimulus = pickRandomStimulus(config, randomFn);
  if (!stimulus) return null;
  return { phase: "stimulus", stimulus, background: stimulus.background, durationMs: computeNextIntervalMs(config, randomFn) };
}

/**
 * 4o incremento (categorias plegables): resumen de una linea para
 * mostrar cuando una categoria esta plegada - logica PURA (sin React),
 * testeable aqui igual que el resto del modulo. El plegado/desplegado en
 * si es estado de UI efimero (vive en StimulusGeneratorClient, nunca en
 * StimulusGeneratorConfig) - estas funciones solo DESCRIBEN la
 * configuracion ya existente, no la modifican ni dependen de si esta
 * plegada o no.
 */
export function summarizeColorsCategory(config: ColorsCategoryConfig): string {
  if (!config.enabled) return "Desactivada";
  if (config.elements.length === 0) return "Sin colores seleccionados";
  return `${config.elements.length} color${config.elements.length === 1 ? "" : "es"} seleccionado${config.elements.length === 1 ? "" : "s"}`;
}

const SYMBOL_BACKGROUND_LABELS: Record<SymbolBackground, string> = { white: "fondo blanco", black: "fondo negro" };

export function summarizeSymbolCategory(config: SymbolCategoryConfig): string {
  if (!config.enabled) return "Desactivada";
  if (config.elements.length === 0) return "Sin elementos seleccionados";
  const MAX_SHOWN = 6;
  const elementsPart =
    config.elements.length <= MAX_SHOWN
      ? config.elements.join(", ")
      : `${config.elements.slice(0, MAX_SHOWN).join(", ")} +${config.elements.length - MAX_SHOWN} más`;
  const colorPart =
    config.colorMode === "fixed"
      ? "color fijo"
      : `paleta de ${config.palette.length} color${config.palette.length === 1 ? "" : "es"}`;
  return `${elementsPart} · ${SYMBOL_BACKGROUND_LABELS[config.background]} · ${colorPart}`;
}
