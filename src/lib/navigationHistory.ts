/**
 * Estado en memoria (no persistido) de si ha habido al menos una
 * navegacion cliente dentro de la app en esta pestaña. Se reinicia a 0
 * en cada carga real del modulo (URL directa, recarga, marcador, nueva
 * pestaña) — asi BackButton distingue "hay historial interno valido
 * al que volver" de "no lo hay, usar el fallback contextual de la
 * pantalla". Solo tiene sentido usado desde componentes cliente.
 */
let internalNavigations = 0;

export function markInternalNavigation() {
  internalNavigations += 1;
}

export function hasInternalHistory() {
  return internalNavigations > 0;
}
