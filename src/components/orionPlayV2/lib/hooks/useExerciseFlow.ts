'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Stages comunes a todos los ejercicios:
 * - config: Pantalla de configuración inicial
 * - fullscreen-ready: Pantalla completa, listo para comenzar
 * - running: Ejercicio en ejecución
 * - feedback: Pantalla de resultados dentro de fullscreen
 * - finished: Ejercicio completado (fuera de fullscreen)
 */
export type ExerciseStage = 'config' | 'fullscreen-ready' | 'running' | 'feedback' | 'finished'

export interface UseExerciseFlowOptions<TConfig, TMetrics> {
  /** Clave para localStorage (e.g., 'reactionTime_defaults') */
  storageKey: string
  /** Configuración por defecto del ejercicio */
  defaultConfig: TConfig
  /** Callback al completar el ejercicio */
  onComplete: (metrics: TMetrics) => void
  /** Función opcional para validar/transformar config al cargar de localStorage */
  validateConfig?: (config: TConfig) => TConfig
}

export interface UseExerciseFlowReturn<TConfig, TMetrics> {
  // Estado
  stage: ExerciseStage
  config: TConfig
  metricsResult: TMetrics | null
  defaultsSaved: boolean
  isFullscreenStage: boolean

  // Refs
  fullscreenRef: React.RefObject<HTMLDivElement>
  abortRef: React.MutableRefObject<boolean>
  configRef: React.MutableRefObject<TConfig>

  // Acciones de configuración
  setConfig: React.Dispatch<React.SetStateAction<TConfig>>
  handleSaveDefaults: () => void

  // Acciones de flujo
  handleOpenFullscreen: () => Promise<void>
  handleExitFullscreen: () => void
  handleStartExercise: () => void
  setStage: React.Dispatch<React.SetStateAction<ExerciseStage>>

  // Para usar desde el ejercicio
  setMetricsResult: React.Dispatch<React.SetStateAction<TMetrics | null>>
  handleExitFeedback: () => void

  // Utilidades
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => void
  sleep: (ms: number) => Promise<void>
}

/**
 * Hook que centraliza la lógica común de flujo de ejercicios.
 *
 * Maneja:
 * - Estados del flujo (config → fullscreen-ready → running → feedback → finished)
 * - Persistencia de configuración en localStorage
 * - Gestión de fullscreen
 * - Abort/cleanup
 *
 * @example
 * ```tsx
 * const flow = useExerciseFlow<MyConfig, MyMetrics>({
 *   storageKey: 'myExercise_defaults',
 *   defaultConfig: { trials: 20 },
 *   onComplete: (metrics) => saveToBackend(metrics)
 * })
 *
 * // En el componente:
 * if (flow.stage === 'config') return <ConfigScreen {...flow} />
 * if (flow.stage === 'running') return <ExerciseScreen {...flow} />
 * ```
 */
export function useExerciseFlow<TConfig extends object, TMetrics>({
  storageKey,
  defaultConfig,
  onComplete,
  validateConfig,
}: UseExerciseFlowOptions<TConfig, TMetrics>): UseExerciseFlowReturn<TConfig, TMetrics> {
  // Estado principal
  const [stage, setStage] = useState<ExerciseStage>('config')
  const [config, setConfig] = useState<TConfig>(defaultConfig)
  const [defaultsSaved, setDefaultsSaved] = useState(false)
  const [metricsResult, setMetricsResult] = useState<TMetrics | null>(null)

  // Refs
  const fullscreenRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef(false)
  const configRef = useRef<TConfig>(config)

  // Mantener configRef sincronizado
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Cargar configuración de localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TConfig
        const validated = validateConfig ? validateConfig(parsed) : parsed
        // eslint-disable-next-line react-hooks/set-state-in-effect -- conservado tal cual del original V.2; el riesgo de reset de config ya esta documentado para la revision individual de ejercicios (Fase 1 no corrige logica de useExerciseFlow)
        setConfig({ ...defaultConfig, ...validated })
      } catch {
        // Si falla el parsing, mantener defaults
      }
    }
  }, [storageKey, defaultConfig, validateConfig])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  // Utilidad para esperar
  const sleep = useCallback((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)), [])

  // Guardar configuración como defaults
  const handleSaveDefaults = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify(config))
    setDefaultsSaved(true)
    setTimeout(() => setDefaultsSaved(false), 2000)
  }, [storageKey, config])

  // Fullscreen
  const enterFullscreen = useCallback(async () => {
    const elem = fullscreenRef.current
    if (elem?.requestFullscreen) {
      try {
        await elem.requestFullscreen()
      } catch {
        // Algunos navegadores pueden bloquear fullscreen
      }
    }
  }, [])

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  // Abrir fullscreen y preparar ejercicio
  const handleOpenFullscreen = useCallback(async () => {
    abortRef.current = false
    setMetricsResult(null)
    await enterFullscreen()
    setStage('fullscreen-ready')
  }, [enterFullscreen])

  // Salir de fullscreen y volver a config
  const handleExitFullscreen = useCallback(() => {
    abortRef.current = true
    exitFullscreen()
    setStage('config')
  }, [exitFullscreen])

  // Comenzar el ejercicio
  const handleStartExercise = useCallback(() => {
    abortRef.current = false
    setStage('running')
  }, [])

  // Salir de feedback y finalizar
  const handleExitFeedback = useCallback(() => {
    exitFullscreen()
    setStage('finished')
    if (metricsResult) {
      onComplete(metricsResult)
    }
  }, [exitFullscreen, metricsResult, onComplete])

  const isFullscreenStage = stage !== 'config' && stage !== 'finished'

  return {
    // Estado
    stage,
    config,
    metricsResult,
    defaultsSaved,
    isFullscreenStage,

    // Refs
    fullscreenRef: fullscreenRef as React.RefObject<HTMLDivElement>,
    abortRef,
    configRef,

    // Acciones de configuración
    setConfig,
    handleSaveDefaults,

    // Acciones de flujo
    handleOpenFullscreen,
    handleExitFullscreen,
    handleStartExercise,
    setStage,

    // Para usar desde el ejercicio
    setMetricsResult,
    handleExitFeedback,

    // Utilidades
    enterFullscreen,
    exitFullscreen,
    sleep,
  }
}

/**
 * Hook adicional para ejercicios que necesitan manejar el tamaño del contenedor en fullscreen.
 */
export function useFullscreenSize() {
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const updateSize = () => {
      if (document.fullscreenElement) {
        setContainerSize({
          width: window.innerWidth,
          height: window.innerHeight
        })
      }
    }

    document.addEventListener('fullscreenchange', updateSize)
    window.addEventListener('resize', updateSize)

    return () => {
      document.removeEventListener('fullscreenchange', updateSize)
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  return containerSize
}

/**
 * Hook para ejercicios que usan keyboard input.
 */
export function useExerciseKeyboard(
  onKeyPress: (key: string) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      onKeyPress(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onKeyPress, enabled])
}

export default useExerciseFlow
