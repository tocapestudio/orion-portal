"use client";

/**
 * ORION Tools · Cartas · McDonald - mismo lenguaje visual y patrones ya
 * probados en HartClient.tsx: vista de configuracion + vista previa de
 * ancho estable, presentacion a pantalla completa separada (CSS fija +
 * Fullscreen API como mejora progresiva), "Regenerar" con boton y con
 * barra espaciadora. No se importa nada de hart/ (modulo privado de esa
 * herramienta) - lo que SI se reutiliza tal cual son los CATALOGOS
 * compartidos (BASE_LETTERS/BASE_NUMBERS de stimulusGenerator/
 * stimulusConfig.ts) y el componente de navegacion del modulo
 * (CartasNav).
 *
 * REQUISITO CRITICO DE DISEÑO: los tres anillos se perciben SOLO por la
 * posicion de los caracteres - en ningun punto de este archivo se dibuja
 * una circunferencia, un borde circular ni ningun trazo geometrico. Cada
 * caracter se posiciona con `transform: translate(-50%, -50%)`
 * UNICAMENTE (ver McDonaldRings) - nunca con `rotate(...)`, para que
 * permanezca siempre vertical sin importar su posicion angular. Esto es
 * cierto TANTO en modo estatico COMO en modo dinamico: la rotacion de
 * los anillos se consigue recalculando la POSICION (x%, y%) de cada
 * estimulo (ver `computeRingPosition`/`rotationAngleRad` mas abajo),
 * jamas aplicando un `rotate(...)` CSS al caracter.
 *
 * MOTOR DE ANIMACION (modo dinamico): mismo patron ya establecido en
 * OculomotorClient.tsx - `requestAnimationFrame` escribiendo
 * DIRECTAMENTE en `style.left/top` de cada estimulo via refs (bypasea
 * React por fotograma, evita re-renderizar 30 elementos 60 veces por
 * segundo), con el angulo ACUMULADO en un ref (`rotationAngleRef`,
 * fuente de verdad en caliente) y sincronizado a estado de React
 * (`rotationAngleRad`) SOLO al pausar/cambiar de modo (para que un
 * re-render no relacionado, p.ej. cambiar de color, no "salte" de
 * vuelta al angulo 0). Cambiar velocidad/sentido NUNCA reinicia el
 * angulo acumulado (el bucle se reinicia, pero `rotationAngleRef` se
 * preserva) - ver el efecto de animacion mas abajo para el detalle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_MCDONALD_CONFIG,
  generateMcDonaldStimuli,
  computeRingPosition,
  computeRotationAngleRad,
  resolveRingSizeScale,
  clampRotationRpm,
  computeStimulusRingGeometry,
  MCDONALD_MIN_ROTATION_RPM,
  MCDONALD_MAX_ROTATION_RPM,
  MCDONALD_MIN_RINGS,
  MCDONALD_MAX_RINGS,
  type McDonaldCardConfig,
  type McDonaldContent,
  type McDonaldColorMode,
  type McDonaldCharSize,
  type McDonaldCardSize,
  type McDonaldCharSizeMode,
  type McDonaldMotionMode,
  type McDonaldRotationDirection,
  type McDonaldStimulus,
} from "./mcdonaldConfig";
import { BASE_LETTERS, BASE_NUMBERS } from "../../stimulusGenerator/stimulusConfig";
import CartasNav from "../CartasNav";

type ViewMode = "config" | "presentation";
/** Mismo tri-estado y mismo razonamiento que en HartClient.tsx. */
type FullscreenStatus = "pending" | "active" | "unavailable";

const MCDONALD_CONTENT_LABELS: Record<McDonaldContent, string> = {
  letters: "Letras",
  numbers: "Números",
  mixed: "Mixto (letras y números)",
};
const MCDONALD_COLOR_MODE_LABELS: Record<McDonaldColorMode, string> = {
  neutral: "Neutro",
  monochromeRed: "Monocromo rojo",
  monochromeGreen: "Monocromo verde",
  redGreen: "Rojo-verde",
};
const MCDONALD_CHAR_SIZE_LABELS: Record<McDonaldCharSize, string> = {
  xs: "Muy pequeño",
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
  xl: "Muy grande",
};
const MCDONALD_CARD_SIZE_LABELS: Record<McDonaldCardSize, string> = { sm: "Pequeña", md: "Mediana", lg: "Grande" };
const MCDONALD_CHAR_SIZE_MODE_LABELS: Record<McDonaldCharSizeMode, string> = { uniform: "Uniforme", progressive: "Progresivo" };
const MCDONALD_MOTION_MODE_LABELS: Record<McDonaldMotionMode, string> = { static: "Estático", dynamic: "Dinámico" };
const MCDONALD_ROTATION_DIRECTION_LABELS: Record<McDonaldRotationDirection, string> = { clockwise: "Horario", counterclockwise: "Antihorario" };

/** Catalogos de contenido resueltos - reutilizados TAL CUAL de
 * stimulusConfig.ts, mismo criterio que HART_CONTENT_POOLS en
 * HartClient.tsx. */
const MCDONALD_CONTENT_POOLS: Record<McDonaldContent, readonly string[]> = {
  letters: BASE_LETTERS,
  numbers: BASE_NUMBERS,
  mixed: [...BASE_LETTERS, ...BASE_NUMBERS],
};

/** Tamaño del CARACTER - independiente del tamaño de la carta (ver
 * cabecera de mcdonaldConfig.ts). En la vista previa en linea, rem fijo;
 * en la de presentacion, vmin, mismo criterio que Hart.
 *
 * Rango ampliado desde los 3 niveles originales (sm/md/lg se mantienen
 * EXACTAMENTE en los mismos valores, para no alterar el aspecto de
 * configuraciones ya elegidas con esos niveles). "xs" es notablemente
 * mas pequeño que "sm" (no un paso incremental mas: su proposito
 * explicito es mantener legibles y separados los estimulos con 5
 * anillos en modo progresivo - con "xs", incluso el anillo exterior,
 * escalado por MCDONALD_PROGRESSIVE_SCALE_MAX, queda mas pequeño que el
 * antiguo "sm" uniforme, verificado visualmente). "xl" es notablemente
 * mas grande que "lg" (1.5x en rem) - caracteres claramente mayores que
 * el maximo anterior.
 *
 * LIMITACION CONOCIDA Y DOCUMENTADA (en vez de reducir
 * MCDONALD_PROGRESSIVE_SCALE_MAX, que perjudicaria el proposito de "xl"
 * en combinaciones mas comunes como 1-3 anillos): la combinacion "5
 * anillos + xl + progresivo" produce solapamiento visible en la VISTA
 * PREVIA en linea, porque su contenedor tiene un tope fijo pequeño
 * (MCDONALD_CARD_SIZE_REM_PREVIEW, max 16rem) independientemente del
 * tamaño de caracter elegido. En la vista de PRESENTACION a pantalla
 * completa (el contexto de uso clinico real, con un contenedor mucho
 * mayor en vmin) esa misma combinacion sigue siendo legible, con los 5
 * anillos distinguibles, aunque con menos margen que combinaciones mas
 * moderadas. Mitigacion disponible para el profesional: elegir un
 * tamaño de caracter menor, menos anillos, o el modo "uniform". */
const MCDONALD_CHAR_SIZE_REM_PREVIEW: Record<McDonaldCharSize, number> = { xs: 0.5, sm: 0.9, md: 1.2, lg: 1.6, xl: 2.4 };
const MCDONALD_CHAR_SIZE_VMIN_PRESENTATION: Record<McDonaldCharSize, number> = { xs: 1.6, sm: 2.8, md: 3.6, lg: 4.6, xl: 6.9 };

/** Tamaño GLOBAL de la carta (diametro del area cuadrada que contiene
 * los 3 anillos) - al usar porcentajes para los radios (ver
 * mcdonaldConfig.ts), escalar este valor mantiene las proporciones
 * circulares automaticamente. Valores de la vista previa elegidos para
 * caber siempre dentro de la columna de vista previa (20rem de ancho,
 * con padding) sin provocar scroll. */
const MCDONALD_CARD_SIZE_REM_PREVIEW: Record<McDonaldCardSize, number> = { sm: 10, md: 13, lg: 16 };
const MCDONALD_CARD_SIZE_VMIN_PRESENTATION: Record<McDonaldCardSize, number> = { sm: 55, md: 70, lg: 85 };

const toggleButtonClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold ${
    active ? "border-orion-navy-900 bg-orion-navy-900 text-white" : "border-orion-navy-200 text-orion-navy-700 hover:border-orion-navy-400"
  }`;

/** Misma tipografia que Hart (Geist Sans, ya cargada globalmente por el
 * proyecto) - identidad visual coherente entre herramientas de Cartas. */
const MCDONALD_STIMULUS_FONT_FAMILY = "var(--font-geist-sans), system-ui, sans-serif";

/** Renderiza los 3 anillos - usado TAL CUAL tanto en la vista previa en
 * linea como en la de presentacion, solo cambian `containerSize`/
 * `resolveFontSize` (CSS, no logica/geometria). Cada estimulo es un
 * elemento posicionado de forma ABSOLUTA dentro de un contenedor
 * cuadrado `relative` - el UNICO transform aplicado es
 * `translate(-50%, -50%)` (centrar el caracter sobre su punto), NUNCA
 * ningun `rotate(...)`: por eso los caracteres se perciben siempre en
 * vertical, sin seguir la tangente de su anillo (requisito critico de
 * diseño, ver cabecera del archivo). Sin ningun elemento de borde/
 * circunferencia: el anillo se percibe exclusivamente por la posicion de
 * los propios caracteres.
 *
 * La posicion de cada estimulo se recalcula aqui mismo a partir de
 * computeStimulusRingGeometry(ringCount) + `rotationAngleRad` (en vez de
 * leer `s.xPercent/yPercent` directamente) - en modo estatico
 * `rotationAngleRad` es 0 y el resultado es IDENTICO al de la fase 1
 * (mismos numeros, mismo pixel). `setStimulusRef`, si se pasa, registra
 * el nodo DOM de cada estimulo en el padre (McDonaldClient) para que el
 * bucle de animacion pueda escribir su posicion directamente por
 * fotograma sin pasar por React (ver cabecera del archivo). */
function McDonaldRings({
  stimuli,
  ringCount,
  containerSize,
  resolveFontSize,
  rotationAngleRad = 0,
  setStimulusRef,
}: {
  stimuli: McDonaldStimulus[];
  ringCount: number;
  containerSize: string;
  resolveFontSize: (ring: number) => string;
  rotationAngleRad?: number;
  setStimulusRef?: (index: number, el: HTMLDivElement | null) => void;
}) {
  const geometry = computeStimulusRingGeometry(ringCount);
  return (
    <div className="relative" style={{ width: containerSize, height: containerSize }}>
      {stimuli.map((s, i) => {
        const geo = geometry[i];
        // Guarda defensiva: `stimuli` y `geometry` deberian tener
        // siempre la misma longitud (el padre las actualiza en el MISMO
        // commit, ver handleContentAffectingChange), pero si algun
        // cambio futuro introdujera un render con longitudes
        // desincronizadas, omitir el estimulo sin geometria es mas
        // seguro que lanzar (geo.radiusPercent de un `undefined`
        // rompia toda la carta - bug real detectado y corregido en esta
        // misma tarea).
        if (!geo) return null;
        const { xPercent, yPercent } = computeRingPosition(geo.radiusPercent, geo.indexInRing, geo.countInRing, rotationAngleRad);
        return (
          <div
            key={i}
            ref={setStimulusRef ? (el) => setStimulusRef(i, el) : undefined}
            className="absolute font-bold leading-none"
            style={{
              left: `${xPercent}%`,
              top: `${yPercent}%`,
              transform: "translate(-50%, -50%)",
              color: s.color,
              fontSize: resolveFontSize(s.ring),
              fontFamily: MCDONALD_STIMULUS_FONT_FAMILY,
            }}
          >
            {s.content}
          </div>
        );
      })}
    </div>
  );
}

/** Rango de numero de anillos (1 a 5) - MCDONALD_MIN_RINGS/MAX_RINGS,
 * generados aqui como array simple para los botones de seleccion. */
const MCDONALD_RING_COUNT_OPTIONS: number[] = Array.from(
  { length: MCDONALD_MAX_RINGS - MCDONALD_MIN_RINGS + 1 },
  (_, i) => MCDONALD_MIN_RINGS + i
);

function McDonaldContentFields({ config, onChange }: { config: McDonaldCardConfig; onChange: (next: McDonaldCardConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MCDONALD_CONTENT_LABELS) as McDonaldContent[]).map((content) => (
          <button key={content} type="button" onClick={() => onChange({ ...config, content })} className={toggleButtonClass(config.content === content)}>
            {MCDONALD_CONTENT_LABELS[content]}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs text-orion-navy-500">Número de anillos</p>
        <div className="flex flex-wrap gap-2">
          {MCDONALD_RING_COUNT_OPTIONS.map((ringCount) => (
            <button
              key={ringCount}
              type="button"
              onClick={() => onChange({ ...config, ringCount })}
              className={toggleButtonClass(config.ringCount === ringCount)}
            >
              {ringCount}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function McDonaldCharSizeFields({ config, onChange }: { config: McDonaldCardConfig; onChange: (next: McDonaldCardConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MCDONALD_CHAR_SIZE_LABELS) as McDonaldCharSize[]).map((charSize) => (
          <button key={charSize} type="button" onClick={() => onChange({ ...config, charSize })} className={toggleButtonClass(config.charSize === charSize)}>
            {MCDONALD_CHAR_SIZE_LABELS[charSize]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MCDONALD_CHAR_SIZE_MODE_LABELS) as McDonaldCharSizeMode[]).map((charSizeMode) => (
          <button
            key={charSizeMode}
            type="button"
            onClick={() => onChange({ ...config, charSizeMode })}
            className={toggleButtonClass(config.charSizeMode === charSizeMode)}
          >
            {MCDONALD_CHAR_SIZE_MODE_LABELS[charSizeMode]}
          </button>
        ))}
      </div>
      <p className="text-xs text-orion-navy-400">
        {config.charSizeMode === "uniform"
          ? "Mismo tamaño en los 3 anillos."
          : "El anillo exterior es el más grande; el interior, el más pequeño."}
      </p>
    </div>
  );
}

function McDonaldCardSizeFields({ config, onChange }: { config: McDonaldCardConfig; onChange: (next: McDonaldCardConfig) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MCDONALD_CARD_SIZE_LABELS) as McDonaldCardSize[]).map((cardSize) => (
          <button key={cardSize} type="button" onClick={() => onChange({ ...config, cardSize })} className={toggleButtonClass(config.cardSize === cardSize)}>
            {MCDONALD_CARD_SIZE_LABELS[cardSize]}
          </button>
        ))}
      </div>
      <p className="text-xs text-orion-navy-400">Cambia el diámetro de la carta manteniendo las proporciones de los 3 anillos.</p>
    </div>
  );
}

/** `onChange` (igual firma que el resto de campos) cubre velocidad/
 * sentido - cambios sin efectos secundarios, el bucle de animacion del
 * padre ya los lee de forma reactiva. `onSelectMotionMode` es un
 * manejador APARTE porque cambiar de estatico a dinamico (o viceversa)
 * SI tiene efectos secundarios (arrancar/parar el bucle, reiniciar el
 * angulo "de forma limpia" al entrar en dinamico) que el padre necesita
 * controlar. `isRotationPlaying`/`onToggleRotation`/
 * `prefersReducedMotion` son estado EFIMERO de interaccion (nunca se
 * guardan en McDonaldCardConfig, igual criterio que el estado de
 * reproduccion de OculomotorClient.tsx). */
function McDonaldMotionFields({
  config,
  onChange,
  onSelectMotionMode,
  isRotationPlaying,
  onToggleRotation,
  prefersReducedMotion,
}: {
  config: McDonaldCardConfig;
  onChange: (next: McDonaldCardConfig) => void;
  onSelectMotionMode: (motionMode: McDonaldMotionMode) => void;
  isRotationPlaying: boolean;
  onToggleRotation: () => void;
  prefersReducedMotion: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MCDONALD_MOTION_MODE_LABELS) as McDonaldMotionMode[]).map((motionMode) => (
          <button
            key={motionMode}
            type="button"
            onClick={() => onSelectMotionMode(motionMode)}
            className={toggleButtonClass(config.motionMode === motionMode)}
          >
            {MCDONALD_MOTION_MODE_LABELS[motionMode]}
          </button>
        ))}
      </div>
      {config.motionMode === "dynamic" && (
        <div className="space-y-2 border-t border-orion-navy-100 pt-2">
          <label className="block text-xs text-orion-navy-500">
            Velocidad de giro: <span className="font-semibold text-orion-navy-900">{config.rotationSpeedRpm} rpm</span>
            <input
              type="range"
              min={MCDONALD_MIN_ROTATION_RPM}
              max={MCDONALD_MAX_ROTATION_RPM}
              step={0.5}
              value={config.rotationSpeedRpm}
              onChange={(e) => onChange({ ...config, rotationSpeedRpm: clampRotationRpm(Number(e.target.value)) })}
              className="mt-1 w-full"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(MCDONALD_ROTATION_DIRECTION_LABELS) as McDonaldRotationDirection[]).map((rotationDirection) => (
              <button
                key={rotationDirection}
                type="button"
                onClick={() => onChange({ ...config, rotationDirection })}
                className={toggleButtonClass(config.rotationDirection === rotationDirection)}
              >
                {MCDONALD_ROTATION_DIRECTION_LABELS[rotationDirection]}
              </button>
            ))}
            <button type="button" onClick={onToggleRotation} className={toggleButtonClass(isRotationPlaying)}>
              {isRotationPlaying ? "Pausar" : "Reproducir"}
            </button>
          </div>
          {prefersReducedMotion && !isRotationPlaying && (
            <p className="text-xs text-orion-navy-400">
              Tu sistema solicita movimiento reducido - la rotación no se inicia automáticamente. Pulsa «Reproducir» para activarla.
            </p>
          )}
          <p className="text-xs text-orion-navy-400">Velocidad orientativa para entrenamiento visual, no representa un estándar clínico.</p>
        </div>
      )}
    </div>
  );
}

function McDonaldColorFields({ config, onChange }: { config: McDonaldCardConfig; onChange: (next: McDonaldCardConfig) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(MCDONALD_COLOR_MODE_LABELS) as McDonaldColorMode[]).map((colorMode) => (
          <button
            key={colorMode}
            type="button"
            onClick={() => onChange({ ...config, colorMode })}
            className={toggleButtonClass(config.colorMode === colorMode)}
          >
            {MCDONALD_COLOR_MODE_LABELS[colorMode]}
          </button>
        ))}
      </div>
      {(config.colorMode === "monochromeRed" || config.colorMode === "redGreen") && (
        <label className="flex items-center gap-2 text-xs text-orion-navy-500">
          Rojo
          <input
            type="color"
            value={config.redHex}
            onChange={(e) => onChange({ ...config, redHex: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
          />
        </label>
      )}
      {(config.colorMode === "monochromeGreen" || config.colorMode === "redGreen") && (
        <label className="flex items-center gap-2 text-xs text-orion-navy-500">
          Verde
          <input
            type="color"
            value={config.greenHex}
            onChange={(e) => onChange({ ...config, greenHex: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border border-orion-navy-200 p-0"
          />
        </label>
      )}
      {config.colorMode !== "neutral" && (
        <p className="text-xs text-orion-navy-400">Los tonos son orientativos y editables, no representan un valor clínicamente calibrado.</p>
      )}
    </div>
  );
}

export default function McDonaldClient() {
  const [config, setConfig] = useState<McDonaldCardConfig>(DEFAULT_MCDONALD_CONFIG);
  // randomFn fijo (nunca Math.random) en el estado inicial - mismo motivo
  // exacto ya documentado en HartClient.tsx: evita el "Hydration failed"
  // por generar contenido aleatorio distinto en servidor y cliente. Este
  // valor es SOLO un placeholder deterministico para que servidor y
  // cliente coincidan en la primera pasada (con randomFn=()=>0,
  // pickStimulusContent elige SIEMPRE el indice 0 del pool, por eso el
  // placeholder es literalmente "AAAA..." en modo letras/mixto y
  // "0000..." en modo numeros) - el useEffect de mas abajo lo sustituye
  // por contenido REALMENTE aleatorio una sola vez, justo tras montar en
  // el cliente.
  const [stimuli, setStimuli] = useState<McDonaldStimulus[]>(() =>
    generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, MCDONALD_CONTENT_POOLS[DEFAULT_MCDONALD_CONFIG.content], () => 0)
  );
  const [view, setView] = useState<ViewMode>("config");
  const [fullscreenStatus, setFullscreenStatus] = useState<FullscreenStatus>("pending");
  const presentationContainerRef = useRef<HTMLDivElement | null>(null);

  // --- Modo dinamico: estado/refs del motor de rotacion ---
  // `rotationAngleRad` (estado) es el angulo "confirmado" que usa React
  // para renderizar cuando NO hay un bucle de animacion activo (reposo,
  // pausado, o justo al montar/cambiar de modo). `rotationAngleRef` es la
  // fuente de verdad EN CALIENTE que el bucle de rAF incrementa cada
  // fotograma sin pasar por React (ver cabecera del archivo). Se
  // sincroniza a estado SOLO al pausar, para que un re-render no
  // relacionado (p.ej. cambiar de color) no "salte" de vuelta al angulo
  // que React tenia renderizado por ultima vez.
  const [isRotationPlaying, setIsRotationPlaying] = useState(false);
  const [rotationAngleRad, setRotationAngleRad] = useState(0);
  const rotationAngleRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const stimulusElsRef = useRef<(HTMLDivElement | null)[]>([]);
  const setStimulusRef = useCallback((index: number, el: HTMLDivElement | null) => {
    stimulusElsRef.current[index] = el;
  }, []);

  // prefers-reduced-motion: valor fijo (false) en el render inicial
  // (servidor y primera pasada de hidratacion coinciden, sin
  // "Hydration failed") - el useEffect lo actualiza solo en cliente tras
  // montar, mismo criterio que el resto de estado "solo cliente" de este
  // proyecto.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefersReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Primera generacion REAL de contenido, una sola vez justo tras montar
  // en el cliente - sustituye el placeholder deterministico ("AAAA...")
  // del estado inicial por un sorteo real (Math.random). Bug real
  // detectado y corregido en esta tarea: el mecanismo que antes cumplia
  // este papel era un useEffect reactivo a
  // content/colorMode/redHex/greenHex/ringCount (que tambien se
  // ejecutaba al montar, como cualquier efecto); al sustituirlo por
  // `handleContentAffectingChange` (sincrono, solo invocado desde los
  // manejadores de clic, para corregir una condicion de carrera al
  // cambiar `ringCount`) dejo de existir CUALQUIER disparo al montar, y
  // el placeholder quedaba visible hasta que el profesional tocara
  // manualmente contenido/color/anillos. Deliberadamente usa
  // DEFAULT_MCDONALD_CONFIG (no `config`) y deps vacias: en el momento
  // del montaje `config` ES DEFAULT_MCDONALD_CONFIG (mismo valor que ya
  // uso el estado inicial del `useState` de arriba), asi que no hay
  // ninguna ambiguedad de que configuracion usar ni riesgo de
  // desincronizar la longitud de `stimuli` con la geometria (ambas
  // calculadas para el MISMO ringCount por defecto).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStimuli(generateMcDonaldStimuli(DEFAULT_MCDONALD_CONFIG, MCDONALD_CONTENT_POOLS[DEFAULT_MCDONALD_CONFIG.content], Math.random));
  }, []);

  // Regenera cuando cambian contenido/color/ringCount (los parametros
  // que afectan al SORTEO o al NUMERO de estimulos) - nunca al cambiar
  // charSize/cardSize/charSizeMode/motionMode/rotationDirection/
  // rotationSpeedRpm, que son solo escala visual o movimiento sobre el
  // mismo contenido ya generado.
  //
  // SINCRONO a proposito (no un useEffect reactivo, a diferencia del
  // patron equivalente en HartClient.tsx): `ringCount` cambia la
  // LONGITUD del array de estimulos (y la geometria de TODOS los
  // anillos), y McDonaldRings recalcula esa geometria a partir del
  // `ringCount` del PROP mas reciente en cada render. Si la
  // regeneracion de `stimuli` ocurriera en un efecto (que se ejecuta
  // DESPUES del commit), habria un render intermedio con `ringCount`
  // YA actualizado pero `stimuli` todavia con la longitud ANTERIOR
  // (p.ej. 30 estimulos de un `ringCount` de 3 renderizados con la
  // geometria de 6 de un `ringCount` de 1 recien elegido) - si el nuevo
  // `ringCount` es MENOR, eso intenta leer una posicion de geometria
  // que ya no existe y rompe el render (bug real, detectado y corregido
  // en esta misma tarea). Al actualizar `config` y `stimuli` en la
  // MISMA funcion de evento, React los aplica en el mismo commit, sin
  // que exista nunca un render con longitudes desincronizadas.
  // `ringCount` SI regenera (a diferencia del resto de controles de
  // tamaño/movimiento): cambia el numero total de estimulos y el radio
  // de TODOS los anillos (ver computeRingDefinitions en
  // mcdonaldConfig.ts), asi que no hay contenido previo que "preservar"
  // de forma no ambigua - decision documentada en la cabecera de
  // mcdonaldConfig.ts. La rotacion en curso (`rotationAngleRef`) vive
  // aparte y nunca se resetea por esto.
  const handleContentAffectingChange = useCallback((next: McDonaldCardConfig) => {
    setConfig(next);
    setStimuli(generateMcDonaldStimuli(next, MCDONALD_CONTENT_POOLS[next.content]));
  }, []);

  const handleRegenerate = useCallback(() => {
    setStimuli(generateMcDonaldStimuli(config, MCDONALD_CONTENT_POOLS[config.content], Math.random));
  }, [config]);

  // Bucle de rotacion (modo dinamico + reproduciendo) - UN SOLO rAF
  // activo a la vez: el efecto se reinicia (cleanup + nuevo bucle) cada
  // vez que cambian motionMode/isRotationPlaying/rpm/direction, pero
  // `rotationAngleRef` NUNCA se resetea aqui (solo en
  // `handleSelectMotionMode` al entrar en dinamico "de forma limpia"),
  // por eso cambiar velocidad/sentido en caliente continua desde el
  // angulo actual sin saltos ("La velocidad seleccionada debe actualizar
  // el movimiento sin reiniciar... los estímulos" / "Al cambiar el
  // sentido... sin regenerar... ni alterar los radios"). `rAF` se pausa
  // de forma nativa cuando la pestaña pasa a segundo plano (el propio
  // navegador lo throttla/congela), por eso no hace falta logica
  // adicional para ese requisito.
  useEffect(() => {
    if (config.motionMode !== "dynamic" || !isRotationPlaying) return;
    const geometry = computeStimulusRingGeometry(config.ringCount);
    let rafId: number;
    lastFrameTimeRef.current = null;
    const frame = (now: number) => {
      if (lastFrameTimeRef.current == null) lastFrameTimeRef.current = now;
      const deltaMs = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      rotationAngleRef.current += computeRotationAngleRad(config.rotationSpeedRpm, deltaMs, config.rotationDirection);
      for (let i = 0; i < geometry.length; i += 1) {
        const el = stimulusElsRef.current[i];
        if (!el) continue;
        const geo = geometry[i];
        const { xPercent, yPercent } = computeRingPosition(geo.radiusPercent, geo.indexInRing, geo.countInRing, rotationAngleRef.current);
        el.style.left = `${xPercent}%`;
        el.style.top = `${yPercent}%`;
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [config.motionMode, isRotationPlaying, config.rotationSpeedRpm, config.rotationDirection, config.ringCount]);

  // Cambiar de modo SI tiene efectos secundarios (a diferencia de
  // velocidad/sentido): entrar en 'dynamic' reinicia el angulo "de forma
  // limpia" (pedido explicitamente) y arranca a reproducir
  // automaticamente, SALVO que el sistema pida movimiento reducido (en
  // ese caso se deja pausado, con activacion explicita via el boton
  // "Reproducir" - "no inicies automaticamente... ofrece una activacion
  // explicita"). Volver a 'static' simplemente detiene la reproduccion
  // (el bucle de arriba se desmonta solo via su propio cleanup); la
  // vista estatica ignora `rotationAngleRad` (siempre dibuja con angulo
  // 0 a traves de `stimuli`, ver mas abajo), asi que no hace falta
  // resetear nada mas.
  const handleSelectMotionMode = useCallback(
    (motionMode: McDonaldMotionMode) => {
      setConfig((prev) => ({ ...prev, motionMode }));
      if (motionMode === "dynamic") {
        rotationAngleRef.current = 0;
        setRotationAngleRad(0);
        setIsRotationPlaying(!prefersReducedMotion);
      } else {
        setIsRotationPlaying(false);
      }
    },
    [prefersReducedMotion]
  );

  // Pausar: sincroniza el angulo "confirmado" de React con el valor
  // actual del ref (para que un re-render posterior no relacionado con
  // la rotacion no dibuje de vuelta el angulo 0). Reanudar: no hace
  // falta restaurar nada, el efecto de arriba retoma
  // `rotationAngleRef.current` tal cual estaba. Lee `isRotationPlaying`
  // del cierre (no de un callback de actualizacion funcional) a
  // proposito: llamar a `setRotationAngleRad` DENTRO del actualizador de
  // `setIsRotationPlaying` seria una funcion de actualizacion con efectos
  // secundarios (React puede invocarla mas de una vez en Strict Mode).
  const handleToggleRotation = useCallback(() => {
    if (isRotationPlaying) setRotationAngleRad(rotationAngleRef.current);
    setIsRotationPlaying(!isRotationPlaying);
  }, [isRotationPlaying]);

  const resolvePreviewFontSize = useCallback(
    (ring: number) => `${MCDONALD_CHAR_SIZE_REM_PREVIEW[config.charSize] * resolveRingSizeScale(config.charSizeMode, ring, config.ringCount)}rem`,
    [config.charSize, config.charSizeMode, config.ringCount]
  );
  const resolvePresentationFontSize = useCallback(
    (ring: number) => `${MCDONALD_CHAR_SIZE_VMIN_PRESENTATION[config.charSize] * resolveRingSizeScale(config.charSizeMode, ring, config.ringCount)}vmin`,
    [config.charSize, config.charSizeMode, config.ringCount]
  );
  // Angulo usado para el render de React (NO el de fotograma a
  // fotograma, que escribe directo al DOM via refs): 0 en modo estatico
  // (comportamiento identico a la fase 1), o el ultimo angulo
  // "confirmado" en modo dinamico (actualizado al pausar/entrar en el
  // modo - ver arriba).
  const renderRotationAngleRad = config.motionMode === "dynamic" ? rotationAngleRad : 0;

  // Regenerar con la barra espaciadora - MISMO mecanismo (y mismas
  // protecciones) que HartClient.tsx: un unico listener global en
  // `window`, ignorado si el foco esta en un control con comportamiento
  // propio de Espacio, descarta pulsaciones repetidas al mantener la
  // tecla, y usa preventDefault para que la pagina no haga scroll.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A" || target?.isContentEditable) {
        return;
      }
      event.preventDefault();
      handleRegenerate();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRegenerate]);

  // Fullscreen real: mismo patron ya probado en HartClient.tsx.
  useEffect(() => {
    const handleChange = () => setFullscreenStatus(document.fullscreenElement ? "active" : "unavailable");
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  useEffect(() => {
    if (view !== "presentation") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullscreenStatus("pending");
    const el = presentationContainerRef.current;
    if (!el || typeof el.requestFullscreen !== "function") {
      setFullscreenStatus("unavailable");
      return;
    }
    el.requestFullscreen().catch(() => setFullscreenStatus("unavailable"));
  }, [view]);

  // Limpieza al desmontar - nunca deja la pagina atascada en fullscreen
  // real tras salir de la herramienta.
  useEffect(() => {
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  const handleEnterPresentation = useCallback(() => setView("presentation"), []);
  const handleExitPresentation = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setFullscreenStatus("pending");
    setView("config");
  }, []);

  // Vista de PRESENTACION: SIN ningun control de configuracion ni
  // navegacion de Cartas (mismo patron que HartClient.tsx) - pero SI
  // conserva el movimiento y sus controles esenciales (pausa/reanudar,
  // salir) cuando el modo es dinamico, pedido explicitamente ("conserva
  // el movimiento... al entrar en pantalla completa").
  if (view === "presentation") {
    const containerSize = `${MCDONALD_CARD_SIZE_VMIN_PRESENTATION[config.cardSize]}vmin`;
    return (
      <div ref={presentationContainerRef} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-[4vmin]">
        <McDonaldRings
          stimuli={stimuli}
          ringCount={config.ringCount}
          containerSize={containerSize}
          resolveFontSize={resolvePresentationFontSize}
          rotationAngleRad={renderRotationAngleRad}
          setStimulusRef={setStimulusRef}
        />
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          {config.motionMode === "dynamic" && (
            <button
              type="button"
              onClick={handleToggleRotation}
              className="rounded-xl border border-orion-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
            >
              {isRotationPlaying ? "Pausar" : "Reanudar"}
            </button>
          )}
          <button
            type="button"
            onClick={handleRegenerate}
            className="rounded-xl border border-orion-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
          >
            Regenerar
          </button>
          <button
            type="button"
            onClick={handleExitPresentation}
            className="rounded-xl border border-orion-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-orion-navy-700 shadow-lg hover:bg-orion-navy-50"
          >
            Salir
          </button>
        </div>
        {fullscreenStatus === "unavailable" && (
          <p className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-md bg-white/90 px-2 py-1 text-xs text-orion-navy-700 shadow-sm">
            Pantalla completa real no activa en este momento — la presentación sigue funcionando con normalidad.
          </p>
        )}
      </div>
    );
  }

  const previewContainerSize = `${MCDONALD_CARD_SIZE_REM_PREVIEW[config.cardSize]}rem`;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-[#1a8f60]">ORION TOOLS · CARTAS</p>
        <h1 className="text-xl font-bold text-orion-navy-900">McDonald</h1>
      </div>

      {/* Navegacion horizontal del modulo Cartas - SOLO en la vista de
          configuracion, nunca en la presentacion a pantalla completa. */}
      <CartasNav active="mcdonald" />

      {/* 2 columnas: configuracion (ancho flexible) | vista previa (ancho
          ESTABLE, 20rem) - mismo patron antiscroll ya validado en Hart. */}
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-2.5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Contenido</h2>
              <McDonaldContentFields config={config} onChange={handleContentAffectingChange} />
            </div>
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Tamaño de los caracteres</h2>
              <McDonaldCharSizeFields config={config} onChange={setConfig} />
            </div>
          </div>

          <div className="grid items-start gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Tamaño de la carta</h2>
              <McDonaldCardSizeFields config={config} onChange={setConfig} />
            </div>
            <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
              <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Color</h2>
              <McDonaldColorFields config={config} onChange={handleContentAffectingChange} />
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-orion-navy-100 bg-white p-3">
            <h2 className="mb-1.5 text-sm font-semibold text-orion-navy-900">Movimiento</h2>
            <McDonaldMotionFields
              config={config}
              onChange={setConfig}
              onSelectMotionMode={handleSelectMotionMode}
              isRotationPlaying={isRotationPlaying}
              onToggleRotation={handleToggleRotation}
              prefersReducedMotion={prefersReducedMotion}
            />
          </div>
        </div>

        {/* Vista previa - ancho ESTABLE (20rem), controles siempre
            accesibles. */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-orion-navy-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Vista previa</p>
            <div className="flex w-full items-center justify-center overflow-auto rounded-xl border border-orion-navy-100 bg-white p-3" style={{ minHeight: "8rem" }}>
              <McDonaldRings
                stimuli={stimuli}
                ringCount={config.ringCount}
                containerSize={previewContainerSize}
                resolveFontSize={resolvePreviewFontSize}
                rotationAngleRad={renderRotationAngleRad}
                setStimulusRef={setStimulusRef}
              />
            </div>

            {/* Jerarquia de botones: "Ver en pantalla completa" como
                accion principal (solida), "Regenerar" como secundaria -
                mismo criterio ya establecido en Hart. */}
            <div className="flex w-full flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleEnterPresentation}
                className="rounded-xl bg-orion-navy-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orion-navy-900"
              >
                Ver en pantalla completa
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                className="rounded-xl border border-orion-navy-200 px-5 py-2.5 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-50"
              >
                Regenerar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
