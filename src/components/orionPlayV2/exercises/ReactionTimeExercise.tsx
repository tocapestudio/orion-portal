'use client'

/**
 * Copia de ReactionTimeExercise.tsx de ORION Play V.2. Adaptaciones
 * respecto al original (unicamente las imprescindibles para compilar en
 * el namespace orionPlayV2 del Portal; la logica no se ha tocado):
 * - imports de '@/lib/types', '@/components/ui/Card', '@/components/ui/Button'
 *   y '@/lib/hooks' -> rutas relativas dentro de orionPlayV2 ('../lib/types',
 *   '../ui/Card', '../ui/Button', '../lib/hooks').
 * - los 5 iconos de '@heroicons/react/24/outline' (PlayIcon, Cog6ToothIcon,
 *   XMarkIcon, ArrowPathIcon, ArrowLeftIcon) sustituidos por SVG inline
 *   equivalentes, porque el Portal no tiene @heroicons/react instalado
 *   (mismo motivo y mismo criterio ya aplicado en exercise-runner/ResultSummary.tsx
 *   para ChartBarIcon).
 * - `useRouter().push('/exercises')` se conserva literal: el Portal no
 *   tiene (todavia) una ruta equivalente a V.2's /exercises. No se ha
 *   adaptado porque no impide compilar (no hay typedRoutes activado en
 *   next.config.ts), solo producira un 404 en runtime si se llega a
 *   pulsar "Volver" - exactamente igual de roto que en el original V.2
 *   fuera de su propio proyecto.
 *
 * Todo lo demas -configuracion totalTrials/goRatio, useExerciseFlow,
 * fullscreen, ReadyScreen, RunningScreen, FeedbackScreen, ResultsScreen,
 * storageKey 'reactionTime_defaults', mecanica Go/No-Go, temporizacion
 * (WAIT_MIN_MS/WAIT_MAX_MS/GO_STIMULUS_TIMEOUT_MS/NO_GO_DISPLAY_MS/RESULT_DISPLAY_MS),
 * calculo de metricas, textos, abortRef, handleRestart- es literal al
 * original. No se conecta onPersist ni ninguna persistencia aqui.
 *
 * NOTA sobre lint (react-hooks/refs, desactivada para todo el archivo):
 * useExerciseFlow devuelve, en el mismo objeto, tanto refs (fullscreenRef,
 * abortRef, configRef) como estado normal (config, metricsResult, stage...).
 * El linter nuevo de React (react-hooks/refs) no distingue el origen de
 * cada propiedad leida de `flow` dentro del render y marca como error casi
 * cualquier uso de `flow.*` en el JSX, incluida la asignacion legitima
 * `ref={flow.fullscreenRef}` y la lectura de `avgReactionTime` (que ya en
 * el V.2 original se calcula leyendo reactionTimesRef.current durante el
 * render). Corregir esto exigiria reescribir el patron de useExerciseFlow
 * o el de este componente, algo que esta fase explicitamente no debe
 * hacer. Se desactiva la regla para todo el archivo en vez de linea por
 * linea porque las apariciones son demasiado numerosas y todas tienen el
 * mismo origen.
 */
/* eslint-disable react-hooks/refs */

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactionTimeMetrics } from '../lib/types'
import Card from '../ui/Card'
import Button from '../ui/Button'
import ExerciseStopButton from '../ui/ExerciseStopButton'
import ExerciseResultsCard from '../ui/ExerciseResultsCard'
import type { ExerciseSaveState } from '../ui/ExerciseSaveButton'
import SpacebarHint from '../ui/SpacebarHint'
import { useExerciseFlow } from '../lib/hooks'
import type { ExerciseOutcome } from '../exercise-runner/ExerciseRunner'
import { BACKGROUND_HEX, applyContrast } from '../lib/contrast'

// ============ ICONOS (inline SVG, equivalentes a @heroicons/react/24/outline) ============

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

// ============ TIPOS Y CONSTANTES ============

const STORAGE_KEY = 'reactionTime_defaults'
const GO_STIMULUS_TIMEOUT_MS = 1000
const NO_GO_DISPLAY_MS = 1500
const RESULT_DISPLAY_MS = 800

type TrialState = 'waiting' | 'go' | 'no-go' | 'result'
type EndMode = 'repetitions' | 'time'
type GoDistribution = 'fixed' | 'random'

/** Genera una secuencia de `total` booleanos (true = GO) con exactamente
 * round(total*ratio) GO, barajada con Fisher-Yates. Pura: no toca refs ni
 * estado, se recalcula en cada llamada a runExercise (cada ejecucion,
 * incluido "Repetir", obtiene un orden nuevo). */
function buildFixedSequence(total: number, ratio: number): boolean[] {
  const goCount = Math.min(total, Math.max(0, Math.round(total * ratio)))
  const sequence = Array.from({ length: total }, (_, i) => i < goCount)
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = sequence[i]
    sequence[i] = sequence[j]
    sequence[j] = tmp
  }
  return sequence
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} s`
  if (s === 0) return `${m} min`
  return `${m} min ${s} s`
}

/** Presets rapidos de duracion total del ejercicio (modo "Por tiempo"),
 * mostrados como fila de accesos directos + stepper de +/-15s. Es la
 * duracion TOTAL del ejercicio (cfg.durationSeconds, usada como deadline
 * en runExercise) - no tiene relacion con intervalMinMs/intervalMaxMs
 * (intervalo entre estimulos), que no se toca en esta fase. */
const QUICK_DURATION_PRESETS = [15, 30, 45, 60, 120, 180, 300]

/** Exitos = clic correcto en GO + no-clic correcto en NO-GO. Fallos =
 * omision en GO (miss) + clic incorrecto en NO-GO (falsa alarma). Ambos
 * se derivan de los mismos campos que ya existen en ReactionTimeMetrics/
 * PartialMetrics - ninguna formula interna nueva, solo una presentacion
 * distinta de los mismos datos (Exitos + Fallos = total de trials
 * resueltos, por construccion: misses+falseAlarms son los unicos
 * desenlaces "fallidos" posibles). */
function computeOutcomeSummary(totalTrials: number, misses: number, falseAlarms: number) {
  const failures = misses + falseAlarms
  const successes = Math.max(0, totalTrials - failures)
  return { successes, failures }
}

/** Paleta propia de colores GO/NO-GO (sustituye a <input type="color">).
 * Incluye alternativas a verde/rojo (azul, ambar, violeta, etc.) para
 * personas con dificultades de discriminacion cromatica. Puramente
 * visual - no afecta a ninguna metrica ni a la logica Go/No-Go. */
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
          aria-pressed={value.toLowerCase() === color.toLowerCase()}
          onClick={() => onChange(color)}
          className={`h-6 w-6 rounded-full border-2 transition-transform ${
            value.toLowerCase() === color.toLowerCase() ? 'border-orion-navy-700 scale-110' : 'border-white hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

/** Registro de un unico trial resuelto, para el desglose "Ver desglose
 * por intento" de la pantalla de Resultados. reactionTimeMs es null
 * cuando no hubo respuesta - nunca se calcula un tiempo ficticio: para
 * un NO-GO correcto (no se pulso, que es lo correcto) siempre es null;
 * para un GO fallado (miss, no se pulso a tiempo) tambien es null; solo
 * lleva numero los GO correctos y las falsas alarmas NO-GO (ambos casos
 * son clics reales, con su propio tiempo transcurrido desde que aparecio
 * el estimulo). Puramente local a este componente - no se anade a
 * ReactionTimeMetrics (no se persiste, no se envia a onComplete/Core). */
interface TrialRecord {
  trialNumber: number
  signal: 'go' | 'no-go'
  outcome: 'success' | 'failure'
  reactionTimeMs: number | null
}

/** Snapshot de metricas parciales, tomado en el instante en que el
 * usuario pulsa "Salir y detener ejercicio". No es parte de
 * ReactionTimeMetrics (ese tipo sigue representando solo la finalizacion
 * normal, sin tocar): es puramente local a esta pantalla de parada. */
interface PartialMetrics {
  completedTrials: number
  /** Necesario para decidir si "totalConfigured" tiene sentido al
   * mostrar la pantalla de parada: en modo 'time' no hay un objetivo de
   * repeticiones fijo, asi que no se muestra "de Y". */
  endMode: EndMode
  totalConfigured: number
  accuracyPercent: number
  avgReactionTime: number | null
  correctResponses: number
  falseAlarms: number
  misses: number
}

interface ExerciseConfig {
  /** Como termina el ejercicio: numero de intentos fijo, o duracion. */
  endMode: EndMode
  totalTrials: number
  /** Solo relevante si endMode === 'time'. */
  durationSeconds: number
  /** 'fixed': exactamente round(totalTrials*goRatio) GO, orden barajado
   * (Fisher-Yates) en cada ejecucion - respeta goRatio. 'random': cada
   * trial decide independientemente con 50%/50% fijo, SIN usar goRatio
   * (ni cuota, ni alternancia, ni correccion por lo ya salido - pueden
   * salir rachas desiguales). Forzado a 'random' cuando endMode === 'time'
   * (no hay numero de trials fijo sobre el que repartir una cuota). */
  goDistribution: GoDistribution
  goRatio: number
  /** Intervalo entre el final de un trial y la aparicion del siguiente
   * estimulo (no confundir con GO_STIMULUS_TIMEOUT_MS/NO_GO_DISPLAY_MS,
   * que son propios del estimulo en si). Sustituyen a las constantes de
   * archivo WAIT_MIN_MS/WAIT_MAX_MS que existian antes de esta fase. */
  intervalMinMs: number
  intervalMaxMs: number
  /** Color del estimulo GO. Ortogonal a las metricas: no afecta a
   * reactionTimes/correctResponses/falseAlarms/misses/accuracyPercent,
   * solo a la representacion visual. */
  goColor: string
  /** Color del estimulo NO GO. Mismo criterio que goColor. */
  noGoColor: string
  /** Nuevo en esta fase. UN unico valor compartido por ambos colores
   * (goColor y noGoColor), no uno por cada uno - ver displayGoColor/
   * displayNoGoColor mas abajo y el razonamiento completo junto a su
   * calculo. Mismo significado matematico/rango que los demas ejercicios
   * (ver lib/contrast.ts): 100 = colores elegidos sin mezclar, valores
   * menores los acercan a BACKGROUND_HEX. Campo requerido en el TIPO,
   * igual que el resto de ExerciseConfig - una config antigua sin este
   * campo lo recibe de DEFAULT_CONFIG via el merge que ya hace
   * useExerciseFlow, sin necesitar el mecanismo de version (ese es
   * especifico de goColor/noGoColor, ver REACTION_TIME_COLOR_DEFAULTS_VERSION). */
  contrastPercent: number
  /** Si es false, RunningScreen no muestra el tiempo/✓/✕ tras resolver
   * un trial - en su lugar se ve la misma cruz de fijacion que durante
   * la espera. Puramente de presentacion: trialState, timings,
   * clickedRef, el registro de trials y todas las metricas siguen
   * calculandose exactamente igual, se oculten o no en pantalla. */
  showFeedback: boolean
  /** Opcional (ausente en cualquier config guardada antes de este campo
   * existir - ver REACTION_TIME_COLOR_DEFAULTS_VERSION mas abajo).
   * Marca si goColor/noGoColor ya pasaron por la migracion a los nuevos
   * valores por defecto (verde/rojo) - no es una preferencia en si misma,
   * es un sello de "esta pareja de colores ya es intencional, no un
   * resto de un default antiguo". */
  colorDefaultsVersion?: number
}

/** Todos los valores por defecto reproducen exactamente el
 * comportamiento ya validado antes de esta fase (20 intentos,
 * distribucion aleatoria equivalente al Math.random()<goRatio previo,
 * intervalo 1500-3000ms identico a las constantes que sustituyen, verde/
 * rojo). Una config antigua guardada en localStorage sin estos campos
 * los recibe automaticamente via el merge `{...defaultConfig,
 * ...validated}` que ya hace useExerciseFlow al cargar - no ha hecho
 * falta tocar ese hook. */
/** Se incrementa UNICAMENTE si algun dia se vuelve a cambiar cual es el
 * par de colores por defecto de GO/NO-GO. Ver REACTION_TIME_COLOR_DEFAULTS_VERSION
 * y validateReactionTimeConfig mas abajo para el motivo completo. */
const REACTION_TIME_COLOR_DEFAULTS_VERSION = 1

const DEFAULT_CONFIG: ExerciseConfig = {
  endMode: 'repetitions',
  totalTrials: 20,
  durationSeconds: 120,
  goDistribution: 'random',
  goRatio: 0.7,
  intervalMinMs: 1500,
  intervalMaxMs: 3000,
  goColor: '#22c55e',
  noGoColor: '#ef4444',
  contrastPercent: 100,
  showFeedback: true,
  colorDefaultsVersion: REACTION_TIME_COLOR_DEFAULTS_VERSION,
}

/** Primer intento de correccion (insuficiente, se deja documentado el
 * motivo): esto solo reemplaza un valor que no coincide con NINGUNO de
 * los 10 de COLOR_PALETTE. El bug real resulto ser otro: un valor
 * guardado en localStorage de ANTES de fijar "verde/rojo" como default
 * (p.ej. '#06b6d4', turquesa - que SI es uno de los 10, solo que no es
 * el que ahora queremos de default) pasa esta comprobacion sin problema,
 * porque "es un color valido de la paleta" no es lo mismo que "es el
 * default correcto". Por eso NO-GO seguia cargando turquesa pese a esta
 * funcion: el valor guardado nunca se considero invalido. Se mantiene
 * como red de seguridad para valores que de verdad no esten en la
 * paleta (p.ej. de un <input type="color"> de una version aun mas
 * antigua). */
function normalizePaletteColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const match = COLOR_PALETTE.find((c) => c.toLowerCase() === value.toLowerCase())
  return match ?? fallback
}

/** Correccion real: una config guardada ANTES de que goColor/noGoColor
 * llevaran `colorDefaultsVersion` (es decir, cualquier config guardada
 * antes de este cambio) nunca puede "ganarle" al nuevo default por
 * casualidad de que su color antiguo tambien exista en la paleta - se
 * fuerza aqui UNA VEZ a los valores actuales (verde/rojo),
 * independientemente de que el valor guardado fuera o no un color
 * valido de la paleta. A partir de ahi la config en memoria (y la que se
 * guarde despues via "Guardar como predeterminado", que serializa este
 * mismo objeto) ya lleva colorDefaultsVersion al dia - un cambio de
 * color que el usuario elija DESPUES de este fix se respeta y no se
 * vuelve a forzar. No se toca ningun otro campo de la config (totalTrials,
 * goRatio, endMode...), ni se borra nada de localStorage - solo se
 * transforma lo que se carga en memoria en este load concreto. */
function validateReactionTimeConfig(config: ExerciseConfig): ExerciseConfig {
  const hasCurrentColorDefaults = config.colorDefaultsVersion === REACTION_TIME_COLOR_DEFAULTS_VERSION
  return {
    ...config,
    goColor: hasCurrentColorDefaults
      ? normalizePaletteColor(config.goColor, DEFAULT_CONFIG.goColor)
      : DEFAULT_CONFIG.goColor,
    noGoColor: hasCurrentColorDefaults
      ? normalizePaletteColor(config.noGoColor, DEFAULT_CONFIG.noGoColor)
      : DEFAULT_CONFIG.noGoColor,
    colorDefaultsVersion: REACTION_TIME_COLOR_DEFAULTS_VERSION,
  }
}

// ============ COMPONENTE PRINCIPAL ============

interface ReactionTimeExerciseProps {
  onComplete: (metrics: ReactionTimeMetrics, outcome?: ExerciseOutcome, idempotencyKey?: string, effectiveConfig?: Record<string, unknown>) => Promise<void>
  /** Si hay un deportista real seleccionado (no modo demo) - ver
   * ReactionTimeV2Runner.tsx, misma condicion que decide si se cablea
   * onPersist. Controla si se muestra "Guardar resultados" y si "Repetir"
   * avisa antes de perder resultados sin guardar: en demo nunca hay nada
   * que guardar de verdad, asi que ninguno de los dos aplica. */
  canPersist?: boolean
  /** De ExerciseRunner.tsx (ver ese archivo) - se usa para decir "si se
   * pulsa Espacio, arranca el ejercicio" SOLO mientras flow.stage==='config'
   * (ver el useEffect mas abajo que lo registra/desregistra). */
  registerSpacebarStart?: (handler: (() => void) | null) => void
}

export default function ReactionTimeExercise({ onComplete, canPersist = false, registerSpacebarStart }: ReactionTimeExerciseProps) {
  const flow = useExerciseFlow<ExerciseConfig, ReactionTimeMetrics>({
    storageKey: STORAGE_KEY,
    defaultConfig: DEFAULT_CONFIG,
    onComplete,
    validateConfig: validateReactionTimeConfig,
  })

  // Estado especifico
  const [trialState, setTrialState] = useState<TrialState>('waiting')
  const [currentTrial, setCurrentTrial] = useState(0)
  const [lastReactionTime, setLastReactionTime] = useState<number | null>(null)
  const [lastTrialResult, setLastTrialResult] = useState<'correct' | 'false-alarm' | 'miss' | null>(null)

  // Estado de la parada voluntaria ("Salir y detener ejercicio"). Local a
  // este componente: flow.stage permanece en 'running' todo el tiempo,
  // no se toca useExerciseFlow para nada de esto.
  const [stoppedEarly, setStoppedEarly] = useState(false)
  const [partialMetrics, setPartialMetrics] = useState<PartialMetrics | null>(null)

  // Estado de "Guardar resultados" (boton que guarda sin salir - ver
  // ExerciseSaveButton.tsx). Se resetea a 'idle' en cada ejecucion nueva
  // (handleOpenFullscreen). handleExit (compartido con "Salir a ORION
  // Play") es quien lo gestiona de verdad - este estado solo reflexiona
  // visualmente lo que ya hace esa funcion.
  const [saveState, setSaveState] = useState<ExerciseSaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Refs especificos
  const stimulusStartRef = useRef<number>(0)
  const clickedRef = useRef(false)
  const reactionTimesRef = useRef<number[]>([])
  const correctResponsesRef = useRef(0)
  const falseAlarmsRef = useRef(0)
  const missesRef = useRef(0)
  const noGoTrialsRef = useRef(0)
  // Registro por-intento para "Ver desglose por intento" (Resultados).
  // Se empuja exactamente en los mismos puntos donde ya se incrementan
  // los contadores agregados de arriba - ningun punto de control nuevo,
  // ninguna formula agregada tocada.
  const trialLogRef = useRef<TrialRecord[]>([])
  // Numero de trial actual, en ref (no en el estado `currentTrial`) para
  // poder leerlo de forma fiable desde handleClick sin depender de que
  // ese callback se haya vuelto a crear con el valor mas reciente.
  const currentTrialRef = useRef(0)
  // Ref local y propia de este componente (no es flow.abortRef: ese lo
  // devuelve useExerciseFlow y el linter no permite mutarlo fuera del
  // propio hook). runExercise la comprueba junto a flow.abortRef en cada
  // punto de control para detenerse sin iniciar un nuevo trial.
  const stopRequestedRef = useRef(false)

  // Una clave nueva por ejecucion (generada al abrir fullscreen/comenzar,
  // antes de cualquier trial), reenviada tal cual a onComplete en
  // handleExit - incluso si el usuario reintenta "Salir" tras un error de
  // guardado, se reutiliza la MISMA clave de esa ejecucion (no se
  // regenera hasta la siguiente vez que se abra fullscreen), para que el
  // reintento sea detectable como la misma operacion en el servidor (ver
  // actions.ts).
  const idempotencyKeyRef = useRef('')

  // Captura de la configuracion EFECTIVA de esta ejecucion (fiabilidad de
  // datos, Fase A): snapshot inmutable de flow.configRef.current, tomado
  // en el MISMO instante que idempotencyKeyRef (en handleOpenFullscreen,
  // antes de cualquier trial) - nunca se vuelve a leer flow.config/
  // flow.configRef despues de ese punto para rellenar esto, asi que un
  // cambio posterior en ConfigScreen (ya inaccesible mientras dura esta
  // ejecucion - stage solo vuelve a 'config' cuando ya no hay una
  // ejecucion en curso, ver handleReconfigure) nunca podria alterar
  // retroactivamente lo que ESTA ejecucion realmente uso. Sobrevive
  // intacta a una finalizacion anticipada (handleStopEarly no la toca,
  // stoppedEarly/partialMetrics son estado distinto) porque solo se
  // reescribe en la SIGUIENTE llamada a handleOpenFullscreen, nunca antes.
  // Puramente en memoria - todavia no se envia a ningun sitio ni se anade
  // a ReactionTimeMetrics (eso es Fase B, no autorizada aqui).
  const effectiveConfigRef = useRef<ExerciseConfig>(DEFAULT_CONFIG)

  const resetMetrics = useCallback(() => {
    reactionTimesRef.current = []
    correctResponsesRef.current = 0
    falseAlarmsRef.current = 0
    missesRef.current = 0
    noGoTrialsRef.current = 0
    trialLogRef.current = []
  }, [])

  const handleOpenFullscreen = useCallback(async () => {
    resetMetrics()
    idempotencyKeyRef.current = crypto.randomUUID()
    effectiveConfigRef.current = { ...flow.configRef.current }
    setCurrentTrial(0)
    setLastReactionTime(null)
    setLastTrialResult(null)
    setTrialState('waiting')
    setStoppedEarly(false)
    setPartialMetrics(null)
    setSaveState('idle')
    setSaveError(null)
    stopRequestedRef.current = false
    await flow.handleOpenFullscreen()
  }, [flow, resetMetrics])

  const runExercise = useCallback(async () => {
    const cfg = flow.configRef.current
    const totalTrials = cfg.totalTrials
    // goRatio SOLO se usa para 'fixed' (via buildFixedSequence, mas
    // abajo). 'random' ya NO lo usa en absoluto: cada estimulo se decide
    // con 50% GO / 50% NO GO fijo, independiente del valor configurado en
    // goRatio (ver `isGo` mas abajo) - goRatio se conserva en la config/
    // localStorage sin cambios, simplemente deja de leerse para generar
    // la secuencia en este modo.
    const goRatio = cfg.goRatio
    // Defensivo: 'fixed' exige conocer el numero de trials de antemano,
    // algo que no existe en modo 'time'. La UI ya fuerza 'random' al
    // seleccionar "Por tiempo" (y deshabilita "Fija"), esto es solo una
    // segunda red de seguridad por si config quedase en un estado
    // inconsistente (p.ej. editado a mano en localStorage).
    const effectiveDistribution: GoDistribution = cfg.endMode === 'time' ? 'random' : cfg.goDistribution
    // 'fixed': buildFixedSequence garantiza EXACTAMENTE round(totalTrials*goRatio)
    // GO, orden barajado (Fisher-Yates) - sin cambios.
    // 'random': ya no se precalcula ninguna secuencia (sequence=null) -
    // cada trial decide su propio isGo mas abajo, en el momento, sin
    // cuota ni memoria de los estimulos anteriores.
    const sequence = effectiveDistribution === 'fixed' ? buildFixedSequence(totalTrials, goRatio) : null
    const intervalLo = Math.min(cfg.intervalMinMs, cfg.intervalMaxMs)
    const intervalHi = Math.max(cfg.intervalMinMs, cfg.intervalMaxMs)
    const deadline = cfg.endMode === 'time' ? performance.now() + cfg.durationSeconds * 1000 : null

    let trial = 0
    while (true) {
      if (flow.abortRef.current || stopRequestedRef.current) return
      if (cfg.endMode === 'repetitions' && trial >= totalTrials) break
      if (deadline !== null && performance.now() >= deadline) break

      setCurrentTrial(trial)
      currentTrialRef.current = trial
      setTrialState('waiting')
      setLastReactionTime(null)
      setLastTrialResult(null)
      clickedRef.current = false

      const waitTime = intervalLo + Math.random() * (intervalHi - intervalLo)
      await flow.sleep(waitTime)
      if (flow.abortRef.current || stopRequestedRef.current) return
      if (deadline !== null && performance.now() >= deadline) break

      // 'fixed': toma el valor ya decidido de antemano en `sequence`
      // (cuota exacta, orden barajado). 'random': se decide AQUI, en el
      // momento, sin mirar nada de lo anterior ni ninguna cuota - 50/50
      // fijo, no goRatio. Cada llamada a Math.random() es independiente
      // de la anterior por definicion: nada en este bloque recuerda
      // cuantos GO/NO-GO han salido hasta ahora, asi que pueden salir
      // rachas desiguales (varios GO seguidos, o varios NO-GO seguidos)
      // sin ninguna correccion que las evite.
      const isGo = sequence ? sequence[trial] : Math.random() < 0.5

      if (isGo) {
        setTrialState('go')
        stimulusStartRef.current = performance.now()

        await flow.sleep(GO_STIMULUS_TIMEOUT_MS)
        if (flow.abortRef.current || stopRequestedRef.current) return
        if (deadline !== null && performance.now() >= deadline) break

        if (!clickedRef.current) {
          missesRef.current += 1
          trialLogRef.current.push({ trialNumber: trial + 1, signal: 'go', outcome: 'failure', reactionTimeMs: null })
          setLastTrialResult('miss')
          setTrialState('result')
          await flow.sleep(RESULT_DISPLAY_MS)
        }
      } else {
        setTrialState('no-go')
        // Igual que en la rama GO: necesario para poder calcular, en
        // handleClick, cuanto tardo en pulsar si el usuario comete una
        // falsa alarma (antes esta ref solo se actualizaba para GO).
        stimulusStartRef.current = performance.now()

        await flow.sleep(NO_GO_DISPLAY_MS)
        if (flow.abortRef.current || stopRequestedRef.current) return
        if (deadline !== null && performance.now() >= deadline) break

        if (!clickedRef.current) {
          // noGoTrialsRef solo se incrementa aqui, al resolverse como
          // "correcto por timeout" - no al mostrar el estimulo. El otro
          // desenlace posible (falsa alarma) lo incrementa handleClick.
          // Resultado final idéntico al de antes en una ejecucion
          // completa (todo NO-GO termina resuelto de una forma u otra),
          // pero ahora completedTrials (parada voluntaria o fin por
          // tiempo) no cuenta un NO-GO todavia pendiente de respuesta.
          noGoTrialsRef.current += 1
          // Sin respuesta: correcto por definicion en NO-GO, nunca se
          // inventa un tiempo de reaccion.
          trialLogRef.current.push({ trialNumber: trial + 1, signal: 'no-go', outcome: 'success', reactionTimeMs: null })
          setLastTrialResult('correct')
          setTrialState('result')
          await flow.sleep(RESULT_DISPLAY_MS)
        }
      }

      if (flow.abortRef.current || stopRequestedRef.current) return
      if (deadline !== null && performance.now() >= deadline) break
      trial++
    }

    // completedTrials (no `totalTrials` configurado) es el denominador
    // correcto en ambos modos: en 'repetitions' coincide siempre con
    // totalTrials cuando se llega aqui sin abortar (todo trial
    // configurado queda resuelto), asi que el resultado es identico al
    // de antes de esta fase; en 'time' es el unico valor con sentido,
    // ya que no hay un objetivo de repeticiones fijo.
    const completedTrials = correctResponsesRef.current + missesRef.current + noGoTrialsRef.current
    const correctNoGo = noGoTrialsRef.current - falseAlarmsRef.current
    const accuracyPercent = completedTrials > 0
      ? ((correctResponsesRef.current + Math.max(0, correctNoGo)) / completedTrials) * 100
      : 0

    flow.setMetricsResult({
      reactionTimes: [...reactionTimesRef.current],
      correctResponses: correctResponsesRef.current,
      falseAlarms: falseAlarmsRef.current,
      misses: missesRef.current,
      totalTrials: completedTrials,
      accuracyPercent: Math.min(100, accuracyPercent),
    })
    flow.setStage('feedback')
  }, [flow])

  const handleStartExercise = useCallback(() => {
    flow.handleStartExercise()
    runExercise()
  }, [flow, runExercise])

  // Respuesta a un estimulo (clic o, mas abajo, Espacio): acierto GO,
  // falsa alarma NO-GO, o no-op si no hay ensayo activo (trialState
  // 'waiting'/'result') o si el ensayo actual ya tiene respuesta
  // (clickedRef.current). Unica implementacion de esta logica - tanto
  // RunningScreen (onClick, mas abajo) como el registro de Espacio
  // (handleClickRef, justo despues) llaman a esta misma funcion, nunca a
  // una copia.
  const handleClick = useCallback(() => {
    if (flow.stage !== 'running' || clickedRef.current) return

    if (trialState === 'go') {
      clickedRef.current = true
      const elapsed = Math.round(performance.now() - stimulusStartRef.current)
      setLastReactionTime(elapsed)
      reactionTimesRef.current.push(elapsed)
      correctResponsesRef.current += 1
      trialLogRef.current.push({ trialNumber: currentTrialRef.current + 1, signal: 'go', outcome: 'success', reactionTimeMs: elapsed })
      setLastTrialResult('correct')
      setTrialState('result')
    } else if (trialState === 'no-go') {
      clickedRef.current = true
      const elapsed = Math.round(performance.now() - stimulusStartRef.current)
      falseAlarmsRef.current += 1
      noGoTrialsRef.current += 1 // resuelto como falsa alarma: cuenta como completado
      trialLogRef.current.push({ trialNumber: currentTrialRef.current + 1, signal: 'no-go', outcome: 'failure', reactionTimeMs: elapsed })
      setLastTrialResult('false-alarm')
      setTrialState('result')
    }
  }, [flow.stage, trialState])

  // Inicio con barra espaciadora (ver ExerciseRunner.tsx para el
  // mecanismo compartido): una pulsacion de Espacio tiene una unica
  // funcion segun la pantalla activa (flow.stage) -
  //   'config' -> handleOpenFullscreen, igual que "Iniciar Ejercicio".
  //   'fullscreen-ready' -> handleStartExercise, igual que "Comenzar" en
  //     ReadyScreen (ver mas abajo, onStart={handleStartExercise}).
  //   'running' && !stoppedEarly -> handleClick, igual que el clic en
  //     RunningScreen (responde al ensayo activo si lo hay; si no hay
  //     ensayo activo, handleClick ya es un no-op por si mismo - ver mas
  //     arriba). Se excluye explicitamente stoppedEarly: flow.stage se
  //     queda en 'running' incluso despues de "Detener y ver resultados"
  //     (esa parada es un booleano local, no un cambio de stage - ver
  //     handleStopEarly), y en ese momento ya NO se muestra RunningScreen
  //     sino StoppedScreen, que no tiene clic de pantalla completa. Sin
  //     esta exclusion, Espacio podria registrar una respuesta fantasma
  //     en StoppedScreen si se detuvo el ejercicio con un estimulo GO/NO-GO
  //     todavia visible.
  //   cualquier otro caso (feedback/finished, o running con stoppedEarly)
  //   -> null, no hace nada.
  // Se desregistra en cualquier otro momento y al desmontarse.
  //
  // handleOpenFullscreenRef/handleStartExerciseRef/handleClickRef guardan
  // siempre la version mas reciente de cada handler SIN que el efecto de
  // abajo dependa de ninguno de los tres directamente. Motivo (bug real
  // encontrado al probar en navegador, ya corregido una vez para
  // handleOpenFullscreen): useExerciseFlow devuelve un objeto `flow`
  // nuevo (literal, sin useMemo) en cada render, asi que cualquier
  // useCallback que dependa de `flow` entero - incluido handleStartExercise,
  // deps [flow, runExercise] - tambien cambia de identidad en cada render,
  // no solo cuando cambia el stage. handleClick no depende de `flow`
  // entero (solo de flow.stage, primitivo) pero SI depende de trialState,
  // que cambia varias veces por ensayo - tambien inestable para este
  // efecto. Si el efecto de registro dependiera de estas funciones
  // directamente, reabriria el mismo bucle infinito de renders ya
  // diagnosticado (registerSpacebarStart -> setState en ExerciseRunner ->
  // re-render -> children(...) se vuelve a llamar -> este componente se
  // re-renderiza -> nueva identidad otra vez -> bucle sin fin, o como
  // minimo un registro innecesario en cada cambio de trialState). Por eso
  // el efecto SOLO depende de flow.stage y stoppedEarly (ambos valores
  // primitivos: solo cambian en transiciones reales) y de
  // registerSpacebarStart (estable) - nunca de los tres handlers.
  const handleOpenFullscreenRef = useRef(handleOpenFullscreen)
  handleOpenFullscreenRef.current = handleOpenFullscreen
  const handleStartExerciseRef = useRef(handleStartExercise)
  handleStartExerciseRef.current = handleStartExercise
  const handleClickRef = useRef(handleClick)
  handleClickRef.current = handleClick

  useEffect(() => {
    if (!registerSpacebarStart) return
    if (flow.stage === 'config') {
      registerSpacebarStart(() => handleOpenFullscreenRef.current())
    } else if (flow.stage === 'fullscreen-ready') {
      registerSpacebarStart(() => handleStartExerciseRef.current())
    } else if (flow.stage === 'running' && !stoppedEarly) {
      registerSpacebarStart(() => handleClickRef.current())
    } else {
      registerSpacebarStart(null)
    }
    return () => registerSpacebarStart(null)
  }, [registerSpacebarStart, flow.stage, stoppedEarly])

  // "Cambiar configuracion" en la pantalla de resultados: vuelve a
  // ConfigScreen (donde se puede editar intentos/ratio/colores) sin pasar
  // por onComplete. Es exactamente el mismo handler que ya existia en
  // este archivo (antes llamado handleRestart, mal nombrado respecto a lo
  // que realmente hacia - esto no es "repetir", es "ir a configurar").
  //
  // Mismo aviso que handleRepeat, mismo motivo (ver ese comentario): si
  // hay una ejecucion real (canPersist) todavia sin guardar
  // (saveState!=='saved'), cambiar de pantalla la descartaria sin mas -
  // se confirma antes. Si ya esta guardada, o es demo, no hay nada que
  // perder y se entra directo a ConfigScreen, igual que antes de este
  // cambio. Reutiliza el mismo saveState que ya gestiona handleExit/
  // "Guardar resultados" - no hay un segundo mecanismo de persistencia
  // ni de seguimiento de "guardado o no".
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

  // "Repetir" en la pantalla de resultados: vuelve a ejecutar
  // inmediatamente con la MISMA config ya cargada en memoria (flow.config
  // no se toca en ningun momento de este camino), encadenando los dos
  // pasos que ya existian para arrancar manualmente (abrir fullscreen +
  // comenzar) sin pasar por ConfigScreen ni por onComplete.
  // handleOpenFullscreen ya genera una idempotencyKey NUEVA y limpia
  // partialMetrics/saveState - cada repeticion es una ejecucion propia,
  // nunca se confunde con la anterior ni la sobrescribe.
  //
  // Antes de descartar una ejecucion con resultados reales (canPersist)
  // que todavia no se ha guardado explicitamente (saveState!=='saved'),
  // se avisa - minimo indispensable: un confirm nativo, nada mas, y solo
  // cuando de verdad habria algo que perder. Si ya esta guardada, o si es
  // demo (canPersist=false, nunca hay nada que guardar), repetir sigue
  // siendo instantaneo, sin preguntar nada.
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

  // Pasa de 'feedback' a 'finished' (muestra ResultsScreen) SIN llamar a
  // onComplete todavia - a diferencia de flow.handleExitFeedback (que si
  // lo llama). Es deliberado: si onComplete se disparase aqui, el
  // ExerciseRunner desmontaria este componente de inmediato (ver
  // diagnóstico) y ResultsScreen nunca llegaria a verse.
  const handleShowResults = useCallback(() => {
    flow.exitFullscreen()
    flow.setStage('finished')
  }, [flow])

  // Guarda la ejecucion actual (normal o interrumpida) - COMPARTIDO entre
  // "Guardar resultados" (no navega) y "Salir a ORION Play" (navega
  // despues, via ExerciseExitButton.tsx que espera esta promesa). Una
  // sola implementacion de guardado, dos puntos desde los que se llama.
  //
  // Si ya esta 'saved', no hace nada: un segundo guardado explicito (o un
  // "Salir" posterior a un "Guardar resultados" ya exitoso) no repite la
  // llamada de red - ya sabemos que esta guardado. Esto es ademas de la
  // idempotencia del lado servidor (actions.ts), no en su lugar: cubre el
  // caso comun sin ni siquiera un viaje de ida y vuelta.
  //
  // Caso interrumpido: partialMetrics (ver handleStopEarly) ya tiene
  // exactamente los mismos agregados que ReactionTimeMetrics necesita
  // (correctResponses/falseAlarms/misses/accuracyPercent), solo con otro
  // nombre para completedTrials/totalTrials - se reconstruye aqui el
  // objeto con la forma persistible, sin tocar StoppedScreen ni lo que
  // el usuario ve. reactionTimesRef.current sigue intacto (handleStopEarly
  // no lo limpia), asi que el detalle de tiempos de reaccion tambien se
  // conserva.
  const handleExit = useCallback(async () => {
    if (saveState === 'saved') return

    setSaveState('saving')
    setSaveError(null)
    try {
      if (flow.metricsResult) {
        await onComplete(flow.metricsResult, 'completed', idempotencyKeyRef.current, effectiveConfigRef.current as unknown as Record<string, unknown>)
      } else if (partialMetrics) {
        const interruptedMetrics: ReactionTimeMetrics = {
          reactionTimes: reactionTimesRef.current,
          correctResponses: partialMetrics.correctResponses,
          falseAlarms: partialMetrics.falseAlarms,
          misses: partialMetrics.misses,
          totalTrials: partialMetrics.completedTrials,
          accuracyPercent: partialMetrics.accuracyPercent,
        }
        await onComplete(interruptedMetrics, 'interrupted', idempotencyKeyRef.current, effectiveConfigRef.current as unknown as Record<string, unknown>)
      }
      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el resultado.')
      throw err
    }
  }, [flow.metricsResult, onComplete, partialMetrics, saveState])

  // "Guardar resultados": llama a handleExit (misma logica que "Salir")
  // pero sin navegar despues - se queda en la pantalla de resultados. El
  // error, si lo hay, ya lo deja preparado handleExit en saveState/
  // saveError; aqui solo hace falta no dejar que la excepcion se propague
  // sin manejar (ExerciseSaveButton no espera una promesa, solo refleja
  // el estado).
  const handleSaveResults = useCallback(() => {
    handleExit().catch(() => {
      // El error ya se guardo en saveState/saveError dentro de
      // handleExit - aqui no hay nada mas que hacer salvo evitar un
      // "unhandled promise rejection" en consola.
    })
  }, [handleExit])

  // Parada voluntaria. Marca stopRequestedRef (ref local, ver mas arriba),
  // que runExercise comprueba junto a flow.abortRef en cada punto de
  // control tras un await flow.sleep(...): es suficiente para que el
  // bucle se detenga en su proxima comprobacion sin arrancar ningun
  // trial nuevo. No se cancela el setTimeout interno de flow.sleep
  // (useExerciseFlow no expone eso y no se va a modificar ese hook), pero
  // es inofensivo: cuando ese timeout resuelva, lo unico que hace el
  // codigo es comprobar stopRequestedRef/abortRef de inmediato antes de
  // tocar ningun estado, asi que no puede reabrir un trial ni disparar
  // onComplete.
  //
  // El trial en curso solo cuenta como completado si su resultado ya
  // estaba registrado en los refs de metricas en el instante de pulsar
  // (p.ej. durante el breve "result" tras una respuesta); si el estimulo
  // todavia estaba esperando respuesta (go/no-go/waiting), sus refs aun
  // no se han incrementado, asi que queda fuera del recuento - exactamente
  // el comportamiento pedido ("Intento 12 de 20" con el estimulo visible
  // no debe contabilizarse).
  const handleStopEarly = useCallback(() => {
    stopRequestedRef.current = true

    const completedTrials = correctResponsesRef.current + missesRef.current + noGoTrialsRef.current
    const correctNoGo = noGoTrialsRef.current - falseAlarmsRef.current
    const accuracyPercent = completedTrials > 0
      ? ((correctResponsesRef.current + Math.max(0, correctNoGo)) / completedTrials) * 100
      : 0

    setPartialMetrics({
      completedTrials,
      endMode: flow.configRef.current.endMode,
      totalConfigured: flow.configRef.current.totalTrials,
      accuracyPercent: Math.min(100, accuracyPercent),
      avgReactionTime: reactionTimesRef.current.length > 0
        ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
        : null,
      correctResponses: correctResponsesRef.current,
      falseAlarms: falseAlarmsRef.current,
      misses: missesRef.current,
    })
    setStoppedEarly(true)
    flow.exitFullscreen()
  }, [flow])

  const avgReactionTime = reactionTimesRef.current.length > 0
    ? Math.round(reactionTimesRef.current.reduce((a, b) => a + b, 0) / reactionTimesRef.current.length)
    : 0

  // Colores reales mostrados: UN unico contrastPercent aplicado por
  // separado a goColor y noGoColor, mismo fondo de referencia
  // (BACKGROUND_HEX) y misma formula que los demas ejercicios. Se usa un
  // unico control compartido (no uno por color) porque el contraste es
  // una propiedad de la PANTALLA (cuanto se funde cualquier color hacia
  // el fondo real), no de cada color en si - aplicar el mismo ratio a
  // ambos mantiene la relacion de contraste entre GO y NO GO consistente
  // en cualquier nivel elegido. Dos controles independientes permitirian,
  // p.ej., GO al 100% y NO GO casi invisible al 10%, degradando la
  // distincion entre estimulos - justo lo que hay que evitar.
  //
  // RIESGO MATEMATICO VERIFICADO (no corregido aqui, documentado para
  // decision futura - ver informe): applyContrast es una interpolacion
  // LINEAL, asi que la distancia RGB entre displayGoColor y
  // displayNoGoColor es EXACTAMENTE `contrastPercent/100` veces la
  // distancia entre goColor y noGoColor sin mezclar. Para la pareja por
  // defecto (verde/rojo, distancia ~243 en escala 0-255 por canal) esto
  // sigue siendo distinguible incluso al 10% (~24 de distancia). Pero si
  // el usuario elige dos colores de la paleta ya proximos entre si (p.ej.
  // '#f59e0b' ambar y '#facc15' amarillo, distancia ~47 al 100%), al 10%
  // de contraste la distancia cae a ~4.7 - practicamente imperceptible.
  // Esto es inherente a aplicar la MISMA formula con el MISMO ratio a dos
  // colores por separado, no un fallo de implementacion - no se corrige
  // aqui (cambiar la paleta o la formula esta fuera de alcance de esta
  // fase) pero queda documentado como riesgo conocido.
  const displayGoColor = applyContrast(flow.config.goColor, BACKGROUND_HEX, flow.config.contrastPercent / 100)
  const displayNoGoColor = applyContrast(flow.config.noGoColor, BACKGROUND_HEX, flow.config.contrastPercent / 100)

  // ============ RENDER ============

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Go/No Go</h1>
        <p className="text-sm text-gray-600">Go/No-Go: haz clic cuando veas la señal GO, no hagas clic cuando veas la señal NO GO</p>
      </div>

      {flow.stage === 'config' && (
        <ConfigScreen
          config={flow.config}
          setConfig={flow.setConfig}
          displayGoColor={displayGoColor}
          displayNoGoColor={displayNoGoColor}
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
              trialLog={trialLogRef.current}
              onRepeat={handleRepeat}
              onReconfigure={handleReconfigure}
              onBeforeExit={handleExit}
              onSave={canPersist ? handleSaveResults : undefined}
              saveState={saveState}
              saveError={saveError}
            />
          ) : (
            <RunningScreen
              config={flow.config}
              displayGoColor={displayGoColor}
              displayNoGoColor={displayNoGoColor}
              currentTrial={currentTrial}
              trialState={trialState}
              lastReactionTime={lastReactionTime}
              lastTrialResult={lastTrialResult}
              onClick={handleClick}
              onStopEarly={handleStopEarly}
              stopContainer={flow.fullscreenRef.current}
            />
          )
        )}

        {flow.stage === 'feedback' && flow.metricsResult && (
          <FeedbackScreen
            metrics={flow.metricsResult}
            avgReactionTime={avgReactionTime}
            onExit={handleShowResults}
          />
        )}
      </div>

      {flow.stage === 'finished' && flow.metricsResult && (
        <ResultsScreen
          metrics={flow.metricsResult}
          avgReactionTime={avgReactionTime}
          trialLog={trialLogRef.current}
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

/** Toggle de 2-4 opciones en forma de pastilla segmentada, usado por
 * "Finalizacion" y "Distribucion". Generico y local a este archivo -
 * no se ha creado como componente compartido porque solo lo usa este
 * ejercicio por ahora. */
function SegmentedToggle<T extends string>({ value, options, onChange, disabledValue }: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabledValue?: T
}) {
  return (
    <div className="inline-flex rounded-lg border border-orion-navy-200 bg-white p-0.5">
      {options.map((opt) => {
        const isDisabled = opt.value === disabledValue
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-orion-navy-700 text-white'
                : isDisabled
                ? 'cursor-not-allowed text-gray-300'
                : 'text-orion-navy-700 hover:bg-orion-navy-100'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** Tamaño fijo de la caja "Vista previa" - mismo criterio que
 * ClickTargetsExercise.tsx/VisualMemoryExercise.tsx/
 * SimpleReactionExercise.tsx (PREVIEW_BOX_SIZE=160). Aqui la caja aloja
 * DOS swatches (GO y NO GO) en vez de uno solo. */
const PREVIEW_BOX_SIZE = 160
const PREVIEW_CIRCLE_SIZE = 56

function ConfigScreen({ config, setConfig, displayGoColor, displayNoGoColor, defaultsSaved, onSaveDefaults, onStart }: {
  config: ExerciseConfig
  setConfig: React.Dispatch<React.SetStateAction<ExerciseConfig>>
  displayGoColor: string
  displayNoGoColor: string
  defaultsSaved: boolean
  onSaveDefaults: () => void
  onStart: () => void
}) {
  // "Ratio fijo": buildFixedSequence (ver mas arriba en este archivo)
  // garantiza exactamente round(totalTrials*goRatio) GO, solo el ORDEN se
  // sortea (Fisher-Yates) - por eso "exacto". Unico caso que muestra el
  // porcentaje configurado: es el unico modo que de verdad lo respeta.
  //
  // "Ratio aleatorio": ya NO usa goRatio en absoluto (ver runExercise,
  // `const isGo = sequence ? sequence[trial] : Math.random() < 0.5`) -
  // cada estimulo es 50% GO / 50% NO-GO, decidido en el momento, sin
  // cuota ni memoria de los estimulos anteriores. El texto NO debe sugerir
  // que se aplica el porcentaje configurado (goRatio sigue existiendo en
  // la config/localStorage, pero deja de leerse aqui) - mensaje fijo,
  // siempre igual independientemente de goRatio.
  const distributionHint = config.endMode === 'time'
    ? 'Modo aleatorio en pruebas por tiempo'
    : config.goDistribution === 'fixed'
      ? `${Math.round(config.goRatio * 100)}% exacto · orden aleatorio`
      : 'Cada estímulo se decide al azar, sin proporción fija'

  const sectionLabel = 'mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'
  const sliderClass = 'w-44 sm:w-48 h-2 bg-gray-200 rounded-lg cursor-pointer accent-orion-navy-600'

  return (
    <Card className="p-3 px-6 mb-3">
      {/* Cabecera compactada (ajuste visual posterior): ya no lleva el
          boton "Iniciar Ejercicio" (se traslada a la columna derecha,
          encima de la vista previa - ver mas abajo) para que la cabecera
          quede mas baja y el boton deje de apretarse contra el borde
          superior de la tarjeta. */}
      <div className="mb-2 flex items-center gap-2">
        <Cog6ToothIcon className="h-5 w-5 text-orion-navy-600" />
        <h2 className="text-lg font-semibold text-gray-900">Configuración</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-x-8 gap-y-2">
        {/* IZQUIERDA: Finalización + Intervalo */}
        <div className="space-y-2">
          <div>
            <p className={sectionLabel}>Finalización</p>
            <SegmentedToggle
              value={config.endMode}
              options={[
                { value: 'repetitions', label: 'Por repeticiones' },
                { value: 'time', label: 'Por tiempo' },
              ]}
              onChange={(endMode) =>
                setConfig((c) => ({
                  ...c,
                  endMode,
                  // "Ratio fijo" exige un numero de trials conocido de
                  // antemano; al pasar a "Por tiempo" se fuerza "Ratio aleatorio".
                  goDistribution: endMode === 'time' ? 'random' : c.goDistribution,
                }))
              }
            />
            {config.endMode === 'repetitions' ? (
              <div className="mt-2.5 flex items-center gap-3">
                <input type="range" min={5} max={50} step={5} value={config.totalTrials}
                  onChange={(e) => setConfig((c) => ({ ...c, totalTrials: parseInt(e.target.value) }))}
                  className={sliderClass} />
                <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.totalTrials} intentos</span>
              </div>
            ) : (
              <div className="mt-2.5">
                {/* Stepper +/-15s, mismo paso que los presets rapidos. */}
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

                {/* Fila de accesos rapidos. */}
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
            <p className={sectionLabel}>Intervalo entre estímulos</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-14 text-sm text-gray-600">Mínimo</span>
                <input type="range" min={200} max={5000} step={100} value={config.intervalMinMs}
                  onChange={(e) => setConfig((c) => ({ ...c, intervalMinMs: parseInt(e.target.value) }))}
                  className={sliderClass} />
                <span className="whitespace-nowrap text-sm font-medium text-gray-900">{(config.intervalMinMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-14 text-sm text-gray-600">Máximo</span>
                <input type="range" min={200} max={5000} step={100} value={config.intervalMaxMs}
                  onChange={(e) => setConfig((c) => ({ ...c, intervalMaxMs: parseInt(e.target.value) }))}
                  className={sliderClass} />
                <span className="whitespace-nowrap text-sm font-medium text-gray-900">{(config.intervalMaxMs / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabel}>Feedback durante el ejercicio</p>
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

        {/* DERECHA: Distribución + Colores */}
        <div className="space-y-2">
          <div>
            <p className={sectionLabel}>Distribución GO / NO-GO</p>
            <SegmentedToggle
              value={config.goDistribution}
              options={[
                { value: 'fixed', label: 'Ratio fijo' },
                { value: 'random', label: 'Ratio aleatorio' },
              ]}
              disabledValue={config.endMode === 'time' ? 'fixed' : undefined}
              onChange={(goDistribution) => setConfig((c) => ({ ...c, goDistribution }))}
            />
            {/* Ratio GO deliberadamente justo debajo del toggle, sin
                etiqueta de seccion propia, para que se perciba como parte
                de la misma decision (fijo/aleatorio) y no como un slider
                suelto. Solo se muestra en "Ratio fijo": en "Ratio
                aleatorio" goRatio YA NO se usa en absoluto (antes si se
                seguia usando como probabilidad interna; ver runExercise
                para el cambio real) - cada estimulo es 50%/50% fijo, sin
                cuota, asi que mostrar o dejar ajustar este slider en ese
                modo seria enganoso. El valor de goRatio se conserva igual
                en la config/localStorage (no se borra ni se resetea),
                simplemente deja de leerse para "Ratio aleatorio" - si el
                usuario vuelve a "Ratio fijo", el ultimo valor usado sigue
                ahi. min/max 0-1 (en vez de 0.3-0.9 como antes) para que
                la posicion del thumb corresponda exactamente al
                porcentaje mostrado (30% queda al 30% de la barra, no al
                extremo izquierdo). */}
            {config.goDistribution === 'fixed' && (
              <div className="mt-2.5 flex items-center gap-3">
                <input type="range" min={0} max={1} step={0.1} value={config.goRatio}
                  onChange={(e) => setConfig((c) => ({ ...c, goRatio: parseFloat(e.target.value) }))}
                  className={sliderClass} />
                <span className="whitespace-nowrap text-sm font-medium text-gray-900">{Math.round(config.goRatio * 100)}% GO</span>
              </div>
            )}
            <p className="mt-1.5 text-xs text-gray-400">{distributionHint}</p>
          </div>

          <div>
            <p className={sectionLabel}>Colores</p>
            <div className="space-y-2.5">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">GO</span>
                  <span className="text-sm text-gray-500">{config.goColor}</span>
                </div>
                <ColorPalette
                  ariaLabel="Color GO"
                  value={config.goColor}
                  onChange={(goColor) => setConfig((c) => ({ ...c, goColor }))}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">NO GO</span>
                  <span className="text-sm text-gray-500">{config.noGoColor}</span>
                </div>
                <ColorPalette
                  ariaLabel="Color NO GO"
                  value={config.noGoColor}
                  onChange={(noGoColor) => setConfig((c) => ({ ...c, noGoColor }))}
                />
              </div>
            </div>
          </div>

          <div>
            <p className={sectionLabel}>Contraste</p>
            <div className="flex items-center gap-3">
              <input type="range" min={10} max={100} step={5} value={config.contrastPercent}
                onChange={(e) => setConfig((c) => ({ ...c, contrastPercent: parseInt(e.target.value) }))}
                className={sliderClass} />
              <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.contrastPercent}%</span>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              100% = colores elegidos sin mezclar (máximo contraste) · valores menores acercan ambos colores al fondo
            </p>
          </div>
        </div>

        {/* DERECHA: boton de inicio (trasladado desde la cabecera, ver
            arriba) + vista previa, apiladas con un poco de separacion del
            borde superior (lg:mt-2) - resuelve que antes quedaban
            apretadas contra el borde de la tarjeta. Vista previa con DOS
            swatches (uno por color GO/NO GO), mismo patron que
            ClickTargetsExercise.tsx/VisualMemoryExercise.tsx/
            SimpleReactionExercise.tsx. */}
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
              className="flex items-center justify-center gap-4 rounded-lg bg-gray-900"
              style={{ width: PREVIEW_BOX_SIZE, height: PREVIEW_BOX_SIZE }}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-full shadow-2xl" style={{ width: PREVIEW_CIRCLE_SIZE, height: PREVIEW_CIRCLE_SIZE, backgroundColor: displayGoColor }} />
                <span className="text-[10px] font-semibold text-gray-400">GO</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="rounded-full shadow-2xl" style={{ width: PREVIEW_CIRCLE_SIZE, height: PREVIEW_CIRCLE_SIZE, backgroundColor: displayNoGoColor }} />
                <span className="text-[10px] font-semibold text-gray-400">NO GO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="mb-2 text-sm text-gray-500">
          <span className="font-medium text-green-700">✓ Clic con GO</span>
          {' · '}
          <span className="font-medium text-red-700">✕ Sin clic con NO-GO</span>
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
        {config.endMode === 'repetitions' ? `${config.totalTrials} intentos` : formatDuration(config.durationSeconds)}
      </p>
      <Button onClick={onStart} variant="primary" className="inline-flex items-center gap-2 text-xl px-12 py-4">
        <PlayIcon className="h-6 w-6" /> Comenzar
      </Button>
      <SpacebarHint label="Pulsa Espacio para comenzar" tone="dark" />
    </div>
  )
}

function RunningScreen({ config, displayGoColor, displayNoGoColor, currentTrial, trialState, lastReactionTime, lastTrialResult, onClick, onStopEarly, stopContainer }: {
  config: ExerciseConfig; displayGoColor: string; displayNoGoColor: string; currentTrial: number; trialState: TrialState
  lastReactionTime: number | null; lastTrialResult: 'correct' | 'false-alarm' | 'miss' | null
  onClick: () => void; onStopEarly: () => void; stopContainer: HTMLElement | null
}) {
  return (
    // HUD de pantalla completa: 4 elementos INDEPENDIENTES posicionados de
    // forma absoluta dentro de este `relative` (no un flujo vertical que
    // los empuje entre si) - intento arriba, estimulo centrado en ambos
    // ejes, leyenda cerca del fondo, boton de detener en una esquina,
    // cada uno anclado a su propia posicion sin afectar a los demas. El
    // click para responder sigue en el contenedor exterior: los clics
    // dentro de cualquiera de los 4 bloques burbujean hasta el, salvo el
    // del boton de detener (stopPropagation).
    <div className="relative w-full h-full cursor-pointer select-none" style={{ minHeight: '100vh' }} onClick={onClick}>
      {/* A) Intento: arriba, centrado horizontalmente, con separacion fija
          del borde superior - no se mueve por el tamaño del circulo. */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className="px-4 py-2 rounded-full bg-gray-800 text-gray-300 text-sm font-semibold">
          {config.endMode === 'repetitions'
            ? `Intento ${currentTrial + 1} de ${config.totalTrials}`
            : `Intento ${currentTrial + 1}`}
        </div>
      </div>

      {/* B) Estimulo: centrado en ambos ejes respecto al contenedor
          completo (top-1/2 left-1/2 -translate-1/2), no respecto a un
          flujo compartido con el badge/leyenda/boton - mismo tamaño,
          colores, texto y mecanica de siempre, solo cambia como se
          posiciona dentro del layout. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`w-72 h-72 md:w-80 md:h-80 rounded-full flex items-center justify-center transition-colors duration-100 ${
            trialState === 'go' || trialState === 'no-go' ? 'shadow-2xl' : ''
          }`}
          style={
            trialState === 'go' ? { backgroundColor: displayGoColor } :
            trialState === 'no-go' ? { backgroundColor: displayNoGoColor } :
            undefined
          }
        >
          {/* Punto de fijacion durante la espera y (si showFeedback esta
              desactivado) durante el feedback: sin fondo ni sombra (el div
              sigue siendo rounded-full pero transparente, se funde con el
              bg-gray-900 del fondo) para que no pueda confundirse con un
              estimulo. Solo cambia la representacion visual - timings,
              trialState, clickedRef, registro de trials y metricas no se
              tocan en ningun caso, se muestre o no el feedback. */}
          {trialState === 'waiting' && (
            <span className="text-3xl font-light leading-none text-gray-500 select-none" aria-hidden="true">+</span>
          )}
          {trialState === 'go' && <p className="text-white text-5xl font-bold drop-shadow">GO</p>}
          {trialState === 'no-go' && <p className="text-white text-4xl font-bold drop-shadow">NO GO</p>}
          {trialState === 'result' && (
            config.showFeedback ? (
              <div className="text-center">
                {lastTrialResult === 'correct' && lastReactionTime !== null && (
                  <><p className="text-green-400 text-4xl font-bold mb-2">{lastReactionTime} ms</p><p className="text-green-400 text-xl">✓</p></>
                )}
                {lastTrialResult === 'correct' && lastReactionTime === null && <p className="text-green-400 text-4xl font-bold">✓</p>}
                {lastTrialResult === 'false-alarm' && <p className="text-red-400 text-3xl font-bold">✗ ¡No hagas clic!</p>}
                {lastTrialResult === 'miss' && <p className="text-amber-400 text-2xl font-bold">¡Muy lento!</p>}
              </div>
            ) : (
              <span className="text-3xl font-light leading-none text-gray-500 select-none" aria-hidden="true">+</span>
            )
          )}
        </div>
      </div>

      {/* C) Leyenda: centrada horizontalmente, cerca del fondo pero
          separada del boton de detener (bottom-20 vs el bottom-6 del
          boton) - ya no comparte columna/flujo con el, es un bloque
          independiente. */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 text-gray-400 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: displayGoColor }} /> = Clic
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: displayNoGoColor }} /> = No clic
        </span>
      </div>

      {/* D) Icono discreto de interrupcion: mismo componente compartido
          (ExerciseStopButton) que Click Targets y Visual Memory - misma
          posicion exacta en el viewport en los 3 ejercicios, sin importar
          la estructura interna de cada RunningScreen. Mismo
          handleStopEarly ya validado (detiene, conserva lo ya resuelto,
          muestra StoppedScreen). */}
      <ExerciseStopButton onClick={onStopEarly} container={stopContainer} />
    </div>
  )
}

function StoppedScreen({ metrics, trialLog, onRepeat, onReconfigure, onBeforeExit, onSave, saveState, saveError }: {
  metrics: PartialMetrics; trialLog: TrialRecord[]
  onRepeat: () => void; onReconfigure: () => void; onBeforeExit?: () => void | Promise<void>
  onSave?: () => void; saveState?: ExerciseSaveState; saveError?: string | null
}) {
  const { successes, failures } = computeOutcomeSummary(metrics.completedTrials, metrics.misses, metrics.falseAlarms)
  // Portal directo a document.body (en vez de solo `fixed inset-0`
  // dentro del arbol normal): `position: fixed` por si solo sigue
  // dependiendo de que ningun ancestro (el propio Portal del producto,
  // SecondaryScreenShell, cualquier componente intermedio) establezca un
  // "containing block" propio (transform/filter/perspective/
  // will-change/contain) - algo que no se puede descartar al 100% sin
  // inspeccionar el DOM en vivo, y que ya se habia intentado antes sin
  // exito. Un portal saca este arbol COMPLETAMENTE del flujo/arbol de
  // ReactionTimeExercise -> ExerciseRunner -> pagina -> <main>: queda
  // colgando directamente de <body>, asi que no puede contribuir en
  // ningun caso a la altura/scroll de main, y su `fixed inset-0` queda
  // referenciado unicamente al viewport real, sin ningun intermediario.
  // Funciona exactamente igual con o sin que el Fullscreen API del
  // navegador haya tenido exito, porque nunca dependio de el.
  // Sin ningun intento completado: mismo criterio que VisualMemoryExercise.tsx
  // (roundsCompleted === 0) - un estado explicito en vez de una fila de
  // metricas en guiones sin contexto.
  const hasTrials = metrics.completedTrials > 0

  // La estructura exterior (overlay fijo a pantalla completa + centrado)
  // sigue siendo propia de esta pantalla (es un modal, a diferencia de
  // ResultsScreen que es inline en la pagina); el contenido INTERIOR
  // (tarjeta + acciones + boton de salida) viene de ExerciseResultsCard,
  // compartido con Click Targets y Visual Memory - mismo componente que
  // usa el ResultsScreen normal de este mismo archivo, mas abajo.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 p-4">
      <ExerciseResultsCard
        title="Ejercicio detenido"
        subtitle={hasTrials ? (
          metrics.endMode === 'repetitions'
            ? `${metrics.completedTrials} de ${metrics.totalConfigured} intentos realizados`
            : `${metrics.completedTrials} intentos realizados`
        ) : undefined}
        onRepeat={onRepeat}
        onReconfigure={onReconfigure}
        onBeforeExit={onBeforeExit}
        onSave={onSave}
        saveState={saveState}
        saveError={saveError}
        breakdown={hasTrials ? <TrialBreakdown trialLog={trialLog} /> : undefined}
      >
        {hasTrials ? (
          <div className="space-y-4 text-left">
            <div className="flex justify-between text-sm"><span className="text-gray-600">Éxitos</span><span className="text-gray-900 font-bold">{successes}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Fallos</span><span className="text-red-600 font-bold">{failures}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Precisión</span><span className="text-gray-900 font-bold">{metrics.accuracyPercent.toFixed(1)}%</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Reacción media</span><span className="text-green-600 font-bold">{metrics.avgReactionTime !== null ? `${metrics.avgReactionTime} ms` : '—'}</span></div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Sin resultados completados. El ejercicio se detuvo antes de completar el primer intento.
          </p>
        )}
      </ExerciseResultsCard>
    </div>,
    document.body
  )
}

function FeedbackScreen({ metrics, avgReactionTime, onExit }: { metrics: ReactionTimeMetrics; avgReactionTime: number; onExit: () => void }) {
  const { successes, failures } = computeOutcomeSummary(metrics.totalTrials, metrics.misses, metrics.falseAlarms)
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <Card className="p-8 max-w-md w-full text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">¡Completado!</h2>
        <div className="space-y-3 mb-8 text-left">
          <div className="flex justify-between text-base"><span className="text-gray-600">Éxitos</span><span className="text-gray-900 font-bold">{successes}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Fallos</span><span className="text-red-600 font-bold">{failures}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Precisión</span><span className="text-gray-900 font-bold">{metrics.accuracyPercent.toFixed(1)}%</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Reacción media</span><span className="text-green-600 font-bold">{avgReactionTime} ms</span></div>
        </div>
        <Button onClick={onExit} variant="primary" className="w-full px-6 py-2">Ver Resultados Completos</Button>
      </Card>
    </div>
  )
}

/** Boton "Ver/Ocultar desglose por intento" + tabla, compartido entre
 * ResultsScreen y StoppedScreen para no duplicar esta implementacion.
 * Lee trialLog tal cual se le pasa - no crea ni toca ningun registro
 * propio. Solo incluye trials ya resueltos porque eso es exactamente lo
 * que ya garantiza trialLogRef por construccion (ver runExercise/
 * handleClick: solo se empuja un registro en el mismo punto donde se
 * incrementan los contadores agregados, nunca para un trial pendiente). */
function TrialBreakdown({ trialLog }: { trialLog: TrialRecord[] }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  return (
    <div className="mt-2 pt-6 border-t border-gray-100">
      <Button
        onClick={() => setShowBreakdown((o) => !o)}
        variant="secondary"
        className="inline-flex items-center gap-2"
      >
        <ListIcon className="h-5 w-5" />
        {showBreakdown ? 'Ocultar desglose por intento' : 'Ver desglose por intento'}
      </Button>

      {showBreakdown && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Intento</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Señal</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Resultado</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {trialLog.map((t) => (
                <tr key={t.trialNumber} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 text-gray-700">{t.trialNumber}</td>
                  <td className="px-3 py-1.5 text-gray-700">{t.signal === 'go' ? 'GO' : 'NO GO'}</td>
                  <td className={`px-3 py-1.5 font-medium ${t.outcome === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.outcome === 'success' ? '✓ Éxito' : '✗ Fallo'}
                  </td>
                  <td className="px-3 py-1.5 text-gray-700">
                    {t.reactionTimeMs !== null ? `${t.reactionTimeMs} ms` : 'Sin respuesta'}
                  </td>
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
  green: 'bg-green-50',
  red: 'bg-red-50',
}
const METRIC_LABEL_COLOR: Record<string, string> = {
  blue: 'text-blue-700',
  gray: 'text-gray-600',
  green: 'text-green-700',
  red: 'text-red-700',
}
const METRIC_VALUE_COLOR: Record<string, string> = {
  blue: 'text-blue-600',
  gray: 'text-gray-900',
  green: 'text-green-600',
  red: 'text-red-600',
}

/** Tarjeta de metrica compacta, mismo patron que ClickTargetsExercise.tsx/
 * VisualMemoryExercise.tsx (filosofia anti-scroll) - duplicada aqui a
 * proposito, mismo criterio de autosuficiencia por archivo. */
function MetricCard({ color, label, value }: { color: keyof typeof METRIC_CARD_BG; label: string; value: string | number }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${METRIC_CARD_BG[color]}`}>
      <p className={`text-xs ${METRIC_LABEL_COLOR[color]}`}>{label}</p>
      <p className={`text-lg font-bold sm:text-xl ${METRIC_VALUE_COLOR[color]}`}>{value}</p>
    </div>
  )
}

function ResultsScreen({ metrics, avgReactionTime, trialLog, onRepeat, onReconfigure, onBeforeExit, onSave, saveState, saveError }: {
  metrics: ReactionTimeMetrics; avgReactionTime: number; trialLog: TrialRecord[]
  onRepeat: () => void; onReconfigure: () => void; onBeforeExit?: () => void | Promise<void>
  onSave?: () => void; saveState?: ExerciseSaveState; saveError?: string | null
}) {
  const { successes, failures } = computeOutcomeSummary(metrics.totalTrials, metrics.misses, metrics.falseAlarms)
  // Mismo componente compartido (ExerciseResultsCard) que StoppedScreen
  // mas arriba en este archivo, y que Click Targets/Visual Memory - misma
  // estructura/acciones/boton de salida en resultados normales y
  // parciales, en los 3 ejercicios. Envuelto en flex centrado porque esta
  // pantalla es inline en la pagina (no un portal como StoppedScreen), y
  // la tarjeta (max-w-lg) necesita algo que la centre dentro del
  // contenedor max-w-6xl de ReactionTimeExercise.
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
        breakdown={<TrialBreakdown trialLog={trialLog} />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard color="green" label="Éxitos" value={successes} />
          <MetricCard color="red" label="Fallos" value={failures} />
          <MetricCard color="blue" label="Precisión" value={`${metrics.accuracyPercent.toFixed(1)}%`} />
          <MetricCard color="gray" label="Reacción Media" value={`${avgReactionTime} ms`} />
        </div>
      </ExerciseResultsCard>
    </div>
  )
}
