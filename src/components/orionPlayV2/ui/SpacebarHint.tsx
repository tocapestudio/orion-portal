/**
 * Texto secundario que indica el atajo de barra espaciadora disponible en
 * ConfigScreen/ReadyScreen de los 3 ejercicios V2 (ver ExerciseRunner.tsx
 * para el mecanismo real - este componente es puramente visual, no
 * registra ni desregistra nada por si mismo). Compartido para no repetir
 * el mismo marcado 6 veces (3 ejercicios x 2 pantallas); ConfigScreen/
 * ReadyScreen en si siguen siendo propios de cada ejercicio, sin fusionar.
 *
 * `tone` adapta el color al fondo de la pantalla que lo usa, reutilizando
 * el mismo gris que cada pantalla ya usa para su propio texto secundario
 * (no se introduce un color nuevo): 'light' para ConfigScreen (fondo
 * claro, mismo gris que `sectionLabel` de esa pantalla), 'dark' para
 * ReadyScreen (fondo oscuro bg-gray-900, mismo gris que el resto del
 * texto secundario de esa pantalla, p.ej. "20 intentos").
 */
export default function SpacebarHint({ label, tone }: { label: string; tone: 'light' | 'dark' }) {
  return (
    <p className={`mt-2 text-center text-xs ${tone === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
      {label}
    </p>
  )
}
