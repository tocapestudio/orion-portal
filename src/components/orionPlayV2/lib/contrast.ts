/**
 * Utilidad compartida de contraste - extraida de ClickTargetsExercise.tsx
 * y VisualMemoryExercise.tsx, donde esta misma logica estaba duplicada
 * byte a byte. Usada tambien por ReactionTimeExercise.tsx y
 * SimpleReactionExercise.tsx (Go/No Go y Tiempo de reaccion), que no
 * tenian ningun mecanismo de contraste antes de esta fase.
 *
 * `applyContrast` NO es un calculo de contraste fotometrico, de
 * luminancia calibrada ni de ratio WCAG - es una interpolacion lineal por
 * canal RGB entre el color elegido y un color de referencia
 * (BACKGROUND_HEX). `ratio=1` -> color elegido puro (maximo contraste,
 * sin mezclar); `ratio` menor -> el color mostrado se acerca al color de
 * referencia. Deliberadamente NO se implementa con `opacity` CSS (con
 * opacity el fondo "se transparenta" de forma menos controlada; con
 * mezcla de color, el resultado es siempre un color solido predecible
 * para cualquier combinacion color+contraste) - esto ya era asi en las
 * dos copias originales y se conserva identico aqui.
 */

/** Fondo real de la pantalla de ejecucion (clase bg-gray-900 del
 * contenedor fullscreen, en los 4 ejercicios V2) - el contraste mezcla el
 * color del estimulo hacia este valor, nunca hacia un gris generico
 * distinto del que realmente se ve detras. */
export const BACKGROUND_HEX = '#111827'

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Mezcla `hex` hacia `toward` segun `ratio` (1 = hex puro/maximo
 * contraste, 0 = toward puro/contraste minimo). Interpolacion lineal por
 * canal RGB - cambia el color real mostrado, no la opacidad. */
export function applyContrast(hex: string, toward: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(toward)
  return rgbToHex(r2 + (r1 - r2) * ratio, g2 + (g1 - g2) * ratio, b2 + (b1 - b2) * ratio)
}
