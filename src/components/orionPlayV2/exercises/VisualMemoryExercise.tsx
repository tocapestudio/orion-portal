'use client'

/**
 * Visual Memory Precision - ampliacion de configuracion y dificultad
 * sobre la version anterior de este archivo (que ya era una adaptacion
 * fiel de ORION Play V.2). La mecanica BASE no se ha rehecho, se ha
 * ampliado:
 *
 * 1 ronda = patron -> memorizar -> recordar -> comprobar -> metricas de
 * esa ronda -> feedback visual (~2s, FEEDBACK_DISPLAY_MS) -> siguiente
 * ronda o resultados. Las metricas de la ronda se calculan y se acumulan
 * en handleSubmit, ANTES del feedback - este ultimo es puramente visual
 * (borde verde/amarillo/rojo por celda + resumen compacto), no afecta a
 * que la ronda cuente ni a su resultado. Lo que cambia respecto a la
 * version anterior es que ahora puede haber VARIAS rondas por ejecucion,
 * segun el modo de finalizacion elegido:
 *
 * - 'repetitions': N rondas fijas (config.repetitions). Al completar la
 *   ultima, termina.
 * - 'time': rondas continuas mientras quede tiempo (deadline independiente
 *   de los clics, mismo patron que ClickTargetsExercise.tsx). Si el
 *   tiempo se acaba con una ronda a medias (memorizando o recordando sin
 *   haber pulsado "Comprobar"), esa ronda NO se cuenta - sus datos nunca
 *   llegan a sumarse porque eso solo ocurre dentro de handleSubmit.
 * - 'progressive': sin deadline. Partiendo de la cuadricula/patternCount
 *   configurados (cuadrado: rows=cols=gridSize), SOLO si la ronda se
 *   supera por completo (patron perfecto: todas las celdas correctas,
 *   ninguna incorrecta, ninguna omitida - ver isRoundPerfect):
 *     - mientras rows < PROGRESSIVE_MAX_ROWS (7): rows y cols suben +1
 *       JUNTOS (sigue cuadrado) y patternCount +1.
 *     - al llegar a 7 filas: rows se congela, solo cols sigue subiendo +1
 *       (aprovechando que horizontalmente hay mucho mas espacio) hasta
 *       PROGRESSIVE_MAX_COLS (10) - nivel final 7x10, donde patternCount
 *       tambien deja de subir.
 *   Ver nextProgressiveLevel. Un fallo mantiene exactamente el mismo
 *   nivel (mismas rows/cols/patternCount), para poder reintentarlo con un
 *   patron nuevo - nunca retrocede. Como no tiene fin natural, necesita un
 *   boton propio ("Detener y ver resultados") para poder terminar y ver
 *   las metricas - mismo concepto que "Salir y detener ejercicio" en
 *   Click Targets, pero aqui SIEMPRE termina en una ronda ya resuelta
 *   (nunca hay un "intento parcial" que mostrar aparte, porque solo se
 *   avanza de ronda despues de un "Comprobar" completo) - por eso no hace
 *   falta una StoppedScreen independiente: el mismo flujo feedback/
 *   finished sirve para los 3 modos.
 *   NOTA: si el usuario configura una cuadricula inicial > 7 (p.ej. 9x9) y
 *   elige Progresivo, las filas de arranque se acotan a 7 (handleStartExercise/
 *   ReadyScreen) - las columnas no, asi que ese caso puntual arrancaria en
 *   7x9, no en 9x9. Los ejemplos dados solo empiezan en <=7, este caso de
 *   borde no estaba cubierto explicitamente; es una decision tomada para
 *   respetar el limite duro de filas visibles comodamente.
 *
 * VisualMemoryMetrics (lib/types.ts) se ha ampliado de forma ADITIVA con
 * `roundsCompleted` - los 4 campos originales (correctSelections/
 * incorrectSelections/missedTiles/accuracyPercent) se mantienen, ahora
 * representando la SUMA de todas las rondas completadas (antes, con una
 * sola ronda posible, ya representaban esa unica ronda - mismo campo,
 * significado compatible). El renderer compartido ResultSummary.tsx
 * (VisualMemorySummary) no se ha tocado - sigue leyendo esos 4 campos y
 * los muestra correctamente con el nuevo significado agregado.
 *
 * Nuevo registro local (no persistido, no forma parte de
 * VisualMemoryMetrics): RoundRecord, un elemento por ronda COMPLETADA,
 * para "Ver progresión" en ResultsScreen.
 *
 * BUG CORREGIDO (ya corregido en fases anteriores): patternCount no puede
 * exceder gridSize² en la configuracion (3x3 -> maximo 9, ..., 10x10 ->
 * maximo 100). Dos capas: 1) el onChange de gridSize reclampa patternCount
 * al nuevo maximo; 2) defensa adicional en startRound (safePatternCount,
 * ahora sobre rows*cols) por si una config invalida llegase por otra via.
 * El modo progresivo nunca genera un patternCount mayor que rows*cols por
 * construccion (nextProgressiveLevel).
 *
 * Nuevas configuraciones, todas aditivas sobre 'visualMemory_defaults'
 * (useExerciseFlow ya rellena los campos que falten en una config antigua
 * guardada, via el merge {...defaultConfig, ...validated} - no hace falta
 * migracion manual):
 * - cellSize ('small'|'medium'|'large'): tamaño VISUAL de cada celda, que
 *   se mantiene aproximadamente constante al crecer rows/cols (la
 *   cuadricula crece fisicamente en su lugar) - solo se reduce si de
 *   verdad no cabe en el espacio real disponible (ver computeCellPx y
 *   useElementSize, medidos sobre el contenedor en pantalla).
 * - stimulusColor + contrastPercent: mismo concepto/paleta/formula que
 *   ClickTargetsExercise.tsx (applyContrast, mezcla real de color contra
 *   BACKGROUND_HEX, nunca opacity) - duplicados aqui a proposito, mismo
 *   criterio de autosuficiencia por archivo ya aplicado a los otros dos
 *   ejercicios. displayColor se calcula UNA vez en el componente principal
 *   y se pasa como prop tanto a la preview de ConfigScreen como a la
 *   ejecucion real - nunca se duplica el calculo.
 * - endMode/repetitions/durationSeconds: mismo concepto que
 *   ReactionTimeExercise.tsx/ClickTargetsExercise.tsx. QUICK_DURATION_PRESETS
 *   reutiliza exactamente los mismos 7 valores ([15,30,45,60,120,180,300]).
 *
 * Iconos inline SVG: mismo set que los otros dos ejercicios + CheckCircleIcon
 * (ya existia aqui) + ListIcon (para "Ver progresión"). Clases Tailwind
 * inexistentes (primary, success, error, warning) sustituidas por
 * orion-navy/green/red/amber. Navegacion de salida: ya no la decide este
 * archivo (ver ExerciseExitButton.tsx, compartido con los otros dos
 * ejercicios) - handleExit solo notifica onComplete. Conflicto Runner/
 * ResultsScreen resuelto igual que en los otros dos ejercicios
 * (handleShowResults en vez de flow.handleExitFeedback).
 *
 * No usa useFullscreenSize (no lo necesita - el ancho del grid es fijo,
 * independiente del contenedor real).
 */
/* eslint-disable react-hooks/refs */

import { useState, useRef, useCallback, useEffect } from 'react'
import type { VisualMemoryMetrics } from '../lib/types'
import Card from '../ui/Card'
import Button from '../ui/Button'
import ExerciseStopButton from '../ui/ExerciseStopButton'
import ExerciseResultsCard from '../ui/ExerciseResultsCard'
import type { ExerciseSaveState } from '../ui/ExerciseSaveButton'
import SpacebarHint from '../ui/SpacebarHint'
import { useExerciseFlow } from '../lib/hooks'
import type { ExerciseOutcome } from '../exercise-runner/ExerciseRunner'
import { BACKGROUND_HEX, applyContrast } from '../lib/contrast'

// ============ ICONOS (inline SVG) ============

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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

// ============ COLOR / CONTRASTE (mismo concepto que ClickTargetsExercise.tsx) ============

// BACKGROUND_HEX/hexToRgb/rgbToHex/applyContrast: extraidas a
// ../lib/contrast.ts (import de arriba) - eran identicas byte a byte a
// las de ClickTargetsExercise.tsx, ahora comparten una unica
// implementacion. Misma formula, mismo resultado exacto.

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


// ============ FINALIZACION (mismo patron que los otros dos ejercicios) ============

type EndMode = 'repetitions' | 'time' | 'progressive'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} s`
  if (s === 0) return `${m} min`
  return `${m} min ${s} s`
}

/** Mismos 7 valores que ReactionTimeExercise.tsx/ClickTargetsExercise.tsx
 * - no se crea una segunda lista de presets. */
const QUICK_DURATION_PRESETS = [15, 30, 45, 60, 120, 180, 300]

/** Valores permitidos para la duracion de la fase de fijacion (ms). Lista
 * cerrada (no se añaden mas opciones por ahora) recorrida con el stepper
 * de ConfigScreen - 1000 ms es el valor por defecto (ver DEFAULT_CONFIG),
 * igual que antes de hacerse configurable. */
const FIXATION_DURATION_PRESETS = [250, 500, 750, 1000, 1500, 2000, 3000] as const

/** Avanza/retrocede un paso dentro de FIXATION_DURATION_PRESETS. Si el
 * valor actual no estuviera en la lista (no deberia ocurrir, config viene
 * siempre de DEFAULT_CONFIG o de este mismo stepper), se parte del valor
 * por defecto en vez de romper. */
function stepFixationDuration(current: number, direction: 1 | -1): number {
  const idx = FIXATION_DURATION_PRESETS.indexOf(current as typeof FIXATION_DURATION_PRESETS[number])
  const safeIdx = idx === -1 ? FIXATION_DURATION_PRESETS.indexOf(1000) : idx
  const nextIdx = Math.min(FIXATION_DURATION_PRESETS.length - 1, Math.max(0, safeIdx + direction))
  return FIXATION_DURATION_PRESETS[nextIdx]
}

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

const STORAGE_KEY = 'visualMemory_defaults'

type CellSize = 'small' | 'medium' | 'large'

const CELL_SIZE_PX: Record<CellSize, number> = {
  small: 32,
  medium: 48,
  large: 80,
}

/** Separacion entre celdas (coincide con gap-2 de Tailwind). */
const GRID_GAP = 8

/** Hueco vertical reservado, DENTRO del mismo bloque centrado que la
 * cuadricula (ver RunningScreen), para el badge de ronda + la zona de
 * accion de altura fija + el icono de interrupcion + sus gaps. El
 * presupuesto de alto disponible para la cuadricula debe descontar esto
 * del alto real medido del contenedor, o el conjunto completo
 * desbordaria el viewport aunque la cuadricula "sola" pareciera caber. */
const RUNNING_SCREEN_CHROME_HEIGHT = 230

/** Margen de seguridad horizontal/vertical restado al tamaño medido del
 * contenedor (ver useElementSize) antes de calcular el presupuesto de la
 * cuadricula, para que nunca quede literalmente pegada al borde. */
const VIEWPORT_SAFETY_MARGIN = 32

/** Tamaño de celda realmente usado: el elegido por el usuario ("Pequeña"/
 * "Mediana"/"Grande"), SALVO que desbordaria el espacio realmente
 * disponible (medido del contenedor en pantalla, no una constante fija -
 * ver useElementSize), en cuyo caso se reduce lo justo para encajar en
 * ambos ejes a la vez. Prioridad explicita: 1) mantener el tamaño
 * elegido, 2) dejar que la cuadricula crezca fisicamente con rows/cols,
 * 3) aprovechar el espacio disponible, 4) evitar overflow real - por eso
 * el presupuesto (availableWidth/availableHeight) viene del tamaño real
 * del contenedor (que es la pantalla completa cuando el Fullscreen API
 * esta activo) y no de un rectangulo pequeño fijo como antes. */
function computeCellPx(cellSize: CellSize, rows: number, cols: number, availableWidth: number, availableHeight: number): number {
  const desired = CELL_SIZE_PX[cellSize]
  const widthBudget = Math.max(0, availableWidth - VIEWPORT_SAFETY_MARGIN)
  const heightBudget = Math.max(0, availableHeight - RUNNING_SCREEN_CHROME_HEIGHT - VIEWPORT_SAFETY_MARGIN)
  const maxByWidth = Math.floor((widthBudget - (cols - 1) * GRID_GAP) / cols)
  const maxByHeight = Math.floor((heightBudget - (rows - 1) * GRID_GAP) / rows)
  return Math.max(1, Math.min(desired, maxByWidth, maxByHeight))
}

/** Mide en vivo el tamaño de un elemento (ResizeObserver) - se usa sobre
 * `flow.fullscreenRef` para conocer el espacio REAL disponible para la
 * cuadricula: cuando el Fullscreen API esta realmente activo, ese
 * elemento ocupa la pantalla completa (no esta limitado por el
 * `max-w-6xl` del contenedor exterior); si el navegador no llega a
 * activar fullscreen, sigue reflejando el tamaño real disponible
 * (el del contenedor, mas pequeño). Evita adivinar con window.innerWidth. */
function useElementSize(ref: React.RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}

interface ExerciseConfig {
  gridSize: number
  patternCount: number
  cellSize: CellSize
  memorizeTimeSec: number
  stimulusColor: string
  /** 10-100. 100 = color elegido sin mezclar (maximo contraste). */
  contrastPercent: number
  endMode: EndMode
  /** Solo relevante si endMode === 'repetitions'. */
  repetitions: number
  /** Solo relevante si endMode === 'time'. */
  durationSeconds: number
  /** Si es true, se inserta una fase de fijacion (cruz "+", FIXATION_DURATION_MS)
   * entre memorizar y recordar, en TODAS las rondas y modos. Por defecto
   * false, para mantener el comportamiento actual. Puramente de
   * presentacion: no afecta a ninguna metrica ni a la logica de acierto. */
  showFixation: boolean
  /** Duracion real de la fase de fijacion (ms), de FIXATION_DURATION_PRESETS.
   * Solo tiene efecto si showFixation es true. Parametro real de la
   * configuracion del ejercicio (no una constante hardcodeada) para que,
   * cuando llegue la persistencia de sesiones, pueda registrarse como
   * parte de la configuracion usada en esa ejecucion. */
  fixationDurationMs: number
}

const DEFAULT_CONFIG: ExerciseConfig = {
  gridSize: 4,
  patternCount: 5,
  cellSize: 'medium',
  memorizeTimeSec: 3,
  stimulusColor: '#3b82f6',
  contrastPercent: 100,
  endMode: 'repetitions',
  repetitions: 5,
  durationSeconds: 120,
  showFixation: false,
  fixationDurationMs: 1000,
}

/** Maximo valido de patternCount para un gridSize dado - pedido
 * explicitamente como exactamente gridSize² (p.ej. 10x10 -> maximo 100),
 * sin margen adicional. Usado tanto para reclampar en ConfigScreen como
 * para la defensa adicional en startRound. */
function maxPatternCount(gridSize: number): number {
  return gridSize * gridSize
}

/** Una ronda se considera "superada" cuando el patron se recuerda
 * perfectamente: todas las celdas correctas, ninguna incorrecta, ninguna
 * omitida. Usa exactamente las metricas que ya calcula el ejercicio
 * (correctSelections/incorrectSelections/missedTiles) - no crea ninguna
 * metrica paralela. */
function isRoundPerfect(correct: number, incorrect: number, missed: number, patternSize: number): boolean {
  return correct === patternSize && incorrect === 0 && missed === 0
}

/** Filas/columnas maximas de la progresion: hasta PROGRESSIVE_MAX_ROWS,
 * filas y columnas crecen juntas (cuadrado); al alcanzarlas, las filas se
 * congelan y solo siguen creciendo las columnas hasta
 * PROGRESSIVE_MAX_COLS (aprovechando que horizontalmente hay mucho mas
 * espacio disponible que verticalmente). Nivel final: 7x10. */
const PROGRESSIVE_MAX_ROWS = 7
const PROGRESSIVE_MAX_COLS = 10

/** Progresion determinista del modo 'progressive' (nunca aleatoria): si la
 * ronda se supera (patron perfecto):
 * - mientras rows < PROGRESSIVE_MAX_ROWS: filas y columnas suben +1 JUNTAS
 *   (sigue siendo cuadrado) y patternCount +1.
 * - una vez rows === PROGRESSIVE_MAX_ROWS: las filas ya no suben, solo las
 *   columnas (+1, hasta PROGRESSIVE_MAX_COLS) y patternCount +1 igual.
 * - al alcanzar PROGRESSIVE_MAX_ROWS x PROGRESSIVE_MAX_COLS, todo se
 *   congela ("simplemente continua en ese nivel").
 * Si falla, rows/cols/patternCount se mantienen exactamente iguales (se
 * reintenta el mismo nivel con un patron nuevo) - nunca retrocede. */
function nextProgressiveLevel(rows: number, cols: number, patternCount: number, roundSucceeded: boolean): { rows: number; cols: number; patternCount: number } {
  if (!roundSucceeded) return { rows, cols, patternCount }
  if (rows >= PROGRESSIVE_MAX_ROWS && cols >= PROGRESSIVE_MAX_COLS) return { rows, cols, patternCount }
  if (rows < PROGRESSIVE_MAX_ROWS) {
    return { rows: rows + 1, cols: cols + 1, patternCount: patternCount + 1 }
  }
  return { rows, cols: Math.min(PROGRESSIVE_MAX_COLS, cols + 1), patternCount: patternCount + 1 }
}

/** Registro de una ronda COMPLETADA (resuelta via "Comprobar"), para
 * "Ver progresión" en ResultsScreen. Puramente local - no forma parte de
 * VisualMemoryMetrics. rows/cols en vez de un unico gridSize porque el
 * modo progresivo puede alcanzar niveles rectangulares (p.ej. 7x9). */
interface RoundRecord {
  roundNumber: number
  rows: number
  cols: number
  patternCount: number
  correctSelections: number
  incorrectSelections: number
  missedTiles: number
  accuracyPercent: number
  /** Patron recordado perfectamente (ver isRoundPerfect) - en modo
   * progresivo, determina si se avanza de nivel. En los otros modos se
   * registra igual, solo informativo. */
  succeeded: boolean
}

type GameStage = 'ready' | 'memorize' | 'fixation' | 'recall' | 'feedback'

/** Duracion de la fase de feedback visual tras "Comprobar" (verde/
 * amarillo/rojo por celda) antes de pasar a la siguiente ronda o a
 * resultados. */
const FEEDBACK_DISPLAY_MS = 2000

// ============ COMPONENTE PRINCIPAL ============

interface VisualMemoryExerciseProps {
  onComplete: (
    metrics: VisualMemoryMetrics | Record<string, unknown>,
    outcome?: ExerciseOutcome,
    idempotencyKey?: string,
    effectiveConfig?: Record<string, unknown>
  ) => Promise<void>
  /** Si hay un deportista real seleccionado (no modo demo) - ver
   * VisualMemoryV2Runner.tsx, misma condicion que decide si se cablea
   * onPersist. Controla si se muestra "Guardar resultados" y si "Repetir"
   * avisa antes de perder resultados sin guardar - mismo criterio que
   * ReactionTimeExercise.tsx/SimpleReactionExercise.tsx/ClickTargetsExercise.tsx. */
  canPersist?: boolean
  /** De ExerciseRunner.tsx (ver ese archivo) - se usa para decir "si se
   * pulsa Espacio, arranca el ejercicio" SOLO mientras flow.stage==='config'
   * (ver el useEffect mas abajo que lo registra/desregistra). */
  registerSpacebarStart?: (handler: (() => void) | null) => void
}

export default function VisualMemoryExercise({ onComplete, canPersist = false, registerSpacebarStart }: VisualMemoryExerciseProps) {
  const flow = useExerciseFlow<ExerciseConfig, VisualMemoryMetrics>({
    storageKey: STORAGE_KEY,
    defaultConfig: DEFAULT_CONFIG,
    onComplete,
  })

  // Espacio real disponible para la cuadricula - ver useElementSize y
  // computeCellPx. Medido sobre el mismo elemento que entra en
  // Fullscreen, asi que refleja la pantalla completa cuando el Fullscreen
  // API esta realmente activo, o el tamaño real del contenedor si no.
  const fullscreenSize = useElementSize(flow.fullscreenRef)

  // Estado especifico del juego
  const [gameStage, setGameStage] = useState<GameStage>('ready')
  const [pattern, setPattern] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [countdown, setCountdown] = useState(3)
  // rows/cols/patternCount de la ronda EN CURSO. En repeticiones/tiempo se
  // quedan fijos (rows === cols === config.gridSize) durante toda la
  // ejecucion; en progresivo, avanzan segun nextProgressiveLevel solo
  // cuando se supera una ronda - rows y cols por separado porque, a partir
  // de 7 filas, el grid deja de ser cuadrado (ver PROGRESSIVE_MAX_ROWS/COLS).
  const [roundRows, setRoundRows] = useState(DEFAULT_CONFIG.gridSize)
  const [roundCols, setRoundCols] = useState(DEFAULT_CONFIG.gridSize)
  const [roundPatternCount, setRoundPatternCount] = useState(DEFAULT_CONFIG.patternCount)
  const [roundsCompleted, setRoundsCompleted] = useState(0)
  // Resumen de la ultima ronda resuelta, solo para el texto compacto
  // durante gameStage 'feedback' - deriva de las mismas metricas que ya
  // se acumulan en los refs de abajo, no es una metrica paralela.
  const [lastRoundSummary, setLastRoundSummary] = useState<{ correct: number; incorrect: number; missed: number } | null>(null)

  // Estado de "Guardar resultados" (boton que guarda sin salir - ver
  // ExerciseSaveButton.tsx) - mismo criterio exacto que
  // ReactionTimeExercise.tsx/SimpleReactionExercise.tsx/ClickTargetsExercise.tsx.
  const [saveState, setSaveState] = useState<ExerciseSaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Agregados de todas las rondas completadas de esta ejecucion
  const correctRef = useRef(0)
  const incorrectRef = useRef(0)
  const missedRef = useRef(0)
  const totalPatternCellsRef = useRef(0)
  const roundsCompletedRef = useRef(0)
  const roundLogRef = useRef<RoundRecord[]>([])
  // Una clave nueva por ejecucion, reenviada tal cual a onComplete en
  // handleExit - mismo criterio exacto que los otros 3 ejercicios.
  const idempotencyKeyRef = useRef('')
  // Evita que una ronda en curso se cuente si el tiempo se acaba o se
  // pide "Detener y ver resultados" mientras se esta memorizando/recordando.
  const stopRequestedRef = useRef(false)
  const deadlineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Timer de la fase de feedback visual (~2s) tras "Comprobar".
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Captura de la configuracion EFECTIVA de esta ejecucion (fiabilidad de
  // datos, Fase A) - mismo criterio que ReactionTimeExercise.tsx/
  // SimpleReactionExercise.tsx/ClickTargetsExercise.tsx: snapshot
  // inmutable de flow.configRef.current, tomado en handleOpenFullscreen
  // (antes de cualquier ronda), nunca releido despues. Reenviada a
  // onComplete en handleExit (ver mas abajo) - actions.ts la usa para
  // construir config_used real via buildConfigUsed/isValidEffectiveConfig.
  const effectiveConfigRef = useRef<ExerciseConfig>(DEFAULT_CONFIG)

  const handleOpenFullscreen = useCallback(async () => {
    idempotencyKeyRef.current = crypto.randomUUID()
    effectiveConfigRef.current = { ...flow.configRef.current }
    setPattern(new Set())
    setSelected(new Set())
    setCountdown(flow.config.memorizeTimeSec)
    setGameStage('ready')
    setRoundRows(flow.config.gridSize)
    setRoundCols(flow.config.gridSize)
    setRoundPatternCount(flow.config.patternCount)
    setRoundsCompleted(0)
    setLastRoundSummary(null)
    setSaveState('idle')
    setSaveError(null)
    stopRequestedRef.current = false
    correctRef.current = 0
    incorrectRef.current = 0
    missedRef.current = 0
    totalPatternCellsRef.current = 0
    roundsCompletedRef.current = 0
    roundLogRef.current = []
    if (deadlineTimeoutRef.current) {
      clearTimeout(deadlineTimeoutRef.current)
      deadlineTimeoutRef.current = null
    }
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
    await flow.handleOpenFullscreen()
  }, [flow])

  // Construye VisualMemoryMetrics a partir de los agregados actuales -
  // usado tanto al terminar por repeticiones, como por tiempo, como al
  // pulsar "Detener y ver resultados" en modo progresivo.
  const finishExercise = useCallback(() => {
    const totalPatternCells = totalPatternCellsRef.current
    const metrics: VisualMemoryMetrics = {
      correctSelections: correctRef.current,
      incorrectSelections: incorrectRef.current,
      missedTiles: missedRef.current,
      accuracyPercent: totalPatternCells > 0 ? Math.min(100, (correctRef.current / totalPatternCells) * 100) : 0,
      roundsCompleted: roundsCompletedRef.current,
    }
    flow.setMetricsResult(metrics)
    flow.setStage('feedback')
  }, [flow])

  // Fin automatico del modo 'time': deadline independiente de los clics
  // (mismo patron que ClickTargetsExercise.tsx). Si dispara mientras una
  // ronda esta a medias (memorizando o recordando sin "Comprobar"), esa
  // ronda nunca llega a sumarse - solo handleSubmit suma a los agregados.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- flow.abortRef es un ref (igual motivo que la desactivacion de react-hooks/refs al inicio del archivo): el React Compiler infiere aqui una dependencia mas especifica (flow.abortRef.current) que la declarada (flow), por ser el unico acceso a flow.* en este callback
  const finishByTime = useCallback(() => {
    if (flow.abortRef.current || stopRequestedRef.current) return
    stopRequestedRef.current = true
    deadlineTimeoutRef.current = null
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current)
      feedbackTimeoutRef.current = null
    }
    finishExercise()
  }, [flow, finishExercise])

  // Icono discreto "Detener ejercicio y ver resultados", disponible en
  // TODOS los modos (antes solo en progresivo, que era el unico sin fin
  // natural - ahora es el control unico de interrupcion para los 3 modos,
  // sustituyendo tambien a la X que antes descartaba todo sin resultados).
  // Misma logica que finishByTime: si hay una ronda a medias
  // (memorizando/fijacion/recordando/feedback), se descarta sin contar -
  // solo se conservan las rondas ya completadas (ver handleSubmit, que es
  // el UNICO sitio donde se suma a los agregados).
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
    finishExercise()
  }, [finishExercise])

  // Genera el patron de UNA ronda (rows/cols/patternCount explicitos, no
  // leidos de estado compartido, para que el bucle de memorizacion de
  // abajo nunca dependa de un valor que pueda cambiar entre medias) y
  // ejecuta la fase de memorizacion (cuenta atras). No decide cuando
  // termina el ejercicio - eso lo decide handleSubmit al completar la ronda.
  // La posicion de cada celda del patron es un indice 0..rows*cols-1 (fila
  // = Math.floor(indice/cols), columna = indice % cols) - Math.random()
  // sobre ese rango nunca puede caer fuera de rows x cols, sea o no cuadrado.
  const startRound = useCallback(async (rows: number, cols: number, patternCount: number) => {
    const totalCells = rows * cols
    // Defensa adicional (ver bug corregido en cabecera): nunca generar mas
    // celdas de patron que celdas totales disponibles.
    const safePatternCount = Math.min(patternCount, totalCells)

    const newPattern = new Set<number>()
    while (newPattern.size < safePatternCount) {
      newPattern.add(Math.floor(Math.random() * totalCells))
    }
    setPattern(newPattern)
    setSelected(new Set())
    setRoundRows(rows)
    setRoundCols(cols)
    setRoundPatternCount(safePatternCount)
    setGameStage('memorize')

    const memorizeTimeSec = flow.configRef.current.memorizeTimeSec
    for (let i = memorizeTimeSec; i > 0; i--) {
      if (flow.abortRef.current || stopRequestedRef.current) return
      setCountdown(i)
      await flow.sleep(1000)
    }
    if (flow.abortRef.current || stopRequestedRef.current) return

    // Fase de fijacion opcional: cruz "+" centrada, cuadricula oculta
    // (misma posicion/tamaño del bloque, ver RunningScreen) - puramente
    // visual, no afecta a pattern/selected ni a ninguna metrica. Se lee
    // de configRef (no de una copia local) para reflejar siempre el valor
    // configurado actual, igual que memorizeTimeSec arriba.
    if (flow.configRef.current.showFixation) {
      setGameStage('fixation')
      await flow.sleep(flow.configRef.current.fixationDurationMs)
      if (flow.abortRef.current || stopRequestedRef.current) return
    }

    setGameStage('recall')
  }, [flow])

  const handleStartExercise = useCallback(() => {
    flow.handleStartExercise()
    stopRequestedRef.current = false
    if (flow.config.endMode === 'time') {
      deadlineTimeoutRef.current = setTimeout(() => finishByTime(), flow.config.durationSeconds * 1000)
    }
    // Nivel inicial: siempre la cuadricula configurada (cuadrada). En
    // modo progresivo, las filas se acotan a PROGRESSIVE_MAX_ROWS si el
    // usuario configuro una cuadricula inicial mayor (p.ej. 9x9) - el
    // limite de filas visibles comodamente es un tope duro de ese modo,
    // independiente de lo configurado; las columnas no se tocan, asi que
    // en ese caso puntual el nivel inicial real seria 7x9, no 9x9.
    const startRows = flow.config.endMode === 'progressive'
      ? Math.min(flow.config.gridSize, PROGRESSIVE_MAX_ROWS)
      : flow.config.gridSize
    startRound(startRows, flow.config.gridSize, flow.config.patternCount)
  }, [flow, startRound, finishByTime])

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

  const handleCellClick = useCallback((index: number) => {
    if (gameStage !== 'recall') return

    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [gameStage])

  // Decide que ocurre tras los ~2s de feedback: terminar (repeticiones
  // agotadas) o empezar la siguiente ronda. En progresivo, grid+celdas
  // avanzan juntos solo si la ronda anterior fue perfecta (ver
  // nextProgressiveLevel); en los otros modos, se repite el mismo
  // grid/celdas de siempre.
  const advanceAfterFeedback = useCallback((roundNumber: number, succeeded: boolean) => {
    if (flow.config.endMode === 'repetitions' && roundNumber >= flow.config.repetitions) {
      finishExercise()
      return
    }
    if (flow.config.endMode === 'progressive') {
      const next = nextProgressiveLevel(roundRows, roundCols, roundPatternCount, succeeded)
      startRound(next.rows, next.cols, next.patternCount)
    } else {
      startRound(roundRows, roundCols, roundPatternCount)
    }
  }, [flow, roundRows, roundCols, roundPatternCount, startRound, finishExercise])

  // Resuelve la ronda actual: calcula metricas, las acumula de inmediato
  // (la ronda YA esta resuelta en este punto - el feedback que sigue es
  // solo visual, no afecta a que se cuente o no) y pasa a gameStage
  // 'feedback' durante FEEDBACK_DISPLAY_MS antes de decidir que sigue. Si
  // el tiempo ya se agoto (o ya se pidio detener) mientras esta ronda
  // estaba en curso, no cuenta - exactamente la regla pedida ("una ronda
  // incompleta cuando acaba el tiempo no cuenta").
  const handleSubmit = useCallback(() => {
    if (stopRequestedRef.current) return

    const correct = [...selected].filter(i => pattern.has(i)).length
    const incorrect = [...selected].filter(i => !pattern.has(i)).length
    const missed = [...pattern].filter(i => !selected.has(i)).length
    const total = pattern.size
    const accuracy = total > 0 ? Math.min(100, (correct / total) * 100) : 0
    const succeeded = isRoundPerfect(correct, incorrect, missed, total)

    correctRef.current += correct
    incorrectRef.current += incorrect
    missedRef.current += missed
    totalPatternCellsRef.current += total
    const roundNumber = roundsCompletedRef.current + 1
    roundLogRef.current.push({
      roundNumber,
      rows: roundRows,
      cols: roundCols,
      patternCount: total,
      correctSelections: correct,
      incorrectSelections: incorrect,
      missedTiles: missed,
      accuracyPercent: accuracy,
      succeeded,
    })
    roundsCompletedRef.current = roundNumber
    setRoundsCompleted(roundNumber)
    setLastRoundSummary({ correct, incorrect, missed })
    setGameStage('feedback')

    feedbackTimeoutRef.current = setTimeout(() => {
      feedbackTimeoutRef.current = null
      if (stopRequestedRef.current) return
      advanceAfterFeedback(roundNumber, succeeded)
    }, FEEDBACK_DISPLAY_MS)
  }, [selected, pattern, roundRows, roundCols, advanceAfterFeedback])

  // "Cambiar configuracion": vuelve a ConfigScreen sin pasar por onComplete.
  // Mismo aviso que handleRepeat (ver ese comentario) si hay una ejecucion
  // real (canPersist) todavia sin guardar.
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
  // cargada. handleOpenFullscreen vacia todos los agregados y genera una
  // idempotencyKey NUEVA, y handleStartExercise/startRound generan
  // patrones NUEVOS (Math.random()) - nunca se reutiliza el Set de una
  // ejecucion anterior.
  //
  // Antes de descartar una ejecucion real (canPersist) que todavia no se
  // ha guardado explicitamente, se avisa - mismo criterio que los otros
  // 3 ejercicios.
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

  // Guarda la ejecucion actual - COMPARTIDO entre "Guardar resultados" (no
  // navega) y "Salir a ORION Play" (navega despues, via
  // ExerciseExitButton.tsx que espera esta promesa). Mismo criterio que
  // los otros 3 ejercicios, con una diferencia deliberada: este ejercicio
  // NUNCA distingue un outcome 'interrupted' - "Detener y ver resultados"
  // (handleStopEarly) ya llama a finishExercise(), la MISMA funcion que
  // cierra una ejecucion normal, y el resultado (rondas ya completadas) es
  // indistinguible de una finalizacion normal por diseño actual del
  // producto (ver cabecera del archivo) - no se introduce aqui una
  // distincion de estado que el propio ejercicio no tiene.
  //
  // roundLog (roundLogRef.current, RoundRecord[] con roundNumber/rows/
  // cols/patternCount/correctSelections/incorrectSelections/missedTiles/
  // accuracyPercent/succeeded por ronda) se añade como propiedad de
  // transporte adicional - actions.ts la separa de las metricas agregadas
  // y la guarda en results.raw_data (ver buildVisualMemoryResultRow). No
  // se persiste por separado, no se reconstruye ni se infiere ningun dato.
  const handleExit = useCallback(async () => {
    if (saveState === 'saved') return
    if (!flow.metricsResult) return

    setSaveState('saving')
    setSaveError(null)
    try {
      const payload: Record<string, unknown> = { ...flow.metricsResult, roundLog: roundLogRef.current }
      await onComplete(payload, 'completed', idempotencyKeyRef.current, effectiveConfigRef.current as unknown as Record<string, unknown>)
      setSaveState('saved')
    } catch (err) {
      setSaveState('error')
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el resultado.')
      throw err
    }
  }, [flow.metricsResult, onComplete, saveState])

  // "Guardar resultados": llama a handleExit (misma logica que "Salir")
  // pero sin navegar despues.
  const handleSaveResults = useCallback(() => {
    handleExit().catch(() => {
      // El error ya se guardo en saveState/saveError dentro de handleExit.
    })
  }, [handleExit])

  const displayColor = applyContrast(flow.config.stimulusColor, BACKGROUND_HEX, flow.config.contrastPercent / 100)

  // ============ RENDER ============

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Visual Memory Precision</h1>
        <p className="text-sm text-gray-600">Memoriza el patrón y selecciona las celdas correctas.</p>
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
          <RunningScreen
            config={flow.config}
            displayColor={displayColor}
            gameStage={gameStage}
            pattern={pattern}
            selected={selected}
            countdown={countdown}
            roundRows={roundRows}
            roundCols={roundCols}
            roundsCompleted={roundsCompleted}
            lastRoundSummary={lastRoundSummary}
            availableWidth={fullscreenSize.width}
            availableHeight={fullscreenSize.height}
            onCellClick={handleCellClick}
            onSubmit={handleSubmit}
            onStopEarly={handleStopEarly}
            stopContainer={flow.fullscreenRef.current}
          />
        )}

        {flow.stage === 'feedback' && flow.metricsResult && (
          <FeedbackScreen metrics={flow.metricsResult} onExit={handleShowResults} />
        )}
      </div>

      {flow.stage === 'finished' && flow.metricsResult && (
        <ResultsScreen
          metrics={flow.metricsResult}
          roundLog={roundLogRef.current}
          endMode={flow.config.endMode}
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

const sectionLabel = 'mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500'
/** flex-1 (en vez de un ancho fijo) para aprovechar el ancho real de
 * columna disponible tras ampliar los contenedores de ORION Play - un
 * tope maximo evita que se vuelva desproporcionado en pantallas muy
 * anchas. No afecta a la altura (h-2 fijo), solo rellena mejor el hueco
 * horizontal que antes quedaba vacio a la derecha de cada slider. */
const sliderClass = 'flex-1 max-w-72 h-2 bg-gray-200 rounded-lg cursor-pointer accent-orion-navy-600'

/** Caja de previsualizacion de dimensiones FIJAS - mismo patron ya
 * validado en ClickTargetsExercise.tsx. Representa solo color/contraste
 * (no gridSize/cellSize, que no se pidieron en la preview). */
const PREVIEW_BOX_SIZE = 120

/** Altura minima reservada para el contenido especifico de cada modo de
 * Finalizacion (Repeticiones/Tiempo/Progresivo), para que la tarjeta de
 * Configuracion no cambie de altura al alternar entre ellos - ajustada al
 * minimo real del contenido mas alto de los tres ("Tiempo": fila de
 * stepper ~32px + fila de presets ~36px), sin margen sobrante, para no
 * añadir altura innecesaria a la tarjeta (contribuye al antiscroll). */
const FINALIZATION_ZONE_HEIGHT = 76

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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-x-6 gap-y-2">
        <div className="space-y-2">
          <div>
            <p className={sectionLabel}>Cuadrícula</p>
            <div className="flex items-center gap-3">
              <input type="range" min={3} max={10} step={1} value={config.gridSize}
                onChange={(e) => {
                  const gridSize = parseInt(e.target.value)
                  setConfig((c) => ({
                    ...c,
                    gridSize,
                    // Reclamp: si el patternCount actual ya no cabe en la
                    // nueva cuadricula, se ajusta aqui mismo.
                    patternCount: Math.min(c.patternCount, maxPatternCount(gridSize)),
                  }))
                }}
                className={sliderClass} />
              <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.gridSize}×{config.gridSize}</span>
            </div>
          </div>

          <div>
            <p className={sectionLabel}>Tamaño de celda</p>
            <SegmentedToggle
              value={config.cellSize}
              options={[
                { value: 'small', label: 'Pequeña' },
                { value: 'medium', label: 'Mediana' },
                { value: 'large', label: 'Grande' },
              ]}
              onChange={(cellSize) => setConfig((c) => ({ ...c, cellSize }))}
            />
          </div>

          <div>
            <p className={sectionLabel}>Celdas a memorizar</p>
            <div className="flex items-center gap-3">
              <input type="range" min={3} max={maxPatternCount(config.gridSize)} step={1} value={config.patternCount}
                onChange={(e) => setConfig((c) => ({ ...c, patternCount: parseInt(e.target.value) }))}
                className={sliderClass} />
              <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.patternCount} celdas</span>
            </div>
          </div>

          <div>
            <p className={sectionLabel}>Tiempo de memorización</p>
            <div className="flex items-center gap-3">
              <input type="range" min={2} max={10} step={1} value={config.memorizeTimeSec}
                onChange={(e) => setConfig((c) => ({ ...c, memorizeTimeSec: parseInt(e.target.value) }))}
                className={sliderClass} />
              <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.memorizeTimeSec} s</span>
            </div>
          </div>

          <div>
            <p className={sectionLabel}>Punto de fijación</p>
            {/* Activado/Desactivado y, si esta activado, la duracion - EN
                LA MISMA FILA (no una fila nueva debajo): asi activar la
                duracion solo añade ANCHO, nunca ALTO, a esta columna - la
                causa real del scroll que aparecia al añadir la duracion
                (esta columna ya era la mas alta de las dos, y una fila
                extra la desbordaba por encima de la otra columna). */}
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedToggle
                value={config.showFixation ? 'with' : 'without'}
                options={[
                  { value: 'with', label: 'Activado' },
                  { value: 'without', label: 'Desactivado' },
                ]}
                onChange={(v) => setConfig((c) => ({ ...c, showFixation: v === 'with' }))}
              />
              {config.showFixation && (
                <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, fixationDurationMs: stepFixationDuration(c.fixationDurationMs, -1) }))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    aria-label="Reducir duración de fijación"
                  >
                    −
                  </button>
                  <span className="w-14 text-center text-sm font-medium text-gray-900">{config.fixationDurationMs} ms</span>
                  <button
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, fixationDurationMs: stepFixationDuration(c.fixationDurationMs, 1) }))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    aria-label="Aumentar duración de fijación"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <p className={sectionLabel}>Color del estímulo</p>
            <ColorPalette
              ariaLabel="Color del estímulo"
              value={config.stimulusColor}
              onChange={(stimulusColor) => setConfig((c) => ({ ...c, stimulusColor }))}
            />
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
              100% = color elegido sin mezclar (máximo contraste) · valores menores acercan el color mostrado al fondo
            </p>
          </div>

          <div>
            <p className={sectionLabel}>Finalización</p>
            <SegmentedToggle
              value={config.endMode}
              options={[
                { value: 'repetitions', label: 'Repeticiones' },
                { value: 'time', label: 'Tiempo' },
                { value: 'progressive', label: 'Progresivo' },
              ]}
              onChange={(endMode) => setConfig((c) => ({ ...c, endMode }))}
            />
            {/* Zona de altura minima fija: el contenido de cada modo
                (Repeticiones/Tiempo/Progresivo) tiene una altura natural
                distinta: sin esta reserva, la tarjeta de Configuracion
                entera cambiaba de altura al alternar entre modos. El
                valor (FINALIZATION_ZONE_HEIGHT) se basa en el contenido
                mas alto de los tres (el stepper + presets de "Tiempo"). */}
            <div className="mt-2" style={{ minHeight: FINALIZATION_ZONE_HEIGHT }}>
              {config.endMode === 'repetitions' && (
                <div className="flex items-center gap-3">
                  <input type="range" min={5} max={20} step={5} value={config.repetitions}
                    onChange={(e) => setConfig((c) => ({ ...c, repetitions: parseInt(e.target.value) }))}
                    className={sliderClass} />
                  <span className="whitespace-nowrap text-sm font-medium text-gray-900">{config.repetitions} rondas</span>
                </div>
              )}
              {config.endMode === 'time' && (
                <div>
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
              {config.endMode === 'progressive' && (
                <p className="text-xs text-gray-400">
                  La dificultad aumenta automáticamente al superar cada ronda: crecen la cuadrícula y las celdas a memorizar. A partir de 7×7, la cuadrícula sigue ampliándose horizontalmente hasta 7×10.
                </p>
              )}
            </div>
          </div>
        </div>

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
                className="rounded-lg"
                style={{ width: CELL_SIZE_PX[config.cellSize] * 0.8, height: CELL_SIZE_PX[config.cellSize] * 0.8, backgroundColor: displayColor }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100">
        <p className="mb-1.5 text-sm text-gray-500">
          Memoriza las celdas iluminadas · después, selecciona las que recuerdes y pulsa &quot;Comprobar&quot;
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
  // Mismo clamp que handleStartExercise: en progresivo, las filas
  // iniciales nunca superan PROGRESSIVE_MAX_ROWS, aunque la cuadricula
  // configurada sea mayor - se muestra aqui el nivel real con el que
  // arrancara la primera ronda, no el valor crudo de configuracion.
  const startRows = config.endMode === 'progressive' ? Math.min(config.gridSize, PROGRESSIVE_MAX_ROWS) : config.gridSize
  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <button onClick={onExit} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XMarkIcon className="h-8 w-8" /></button>
      <p className="text-white text-xl mb-4">Preparado para comenzar</p>
      <p className="text-gray-400 mb-2">Cuadrícula {startRows}×{config.gridSize}</p>
      <p className="text-gray-400 mb-8">
        {config.endMode === 'repetitions' && `${config.repetitions} rondas · ${config.patternCount} celdas a memorizar en ${config.memorizeTimeSec}s`}
        {config.endMode === 'time' && `${formatDuration(config.durationSeconds)} · ${config.patternCount} celdas a memorizar en ${config.memorizeTimeSec}s`}
        {config.endMode === 'progressive' && `Dificultad progresiva desde ${startRows}×${config.gridSize} · ${config.patternCount} celdas en ${config.memorizeTimeSec}s`}
      </p>
      <Button onClick={onStart} variant="primary" className="inline-flex items-center gap-2 text-xl px-12 py-4">
        <PlayIcon className="h-6 w-6" /> Comenzar
      </Button>
      <SpacebarHint label="Pulsa Espacio para comenzar" tone="dark" />
    </div>
  )
}

/** Altura FIJA de la zona de accion, justo debajo de la cuadricula.
 * Durante 'memorize' muestra la cuenta atras; durante 'recall', el boton
 * "Comprobar" + el texto "Seleccionadas: X / Y". Al ser siempre la misma
 * altura (se renderiza SIEMPRE, nunca se monta/desmonta condicionalmente),
 * el bloque grid+zona-de-accion tiene una altura total constante en todas
 * las fases - por eso la cuadricula nunca cambia de posicion vertical al
 * pasar de memorizar a recordar/comprobar. */
const ACTION_ZONE_HEIGHT = 96

/** Color de borde de feedback para una celda, segun su relacion con el
 * patron y con la seleccion del usuario - usa exactamente
 * pattern/selected, nada nuevo. Border (no relleno) para mantener la
 * cuadricula limpia, tal como se pidio. */
function feedbackBorderClass(isPattern: boolean, isSelected: boolean): string {
  if (isPattern && isSelected) return 'border-green-400'
  if (isPattern && !isSelected) return 'border-amber-400'
  if (!isPattern && isSelected) return 'border-red-400'
  return 'border-transparent'
}

function RunningScreen({ config, displayColor, gameStage, pattern, selected, countdown, roundRows, roundCols, roundsCompleted, lastRoundSummary, availableWidth, availableHeight, onCellClick, onSubmit, onStopEarly, stopContainer }: {
  config: ExerciseConfig
  displayColor: string
  gameStage: GameStage
  pattern: Set<number>
  selected: Set<number>
  countdown: number
  roundRows: number
  roundCols: number
  roundsCompleted: number
  lastRoundSummary: { correct: number; incorrect: number; missed: number } | null
  availableWidth: number
  availableHeight: number
  onCellClick: (index: number) => void
  onSubmit: () => void
  onStopEarly: () => void
  stopContainer: HTMLElement | null
}) {
  const totalCells = roundRows * roundCols
  // Antes de la primera medicion (availableWidth/Height en 0, ver
  // useElementSize) se usa un presupuesto generoso de fallback para que
  // el primer frame no calcule celdas de tamaño 0/1px - se corrige en el
  // siguiente render en cuanto ResizeObserver mide el contenedor real.
  const cellPx = computeCellPx(config.cellSize, roundRows, roundCols, availableWidth || 1200, availableHeight || 800)
  const gridWidth = roundCols * cellPx + (roundCols - 1) * GRID_GAP
  // Durante 'feedback'/'fixation', roundsCompleted ya incluye la ronda que
  // se esta mostrando/que ya se memorizo (se incrementa en handleSubmit,
  // o simplemente no ha cambiado desde memorize) - por eso aqui no se
  // suma +1 en 'feedback', a diferencia de memorize/fixation/recall.
  const roundNumber = gameStage === 'feedback' ? roundsCompleted : roundsCompleted + 1
  const isFixation = gameStage === 'fixation'

  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      {/* Unidad central: badge + cuadricula + zona de accion, dentro del
          mismo flex-column - asi el conjunto se centra como un solo
          bloque. Ni el badge ni la zona de accion cambian de alto entre
          memorize/fixation/recall/feedback (solo su TEXTO/contenido
          interno), asi que agruparlos aqui no reintroduce ningun salto de
          layout entre fases - la cuadricula + zona de accion siguen
          siendo, dentro de este grupo, el bloque de altura estable ya
          validado (ACTION_ZONE_HEIGHT). El icono de interrupcion ya NO
          forma parte de este grupo: ExerciseStopButton (compartido con
          Reaction Time/Click Targets) se posiciona por su cuenta en una
          esquina fija del viewport via portal, independiente del resto. */}
      <div className="flex flex-col items-center gap-6">
        <div className="px-4 py-2 rounded-full bg-gray-800 text-gray-300 text-sm font-semibold">
          {config.endMode === 'progressive' && `Nivel ${roundRows}×${roundCols} · `}
          {config.endMode === 'repetitions'
            ? `Ronda ${roundNumber} / ${config.repetitions}`
            : `Ronda ${roundNumber}`}
          {' · '}
          {gameStage === 'memorize' && `Memoriza... ${countdown}`}
          {isFixation && 'Fijación'}
          {gameStage === 'recall' && 'Recuerda el patrón'}
          {gameStage === 'feedback' && 'Resultado'}
        </div>

        {/* Cuadricula + zona de accion de altura fija, agrupadas para que
            su altura TOTAL no cambie entre fases - ver ACTION_ZONE_HEIGHT.
            Durante 'fixation', la cuadricula se oculta con opacity-0 (NO
            se desmonta: mismo footprint, misma posicion) y se superpone la
            cruz centrada en ese mismo hueco - por eso la cuadricula
            reaparece exactamente en la misma posicion en 'recall'. */}
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: gridWidth }}>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${roundCols}, minmax(0, 1fr))`,
                width: gridWidth,
                opacity: isFixation ? 0 : 1,
              }}
            >
              {Array.from({ length: totalCells }).map((_, i) => {
                const isPattern = pattern.has(i)
                const isSelected = selected.has(i)
                const lit = gameStage !== 'feedback' && ((gameStage === 'memorize' && isPattern) || isSelected)
                const borderClass = gameStage === 'feedback' ? feedbackBorderClass(isPattern, isSelected) : 'border-transparent'

                return (
                  <button
                    key={i}
                    onClick={() => onCellClick(i)}
                    disabled={gameStage !== 'recall'}
                    className={`aspect-square rounded-lg border-2 transition-colors duration-200 ${borderClass} ${
                      lit ? 'shadow-lg' : 'bg-gray-700 hover:bg-gray-600'
                    } ${gameStage === 'recall' ? 'cursor-pointer' : 'cursor-default'}`}
                    style={lit ? { backgroundColor: displayColor } : undefined}
                  />
                )
              })}
            </div>

            {isFixation && (
              <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <span className="text-2xl font-light leading-none text-gray-500 select-none">+</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center justify-center" style={{ height: ACTION_ZONE_HEIGHT }}>
            {gameStage === 'memorize' && (
              <p className="text-2xl font-bold text-white leading-none">{countdown}</p>
            )}
            {gameStage === 'recall' && (
              <>
                <Button onClick={onSubmit} variant="primary" className="inline-flex items-center gap-2 px-8 py-3">
                  <CheckCircleIcon className="h-5 w-5" /> Comprobar
                </Button>
                <p className="text-gray-500 text-sm mt-2 text-center">
                  Seleccionadas: {selected.size} / {pattern.size}
                </p>
              </>
            )}
            {gameStage === 'feedback' && lastRoundSummary && (
              <p className="text-sm font-semibold text-gray-200 text-center">
                ✓ {lastRoundSummary.correct} acertadas · {lastRoundSummary.missed} olvidadas · {lastRoundSummary.incorrect} incorrectas
              </p>
            )}
            {/* 'fixation': zona vacia a proposito - nada visualmente
                relevante aparte de la cruz, solo se reserva la altura. */}
          </div>
        </div>
      </div>

      {/* Icono discreto de interrupcion: mismo componente compartido
          (ExerciseStopButton) que Reaction Time y Click Targets - misma
          posicion exacta en el viewport en los 3 ejercicios, por eso ya
          no es un hijo mas del flex-column central de arriba. Mismo
          handleStopEarly ya validado (detiene, conserva lo ya resuelto,
          posicion fija durante TODA la ejecucion, los 3 modos, las 4
          fases). */}
      <ExerciseStopButton onClick={onStopEarly} container={stopContainer} />
    </div>
  )
}

function FeedbackScreen({ metrics, onExit }: { metrics: VisualMemoryMetrics; onExit: () => void }) {
  // Si se interrumpio el ejercicio antes de completar ni una ronda, no hay
  // metricas reales que mostrar - mostrar 0% de precision seria enganoso.
  // Ver tambien el mismo caso en ResultsScreen.
  if (metrics.roundsCompleted === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
        <Card className="p-8 max-w-md w-full text-center shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Sin rondas completadas</h2>
          <p className="text-sm text-gray-600 mb-8">
            El ejercicio se detuvo antes de completar la primera ronda, así que no hay resultados que mostrar.
          </p>
          <Button onClick={onExit} variant="primary" className="w-full px-6 py-2">Ver Resultados Completos</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center" style={{ minHeight: '100vh' }}>
      <Card className="p-8 max-w-md w-full text-center shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">¡Completado!</h2>
        <div className="space-y-3 mb-8 text-left">
          <div className="flex justify-between text-base"><span className="text-gray-600">Precisión</span><span className="text-gray-900 font-bold">{metrics.accuracyPercent.toFixed(1)}%</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Correctas</span><span className="text-green-600 font-bold">{metrics.correctSelections}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Incorrectas</span><span className="text-red-600 font-bold">{metrics.incorrectSelections}</span></div>
          <div className="flex justify-between text-base"><span className="text-gray-600">Olvidadas</span><span className="text-amber-600 font-bold">{metrics.missedTiles}</span></div>
        </div>
        <Button onClick={onExit} variant="primary" className="w-full px-6 py-2">Ver Resultados Completos</Button>
      </Card>
    </div>
  )
}

const METRIC_CARD_BG: Record<string, string> = {
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  red: 'bg-red-50',
  amber: 'bg-amber-50',
  gray: 'bg-gray-50',
}
const METRIC_LABEL_COLOR: Record<string, string> = {
  blue: 'text-blue-700',
  green: 'text-green-700',
  red: 'text-red-700',
  amber: 'text-amber-700',
  gray: 'text-gray-600',
}
const METRIC_VALUE_COLOR: Record<string, string> = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  amber: 'text-amber-600',
  gray: 'text-gray-900',
}

/** Tarjeta de metrica compacta, mismo patron que ResultsScreen en
 * ClickTargetsExercise.tsx (filosofia anti-scroll). */
function MetricCard({ color, label, value }: { color: keyof typeof METRIC_CARD_BG; label: string; value: string }) {
  return (
    <div className={`rounded-lg p-2.5 text-center ${METRIC_CARD_BG[color]}`}>
      <p className={`text-xs ${METRIC_LABEL_COLOR[color]}`}>{label}</p>
      <p className={`text-lg font-bold sm:text-xl ${METRIC_VALUE_COLOR[color]}`}>{value}</p>
    </div>
  )
}

/** "Ver progresión": desglose por ronda, colapsado por defecto, con
 * altura maxima + scroll interno (mismo patron que TargetBreakdown en
 * ClickTargetsExercise.tsx) - nunca hace crecer la pagina contenedora. */
function RoundBreakdown({ roundLog }: { roundLog: RoundRecord[] }) {
  const [show, setShow] = useState(false)
  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <Button
        onClick={() => setShow((o) => !o)}
        variant="secondary"
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm"
      >
        <ListIcon className="h-4 w-4" />
        {show ? 'Ocultar progresión' : 'Ver progresión'}
      </Button>

      {show && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Ronda</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Cuadrícula</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Celdas</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Precisión</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {roundLog.map((r) => (
                <tr key={r.roundNumber} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 text-gray-700">{r.roundNumber}</td>
                  <td className="px-3 py-1.5 text-gray-700">{r.rows}×{r.cols}</td>
                  <td className="px-3 py-1.5 text-gray-700">{r.patternCount}</td>
                  <td className="px-3 py-1.5 text-gray-700">{r.accuracyPercent.toFixed(0)}%</td>
                  <td className={`px-3 py-1.5 font-medium ${r.succeeded ? 'text-green-600' : 'text-red-600'}`}>
                    {r.succeeded ? '✓' : '✕'}
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

/** Mismo componente compartido (ExerciseResultsCard) que Reaction Time y
 * Click Targets - misma estructura/acciones/boton de salida. Visual
 * Memory no tiene una pantalla "Ejercicio detenido" separada (a
 * diferencia de los otros dos): detener pronto reutiliza este mismo
 * ResultsScreen con lo que ya se hubiera acumulado (ver handleStopEarly),
 * asi que esta pantalla YA cubre ambos casos (normal e interrumpido) con
 * el mismo titulo - precisamente el patron "un unico resultado, sin
 * importar si se llego por fin normal o por interrupcion" que se pedia
 * unificar en los otros dos ejercicios. */
function ResultsScreen({ metrics, roundLog, endMode, onRepeat, onReconfigure, onBeforeExit, onSave, saveState, saveError }: {
  metrics: VisualMemoryMetrics
  roundLog: RoundRecord[]
  endMode: EndMode
  onRepeat: () => void; onReconfigure: () => void; onBeforeExit?: () => void | Promise<void>
  onSave?: () => void; saveState?: ExerciseSaveState; saveError?: string | null
}) {
  const isProgressive = endMode === 'progressive'
  // La progresion nunca retrocede (rows/cols solo suben o se mantienen
  // igual tras un fallo) - el nivel maximo alcanzado es siempre el de la
  // ULTIMA ronda registrada, sea cuadrado (7x7) o rectangular (7x9).
  const lastRound = roundLog.length > 0 ? roundLog[roundLog.length - 1] : null
  // Mismo caso especial que FeedbackScreen: sin rondas completadas no hay
  // metricas reales, asi que no se muestran las tarjetas de precision/
  // correctas/incorrectas/olvidadas (serian 0%/0/0/0 enganosos) - solo un
  // mensaje, manteniendo las mismas acciones de navegacion.
  const hasRounds = metrics.roundsCompleted > 0

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
        breakdown={hasRounds ? <RoundBreakdown roundLog={roundLog} /> : undefined}
      >
        {hasRounds ? (
          <div className={`grid grid-cols-2 gap-2 ${isProgressive ? 'sm:grid-cols-6' : 'sm:grid-cols-5'}`}>
            <MetricCard color="blue" label="Precisión" value={`${metrics.accuracyPercent.toFixed(1)}%`} />
            <MetricCard color="green" label="Correctas" value={String(metrics.correctSelections)} />
            <MetricCard color="red" label="Incorrectas" value={String(metrics.incorrectSelections)} />
            <MetricCard color="amber" label="Olvidadas" value={String(metrics.missedTiles)} />
            <MetricCard color="gray" label="Rondas" value={String(metrics.roundsCompleted)} />
            {isProgressive && (
              <MetricCard color="blue" label="Nivel máximo" value={lastRound ? `${lastRound.rows}×${lastRound.cols}` : '—'} />
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Sin rondas completadas. El ejercicio se detuvo antes de terminar la primera ronda.
          </p>
        )}
      </ExerciseResultsCard>
    </div>
  )
}
