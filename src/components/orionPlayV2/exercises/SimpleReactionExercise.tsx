'use client'

/**
 * Solo GO: ejercicio independiente de tiempo de reaccion SIMPLE, sin
 * dimension de inhibicion - unicamente estimulos GO, nunca NO GO.
 * Hermano autosuficiente de ReactionTimeExercise.tsx (Go/No Go), NO una
 * variante condicional dentro de ese archivo: misma filosofia de
 * autosuficiencia ya aplicada a Click Targets/Visual Memory respecto a
 * Go/No Go. Comparte el PATRON (useExerciseFlow, estructura de pantallas,
 * registro de Espacio via refs, StoppedScreen/ResultsScreen/
 * ExerciseResultsCard) pero NO comparte estado ni logica de ensayo con
 * Go/No Go - cero riesgo de que un cambio aqui afecte a Go/No Go, y
 * viceversa.
 *
 * Diferencia de diseño clave respecto a Go/No Go: ademas de "valido"
 * (respuesta dentro de la ventana tras el estimulo) y "omision" (sin
 * respuesta), existe un tercer desenlace: "anticipada" (respuesta ANTES
 * de que aparezca el estimulo, trialState==='waiting'). Una anticipada
 * NUNCA sustituye ni altera el desenlace valido/omision del ensayo en el
 * que ocurre - es un contador independiente (falseStartsRef), incrementado
 * aparte; el estimulo sigue apareciendo en su momento normal y el ensayo
 * se resuelve exactamente igual que si no hubiera habido anticipacion.
 * Esto es una decision de diseño explicita (ver handleClick mas abajo
 * para el razonamiento completo), no un efecto secundario accidental.
 *
 * Metricas: SimpleReactionMetrics (orionPlayV2/lib/types.ts), NO
 * ReactionTimeMetrics - no incluye falseAlarms ni ningun concepto de
 * inhibicion. Persistencia: ver actions.ts, submitPlayAttempt acepta
 * exerciseId 'simple-reaction' ademas de 'reaction-time', con su propio
 * validador/mapeo a core.results - deuda tecnica documentada alli
 * (reutiliza provisionalmente el activity_catalog_id de 'reaction-time'
 * por no poder crear una fila nueva de catalogo).
 *
 * Mismo motivo que ReactionTimeExercise.tsx para desactivar
 * react-hooks/refs en todo el archivo: useExerciseFlow devuelve refs y
 * estado en el mismo objeto `flow`.
 *
 * TAMBIEN desactivada react-hooks/preserve-manual-memoization (nueva en
 * este archivo, Go/No Go no la necesitaba): en handleExit, el React
 * Compiler no logra inferir correctamente la dependencia
 * flow.configRef.current.intervalMinMs/intervalMaxMs (leida dentro de una
 * rama condicional de una funcion async, para construir el `config` de
 * las metricas interrumpidas) y se niega a optimizar el componente en vez
 * de solo avisar. Mismo origen que react-hooks/refs (el linter no
 * distingue que flow.configRef es un ref estable), y un
 * eslint-disable-next-line puntual sobre la propia declaracion no basta
 * para suprimir este diagnostico concreto (se probo y seguia
 * reportandose) - de ahi la desactivacion a nivel de archivo, igual que
 * la de arriba.
 */
/* eslint-disable react-hooks/refs, react-hooks/preserve-manual-memoization */

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { SimpleReactionMetrics } from '../lib/types'
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

// ============ TIPOS Y CONSTANTES ============

const STORAGE_KEY = 'simpleReaction_defaults'
// Mismos valores que GO_STIMULUS_TIMEOUT_MS/RESULT_DISPLAY_MS de
// ReactionTimeExercise.tsx - reutilizados tal cual (no inventados): son
// la misma ventana de respuesta y la misma pausa de feedback ya
// validadas para un estimulo GO en ese ejercicio, y este ejercicio
// presenta el mismo tipo de estimulo (un circulo de color que aparece
// una vez por ensayo).
const STIMULUS_TIMEOUT_MS = 1000
const RESULT_DISPLAY_MS = 800

type TrialState = 'waiting' | 'go' | 'result'
type EndMode = 'repetitions' | 'time'
type TrialOutcome = 'valid' | 'omission' | 'anticipated'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} s`
  if (s === 0) return `${m} min`
  return `${m} min ${s} s`
}

const QUICK_DURATION_PRESETS = [15, 30, 45, 60, 120, 180, 300]

/** Media/minimo/maximo/mediana de una lista de tiempos de reaccion
 * VALIDOS (nunca incluye anticipaciones ni omisiones, que no tienen
 * tiempo de reaccion real). Pura, sin estado - usada tanto para las
 * metricas finales (runExercise) como para las parciales
 * (handleStopEarly/handleExit en caso interrumpido), una unica
 * implementacion para ambos casos. */
function computeReactionStats(times: number[]): { avg: number; min: number; max: number; median: number } {
  if (times.length === 0) return { avg: 0, min: 0, max: 0, median: 0 }
  const sorted = [...times].sort((a, b) => a - b)
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const mid = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
  return { avg, min, max, median }
}

/** Paleta de colores del estimulo - copia literal de COLOR_PALETTE de
 * ReactionTimeExercise.tsx (duplicada a proposito, mismo criterio de
 * autosuficiencia por archivo). Un unico color aqui (no hay GO/NO-GO que
 * distinguir). */
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

/** Registro de un unico evento resuelto, para "Ver desglose por intento".
 * A diferencia de ReactionTimeExercise.tsx, UN MISMO trialNumber puede
 * aparecer dos veces aqui: una vez si hubo una respuesta anticipada
 * durante la espera de ese ensayo (outcome='anticipated'), y SIEMPRE una
 * vez mas con el desenlace propio del ensayo (outcome='valid'|'omission')
 * - son dos eventos distintos e independientes, no una reclasificacion
 * del mismo. Ver handleClick para el razonamiento completo. */
interface TrialRecord {
  trialNumber: number
  outcome: TrialOutcome
  reactionTimeMs: number | null
}

/** Snapshot de metricas parciales al pulsar "Salir y detener ejercicio".
 * avgReactionTime es `number | null` (no 0) a proposito, a diferencia de
 * SimpleReactionMetrics.avgReactionTimeMs (que es `number`, 0 si no hay
 * datos) - PartialMetrics es puramente de presentacion local a esta
 * pantalla de parada (StoppedScreen distingue "sin datos" de "0 ms" en el
 * texto), nunca se persiste tal cual. */
interface PartialMetrics {
  completedTrials: number
  endMode: EndMode
  totalConfigured: number
  validTrials: number
  omissions: number
  falseStarts: number
  avgReactionTime: number | null
}

interface ExerciseConfig {
  endMode: EndMode
  totalTrials: number
  durationSeconds: number
  intervalMinMs: number
  intervalMaxMs: number
  /** Color del (unico) estimulo. Ortogonal a las metricas - solo
   * representacion visual. Seleccionable de forma independiente de
   * contrastPercent (mas abajo) - son dos campos distintos de la misma
   * config, nunca se mezclan entre si en el almacenamiento. */
  stimulusColor: string
  /** Nuevo en esta fase. Mismo significado matematico y mismo rango que
   * Click Targets/Visual Memory (ver lib/contrast.ts): 100 = color
   * elegido sin mezclar, valores menores lo acercan a BACKGROUND_HEX.
   * Campo requerido en el TIPO, igual que el resto de ExerciseConfig
   * (totalTrials/intervalMinMs/...): una config antigua guardada en
   * localStorage ANTES de que este campo existiera no lo tiene en el
   * JSON, pero el merge `{...defaultConfig, ...validated}` que ya hace
   * useExerciseFlow al cargar lo completa automaticamente con
   * DEFAULT_CONFIG.contrastPercent (100) - no hace falta marcarlo
   * opcional ni ningun mecanismo de version nuevo (a diferencia de
   * goColor/noGoColor en ReactionTimeExercise.tsx, cuyo problema era un
   * valor YA presente pero incorrecto, no un campo ausente). */
  contrastPercent: number
  /** Mismo criterio que showFeedback de ReactionTimeExercise.tsx: solo
   * afecta a si se ve el tiempo/✓ tras cada ensayo, nunca a la logica. */
  showFeedback: boolean
}

const DEFAULT_CONFIG: ExerciseConfig = {
  endMode: 'repetitions',
  totalTrials: 20,
  durationSeconds: 120,
  intervalMinMs: 1500,
  intervalMaxMs: 3000,
  stimulusColor: '#22c55e',
  contrastPercent: 100,
  showFeedback: true,
}

// ============ COMPONENTE PRINCIPAL ============

interface SimpleReactionExerciseProps {
  onComplete: (metrics: SimpleReactionMetrics, outcome?: ExerciseOutcome, idempotencyKey?: string, effectiveConfig?: Record<string, unknown>) => Promise<void>
  /** Mismo criterio que ReactionTimeExercise.tsx: controla "Guardar
   * resultados" y el aviso antes de perder resultados sin guardar. */
  canPersist?: boolean
  /** De ExerciseRunner.tsx - ver el mismo mecanismo, documentado en
   * detalle en ReactionTimeExercise.tsx (el bug real del bucle infinito
   * de renders que motiva el patron de refs usado mas abajo). */
  registerSpacebarStart?: (handler: (() => void) | null) => void
}

export default function SimpleReactionExercise({ onComplete, canPersist = false, registerSpacebarStart }: SimpleReactionExerciseProps) {
  const flow = useExerciseFlow<ExerciseConfig, SimpleReactionMetrics>({
    storageKey: STORAGE_KEY,
    defaultConfig: DEFAULT_CONFIG,
    onComplete,
  })

  // Estado especifico
  const [trialState, setTrialState] = useState<TrialState>('waiting')
  const [currentTrial, setCurrentTrial] = useState(0)
  const [lastReactionTime, setLastReactionTime] = useState<number | null>(null)
  const [lastTrialResult, setLastTrialResult] = useState<'valid' | 'omission' | null>(null)

  const [stoppedEarly, setStoppedEarly] = useState(false)
  const [partialMetrics, setPartialMetrics] = useState<PartialMetrics | null>(null)

  const [saveState, setSaveState] = useState<ExerciseSaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Refs especificos
  const stimulusStartRef = useRef<number>(0)
  // Si el ensayo YA tiene una respuesta valida registrada (equivalente a
  // clickedRef de ReactionTimeExercise.tsx, mismo nombre evitado a
  // proposito para no sugerir que cubre tambien las anticipadas - esas
  // tienen su propio guard, anticipatedThisTrialRef, justo abajo).
  const respondedRef = useRef(false)
  // Maximo UNA anticipacion contabilizada por ensayo, independientemente
  // de cuantas pulsaciones distintas (no repeticiones del SO, eso ya lo
  // filtra ExerciseRunner.tsx via event.repeat) lleguen durante la espera
  // de ese ensayo concreto - decision de diseño explicita (ver
  // handleClick) para no dejar un contador sin cota ante alguien
  // pulsando varias veces nervioso antes de que aparezca el estimulo.
  const anticipatedThisTrialRef = useRef(false)
  const reactionTimesRef = useRef<number[]>([])
  const validTrialsRef = useRef(0)
  const omissionsRef = useRef(0)
  const falseStartsRef = useRef(0)
  const trialLogRef = useRef<TrialRecord[]>([])
  const currentTrialRef = useRef(0)
  const stopRequestedRef = useRef(false)
  const idempotencyKeyRef = useRef('')

  // Captura de la configuracion EFECTIVA de esta ejecucion (fiabilidad de
  // datos, Fase A) - mismo criterio exacto que ReactionTimeExercise.tsx:
  // snapshot inmutable de flow.configRef.current, tomado en el MISMO
  // instante que idempotencyKeyRef (handleOpenFullscreen), nunca releido
  // despues. Sobrevive intacta a una finalizacion anticipada (solo se
  // reescribe en la SIGUIENTE llamada a handleOpenFullscreen). Puramente
  // en memoria - no se envia a ningun sitio ni se anade a
  // SimpleReactionMetrics todavia (Fase B, no autorizada aqui).
  const effectiveConfigRef = useRef<ExerciseConfig>(DEFAULT_CONFIG)

  const resetMetrics = useCallback(() => {
    reactionTimesRef.current = []
    validTrialsRef.current = 0
    omissionsRef.current = 0
    falseStartsRef.current = 0
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
      respondedRef.current = false
      anticipatedThisTrialRef.current = false

      const waitTime = intervalLo + Math.random() * (intervalHi - intervalLo)
      await flow.sleep(waitTime)
      if (flow.abortRef.current || stopRequestedRef.current) return
      if (deadline !== null && performance.now() >= deadline) break

      // Unico tipo de estimulo: siempre aparece, sin distribucion que
      // decidir (a diferencia de Go/No Go). El estimulo aparece en su
      // momento normal independientemente de si hubo una anticipacion
      // durante la espera que acaba de terminar - ver handleClick.
      setTrialState('go')
      stimulusStartRef.current = performance.now()

      await flow.sleep(STIMULUS_TIMEOUT_MS)
      if (flow.abortRef.current || stopRequestedRef.current) return
      if (deadline !== null && performance.now() >= deadline) break

      if (!respondedRef.current) {
        omissionsRef.current += 1
        trialLogRef.current.push({ trialNumber: trial + 1, outcome: 'omission', reactionTimeMs: null })
        setLastTrialResult('omission')
        setTrialState('result')
        await flow.sleep(RESULT_DISPLAY_MS)
      }

      if (flow.abortRef.current || stopRequestedRef.current) return
      if (deadline !== null && performance.now() >= deadline) break
      trial++
    }

    const completedTrials = validTrialsRef.current + omissionsRef.current
    const stats = computeReactionStats(reactionTimesRef.current)

    flow.setMetricsResult({
      totalTrials: completedTrials,
      validTrials: validTrialsRef.current,
      omissions: omissionsRef.current,
      falseStarts: falseStartsRef.current,
      reactionTimes: [...reactionTimesRef.current],
      avgReactionTimeMs: stats.avg,
      minReactionTimeMs: stats.min,
      maxReactionTimeMs: stats.max,
      medianReactionTimeMs: stats.median,
      config: {
        trialCount: completedTrials,
        minDelayMs: cfg.intervalMinMs,
        maxDelayMs: cfg.intervalMaxMs,
        stimulusType: 'color',
      },
    })
    flow.setStage('feedback')
  }, [flow])

  const handleStartExercise = useCallback(() => {
    flow.handleStartExercise()
    runExercise()
  }, [flow, runExercise])

  // Respuesta a un estimulo (clic o, mas abajo, Espacio) - unica
  // implementacion, usada tanto por RunningScreen (onClick) como por el
  // registro de Espacio (handleClickRef, justo despues).
  //
  // Regla de anticipacion (trialState==='waiting'): se cuenta como
  // falseStart, SIN marcar respondedRef y SIN cambiar trialState. Esto es
  // deliberado y es la parte menos obvia de este archivo, documentada
  // aqui con su justificacion completa porque la especificacion pide
  // explicitamente no dejar esta decision implicita:
  //
  // - El limite temporal de "antes del estimulo" es trialState==='waiting'
  //   (el propio estado que runExercise ya usa para la espera previa) -
  //   no se inventa una ventana nueva, es la misma que ya gobierna cuando
  //   aparece el circulo. No hay ambiguedad: antes de 'go', es espera;
  //   desde 'go', es el estimulo.
  // - Una anticipacion NO termina el ensayo ni le quita su oportunidad de
  //   resolverse como valido/omision: el estimulo sigue apareciendo en el
  //   momento programado (waitTime ya en curso, ininterrumpido) y
  //   stimulusStartRef se fija igual que siempre al entrar en 'go'. Por
  //   que: una anticipacion mide "¿respondio antes de tiempo?", una
  //   pregunta independiente de "¿respondio bien una vez aparecio el
  //   estimulo?" - tratarlas como mutuamente excluyentes (p.ej. que una
  //   anticipacion cancelara el ensayo) mezclaria ambas preguntas en una
  //   sola categoria, exactamente lo que la especificacion pide evitar.
  // - anticipatedThisTrialRef limita a UNA anticipacion contabilizada por
  //   ensayo (ver el comentario de esa ref mas arriba) - cualquier
  //   pulsacion adicional durante la misma espera, despues de la primera,
  //   no incrementa falseStartsRef de nuevo.
  // - Sin feedback visual durante la espera cuando ocurre una anticipacion
  //   (el "+" de fijacion no cambia) - decision deliberada para no
  //   introducir un estado visual nuevo que pudiera percibirse como parte
  //   del propio ensayo; la anticipacion se refleja unicamente en las
  //   metricas finales y en "Ver desglose por intento". Posible mejora
  //   futura (no implementada aqui, fuera del alcance pedido): un
  //   indicador breve y no disruptivo en el momento mismo de la
  //   anticipacion.
  const handleClick = useCallback(() => {
    if (flow.stage !== 'running') return

    if (trialState === 'waiting') {
      if (anticipatedThisTrialRef.current) return
      anticipatedThisTrialRef.current = true
      falseStartsRef.current += 1
      trialLogRef.current.push({ trialNumber: currentTrialRef.current + 1, outcome: 'anticipated', reactionTimeMs: null })
      return
    }

    if (trialState === 'go') {
      if (respondedRef.current) return
      respondedRef.current = true
      const elapsed = Math.round(performance.now() - stimulusStartRef.current)
      setLastReactionTime(elapsed)
      reactionTimesRef.current.push(elapsed)
      validTrialsRef.current += 1
      trialLogRef.current.push({ trialNumber: currentTrialRef.current + 1, outcome: 'valid', reactionTimeMs: elapsed })
      setLastTrialResult('valid')
      setTrialState('result')
    }
  }, [flow.stage, trialState])

  // Inicio con barra espaciadora - mismo mecanismo y mismo motivo
  // documentados en detalle en ReactionTimeExercise.tsx (bug real del
  // bucle infinito de renders ya diagnosticado y corregido alli; aqui se
  // aplica el mismo patron desde el principio, no se reintroduce el bug).
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

  const handleShowResults = useCallback(() => {
    flow.exitFullscreen()
    flow.setStage('finished')
  }, [flow])

  const handleExit = useCallback(async () => {
    if (saveState === 'saved') return

    setSaveState('saving')
    setSaveError(null)
    try {
      if (flow.metricsResult) {
        await onComplete(flow.metricsResult, 'completed', idempotencyKeyRef.current, effectiveConfigRef.current as unknown as Record<string, unknown>)
      } else if (partialMetrics) {
        const stats = computeReactionStats(reactionTimesRef.current)
        const interruptedMetrics: SimpleReactionMetrics = {
          totalTrials: partialMetrics.completedTrials,
          validTrials: partialMetrics.validTrials,
          omissions: partialMetrics.omissions,
          falseStarts: partialMetrics.falseStarts,
          reactionTimes: [...reactionTimesRef.current],
          avgReactionTimeMs: stats.avg,
          minReactionTimeMs: stats.min,
          maxReactionTimeMs: stats.max,
          medianReactionTimeMs: stats.median,
          config: {
            trialCount: partialMetrics.completedTrials,
            minDelayMs: flow.configRef.current.intervalMinMs,
            maxDelayMs: flow.configRef.current.intervalMaxMs,
            stimulusType: 'color',
          },
        }
        await onComplete(interruptedMetrics, 'interrupted', idempotencyKeyRef.current, effectiveConfigRef.current as unknown as Record<string, unknown>)
      }
      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el resultado.')
      throw err
    }
  }, [flow, onComplete, partialMetrics, saveState])

  const handleSaveResults = useCallback(() => {
    handleExit().catch(() => {
      // El error ya se guardo en saveState/saveError dentro de handleExit.
    })
  }, [handleExit])

  const handleStopEarly = useCallback(() => {
    stopRequestedRef.current = true

    const completedTrials = validTrialsRef.current + omissionsRef.current
    const stats = computeReactionStats(reactionTimesRef.current)

    setPartialMetrics({
      completedTrials,
      endMode: flow.configRef.current.endMode,
      totalConfigured: flow.configRef.current.totalTrials,
      validTrials: validTrialsRef.current,
      omissions: omissionsRef.current,
      falseStarts: falseStartsRef.current,
      avgReactionTime: reactionTimesRef.current.length > 0 ? stats.avg : null,
    })
    setStoppedEarly(true)
    flow.exitFullscreen()
  }, [flow])

  // Color real mostrado (color elegido mezclado hacia BACKGROUND_HEX
  // segun contrastPercent) - calculado UNA vez aqui, igual que
  // ClickTargetsExercise.tsx/VisualMemoryExercise.tsx, y reenviado tanto
  // a la Vista previa de ConfigScreen como al estimulo real de
  // RunningScreen. Puramente de presentacion (una propiedad CSS
  // backgroundColor) - no toca trialState, handleClick, runExercise ni
  // ningun ref de metricas.
  const displayColor = applyContrast(flow.config.stimulusColor, BACKGROUND_HEX, flow.config.contrastPercent / 100)

  // ============ RENDER ============

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tiempo de reacción</h1>
        <p className="text-sm text-gray-600">Responde en cuanto aparezca el estímulo. Responder antes de tiempo cuenta como anticipación, no como acierto.</p>
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
              displayColor={displayColor}
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
          <FeedbackScreen metrics={flow.metricsResult} onExit={handleShowResults} />
        )}
      </div>

      {flow.stage === 'finished' && flow.metricsResult && (
        <ResultsScreen
          metrics={flow.metricsResult}
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
 * ClickTargetsExercise.tsx (PREVIEW_BOX_SIZE=160): el estimulo de este
 * ejercicio no tiene un tamaño configurable (a diferencia del target de
 * Click Targets), asi que el circulo de la vista previa usa un tamaño
 * fijo razonable, no "a escala real". */
const PREVIEW_BOX_SIZE = 160
const PREVIEW_CIRCLE_SIZE = 80

function ConfigScreen({ config, setConfig, displayColor, defaultsSaved, onSaveDefaults, onStart }: {
  config: ExerciseConfig
  setConfig: React.Dispatch<React.SetStateAction<ExerciseConfig>>
  displayColor: string
  defaultsSaved: boolean
  onSaveDefaults: () => void
  onStart: () => void
}) {
  const sectionLabel = 'mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'
  const sliderClass = 'w-44 sm:w-48 h-2 bg-gray-200 rounded-lg cursor-pointer accent-orion-navy-600'

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
                <input type="range" min={5} max={50} step={5} value={config.totalTrials}
                  onChange={(e) => setConfig((c) => ({ ...c, totalTrials: parseInt(e.target.value) }))}
                  className={sliderClass} />
                <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.totalTrials} intentos</span>
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

        <div className="space-y-2">
          <div>
            <p className={sectionLabel}>Color del estímulo</p>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm text-gray-500">{config.stimulusColor}</span>
            </div>
            <ColorPalette
              ariaLabel="Color del estímulo"
              value={config.stimulusColor}
              onChange={(stimulusColor) => setConfig((c) => ({ ...c, stimulusColor }))}
            />
          </div>

          <div>
            <p className={sectionLabel}>Contraste del estímulo</p>
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
        </div>

        {/* Vista previa: mismo patron que ClickTargetsExercise.tsx/
            VisualMemoryExercise.tsx - caja de tamaño fijo sobre el fondo
            real de ejecucion (BACKGROUND_HEX/bg-gray-900), con el color ya
            mezclado (displayColor), para ver el resultado del contraste
            sin tener que entrar en el ejercicio. */}
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
                style={{ width: PREVIEW_CIRCLE_SIZE, height: PREVIEW_CIRCLE_SIZE, backgroundColor: displayColor }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="mb-2 text-sm text-gray-500">
          <span className="font-medium text-green-700">✓ Responde en cuanto aparezca</span>
          {' · '}
          <span className="font-medium text-amber-700">Antes de tiempo = anticipación</span>
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

function RunningScreen({ config, displayColor, currentTrial, trialState, lastReactionTime, lastTrialResult, onClick, onStopEarly, stopContainer }: {
  config: ExerciseConfig; displayColor: string; currentTrial: number; trialState: TrialState
  lastReactionTime: number | null; lastTrialResult: 'valid' | 'omission' | null
  onClick: () => void; onStopEarly: () => void; stopContainer: HTMLElement | null
}) {
  return (
    <div className="relative w-full h-full cursor-pointer select-none" style={{ minHeight: '100vh' }} onClick={onClick}>
      <div className="absolute top-6 left-1/2 -translate-x-1/2">
        <div className="px-4 py-2 rounded-full bg-gray-800 text-gray-300 text-sm font-semibold">
          {config.endMode === 'repetitions'
            ? `Intento ${currentTrial + 1} de ${config.totalTrials}`
            : `Intento ${currentTrial + 1}`}
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div
          className={`w-72 h-72 md:w-80 md:h-80 rounded-full flex items-center justify-center transition-colors duration-100 ${
            trialState === 'go' ? 'shadow-2xl' : ''
          }`}
          style={trialState === 'go' ? { backgroundColor: displayColor } : undefined}
        >
          {trialState === 'waiting' && (
            <span className="text-3xl font-light leading-none text-gray-500 select-none" aria-hidden="true">+</span>
          )}
          {trialState === 'go' && <p className="text-white text-5xl font-bold drop-shadow">GO</p>}
          {trialState === 'result' && (
            config.showFeedback ? (
              <div className="text-center">
                {lastTrialResult === 'valid' && lastReactionTime !== null && (
                  <><p className="text-green-400 text-4xl font-bold mb-2">{lastReactionTime} ms</p><p className="text-green-400 text-xl">✓</p></>
                )}
                {lastTrialResult === 'omission' && <p className="text-amber-400 text-2xl font-bold">¡Muy lento!</p>}
              </div>
            ) : (
              <span className="text-3xl font-light leading-none text-gray-500 select-none" aria-hidden="true">+</span>
            )
          )}
        </div>
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-4 text-gray-400 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: displayColor }} /> = Clic o Espacio
        </span>
      </div>

      <ExerciseStopButton onClick={onStopEarly} container={stopContainer} />
    </div>
  )
}

function StoppedScreen({ metrics, trialLog, onRepeat, onReconfigure, onBeforeExit, onSave, saveState, saveError }: {
  metrics: PartialMetrics; trialLog: TrialRecord[]
  onRepeat: () => void; onReconfigure: () => void; onBeforeExit?: () => void | Promise<void>
  onSave?: () => void; saveState?: ExerciseSaveState; saveError?: string | null
}) {
  const hasTrials = metrics.completedTrials > 0

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
            <div className="flex justify-between text-sm"><span className="text-gray-600">Válidos</span><span className="text-gray-900 font-bold">{metrics.validTrials}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Omisiones</span><span className="text-red-600 font-bold">{metrics.omissions}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600">Anticipaciones</span><span className="text-amber-600 font-bold">{metrics.falseStarts}</span></div>
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

function FeedbackScreen({ metrics, onExit }: { metrics: SimpleReactionMetrics; onExit: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <Card className="p-8 max-w-md w-full text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">¡Completado!</h2>
        <div className="space-y-3 mb-8 text-left">
          <div className="flex justify-between text-base"><span className="text-gray-600">Válidos</span><span className="text-gray-900 font-bold">{metrics.validTrials}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Omisiones</span><span className="text-red-600 font-bold">{metrics.omissions}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Anticipaciones</span><span className="text-amber-600 font-bold">{metrics.falseStarts}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Reacción media</span><span className="text-green-600 font-bold">{metrics.avgReactionTimeMs} ms</span></div>
        </div>
        <Button onClick={onExit} variant="primary" className="w-full px-6 py-2">Ver Resultados Completos</Button>
      </Card>
    </div>
  )
}

/** Boton "Ver/Ocultar desglose por intento" + tabla - mismo patron
 * compartido entre ResultsScreen/StoppedScreen que ReactionTimeExercise.tsx,
 * duplicado aqui a proposito (misma autosuficiencia por archivo). Una
 * fila por EVENTO (no por ensayo): un ensayo con anticipacion aparece dos
 * veces (una 'Anticipada', una 'Válida'/'Omisión') - ver TrialRecord mas
 * arriba para el motivo. */
function TrialBreakdown({ trialLog }: { trialLog: TrialRecord[] }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const outcomeLabel: Record<TrialOutcome, string> = {
    valid: '✓ Válida',
    omission: '✗ Omisión',
    anticipated: '⚠ Anticipada',
  }
  const outcomeColor: Record<TrialOutcome, string> = {
    valid: 'text-green-600',
    omission: 'text-red-600',
    anticipated: 'text-amber-600',
  }
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
                <th className="px-3 py-2 text-left font-medium text-gray-600">Resultado</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {trialLog.map((t, i) => (
                <tr key={`${t.trialNumber}-${t.outcome}-${i}`} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 text-gray-700">{t.trialNumber}</td>
                  <td className={`px-3 py-1.5 font-medium ${outcomeColor[t.outcome]}`}>{outcomeLabel[t.outcome]}</td>
                  <td className="px-3 py-1.5 text-gray-700">
                    {t.reactionTimeMs !== null ? `${t.reactionTimeMs} ms` : 'Sin tiempo'}
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
  amber: 'bg-amber-50',
}
const METRIC_LABEL_COLOR: Record<string, string> = {
  blue: 'text-blue-700',
  gray: 'text-gray-600',
  green: 'text-green-700',
  red: 'text-red-700',
  amber: 'text-amber-700',
}
const METRIC_VALUE_COLOR: Record<string, string> = {
  blue: 'text-blue-600',
  gray: 'text-gray-900',
  green: 'text-green-600',
  red: 'text-red-600',
  amber: 'text-amber-600',
}

function MetricCard({ color, label, value }: { color: keyof typeof METRIC_CARD_BG; label: string; value: string | number }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${METRIC_CARD_BG[color]}`}>
      <p className={`text-xs ${METRIC_LABEL_COLOR[color]}`}>{label}</p>
      <p className={`text-lg font-bold sm:text-xl ${METRIC_VALUE_COLOR[color]}`}>{value}</p>
    </div>
  )
}

function ResultsScreen({ metrics, trialLog, onRepeat, onReconfigure, onBeforeExit, onSave, saveState, saveError }: {
  metrics: SimpleReactionMetrics; trialLog: TrialRecord[]
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
        breakdown={<TrialBreakdown trialLog={trialLog} />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
          <MetricCard color="green" label="Válidos" value={metrics.validTrials} />
          <MetricCard color="red" label="Omisiones" value={metrics.omissions} />
          <MetricCard color="amber" label="Anticipaciones" value={metrics.falseStarts} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCard color="gray" label="Media" value={`${metrics.avgReactionTimeMs} ms`} />
          <MetricCard color="blue" label="Mejor" value={`${metrics.minReactionTimeMs} ms`} />
          <MetricCard color="blue" label="Mediana" value={`${metrics.medianReactionTimeMs} ms`} />
          <MetricCard color="gray" label="Peor" value={`${metrics.maxReactionTimeMs} ms`} />
        </div>
      </ExerciseResultsCard>
    </div>
  )
}
