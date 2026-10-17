import Link from "next/link";
import { getAthletePlayResults } from "@/lib/data/playResults";
import { getPlayExercise } from "@/components/orionPlay/catalog";
import {
  computePlayRadarAxes,
  computeRadarPolygonPoints,
  describePlayRadarAxes,
  REQUIRED_RADAR_AXES,
  type RadarAxis,
} from "@/lib/ui/playRadarMetrics";

/**
 * Sustituye el resumen numerico anterior (contadores/fecha/porcentajes)
 * por un radar/spider chart - mismo hueco de tarjeta en General, misma
 * fuente de datos (getAthletePlayResults, sin consultas nuevas). La
 * seleccion/normalizacion de ejes (cada uno atado a UN SOLO ejercicio,
 * ver AXIS_SPECS) vive en playRadarMetrics.ts (pura, con sus
 * propias pruebas) - este archivo solo dibuja el SVG a partir de los
 * ejes YA calculados. Un eje sin datos suficientes simplemente no se
 * dibuja - nunca se fuerza a 0.
 *
 * El SVG es responsive via viewBox + preserveAspectRatio="xMidYMid meet"
 * (el valor por defecto): nunca recorta etiquetas porque "meet" escala
 * manteniendo SIEMPRE el viewBox completo visible.
 *
 * El contenedor que lo envuelve tiene un alto/ancho fijo (la tarjeta no
 * crece para acomodarlo), rectangular (CHART_WIDTH > CHART_HEIGHT), no
 * cuadrado: esto permite que el poligono (RADIUS) ocupe casi todo el
 * alto disponible sin que las etiquetas de 2 lineas ancladas a los ejes
 * horizontales (p.ej. "Click Targets"/"Go / No Go") se corten - usan el
 * ancho EXTRA del rectangulo, que no afecta en nada a la altura de la
 * tarjeta (la tarjeta tiene de sobra espacio horizontal, es la columna
 * ~40% de la fila superior de General). Las etiquetas verticales
 * (arriba/abajo, centradas en X) solo necesitan margen de ALTO, que es
 * el recurso mas escaso - de ahi que el hueco entre RADIUS y
 * LABEL_RADIUS se mantenga ajustado. 220x310 (y RADIUS/LABEL_RADIUS a
 * juego) son ~15% mas grandes que la version anterior (190x270,
 * RADIUS=72) en cada dimension - el texto de las etiquetas NO escala
 * (sigue en font-size:9 unidades de viewBox, el mismo tamaño de letra
 * real en pantalla que antes), asi que los margenes de ajuste de
 * etiqueta mejoran respecto a la version anterior en vez de empeorar.
 * Se centra con flexbox en el espacio ya reservado (nunca al reves).
 *
 * Gestion de errores: mismo patron que la version anterior - un fallo de
 * la consulta no debe tirar abajo toda la pestaña General (bloque
 * pequeño dentro de una pestaña con mucho mas contenido), se distingue
 * explicitamente de "sin resultados todavia".
 */

const CHART_HEIGHT = 220;
const CHART_WIDTH = 310;
const CENTER_X = CHART_WIDTH / 2;
const CENTER_Y = CHART_HEIGHT / 2;
const RADIUS = 83;
const LABEL_RADIUS = RADIUS + 12;
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1];
const MAX_LABEL_LINE_CHARS = 9;

function ringPointsAttr(fraction: number, axisCount: number): string {
  const points = computeRadarPolygonPoints(
    new Array(axisCount).fill(fraction * 100),
    CENTER_X,
    CENTER_Y,
    RADIUS
  );
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function labelAnchor(labelX: number): "start" | "middle" | "end" {
  if (labelX > CENTER_X + 4) return "start";
  if (labelX < CENTER_X - 4) return "end";
  return "middle";
}

/** Reparte una etiqueta corta en 1-2 lineas (nunca mas), buscando el
 * punto de corte entre palabras que minimiza la linea mas larga -
 * evita que nombres de dos palabras ("Memoria visual", "Go / No Go")
 * se salgan del área del grafico cuando quedan anclados en un eje
 * horizontal. Las etiquetas de una sola palabra ("Reacción") no se
 * dividen. */
function wrapLabel(label: string): string[] {
  const words = label.split(" ");
  if (words.length <= 1 || label.length <= MAX_LABEL_LINE_CHARS) return [label];

  let best = [label];
  let bestLongest = label.length;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(" ");
    const line2 = words.slice(i).join(" ");
    const longest = Math.max(line1.length, line2.length);
    if (longest < bestLongest) {
      bestLongest = longest;
      best = [line1, line2];
    }
  }
  return best;
}

function RadarChart({ axes }: { axes: RadarAxis[] }) {
  const scores = axes.map((a) => a.score);
  const dataPoints = computeRadarPolygonPoints(scores, CENTER_X, CENTER_Y, RADIUS);
  const labelPoints = computeRadarPolygonPoints(scores, CENTER_X, CENTER_Y, RADIUS, LABEL_RADIUS);
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const axisLineEnds = computeRadarPolygonPoints(new Array(axes.length).fill(100), CENTER_X, CENTER_Y, RADIUS);

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-full w-full"
      role="img"
      aria-label={`Radar de rendimiento visual: ${axes.map((a) => `${a.label} ${Math.round(a.score)} de 100`).join(", ")}`}
    >
      {RING_FRACTIONS.map((fraction) => (
        <polygon
          key={fraction}
          points={ringPointsAttr(fraction, axes.length)}
          fill="none"
          stroke="var(--orion-navy-100)"
          strokeWidth={1}
        />
      ))}

      {axisLineEnds.map((end, i) => (
        <line
          key={axes[i].key}
          x1={CENTER_X}
          y1={CENTER_Y}
          x2={end.x}
          y2={end.y}
          stroke="var(--orion-navy-100)"
          strokeWidth={1}
        />
      ))}

      <polygon
        points={dataPolygon}
        fill="var(--orion-accent)"
        fillOpacity={0.25}
        stroke="var(--orion-accent)"
        strokeWidth={2}
      />
      {dataPoints.map((p, i) => (
        <circle key={axes[i].key} cx={p.x} cy={p.y} r={2.5} fill="var(--orion-accent)" />
      ))}

      {labelPoints.map((p, i) => {
        const lines = wrapLabel(axes[i].label);
        // p.labelX/p.labelY (NUNCA p.x/p.y, que son los vertices del
        // poligono de datos y SI dependen del score) - la etiqueta debe
        // quedar a LABEL_RADIUS fijo del centro, independientemente de
        // la puntuacion del eje (incluido score=0).
        const anchor = labelAnchor(p.labelX);
        // Centra el bloque de texto verticalmente sobre el punto de
        // etiqueta cuando hay 2 lineas, en vez de apilarlas hacia abajo.
        const startDy = lines.length > 1 ? -4 : 0;
        return (
          <text
            key={axes[i].key}
            x={p.labelX}
            y={p.labelY}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-orion-navy-600"
            style={{ fontSize: 9, fontWeight: 600 }}
          >
            {lines.map((line, lineIndex) => (
              <tspan key={line} x={p.labelX} dy={lineIndex === 0 ? startDy : 10}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

export default async function VisualPerformanceSummary({ athleteId }: { athleteId: string }) {
  let axes: RadarAxis[] | null = null;
  let missingExerciseNames: string[] = [];
  let hasAnyResult = false;
  try {
    const results = await getAthletePlayResults(athleteId);
    hasAnyResult = results.length > 0;
    axes = computePlayRadarAxes(results);
    // Diagnostico completo (disponible o no cada uno de los 4 ejes
    // definidos, y de que ejercicio depende) - permite explicar
    // EXACTAMENTE que falta en vez de mostrar un radar vacio sin
    // contexto cuando no se alcanza el minimo de REQUIRED_RADAR_AXES.
    missingExerciseNames = describePlayRadarAxes(results)
      .filter((status) => !status.available)
      .map((status) => getPlayExercise(status.exerciseId)?.name ?? status.label);
  } catch {
    axes = null;
  }

  if (axes === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 rounded-lg bg-red-50 px-4 text-center text-xs text-red-600">
        <p className="font-semibold">No se pudo cargar el rendimiento visual.</p>
        <p className="text-red-500">Inténtalo de nuevo más tarde.</p>
      </div>
    );
  }

  if (!hasAnyResult) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-orion-navy-100 px-4 text-center text-xs text-orion-navy-400">
        Sin resultados de ORION Play todavía
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {axes.length >= REQUIRED_RADAR_AXES ? (
        // Tamaño FIJO (no el espacio disponible completo), centrado en
        // el hueco de la tarjeta - nunca estira la tarjeta verticalmente
        // ni se recorta si el hueco es mas pequeño (max-h-full/max-w-full
        // lo limitan sin desbordar). Rectangular (310x220, ~15% mas
        // grande que la version anterior), no cuadrado - ver comentario
        // de CHART_WIDTH/CHART_HEIGHT en RadarChart.
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="h-[220px] w-[310px] max-h-full max-w-full">
            <RadarChart axes={axes} />
          </div>
        </div>
      ) : (
        // Diagnostico, no un error: el deportista SI tiene resultados
        // (hasAnyResult=true, ya descartado arriba), simplemente no en
        // suficientes ejercicios distintos todavia. Nunca se rebaja
        // REQUIRED_RADAR_AXES solo para forzar un radar - se explica que
        // falta en su lugar.
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 px-3 text-center text-xs text-orion-navy-500">
          <p className="font-semibold text-orion-navy-700">
            {axes.length} de {REQUIRED_RADAR_AXES} dimensiones disponibles
          </p>
          <p className="text-orion-navy-400">
            Faltan resultados válidos en: {missingExerciseNames.join(", ")}.
          </p>
          <p className="text-orion-navy-400">
            Completa y guarda una ejecución de alguno de esos ejercicios en ORION Play para
            desbloquear el radar.
          </p>
        </div>
      )}

      <Link
        href={`/perfiles/atleta/${athleteId}/rendimiento-visual`}
        className="mt-1 inline-block shrink-0 text-[11px] font-semibold text-orion-navy-600 hover:text-orion-navy-800"
      >
        Ver Rendimiento Visual completo →
      </Link>
    </div>
  );
}
