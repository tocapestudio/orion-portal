/**
 * Logica PURA de generacion de secuencia GO/NO-GO de Go/No Go
 * (ReactionTimeExercise.tsx) - extraida para poder probarla con el test
 * runner nativo de Node (node --test), mismo patron ya establecido en
 * effectiveConfig.ts/resultRowMapping.ts/athleteOwnership.ts de este
 * proyecto (ver visual-lab/play/).
 *
 * Deliberadamente SIN ningun import de React/Next.js - cualquier import
 * de ese tipo aqui reintroduciria el problema que esta extraccion
 * resuelve (no poder importarla desde node --test sin arrastrar el
 * bundler de Next.js).
 */

/**
 * Genera una secuencia de `total` booleanos (true = GO) con exactamente
 * round(total*ratio) GO, barajada con Fisher-Yates. Pura: no toca refs ni
 * estado de React, se recalcula en cada llamada (cada ejecucion, incluido
 * "Repetir", obtiene un orden nuevo).
 *
 * Usada por el modo 'fixed': garantiza la CUOTA exacta sobre el total de
 * la ejecucion; el barajado solo decide el ORDEN en el que aparecen los
 * GO ya contados. Sin cambios de comportamiento respecto a la version
 * que vivia inline en ReactionTimeExercise.tsx antes de esta extraccion.
 */
export function buildFixedSequence(total: number, ratio: number): boolean[] {
  const goCount = Math.min(total, Math.max(0, Math.round(total * ratio)));
  const sequence = Array.from({ length: total }, (_, i) => i < goCount);
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = sequence[i];
    sequence[i] = sequence[j];
    sequence[j] = tmp;
  }
  return sequence;
}

/**
 * Decide si UN intento es GO en modo 'random': sorteo independiente con
 * probabilidad `goRatio` de ser GO.
 *
 * A diferencia de 'fixed' (cuota EXACTA garantizada sobre el total),
 * `goRatio` aqui es una PROBABILIDAD por intento, no una proporcion
 * garantizada sobre el total de la ejecucion - no hay cuota ni memoria de
 * los estimulos anteriores. Pueden salir rachas de cualquier longitud por
 * puro azar, igual que con una moneda sesgada lanzada repetidamente: esto
 * es intencional, no un defecto a corregir aqui (ver auditoria de la
 * incidencia de Go/No Go: no se introduce ningun limite de racha ni
 * alternancia forzada, ni en esta funcion ni en quien la llama).
 *
 * ANTES de esta correccion, runExercise (ReactionTimeExercise.tsx) usaba
 * `Math.random() < 0.5` directamente para el modo 'random', ignorando
 * goRatio por completo (bug real: el deslizador "% GO" de la UI no tenia
 * ningun efecto en este modo, pese a mostrarse como si lo tuviera -
 * corregido reemplazando esa llamada por decideRandomIsGo(goRatio)).
 *
 * `randomFn` inyectable (por defecto `Math.random`) unicamente para que
 * las pruebas puedan ser deterministas cuando lo necesiten; en produccion
 * siempre se usa el `Math.random` real, nunca se inyecta otra cosa.
 */
export function decideRandomIsGo(goRatio: number, randomFn: () => number = Math.random): boolean {
  return randomFn() < goRatio;
}

/**
 * Sortea la probabilidad GO real de UNA sesion completa en modo
 * 'random' (incluido 'time', que fuerza 'random' - ver runExercise en
 * ReactionTimeExercise.tsx): un unico valor en el rango [0.5, 0.9),
 * sorteado UNA VEZ al iniciar la sesion (handleOpenFullscreen) y
 * reutilizado SIN CAMBIOS para cada sorteo independiente de
 * decideRandomIsGo durante toda esa sesion - nunca se vuelve a sortear
 * hasta la siguiente vez que se abre pantalla completa (una ejecucion
 * nueva, incluido "Repetir").
 *
 * El profesional NO configura este valor en modo 'random' (a diferencia
 * de 'fixed', donde si elige goRatio libremente) - por eso esta funcion
 * no recibe ninguna configuracion como argumento, solo el generador
 * aleatorio inyectable (mismo motivo que en decideRandomIsGo: permitir
 * pruebas deterministas sin tocar el `Math.random` real de produccion).
 *
 * Limite superior matematicamente ABIERTO, no una desviacion del
 * requisito "entre 50% y 90% inclusive": con un sorteo CONTINUO
 * (Math.random() en [0,1)), ningun valor fijo (incluido exactamente 0.9)
 * tiene probabilidad distinta de cero de salir - describir un rango
 * continuo como "inclusive" en sus dos extremos es el lenguaje habitual
 * para el intervalo cerrado [0.5, 0.9] que delimita los valores
 * POSIBLES, no una garantia de que el extremo superior exacto vaya a
 * sortearse alguna vez (no la tiene, por construccion, con cualquier
 * generador continuo). No se usa ninguna otra formula (p.ej. redondeo a
 * un numero finito de pasos) porque el requisito no pide una cuota de
 * valores discretos, solo un rango continuo de probabilidades.
 */
export function drawSessionGoRatio(randomFn: () => number = Math.random): number {
  return 0.5 + randomFn() * 0.4;
}
