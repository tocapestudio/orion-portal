'use client'

/**
 * Click Targets - mecanica "un clic = un ensayo" (revision funcional
 * posterior a la adaptacion inicial desde ORION Play V.2). Cambios de
 * fondo respecto a la version anterior de este archivo:
 *
 * - Un unico clic resuelve cada target: si cae dentro es acierto, si cae
 *   fuera es fallo, pero en AMBOS casos el ensayo termina inmediatamente
 *   (el target desaparece y aparece el siguiente). Ya no se puede
 *   reintentar un target fallado - antes, un clic fuera solo incrementaba
 *   `errors` y el target permanecia esperando otro clic.
 * - El tiempo de reaccion se registra para CADA ensayo (acierto o fallo),
 *   no solo para los aciertos.
 * - ClickTargetMetrics (lib/types.ts) se ha ampliado de forma ADITIVA con
 *   `hits` y `accuracyPercent` - los 4 campos originales
 *   (timesPerTarget/totalTimeMs/totalClicks/errors) se mantienen, solo
 *   cambia su significado exacto (ver comentarios en types.ts): totalClicks
 *   pasa a ser "ensayos respondidos" (antes "aciertos"), errors pasa a ser
 *   "ensayos fallados" (antes "clics extra fuera del target"). El
 *   renderer compartido ResultSummary.tsx (ClickTargetSummary) no se ha
 *   tocado - solo lee esos mismos 4 campos y los sigue mostrando
 *   correctamente con el nuevo significado.
 * - Target estatico: se elimina `animate-pulse`. El circulo no debe
 *   cambiar de aspecto mientras espera respuesta.
 * - Nuevo: color del objetivo configurable (antes fijo, bg-orion-navy-500)
 *   + contraste configurable. El contraste se implementa mezclando de
 *   verdad el color elegido hacia el color de fondo real de la pantalla
 *   de ejecucion (`BACKGROUND_HEX`, igual al bg-gray-900 que ya tiene el
 *   contenedor fullscreen) - interpolacion lineal por canal RGB, NO
 *   `opacity` (pedido explicitamente: con opacity el fondo "se transparenta"
 *   de forma menos controlada - con mezcla de color, el resultado es un
 *   color solido final predecible para cualquier combinacion color+contraste).
 *   100% = color elegido sin mezclar (maximo contraste); valores menores
 *   acercan ese color hacia BACKGROUND_HEX.
 * - TargetRecord ahora incluye `outcome: 'hit' | 'miss'` (antes solo
 *   registraba aciertos). "Ver desglose por objetivo" en
 *   ResultsScreen/StoppedScreen muestra Objetivo/Resultado/Tiempo.
 * - Feedback breve opcional entre ensayos (showFeedback, default true):
 *   ✓/✕ + ms durante FEEDBACK_DISPLAY_MS tras cada clic, antes de spawnear
 *   el siguiente target - ver handleContainerClick. reactionTimeMs se fija
 *   ANTES de esta pausa (en el propio clic), nunca la incluye. Si es false,
 *   el siguiente target aparece de inmediato, como en la version anterior.
 *   El FeedbackScreen de fin de ejercicio completo (flow.stage==='feedback')
 *   es un concepto distinto y no se toca.
 *
 * Se mantiene sin cambios respecto a la adaptacion anterior: lectura del
 * area real via containerRef.getBoundingClientRect() (no useFullscreenSize),
 * el fix de Runner/ResultsScreen (onComplete solo en "Salir"), Repetir vs
 * Cambiar configuracion, "Salir y detener ejercicio" con StoppedScreen via
 * Portal, guardado de defaults en localStorage ('clickTargets_defaults').
 *
 * Mismo motivo que en ReactionTimeExercise.tsx para desactivar
 * react-hooks/refs en todo el archivo: useExerciseFlow devuelve refs y
 * estado en el mismo objeto `flow`.
 */
/* eslint-disable react-hooks/refs */

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ClickTargetMetrics } from '../lib/types'
import Card from '../ui/Card'
import Button from '../ui/Button'
import ExerciseStopButton from '../ui/ExerciseStopButton'
import ExerciseResultsCard from '../ui/ExerciseResultsCard'
import type { ExerciseSaveState } from '../ui/ExerciseSaveButton'
import SpacebarHint from '../ui/SpacebarHint'
import { useExerciseFlow } from '../lib/hooks'
import type { ExerciseOutcome } from '../exercise-runner/ExerciseRunner'
import { BACKGROUND_HEX, applyContrast } from '../lib/contrast'

// ============ ICONOS (inline SVG, mismo set que ReactionTimeExercise.tsx) ============

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />
    </svg>
  )
}

function Cog6ToothIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431 1.001a6.606 6.606 0 0 1 0 .255c-.007.388.138.761.43 1.001l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-1.001a6.606 6.606 0 0 1 0-.255c.007-.388-.138-.761-.43-1.001l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <circle cx="12" cy="12" r="2.625" />
    </svg>
  )
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

// ============ COLOR / CONTRASTE ============

// BACKGROUND_HEX/hexToRgb/rgbToHex/applyContrast: extraidas a
// ../lib/contrast.ts (import de arriba) - eran identicas byte a byte a
// las de VisualMemoryExercise.tsx, ahora comparten una unica
// implementacion. Misma formula, mismo resultado exacto para cualquier
// color+contraste - ver contrast.ts para el razonamiento completo.

/** Paleta propia de colores del target, mismo criterio que la de
 * ReactionTimeExercise.tsx (duplicada aqui a proposito: cada ejercicio es
 * autosuficiente, sin depender de un modulo compartido nuevo).
 *
 * El amarillo (antes '#eab308', Tailwind yellow-500) se sustituye por
 * '#facc15' (yellow-400, mismo matiz, un tono mas claro/limpio) porque se
 * percibia como ocre/amarillo anaranjado en vez de amarillo puro. Resto de
 * la paleta sin cambios, incluido '#f59e0b' (ambar) y '#f97316' (naranja),
 * que son intencionalmente distintos del amarillo. */
const COLOR_PALETTE = [
  '#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#facc15', '#6b7280',
] as const

function ColorPalette({ value, onChange, ariaLabel }: { value: string; onChange: (color: string) => void; ariaLabel: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={`h-6 w-6 rounded-full border-2 transition-transform ${
            value === color ? 'border-orion-navy-700 scale-110' : 'border-white hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

// ============ FINALIZACION (mismo patron conceptual que ReactionTimeExercise.tsx) ============

type EndMode = 'repetitions' | 'time'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} s`
  if (s === 0) return `${m} min`
  return `${m} min ${s} s`
}

/** Presets rapidos de duracion (modo "Por tiempo"), con stepper +/-15s -
 * copiado EXACTAMENTE del array y del comportamiento de
 * ReactionTimeExercise.tsx (mismos 7 valores, mismo stepper sin tope
 * superior). Sustituye a la lista de 12 valores usada anteriormente aqui. */
const QUICK_DURATION_PRESETS = [15, 30, 45, 60, 120, 180, 300]

/** Toggle de 2 opciones en forma de pastilla segmentada, mismo patron
 * visual que ReactionTimeExercise.tsx (duplicado aqui a proposito, cada
 * ejercicio es autosuficiente). */
function SegmentedToggle<T extends string>({ value, options, onChange }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-orion-navy-200 bg-white p-0.5">
      {options.map((opt) => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-orion-navy-700 text-white' : 'text-orion-navy-700 hover:bg-orion-navy-100'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ============ TIPOS Y CONSTANTES ============

const STORAGE_KEY = 'clickTargets_defaults'

/** Holgura (px) sumada al radio del target para calcular el radio de
 * exclusion alrededor del punto de fijacion (ver randomPosition). Se suma
 * al tamaño real del target (en vez de usar un radio fijo) para que el
 * hueco siga siendo proporcional si se configura un target mas grande -
 * garantiza que el circulo nunca toque la cruz central, con margen. */
const FIXATION_EXCLUSION_MARGIN = 40

/** Duracion del feedback breve (✓/✕ + ms) mostrado tras cada ensayo
 * cuando showFeedback === true, antes de que aparezca el siguiente
 * target. Mismo valor que RESULT_DISPLAY_MS en ReactionTimeExercise.tsx
 * (no se crea ninguna configuracion nueva para controlarlo, tal como se
 * pidio). */
const FEEDBACK_DISPLAY_MS = 800

interface Target {
  id: number
  x: number
  y: number
  appearedAt: number
}

interface ExerciseConfig {
  /** Como termina el ejercicio: numero de repeticiones fijo, o duracion.
   * Nombre interno `targetCount` conservado (ya existia) para minimizar
   * cambios - en la interfaz se presenta como "Repeticiones". */
  endMode: EndMode
  targetCount: number
  /** Solo relevante si endMode === 'time'. */
  durationSeconds: number
  targetSize: number
  targetColor: string
  /** 10-100. 100 = color elegido sin mezclar (maximo contraste contra el
   * fondo). Valores menores acercan el color mostrado a BACKGROUND_HEX. */
  contrastPercent: number
  /** Punto de fijacion central ("+"), estatico, puramente visual. No
   * afecta a la mecanica (tiempo de reaccion, hit/miss, metricas) - solo
   * a si randomPosition evita la zona central (ver FIXATION_EXCLUSION_MARGIN). */
  showFixation: boolean
  /** Si es true, tras resolver cada ensayo se muestra brevemente ✓/✕ + ms
   * (FEEDBACK_DISPLAY_MS) antes de spawnear el siguiente target. Si es
   * false, el siguiente target aparece de inmediato. Puramente de
   * presentacion: reactionTimeMs ya se calcula ANTES de este punto (al
   * resolverse el clic), por lo que nunca incluye la duracion del feedback -
   * ver handleContainerClick. */
  showFeedback: boolean
}

const DEFAULT_CONFIG: ExerciseConfig = {
  endMode: 'repetitions',
  targetCount: 15,
  durationSeconds: 120,
  targetSize: 32,
  targetColor: '#3b82f6',
  contrastPercent: 100,
  showFixation: false,
  showFeedback: true,
}

/** Registro de un unico ensayo (acierto o fallo), para "Ver desglose por
 * objetivo". Se empuja exactamente una vez por clic, en el mismo punto
 * donde se resuelve el ensayo - nunca para un target todavia visible sin
 * respuesta. Puramente local a este componente: no se añade a
 * ClickTargetMetrics. */
interface TargetRecord {
  targetNumber: number
  reactionTimeMs: number
  outcome: 'hit' | 'miss'
}

/** Snapshot de metricas parciales, tomado al pulsar "Salir y detener
 * ejercicio". No es parte de ClickTargetMetrics (ese tipo sigue
 * representando solo la finalizacion normal). */
interface PartialMetrics {
  trialsCompleted: number
  /** Necesario para decidir si "totalConfigured" tiene sentido al mostrar
   * la pantalla de parada: en modo 'time' no hay un objetivo de
   * repeticiones fijo, asi que no se muestra "de Y" (mismo criterio que
   * PartialMetrics en ReactionTimeExercise.tsx). */
  endMode: EndMode
  totalConfigured: number
  hits: number
  misses: number
  accuracyPercent: number
  totalTimeMs: number
  avgTimeMs: number | null
}

// ============ COMPONENTE PRINCIPAL ============

interface ClickTargetsExerciseProps {
  onComplete: (
    metrics: ClickTargetMetrics | Record<string, unknown>,
    outcome?: ExerciseOutcome,
    idempotencyKey?: string,
    effectiveConfig?: Record<string, unknown>
  ) => Promise<void>
  /** Si hay un deportista real seleccionado (no modo demo) - ver
   * ClickTargetsV2Runner.tsx, misma condicion que decide si se cablea
   * onPersist. Controla si se muestra "Guardar resultados" y si "Repetir"
   * avisa antes de perder resultados sin guardar - mismo criterio que
   * ReactionTimeExercise.tsx/SimpleReactionExercise.tsx. */
  canPersist?: boolean
  /** De ExerciseRunner.tsx (ver ese archivo) - se usa para decir "si se
   * pulsa Espacio, arranca el ejercicio" SOLO mientras flow.stage==='config'
   * (ver el useEffect mas abajo que lo registra/desregistra). */
  registerSpacebarStart?: (handler: (() => void) | null) => void
}

export default function ClickTargetsExercise({ onComplete, canPersist = false, registerSpacebarStart }: ClickTargetsExerciseProps) {
  const flow = useExerciseFlow<ExerciseConfig, ClickTargetMetrics>({
    storageKey: STORAGE_KEY,
    defaultConfig: DEFAULT_CONFIG,
    onComplete,
  })

  // Estado especifico
  const [trialsCompleted, setTrialsCompleted] = useState(0)
  const [currentTarget, setCurrentTarget] = useState<Target | null>(null)
  const [errors, setErrors] = useState(0)
  const [lastTime, setLastTime] = useState<number | null>(null)
  // Resultado del ultimo ensayo resuelto, solo para el feedback breve
  // (✓/✕) - no participa en ninguna metrica, puramente de presentacion.
  const [lastOutcome, setLastOutcome] = useState<'hit' | 'miss' | null>(null)

  // Estado de la parada voluntaria ("Salir y detener ejercicio").
  const [stoppedEarly, setStoppedEarly] = useState(false)
  const [partialMetrics, setPartialMetrics] = useState<PartialMetrics | null>(null)

  // Estado de "Guardar resultados" (boton que guarda sin salir - ver
  // ExerciseSaveButton.tsx) - mismo criterio exacto que
  // ReactionTimeExercise.tsx/SimpleReactionExercise.tsx. Se resetea a
  // 'idle' en cada ejecucion nueva (handleOpenFullscreen). handleExit
  // (compartido con "Salir a ORION Play") es quien lo gestiona de verdad.
  const [saveState, setSaveState] = useState<ExerciseSaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Refs especificos
  const containerRef = useRef<HTMLDivElement>(null)
  const timesPerTargetRef = useRef<number[]>([])
  const errorsRef = useRef(0)
  const targetRecordsRef = useRef<TargetRecord[]>([])
  // Una clave nueva por ejecucion (generada al abrir fullscreen, antes de
  // cualquier target), reenviada tal cual a onComplete en handleExit -
  // mismo criterio exacto que ReactionTimeExercise.tsx/
  // SimpleReactionExercise.tsx (idempotencia del lado servidor, ver
  // actions.ts).
  const idempotencyKeyRef = useRef('')
  // Evita que el setTimeout de arranque (300ms) spawnee un target si el
  // usuario ya ha pedido parar antes de que se cumpla ese plazo. Tambien
  // la usa finishByTime (fin automatico por tiempo) con el mismo sentido.
  const stopRequestedRef = useRef(false)
  // Timer del modo "Por tiempo" (deadline). Se guarda para poder
  // cancelarlo si el ejercicio termina antes por otra via (parada manual,
  // Repetir, nueva apertura) - evita que un deadline de una ejecucion
  // anterior finalice por error la ejecucion siguiente.
  const deadlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Timer del feedback breve post-ensayo (solo si showFeedback === true).
  // Se guarda para poder cancelarlo si el ejercicio termina por otra via
  // (parada manual, deadline por tiempo) mientras el feedback esta visible.
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Captura de la configuracion EFECTIVA de esta ejecucion (fiabilidad de
  // datos, Fase A) - mismo criterio que ReactionTimeExercise.tsx/
  // SimpleReactionExercise.tsx: snapshot inmutable de
  // flow.configRef.current, tomado en handleOpenFullscreen (antes de
  // cualquier target), nunca releido despues. Reenviada a onComplete en
  // handleExit (ver mas abajo) - actions.ts la usa para construir
  // config_used real via buildConfigUsed/isValidEffectiveConfig.
  const effectiveConfigRef = useRef<ExerciseConfig>(DEFAULT_CONFIG)

  // Sincronizar errors con ref (handleContainerClick no depende de
  // `errors` en sus deps, lee siempre el valor mas reciente via ref)
  useEffect(() => {
    errorsRef.current = errors
  }, [errors])

  const resetMetrics = useCallback(() => {
    timesPerTargetRef.current = []
    errorsRef.current = 0
    targetRecordsRef.current = []
  }, [])

  // Construye ClickTargetMetrics a partir de los refs actuales - usado
  // tanto al terminar por repeticiones como al terminar por tiempo
  // (finishByTime), para no duplicar la formula en dos sitios.
  const buildMetrics = useCallback((): ClickTargetMetrics => {
    const totalTime = timesPerTargetRef.current.reduce((a, b) => a + b, 0)
    const totalClicks = timesPerTargetRef.current.length
    const hits = totalClicks - errorsRef.current
    return {
      timesPerTarget: [...timesPerTargetRef.current],
      totalTimeMs: Math.round(totalTime),
      totalClicks,
      errors: errorsRef.current,
      hits,
      accuracyPercent: totalClicks > 0 ? (hits / totalClicks) * 100 : 0,
    }
  }, [])

  // Genera una posicion aleatoria dentro del area REAL del contenedor en
  // este instante (no un tamaño asumido de antemano). Con fijacion activa,
  // se evita por rechazo (hasta 20 intentos) que el CENTRO del target caiga
  // dentro de un radio de exclusion alrededor del centro del contenedor
  // (donde esta la cruz) - ver FIXATION_EXCLUSION_MARGIN. Sin fijacion, el
  // comportamiento es exactamente el de antes (sin ningun descarte).
  const randomPosition = useCallback(() => {
    const padding = 80
    const size = flow.config.targetSize
    const rect = containerRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 800
    const height = rect?.height ?? 600

    const pick = () => ({
      x: padding + Math.random() * (width - padding * 2 - size),
      y: padding + Math.random() * (height - padding * 2 - size),
    })

    if (!flow.config.showFixation) return pick()

    const exclusionRadius = size + FIXATION_EXCLUSION_MARGIN
    const centerX = width / 2
    const centerY = height / 2

    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = pick()
      const distance = Math.hypot((candidate.x + size) - centerX, (candidate.y + size) - centerY)
      if (distance >= exclusionRadius) return candidate
    }
    return pick() // fallback defensivo, extremadamente improbable con estos tamaños de area
  }, [flow.config.targetSize, flow.config.showFixation])

  const spawnNext = useCallback(() => {
    const { x, y } = randomPosition()
    setCurrentTarget({
      id: performance.now(),
      x,
      y,
      appearedAt: performance.now(),
    })
  }, [randomPosition])

  const handleOpenFullscreen = useCallback(async () => {
    resetMetrics()
    idempotencyKeyRef.current = crypto.randomUUID()
    effectiveConfigRef.current = { ...flow.configRef.current }
    setTrialsCompleted(0)
    setErrors(0)
    setCurrentTarget(null)
    setLastTime(null)
    setLastOutcome(null)
    setStoppedEarly(false)
    setPartialMetrics(null)
    setSaveState('idle')
    setSaveError(null)
    stopRequestedRef.current = false
    if (deadlineTimeoutRef.current) {
      clearTimeout(deadlineTimeoutRef.current)
      deadlineTimeoutRef.current = null
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
    await flow.handleOpenFullscreen()
  }, [flow, resetMetrics])

  // Fin automatico del modo "Por tiempo": se programa como setTimeout
  // independiente de los clics (ver handleStartExercise), porque el
  // deadline debe cumplirse aunque no haya ningun clic pendiente en ese
  // instante. Usa refs (abortRef/stopRequestedRef), nunca flow.stage,
  // porque este callback puede ejecutarse minutos despues de haberse
  // programado - flow.stage en su closure original estaria obsoleto.
  //
  // Si el deadline llega mientras se esta mostrando el feedback breve de
  // un ensayo ya respondido (showFeedback === true), ese ensayo YA esta
  // registrado en los refs (se registra en el clic, antes de programar el
  // feedback) - finalizar aqui no genera ninguna respuesta ficticia ni
  // descarta nada real, solo corta el feedback visual un poco antes.
  const finishByTime = useCallback(() => {
    if (flow.abortRef.current || stopRequestedRef.current) return
    stopRequestedRef.current = true
    deadlineTimeoutRef.current = null
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
    // El target visible sin responder desaparece sin generar ningun
    // registro: timesPerTargetRef/targetRecordsRef no se tocan aqui.
    setCurrentTarget(null)
    flow.setMetricsResult(buildMetrics())
    flow.setStage('feedback')
  }, [flow, buildMetrics])

  const handleStartExercise = useCallback(() => {
    flow.handleStartExercise()
    if (deadlineTimeoutRef.current) clearTimeout(deadlineTimeoutRef.current)
    if (flow.config.endMode === 'time') {
      deadlineTimeoutRef.current = setTimeout(() => finishByTime(), flow.config.durationSeconds * 1000)
    }
    setTimeout(() => {
      if (flow.abortRef.current || stopRequestedRef.current) return
      spawnNext()
    }, 300)
  }, [flow, spawnNext, finishByTime])

  // Inicio con barra espaciadora (ver ExerciseRunner.tsx para el
  // mecanismo compartido, y el comentario mas extenso en
  // ReactionTimeExercise.tsx para el motivo completo): una pulsacion de
  // Espacio tiene una unica funcion segun flow.stage -
  //   'config' -> handleOpenFullscreen, igual que "Iniciar Ejercicio".
  //   'fullscreen-ready' -> handleStartExercise, igual que "Comenzar" en
  //     ReadyScreen (onStart={handleStartExercise}, mas abajo).
  //   cualquier otro stage -> null, Espacio no inicia ni reinicia nada
  //   durante la ejecucion ni en resultados.
  // handleOpenFullscreenRef/handleStartExerciseRef guardan siempre la
  // version mas reciente de cada handler SIN que el efecto dependa de
  // ninguno de los dos directamente - handleStartExercise tiene las
  // mismas deps inestables que handleOpenFullscreen ([flow, ...], y
  // `flow` es un objeto nuevo en cada render), asi que meterla en las
  // dependencias del efecto reabriria el mismo bucle infinito de renders
  // ya corregido. Por eso el efecto SOLO depende de flow.stage (valor
  // primitivo) y de registerSpacebarStart (estable).
  const handleOpenFullscreenRef = useRef(handleOpenFullscreen)
  handleOpenFullscreenRef.current = handleOpenFullscreen
  const handleStartExerciseRef = useRef(handleStartExercise)
  handleStartExerciseRef.current = handleStartExercise

  useEffect(() => {
    if (!registerSpacebarStart) return
    if (flow.stage === 'config') {
      registerSpacebarStart(() => handleOpenFullscreenRef.current())
    } else if (flow.stage === 'fullscreen-ready') {
      registerSpacebarStart(() => handleStartExerciseRef.current())
    } else {
      registerSpacebarStart(null)
    }
    return () => registerSpacebarStart(null)
  }, [registerSpacebarStart, flow.stage])

  const isClickOnTarget = useCallback((clickX: number, clickY: number, target: Target): boolean => {
    const size = flow.config.targetSize
    const dx = clickX - (target.x + size)
    const dy = clickY - (target.y + size)
    return Math.sqrt(dx * dx + dy * dy) <= size
  }, [flow.config.targetSize])

  // Un unico clic resuelve el ensayo completo: acierto o fallo, pero en
  // ambos casos termina aqui mismo (no hay reintento sobre el mismo target).
  // `stopRequestedRef` se comprueba tambien aqui por si finishByTime (fin
  // automatico por tiempo) ya resolvio el ejercicio justo antes de este clic.
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (flow.stage !== 'running' || !currentTarget || stopRequestedRef.current) return

    const el = containerRef.current
    if (!el) return

    const rect = el.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const elapsed = Math.round(performance.now() - currentTarget.appearedAt)
    const hit = isClickOnTarget(clickX, clickY, currentTarget)

    // reactionTimeMs ya ha quedado fijado arriba (`elapsed`), ANTES de
    // cualquier logica de feedback - el feedback (si se muestra) nunca
    // puede alargar ni acortar este valor, solo retrasa cuando aparece el
    // siguiente target.
    timesPerTargetRef.current.push(elapsed)
    if (!hit) {
      errorsRef.current += 1
      setErrors(errorsRef.current)
    }

    const trialNumber = trialsCompleted + 1
    targetRecordsRef.current.push({ targetNumber: trialNumber, reactionTimeMs: elapsed, outcome: hit ? 'hit' : 'miss' })
    setLastTime(elapsed)
    setLastOutcome(hit ? 'hit' : 'miss')
    setTrialsCompleted(trialNumber)
    setCurrentTarget(null)

    // En modo 'time' no hay un numero fijo de repeticiones: el ejercicio
    // solo termina via finishByTime (deadline) o parada manual, nunca
    // por alcanzar un recuento de trials.
    const isLastRepetition = flow.config.endMode === 'repetitions' && trialNumber >= flow.config.targetCount

    const advance = () => {
      if (isLastRepetition) {
        flow.setMetricsResult(buildMetrics())
        flow.setStage('feedback')
      } else {
        spawnNext()
      }
    }

    if (flow.config.showFeedback) {
      // Pausa breve y fija (FEEDBACK_DISPLAY_MS) antes de avanzar. Si
      // finishByTime (deadline) o una parada manual se disparan durante
      // esta pausa, marcan stopRequestedRef - este callback lo comprueba
      // al ejecutarse y no hace nada, para no spawnear ni finalizar dos veces.
      feedbackTimeoutRef.current = setTimeout(() => {
        feedbackTimeoutRef.current = null
        if (stopRequestedRef.current) return
        setLastOutcome(null)
        setLastTime(null)
        advance()
      }, FEEDBACK_DISPLAY_MS)
    } else {
      advance()
    }
  }, [flow, currentTarget, trialsCompleted, isClickOnTarget, spawnNext, buildMetrics])

  // "Cambiar configuracion": vuelve a ConfigScreen sin pasar por onComplete.
  // Mismo aviso que handleRepeat (ver ese comentario): si hay una
  // ejecucion real (canPersist) todavia sin guardar, se confirma antes.
  const handleReconfigure = useCallback(() => {
    if (canPersist && saveState !== 'saved') {
      const confirmed = window.confirm(
        'Todavía no has guardado los resultados de este intento. Si cambias la configuración ahora, se perderán. ¿Quieres continuar sin guardarlos?'
      )
      if (!confirmed) return
    }
    flow.setStage('config')
    flow.setMetricsResult(null)
  }, [canPersist, saveState, flow])

  // "Repetir": reinicia inmediatamente con la MISMA configuracion ya
  // cargada. handleOpenFullscreen ya genera una idempotencyKey NUEVA y
  // limpia partialMetrics/saveState - cada repeticion es una ejecucion
  // propia, nunca se confunde con la anterior ni la sobrescribe.
  //
  // Antes de descartar una ejecucion real (canPersist) que todavia no se
  // ha guardado explicitamente, se avisa - mismo criterio que
  // ReactionTimeExercise.tsx/SimpleReactionExercise.tsx.
  const handleRepeat = useCallback(async () => {
    if (canPersist && saveState !== 'saved') {
      const confirmed = window.confirm(
        'Todavía no has guardado los resultados de este intento. Si repites ahora, se perderán. ¿Quieres continuar sin guardarlos?'
      )
      if (!confirmed) return
    }
    await handleOpenFullscreen()
    handleStartExercise()
  }, [canPersist, saveState, handleOpenFullscreen, handleStartExercise])

  // Pasa de 'feedback' a 'finished' (ResultsScreen) SIN llamar a onComplete
  // todavia - evita que ExerciseRunner desmonte el ejercicio antes de que
  // ResultsScreen llegue a verse.
  const handleShowResults = useCallback(() => {
    flow.exitFullscreen()
    flow.setStage('finished')
  }, [flow])

  // Guarda la ejecucion actual (normal o interrumpida) - COMPARTIDO entre
  // "Guardar resultados" (no navega) y "Salir a ORION Play" (navega
  // despues, via ExerciseExitButton.tsx que espera esta promesa). Mismo
  // criterio exacto que ReactionTimeExercise.tsx/SimpleReactionExercise.tsx:
  //
  // - Si ya esta 'saved', no hace nada (cubre reintentos/doble clic sin
  //   repetir la llamada de red - ademas de la idempotencia del lado
  //   servidor en actions.ts, no en su lugar).
  // - Ejecucion normal (flow.metricsResult ya establecido): se añade
  //   targetLog (targetRecordsRef.current, TargetRecord[] con
  //   targetNumber/reactionTimeMs/outcome por ensayo) como propiedad de
  //   transporte adicional - actions.ts la separa de las metricas
  //   agregadas y la guarda en results.raw_data (ver
  //   buildClickTargetsResultRow). No se persiste por separado, no se
  //   reconstruye ni se infiere ningun dato - es exactamente el mismo
  //   array ya mostrado en "Ver desglose por objetivo".
  // - Ejecucion interrumpida (partialMetrics, sin flow.metricsResult):
  //   se reconstruye un ClickTargetMetrics equivalente a partir de
  //   PartialMetrics (ya calculado en handleStopEarly) + timesPerTargetRef
  //   (intacto, handleStopEarly no lo limpia) - mismo patron que
  //   ReactionTimeExercise.tsx para su propio caso interrumpido. outcome
  //   se marca 'interrupted', NUNCA 'completed' - nunca se confunde una
  //   ejecucion detenida con una terminada con normalidad.
  const handleExit = useCallback(async () => {
    if (saveState === 'saved') return

    setSaveState('saving')
    setSaveError(null)
    try {
      if (flow.metricsResult) {
        const payload: Record<string, unknown> = { ...flow.metricsResult, targetLog: targetRecordsRef.current }
        await onComplete(payload, 'completed', idempotencyKeyRef.current, effectiveConfigRef.current as unknown as Record<string, unknown>)
      } else if (partialMetrics) {
        const interruptedMetrics: ClickTargetMetrics = {
          timesPerTarget: [...timesPerTargetRef.current],
          totalTimeMs: partialMetrics.totalTimeMs,
          totalClicks: partialMetrics.trialsCompleted,
          errors: partialMetrics.misses,
          hits: partialMetrics.hits,
          accuracyPercent: partialMetrics.accuracyPercent,
        }
        const payload: Record<string, unknown> = { ...interruptedMetrics, targetLog: targetRecordsRef.current }
        await onComplete(payload, 'interrupted', idempotencyKeyRef.current, effectiveConfigRef.current as unknown as Record<string, unknown>)
      }
      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el resultado.')
      throw err
    }
  }, [flow.metricsResult, onComplete, partialMetrics, saveState])

  // "Guardar resultados": llama a handleExit (misma logica que "Salir")
  // pero sin navegar despues - se queda en la pantalla de resultados.
  const handleSaveResults = useCallback(() => {
    handleExit().catch(() => {
      // El error ya se guardo en saveState/saveError dentro de handleExit.
    })
  }, [handleExit])

  // Parada voluntaria durante la ejecucion. El target visible sin
  // respuesta no cuenta: timesPerTargetRef/targetRecordsRef solo se
  // actualizan al resolverse un clic, nunca antes.
  const handleStopEarly = useCallback(() => {
    stopRequestedRef.current = true
    if (deadlineTimeoutRef.current) {
      clearTimeout(deadlineTimeoutRef.current)
      deadlineTimeoutRef.current = null
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }

    const completed = timesPerTargetRef.current.length
    const totalTime = timesPerTargetRef.current.reduce((a, b) => a + b, 0)
    const hits = completed - errorsRef.current

    setPartialMetrics({
      trialsCompleted: completed,
      endMode: flow.config.endMode,
      totalConfigured: flow.config.targetCount,
      hits,
      misses: errorsRef.current,
      accuracyPercent: completed > 0 ? (hits / completed) * 100 : 0,
      totalTimeMs: Math.round(totalTime),
      avgTimeMs: completed > 0 ? Math.round(totalTime / completed) : null,
    })
    setStoppedEarly(true)
    flow.exitFullscreen()
  }, [flow])

  const displayColor = applyContrast(flow.config.targetColor, BACKGROUND_HEX, flow.config.contrastPercent / 100)
  const targetSize = flow.config.targetSize * 2

  const avgTime = timesPerTargetRef.current.length > 0
    ? Math.round(timesPerTargetRef.current.reduce((a, b) => a + b, 0) / timesPerTargetRef.current.length)
    : 0

  // ============ RENDER ============

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Click Targets</h1>
        <p className="text-sm text-gray-600">Haz clic en cada objetivo en cuanto aparezca.</p>
      </div>

      {flow.stage === 'config' && (
        <ConfigScreen
          config={flow.config}
          setConfig={flow.setConfig}
          displayColor={displayColor}
          defaultsSaved={flow.defaultsSaved}
          onSaveDefaults={flow.handleSaveDefaults}
          onStart={handleOpenFullscreen}
        />
      )}

      {/* fixed inset-0 (no solo 'block'/width:height 100%) cuando esta en
          una fase de fullscreen: cubre TODO el viewport por CSS igual que
          lo haria el Fullscreen API real, incluso si el navegador no
          llega a concederlo (enterFullscreen falla en silencio - ver
          useExerciseFlow.ts). Antes, en ese caso de fallo, este div solo
          ocupaba su contenedor normal dentro de la pagina, dejando
          visible a la vez el "Volver" del Portal (SecondaryScreenShell)
          y el icono de detener del ejercicio - dos salidas distintas
          simultaneas. Con fixed+inset-0 siempre se tapa el resto de la
          pagina (igual que el Fullscreen API real), quedando una unica
          salida visible en todos los casos: la propia del ejercicio. */}
      <div
        ref={flow.fullscreenRef}
        className={`${flow.isFullscreenStage ? 'fixed inset-0 z-50' : 'hidden'} bg-gray-900`}
      >
        {flow.stage === 'fullscreen-ready' && (
          <ReadyScreen
            config={flow.config}
            onExit={flow.handleExitFullscreen}
            onStart={handleStartExercise}
          />
        )}

        {flow.stage === 'running' && (
          stoppedEarly && partialMetrics ? (
            <StoppedScreen
              metrics={partialMetrics}
              targetLog={targetRecordsRef.current}
              onRepeat={handleRepeat}
              onReconfigure={handleReconfigure}
              onBeforeExit={handleExit}
              onSave={canPersist ? handleSaveResults : undefined}
              saveState={saveState}
              saveError={saveError}
            />
          ) : (
            <RunningScreen
              containerRef={containerRef}
              config={flow.config}
              displayColor={displayColor}
              targetSize={targetSize}
              trialsCompleted={trialsCompleted}
              currentTarget={currentTarget}
              errors={errors}
              lastTime={lastTime}
              lastOutcome={lastOutcome}
              onContainerClick={handleContainerClick}
              onStopEarly={handleStopEarly}
              stopContainer={flow.fullscreenRef.current}
            />
          )
        )}

        {flow.stage === 'feedback' && flow.metricsResult && (
          <FeedbackScreen
            metrics={flow.metricsResult}
            avgTime={avgTime}
            onExit={handleShowResults}
          />
        )}
      </div>

      {flow.stage === 'finished' && flow.metricsResult && (
        <ResultsScreen
          metrics={flow.metricsResult}
          avgTime={avgTime}
          targetLog={targetRecordsRef.current}
          onRepeat={handleRepeat}
          onReconfigure={handleReconfigure}
          onBeforeExit={handleExit}
          onSave={canPersist ? handleSaveResults : undefined}
          saveState={saveState}
          saveError={saveError}
        />
      )}
    </div>
  )
}

// ============ SUB-COMPONENTES ============

const sectionLabel = 'mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'
const sliderClass = 'w-44 sm:w-48 h-2 bg-gray-200 rounded-lg cursor-pointer accent-orion-navy-600'

/** Caja de previsualizacion de dimensiones FIJAS (no depende de
 * targetSize): el circulo interior cambia de tamaño/color/contraste,
 * pero la caja nunca se redimensiona, para que nada del layout de
 * ConfigScreen se desplace al mover los sliders. */
const PREVIEW_BOX_SIZE = 160

function ConfigScreen({ config, setConfig, displayColor, defaultsSaved, onSaveDefaults, onStart }: {
  config: ExerciseConfig
  setConfig: React.Dispatch<React.SetStateAction<ExerciseConfig>>
  displayColor: string
  defaultsSaved: boolean
  onSaveDefaults: () => void
  onStart: () => void
}) {
  return (
    <Card className="p-3 px-6 mb-3">
      {/* Cabecera compactada (ajuste visual posterior): ya no lleva el
          boton "Iniciar Ejercicio" (se traslada a la columna derecha,
          encima de la vista previa - ver mas abajo), mismo criterio que
          ReactionTimeExercise.tsx. */}
      <div className="mb-2 flex items-center gap-2">
        <Cog6ToothIcon className="h-5 w-5 text-orion-navy-600" />
        <h2 className="text-lg font-semibold text-gray-900">Configuración</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-x-8 gap-y-2">
        <div className="space-y-2">
          <div>
            <p className={sectionLabel}>Finalización</p>
            <SegmentedToggle
              value={config.endMode}
              options={[
                { value: 'repetitions', label: 'Por repeticiones' },
                { value: 'time', label: 'Por tiempo' },
              ]}
              onChange={(endMode) => setConfig((c) => ({ ...c, endMode }))}
            />
            {config.endMode === 'repetitions' ? (
              <div className="mt-2.5 flex items-center gap-3">
                <input type="range" min={5} max={30} step={1} value={config.targetCount}
                  onChange={(e) => setConfig((c) => ({ ...c, targetCount: parseInt(e.target.value) }))}
                  className={sliderClass} />
                <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.targetCount} repeticiones</span>
              </div>
            ) : (
              <div className="mt-2.5">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, durationSeconds: Math.max(15, c.durationSeconds - 15) }))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-base font-semibold text-gray-700 hover:bg-gray-100"
                    aria-label="Reducir duración"
                  >
                    −
                  </button>
                  <span className="w-20 text-center text-sm font-medium text-gray-900">{formatDuration(config.durationSeconds)}</span>
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, durationSeconds: c.durationSeconds + 15 }))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 text-base font-semibold text-gray-700 hover:bg-gray-100"
                    aria-label="Aumentar duración"
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
                  {QUICK_DURATION_PRESETS.map((s, i) => (
                    <span key={s} className="flex items-center">
                      {i > 0 && <span className="mx-1 text-gray-300">·</span>}
                      <button
                        type="button"
                        onClick={() => setConfig((c) => ({ ...c, durationSeconds: s }))}
                        className={config.durationSeconds === s
                          ? 'font-semibold text-orion-navy-700'
                          : 'text-gray-500 hover:text-orion-navy-600'}
                      >
                        {formatDuration(s)}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <p className={sectionLabel}>Tamaño del objetivo</p>
            <div className="flex items-center gap-3">
              <input type="range" min={16} max={64} step={4} value={config.targetSize}
                onChange={(e) => setConfig((c) => ({ ...c, targetSize: parseInt(e.target.value) }))}
                className={sliderClass} />
              <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.targetSize}px</span>
            </div>
          </div>

          <div>
            <p className={sectionLabel}>Feedback</p>
            <SegmentedToggle
              value={config.showFeedback ? 'show' : 'hide'}
              options={[
                { value: 'show', label: 'Mostrar feedback' },
                { value: 'hide', label: 'No mostrar feedback' },
              ]}
              onChange={(v) => setConfig((c) => ({ ...c, showFeedback: v === 'show' }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className={sectionLabel}>Color del objetivo</p>
            <ColorPalette
              ariaLabel="Color del objetivo"
              value={config.targetColor}
              onChange={(targetColor) => setConfig((c) => ({ ...c, targetColor }))}
            />
          </div>

          <div>
            <p className={sectionLabel}>Contraste del objetivo</p>
            <div className="flex items-center gap-3">
              <input type="range" min={10} max={100} step={5} value={config.contrastPercent}
                onChange={(e) => setConfig((c) => ({ ...c, contrastPercent: parseInt(e.target.value) }))}
                className={sliderClass} />
              <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.contrastPercent}%</span>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              100% = color elegido sin mezclar (máximo contraste) · valores menores acercan el color mostrado al fondo
            </p>
          </div>

          <div>
            <p className={sectionLabel}>Punto de fijación</p>
            <SegmentedToggle
              value={config.showFixation ? 'with' : 'without'}
              options={[
                { value: 'with', label: 'Con fijación' },
                { value: 'without', label: 'Sin fijación' },
              ]}
              onChange={(v) => setConfig((c) => ({ ...c, showFixation: v === 'with' }))}
            />
          </div>
        </div>

        {/* Preview unificada: tamaño/color/contraste simultaneos, en una
            caja de tamaño fijo (PREVIEW_BOX_SIZE) - el circulo interior es
            el unico elemento que cambia, nunca la caja. */}
        {/* DERECHA: boton de inicio (trasladado desde la cabecera, ver
            arriba) + vista previa, apiladas con un poco de separacion del
            borde superior (lg:mt-2) - mismo criterio que
            ReactionTimeExercise.tsx. */}
        <div className="flex flex-col items-center gap-4 justify-self-center lg:mt-2 lg:justify-self-end">
          <div className="flex flex-col items-center gap-1.5">
            <Button onClick={onStart} variant="primary" className="inline-flex items-center gap-2 px-6 py-2.5">
              <PlayIcon className="h-5 w-5" /> Iniciar Ejercicio
            </Button>
            <SpacebarHint label="Pulsa Espacio para continuar" tone="light" />
          </div>
          <div className="flex flex-col items-center">
            <p className={sectionLabel}>Vista previa</p>
            <div
              className="flex items-center justify-center rounded-lg bg-gray-900"
              style={{ width: PREVIEW_BOX_SIZE, height: PREVIEW_BOX_SIZE }}
            >
              <div
                className="rounded-full shadow-2xl"
                style={{ width: config.targetSize * 2, height: config.targetSize * 2, backgroundColor: displayColor }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="mb-2 text-sm text-gray-500">
          Un clic resuelve cada objetivo (dentro = acierto, fuera = fallo) · no se puede reintentar un objetivo fallado
        </p>
        <button
          onClick={onSaveDefaults}
          className="inline-flex items-center gap-2 rounded-lg border border-orion-navy-200 bg-white px-3 py-1.5 text-sm font-medium text-orion-navy-700 hover:bg-orion-navy-50"
        >
          <Cog6ToothIcon className="h-4 w-4" />
          {defaultsSaved ? <span className="text-green-600">¡Guardado!</span> : 'Guardar como predeterminado'}
        </button>
      </div>
    </Card>
  )
}

function ReadyScreen({ config, onExit, onStart }: { config: ExerciseConfig; onExit: () => void; onStart: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <button onClick={onExit} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="h-8 w-8" /></button>
      <p className="text-white text-xl mb-4">Preparado para comenzar</p>
      <p className="text-gray-400 mb-8">
        {config.endMode === 'repetitions' ? `${config.targetCount} repeticiones` : formatDuration(config.durationSeconds)}
      </p>
      <Button onClick={onStart} variant="primary" className="inline-flex items-center gap-2 text-xl px-12 py-4">
        <PlayIcon className="h-6 w-6" /> Comenzar
      </Button>
      <SpacebarHint label="Pulsa Espacio para comenzar" tone="dark" />
    </div>
  )
}

function RunningScreen({ containerRef, config, displayColor, targetSize, trialsCompleted, currentTarget, errors, lastTime, lastOutcome, onContainerClick, onStopEarly, stopContainer }: {
  containerRef: React.RefObject<HTMLDivElement | null>
  config: ExerciseConfig
  displayColor: string
  targetSize: number
  trialsCompleted: number
  currentTarget: Target | null
  errors: number
  lastTime: number | null
  lastOutcome: 'hit' | 'miss' | null
  onContainerClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onStopEarly: () => void
  stopContainer: HTMLElement | null
}) {
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-crosshair select-none"
      style={{ minHeight: '100vh' }}
      onClick={onContainerClick}
    >
      <div className="absolute top-4 left-1/2 flex -translate-x-1/2 gap-6">
        <div className="rounded-full bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-300">
          {config.endMode === 'repetitions'
            ? `Objetivos: ${trialsCompleted} / ${config.targetCount}`
            : `Objetivos: ${trialsCompleted}`}
        </div>
        <div className="rounded-full bg-gray-800 px-4 py-2 text-sm font-semibold text-red-400">
          Errores: {errors}
        </div>
      </div>

      {/* Feedback breve post-ensayo (✓/✕ + ms), solo si showFeedback esta
          activo - sencillo y discreto, sin pantalla propia. Se oculta de
          nuevo (lastOutcome/lastTime a null) antes de que aparezca el
          siguiente target - ver handleContainerClick. */}
      {config.showFeedback && lastOutcome !== null && lastTime !== null && (
        <div className="absolute top-16 left-1/2 flex items-center gap-2 -translate-x-1/2">
          <span className={`text-2xl font-bold ${lastOutcome === 'hit' ? 'text-green-400' : 'text-red-400'}`}>
            {lastOutcome === 'hit' ? '✓' : '✕'}
          </span>
          <span className="text-2xl font-bold text-gray-300">{lastTime} ms</span>
        </div>
      )}

      {/* Punto de fijacion: cruz estatica en el centro, puramente visual -
          no afecta a timing/metricas, no se anima ni parpadea.
          pointer-events-none para que un clic sobre ella burbujee igual al
          contenedor (onContainerClick), exactamente como si se hiciera clic
          en el fondo. randomPosition ya evita que el target se solape con
          esta zona cuando showFixation esta activo. */}
      {config.showFixation && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-3xl font-light leading-none text-gray-500 select-none" aria-hidden="true">+</span>
        </div>
      )}

      {/* Target estatico: sin animate-pulse ni transiciones de tamaño/opacidad
          mientras espera respuesta - aparece, permanece quieto, recibe un
          clic, desaparece. */}
      {currentTarget && (
        <div
          className="absolute rounded-full shadow-2xl"
          style={{ left: currentTarget.x, top: currentTarget.y, width: targetSize, height: targetSize, backgroundColor: displayColor }}
        />
      )}

      {/* Icono discreto de interrupcion: mismo componente compartido
          (ExerciseStopButton) que Reaction Time y Visual Memory - misma
          posicion exacta en el viewport en los 3 ejercicios, independiente
          del campo `relative`/`absolute` de targets de esta pantalla.
          Mismo handleStopEarly ya validado (detiene, conserva lo ya
          resuelto, muestra StoppedScreen). */}
      <ExerciseStopButton onClick={onStopEarly} container={stopContainer} />
    </div>
  )
}

function StoppedScreen({ metrics, targetLog, onRepeat, onReconfigure, onBeforeExit, onSave, saveState, saveError }: {
  metrics: PartialMetrics; targetLog: TargetRecord[]
  onRepeat: () => void; onReconfigure: () => void; onBeforeExit?: () => void | Promise<void>
  onSave?: () => void; saveState?: ExerciseSaveState; saveError?: string | null
}) {
  // Sin ningun objetivo completado: mismo criterio que VisualMemoryExercise.tsx
  // (roundsCompleted === 0) - un estado explicito en vez de una fila de
  // metricas en guiones sin contexto.
  const hasTargets = metrics.trialsCompleted > 0

  // Portal directo a document.body, mismo motivo que en ReactionTimeExercise.tsx.
  // Contenido interior (tarjeta + acciones + boton de salida) via
  // ExerciseResultsCard, compartido con Reaction Time y Visual Memory.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4">
      <ExerciseResultsCard
        title="Ejercicio detenido"
        subtitle={hasTargets ? (
          metrics.endMode === 'repetitions'
            ? `${metrics.trialsCompleted} de ${metrics.totalConfigured} objetivos presentados`
            : `${metrics.trialsCompleted} objetivos presentados`
        ) : undefined}
        onRepeat={onRepeat}
        onReconfigure={onReconfigure}
        onBeforeExit={onBeforeExit}
        onSave={onSave}
        saveState={saveState}
        saveError={saveError}
        breakdown={hasTargets ? <TargetBreakdown targetLog={targetLog} /> : undefined}
      >
        {hasTargets ? (
          <div className="space-y-4 text-left">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Aciertos</span><span className="text-green-600 font-bold">{metrics.hits}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Fallos</span><span className="text-red-600 font-bold">{metrics.misses}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Precisión</span><span className="text-gray-900 font-bold">{metrics.accuracyPercent.toFixed(1)}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Tiempo total</span><span className="text-gray-900 font-bold">{(metrics.totalTimeMs / 1000).toFixed(2)} s</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Tiempo medio</span><span className="text-gray-900 font-bold">{metrics.avgTimeMs !== null ? `${metrics.avgTimeMs} ms` : '—'}</span></div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Sin resultados completados. El ejercicio se detuvo antes de completar el primer objetivo.
          </p>
        )}
      </ExerciseResultsCard>
    </div>,
    document.body
  )
}

function FeedbackScreen({ metrics, avgTime, onExit }: { metrics: ClickTargetMetrics; avgTime: number; onExit: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <Card className="p-8 max-w-md w-full text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">¡Completado!</h2>
        <div className="space-y-3 mb-8 text-left">
          <div className="flex justify-between text-base"><span className="text-gray-600">Objetivos presentados</span><span className="text-gray-900 font-bold">{metrics.totalClicks}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Aciertos</span><span className="text-green-600 font-bold">{metrics.hits}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Fallos</span><span className="text-red-600 font-bold">{metrics.errors}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Precisión</span><span className="text-gray-900 font-bold">{metrics.accuracyPercent.toFixed(1)}%</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Tiempo medio</span><span className="text-gray-900 font-bold">{avgTime} ms</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Tiempo total</span><span className="text-gray-900 font-bold">{(metrics.totalTimeMs / 1000).toFixed(2)} s</span></div>
        </div>
        <Button onClick={onExit} variant="primary" className="w-full px-6 py-2">Ver Resultados Completos</Button>
      </Card>
    </div>
  )
}

/** Boton "Ver/Ocultar desglose por objetivo" + tabla, compartido entre
 * ResultsScreen y StoppedScreen. Muestra Objetivo/Resultado/Tiempo para
 * cada ensayo registrado (TargetRecord ahora incluye `outcome`).
 *
 * Altura maxima + scroll INTERNO (max-h-48 overflow-y-auto): al abrirse,
 * nunca hace crecer la pagina contenedora - solo este bloque se desplaza
 * internamente si hay mas filas de las que caben. */
function TargetBreakdown({ targetLog }: { targetLog: TargetRecord[] }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <Button
        onClick={() => setShowBreakdown((o) => !o)}
        variant="secondary"
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm"
      >
        <ListIcon className="h-4 w-4" />
        {showBreakdown ? 'Ocultar desglose por objetivo' : 'Ver desglose por objetivo'}
      </Button>

      {showBreakdown && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Objetivo</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Resultado</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {targetLog.map((t) => (
                <tr key={t.targetNumber} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 text-gray-700">{t.targetNumber}</td>
                  <td className={`px-3 py-1.5 font-medium ${t.outcome === 'hit' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.outcome === 'hit' ? '✓ Acierto' : '✗ Fallo'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-700">{t.reactionTimeMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const METRIC_CARD_BG: Record<string, string> = {
  blue: 'bg-blue-50',
  gray: 'bg-gray-50',
  amber: 'bg-amber-50',
  green: 'bg-green-50',
  red: 'bg-red-50',
}
const METRIC_LABEL_COLOR: Record<string, string> = {
  blue: 'text-blue-700',
  gray: 'text-gray-600',
  amber: 'text-amber-700',
  green: 'text-green-700',
  red: 'text-red-700',
}
const METRIC_VALUE_COLOR: Record<string, string> = {
  blue: 'text-blue-600',
  gray: 'text-gray-900',
  amber: 'text-amber-600',
  green: 'text-green-600',
  red: 'text-red-600',
}

/** Tarjeta de metrica compacta, usada por ResultsScreen (grid 3x2) para
 * que las 6 metricas quepan en el viewport sin provocar scroll de pagina -
 * ver filosofia anti-scroll en el comentario de ResultsScreen. */
function MetricCard({ color, label, value }: { color: keyof typeof METRIC_CARD_BG; label: string; value: string | number }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${METRIC_CARD_BG[color]}`}>
      <p className={`text-xs ${METRIC_LABEL_COLOR[color]}`}>{label}</p>
      <p className={`text-lg font-bold sm:text-xl ${METRIC_VALUE_COLOR[color]}`}>{value}</p>
    </div>
  )
}

/** Vista principal de resultados: mismo componente compartido
 * (ExerciseResultsCard) que StoppedScreen mas arriba, y que Reaction
 * Time/Visual Memory - misma estructura/acciones/boton de salida en
 * resultados normales y parciales, en los 3 ejercicios. Envuelto en flex
 * centrado porque esta pantalla es inline en la pagina (no un portal como
 * StoppedScreen). El desglose (ver TargetBreakdown) permanece colapsado
 * por defecto y usa su propio scroll interno cuando se abre. */
function ResultsScreen({ metrics, avgTime, targetLog, onRepeat, onReconfigure, onBeforeExit, onSave, saveState, saveError }: {
  metrics: ClickTargetMetrics; avgTime: number; targetLog: TargetRecord[]
  onRepeat: () => void; onReconfigure: () => void; onBeforeExit?: () => void | Promise<void>
  onSave?: () => void; saveState?: ExerciseSaveState; saveError?: string | null
}) {
  return (
    <div className="flex flex-col items-center">
      <ExerciseResultsCard
        title="Resultados"
        onRepeat={onRepeat}
        onReconfigure={onReconfigure}
        onBeforeExit={onBeforeExit}
        onSave={onSave}
        saveState={saveState}
        saveError={saveError}
        breakdown={<TargetBreakdown targetLog={targetLog} />}
      >
        <div className="grid grid-cols-3 gap-2">
          <MetricCard color="blue" label="Tiempo Total" value={`${(metrics.totalTimeMs / 1000).toFixed(2)}s`} />
          <MetricCard color="gray" label="Tiempo Medio" value={`${avgTime} ms`} />
          <MetricCard color="gray" label="Objetivos" value={metrics.totalClicks} />
          <MetricCard color="amber" label="Precisión" value={`${metrics.accuracyPercent.toFixed(1)}%`} />
          <MetricCard color="green" label="Aciertos" value={metrics.hits} />
          <MetricCard color="red" label="Fallos" value={metrics.errors} />
        </div>
      </ExerciseResultsCard>
    </div>
  )
}
