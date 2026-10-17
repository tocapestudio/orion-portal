"use client";

import { useState } from "react";
import type {
  ExerciseResultGroup,
  PlayExerciseRecord,
  PlayRecordEntry,
  AthletePlayResult,
  PlayTargetLogEntry,
  PlayRoundLogEntry,
} from "@/lib/data/playResultsMapping";
import { getPlayExercise } from "@/components/orionPlay/catalog";
import { formatConfigUsed } from "@/lib/ui/playConfigLabels";

/**
 * Lista de ejercicios REALMENTE utilizados (una fila por exerciseId con
 * al menos un resultado, ver groupResultsByExercise) <-> ficha de
 * detalle amplia con navegacion "Registro X de Y" entre los resultados
 * de ESE ejercicio - mismo patron de flechas ‹/› que
 * FichaOptometricaForm.tsx (evaluaciones-clinicas), reutilizado aqui por
 * consistencia visual, sin copiar su logica de edicion/fetch (aqui todo
 * ya esta cargado en memoria, no hace falta volver a consultar al
 * navegar entre registros).
 *
 * `groups`/`records` llegan YA calculados desde page.tsx (Server
 * Component) - este componente cliente solo gestiona que fila/indice
 * esta seleccionado, nunca vuelve a calcular agrupaciones ni records.
 */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function MetricValue({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-orion-navy-400">{label}</p>
      <p className="text-sm font-semibold text-orion-navy-900">
        {value === null ? "No disponible" : `${value}${unit ?? ""}`}
      </p>
    </div>
  );
}

/** Etiquetas/formato legible via playConfigLabels.ts (inspeccionado
 * contra la config real de los 4 ejercicios + los 4 fallbacks fijos de
 * effectiveConfig.ts) - esta lista ya NO muestra claves tecnicas en
 * bruto ni valores sin unidad; ver ese modulo para el detalle completo. */
function ConfigUsedList({ config }: { config: Record<string, unknown> | null }) {
  const fields = config ? formatConfigUsed(config) : [];
  if (fields.length === 0) {
    return <p className="text-xs text-orion-navy-400">No disponible.</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
      {fields.map((field) => (
        <div key={field.key}>
          <dt className="text-orion-navy-400">{field.label}</dt>
          <dd className="flex items-center gap-1.5 font-medium text-orion-navy-800">
            {field.colorSwatch && (
              <span
                aria-hidden
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-orion-navy-200"
                style={{ backgroundColor: field.colorSwatch }}
              />
            )}
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** reactionTimes[] vive DENTRO de metrics (no en raw_data) para Reaction
 * Time/Simple Reaction - ver ReactionTimeMetrics/SimpleReactionMetrics
 * en components/orionPlay/types.ts. `null` si el campo falta o no tiene
 * la forma esperada (dato ausente); `[]` si existe pero esta vacio
 * (ejecucion real sin ninguna respuesta valida) - dos estados distintos,
 * nunca confundidos. */
function extractReactionTimes(metrics: Record<string, unknown>): number[] | null {
  const value = metrics.reactionTimes;
  if (!Array.isArray(value)) return null;
  if (!value.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
  return value as number[];
}

/** Conserva EXACTAMENTE los tiempos individuales de siempre (nunca se
 * sustituyen por la media) - solo añade dos cosas, ambas derivadas de
 * los mismos `times` ya disponibles, sin ninguna metrica nueva:
 * - resalta el/los intento(s) mas rapido(s) (puede haber empate, ambos
 *   se resaltan, nunca se elige uno arbitrariamente entre iguales);
 * - muestra la media de la sesion, calculada aqui mismo a partir de
 *   `times` (coincide, por construccion, con el `reaction_time_ms`
 *   canonico ya mostrado arriba en la ficha - ver buildReactionTimeResultRow/
 *   buildSimpleReactionResultRow - se repite aqui por conveniencia, junto
 *   al desglose, no porque sea un dato distinto). */
function ReactionTimeBars({ times }: { times: number[] | null }) {
  if (times === null) {
    return <p className="text-xs text-orion-navy-400">Tiempos individuales no disponibles para esta ejecución.</p>;
  }
  if (times.length === 0) {
    return <p className="text-xs text-orion-navy-400">Esta ejecución no registró ninguna respuesta válida.</p>;
  }
  const max = Math.max(...times);
  const min = Math.min(...times);
  const average = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);

  return (
    <div>
      <p className="mb-2 text-xs text-orion-navy-500">
        Media de la sesión: <span className="font-semibold text-orion-navy-800">{average} ms</span>
      </p>
      <div className="space-y-1.5">
        {times.map((t, i) => {
          const isFastest = t === min;
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className={`w-20 shrink-0 ${isFastest ? "font-semibold text-orion-accent" : "text-orion-navy-500"}`}
              >
                Intento {i + 1}
                {isFastest && " ⚡"}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-orion-navy-100">
                <div
                  className={`h-full rounded-full ${isFastest ? "bg-orion-accent" : "bg-orion-sky"}`}
                  style={{ width: `${max > 0 ? (t / max) * 100 : 0}%` }}
                />
              </div>
              <span
                className={`w-14 shrink-0 text-right font-medium ${
                  isFastest ? "text-orion-accent" : "text-orion-navy-800"
                }`}
              >
                {t} ms
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TargetLogList({ log }: { log: PlayTargetLogEntry[] | null }) {
  if (log === null) {
    return <p className="text-xs text-orion-navy-400">Detalle por objetivo no disponible para esta ejecución.</p>;
  }
  if (log.length === 0) {
    return <p className="text-xs text-orion-navy-400">Esta ejecución no registró ningún clic.</p>;
  }
  const max = Math.max(...log.map((e) => e.reactionTimeMs));
  return (
    <div className="space-y-1.5">
      {log.map((entry) => (
        <div key={entry.targetNumber} className="flex items-center gap-2 text-xs">
          <span className="w-16 shrink-0 text-orion-navy-500">Objetivo {entry.targetNumber}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-orion-navy-100">
            <div
              className={`h-full rounded-full ${entry.outcome === "hit" ? "bg-orion-accent" : "bg-red-400"}`}
              style={{ width: `${max > 0 ? (entry.reactionTimeMs / max) * 100 : 0}%` }}
            />
          </div>
          <span
            className={`w-14 shrink-0 text-center text-[10px] font-semibold uppercase ${
              entry.outcome === "hit" ? "text-orion-accent" : "text-red-500"
            }`}
          >
            {entry.outcome === "hit" ? "Acierto" : "Fallo"}
          </span>
          <span className="w-14 shrink-0 text-right font-medium text-orion-navy-800">{entry.reactionTimeMs} ms</span>
        </div>
      ))}
    </div>
  );
}

function RoundLogTable({ log }: { log: PlayRoundLogEntry[] | null }) {
  if (log === null) {
    return <p className="text-xs text-orion-navy-400">Detalle por ronda no disponible para esta ejecución.</p>;
  }
  if (log.length === 0) {
    return <p className="text-xs text-orion-navy-400">Esta ejecución no completó ninguna ronda.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-orion-navy-400">
            <th className="py-1 pr-3 font-medium">Ronda</th>
            <th className="py-1 pr-3 font-medium">Patrón</th>
            <th className="py-1 pr-3 font-medium">Correctas</th>
            <th className="py-1 pr-3 font-medium">Incorrectas</th>
            <th className="py-1 pr-3 font-medium">Olvidadas</th>
            <th className="py-1 pr-3 font-medium">Precisión</th>
            <th className="py-1 font-medium">¿Perfecta?</th>
          </tr>
        </thead>
        <tbody>
          {log.map((r) => (
            <tr key={r.roundNumber} className="border-t border-orion-navy-50">
              <td className="py-1.5 pr-3 font-medium text-orion-navy-800">{r.roundNumber}</td>
              <td className="py-1.5 pr-3 text-orion-navy-600">
                {r.rows}×{r.cols} · {r.patternCount}
              </td>
              <td className="py-1.5 pr-3 text-orion-navy-600">{r.correctSelections}</td>
              <td className="py-1.5 pr-3 text-orion-navy-600">{r.incorrectSelections}</td>
              <td className="py-1.5 pr-3 text-orion-navy-600">{r.missedTiles}</td>
              <td className="py-1.5 pr-3 text-orion-navy-600">{Math.round(r.accuracyPercent)}%</td>
              <td className="py-1.5 text-orion-navy-600">{r.succeeded ? "Sí" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExerciseBreakdown({ exerciseId, result }: { exerciseId: string; result: AthletePlayResult }) {
  if (exerciseId === "click-targets") return <TargetLogList log={result.targetLog} />;
  if (exerciseId === "visual-memory-precision") return <RoundLogTable log={result.roundLog} />;
  // reaction-time / simple-reaction (y cualquier otro, defensivo)
  return <ReactionTimeBars times={extractReactionTimes(result.metrics)} />;
}

function breakdownTitle(exerciseId: string): string {
  if (exerciseId === "click-targets") return "Detalle por objetivo";
  if (exerciseId === "visual-memory-precision") return "Detalle por ronda";
  return "Tiempos por intento";
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4.5a2 2 0 1 0 0 4H7M17 5h2.5a2 2 0 1 1 0 4H17" />
      <path d="M12 13v3.5" />
      <path d="M9 20.5h6" />
      <path d="M9.5 17.5h5l.6 3H8.9l.6-3Z" />
    </svg>
  );
}

/**
 * Tarjeta independiente de récords personales - vive como columna lateral
 * derecha de la zona de datos (fecha+metricas+configuracion), PERMANENTE:
 * no cambia al navegar entre registros (`entries` llega YA calculada
 * desde page.tsx via getExerciseRecordBreakdown(group.exerciseId,
 * group.results) - todo el historial del ejercicio, nunca recalculado
 * aqui ni a partir solo del registro visible). Muestra VARIOS
 * indicadores a la vez (media de sesion, intento mas rapido, precision,
 * etc. segun el ejercicio - ver getExerciseRecordBreakdown) en vez de
 * reducirlos a una sola cifra; `record` (el récord PRINCIPAL, sin
 * cambios en su criterio de eleccion) solo se usa aqui para el punto que
 * marca "este es el registro que lo estableció" - `isCurrentRecord` es
 * la UNICA parte que cambia al navegar.
 *
 * Proporcion vertical y estrecha a proposito (trofeo arriba, indicadores
 * apilados debajo). `w-full h-full` + `justify-center`: ocupa TODO el
 * ancho/alto que le da su celda del grid en ExerciseDetail (esa celda
 * mide lo que YA mide junta la columna izquierda - metricas+
 * configuracion -, nunca un numero inventado) y centra su contenido
 * dentro, en vez de necesitar su propio min-height.
 */
function RecordBadge({
  entries,
  isCurrentRecord,
}: {
  entries: PlayRecordEntry[];
  isCurrentRecord: boolean;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-center shadow-sm">
      <div className="relative shrink-0">
        <TrophyIcon className="h-6 w-6 text-amber-500" />
        {isCurrentRecord && (
          <span
            title="Este es el registro que estableció al menos uno de los récords"
            aria-label="Este es el registro que estableció al menos uno de los récords"
            className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-amber-600 ring-2 ring-amber-50"
          />
        )}
      </div>
      <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-amber-700">
        Récords personales
      </p>
      {entries.length > 0 ? (
        <dl className="w-full space-y-2">
          {entries.map((entry) => (
            <div key={entry.label}>
              <dt className="truncate text-[10px] leading-tight text-amber-600">{entry.label}</dt>
              <dd className="text-sm font-bold leading-tight text-amber-900">{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-amber-600">No disponible</p>
      )}
    </div>
  );
}

function ExerciseDetail({
  group,
  record,
  recordBreakdown,
  recordIndex,
  onIndexChange,
  onBack,
}: {
  group: ExerciseResultGroup;
  record: PlayExerciseRecord | null;
  recordBreakdown: PlayRecordEntry[];
  recordIndex: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
}) {
  const results = group.results;
  const current = results[recordIndex] ?? results[0];
  const exercise = getPlayExercise(group.exerciseId);
  const hasOlder = recordIndex < results.length - 1;
  const hasNewer = recordIndex > 0;
  const isCurrentRecord = record !== null && record.result.id === current.id;

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-5">
      {/* Cabecera: volver + icono + nombre + navegacion/contador de ESTE
          ejercicio - sin la tarjeta de record, que ahora vive abajo junto
          a la fecha/metricas (ver bloque siguiente), no aqui arriba donde
          dejaba una franja vacia debajo suyo. Las flechas conservan
          exactamente el mismo comportamiento/handlers, solo cambia su
          posicion. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          title="Volver al listado"
          aria-label="Volver al listado"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-orion-navy-200 text-orion-navy-600 hover:bg-orion-navy-100"
        >
          ‹
        </button>
        {exercise && <exercise.Icon className="h-5 w-5 shrink-0 text-orion-navy-600" />}
        <p className="font-semibold text-orion-navy-900">{exercise?.name ?? group.exerciseId}</p>

        <div className="ml-1 flex items-center gap-1 text-xs font-medium text-orion-navy-500">
          <button
            type="button"
            onClick={() => onIndexChange(recordIndex + 1)}
            disabled={!hasOlder}
            title="Registro anterior"
            className="rounded px-1.5 py-1 text-base leading-none text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700 disabled:opacity-30"
          >
            ‹
          </button>
          <span className="min-w-[100px] text-center">
            Registro {recordIndex + 1} de {results.length}
          </span>
          <button
            type="button"
            onClick={() => onIndexChange(recordIndex - 1)}
            disabled={!hasNewer}
            title="Registro siguiente"
            className="rounded px-1.5 py-1 text-base leading-none text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      {/* Zona de datos: rejilla de 2 columnas (1 sola columna en
          pantallas estrechas). Columna izquierda = fecha+metricas y,
          justo debajo SIN linea divisoria, configuracion - un unico
          bloque de flujo normal, su altura la decide solo ese contenido
          real. Columna derecha = tarjeta de récord: al ser la OTRA
          columna de la MISMA fila del grid, por defecto (align-items:
          stretch) ocupa automaticamente la altura TOTAL que ya mide la
          columna izquierda (metricas+configuracion juntas) - nunca un
          min-height propio adivinado, y nunca se solapa con "Errores"
          ni con la configuracion porque son columnas distintas, no
          capas superpuestas. El borde ambar fino (sm:border-l) solo
          conecta visualmente ambas columnas, no reserva espacio. En
          pantallas estrechas se apila en una sola columna (la tarjeta
          despues de metricas+configuracion), sin scroll horizontal. */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:gap-4">
        <div className="min-w-0">
          <p className="mb-2 text-xs text-orion-navy-400">{formatDateTime(current.generatedAt)}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricValue label="Precisión" value={current.accuracyPercent} unit="%" />
            <MetricValue label="Intentos" value={current.totalTrials} />
            <MetricValue label="Tiempo de reacción" value={current.reactionTimeMs} unit=" ms" />
            <MetricValue label="Errores" value={current.errorsCount} />
          </div>
          {/* Sin linea divisoria ni hueco antes de Configuracion - el
              subrayado del propio titulo basta para distinguir la
              seccion, todo queda mas alto/compacto. */}
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-navy-500 underline underline-offset-4">
              Configuración de la ejecución
            </p>
            <ConfigUsedList config={current.configUsed} />
          </div>
        </div>

        <div className="sm:border-l-2 sm:border-amber-200 sm:pl-3">
          <RecordBadge entries={recordBreakdown} isCurrentRecord={isCurrentRecord} />
        </div>
      </div>

      <div className="mt-4 border-t border-orion-navy-100 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
          {breakdownTitle(group.exerciseId)}
        </p>
        <ExerciseBreakdown exerciseId={group.exerciseId} result={current} />
      </div>
    </div>
  );
}

function ExerciseRow({
  group,
  record,
  onSelect,
}: {
  group: ExerciseResultGroup;
  record: PlayExerciseRecord | null;
  onSelect: () => void;
}) {
  const exercise = getPlayExercise(group.exerciseId);
  const latest = group.results[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-orion-navy-100 bg-white p-4 text-left shadow-sm transition hover:border-orion-navy-400 hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orion-navy-100">
          {exercise && <exercise.Icon className="h-5 w-5 text-orion-navy-700" />}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-orion-navy-900">{exercise?.name ?? group.exerciseId}</p>
          <p className="text-xs text-orion-navy-400">Última sesión: {formatDate(latest.generatedAt)}</p>
          <p className="text-xs text-orion-navy-500">
            {latest.accuracyPercent !== null ? `Precisión: ${Math.round(latest.accuracyPercent)}%` : "Precisión no disponible"}
            {latest.totalTrials !== null ? ` · ${latest.totalTrials} intentos` : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-orion-navy-400">Mejor resultado</p>
          <p className="text-sm font-semibold text-orion-accent">{record ? record.headline : "Sin récord disponible"}</p>
        </div>
        <span aria-hidden className="text-lg text-orion-navy-300">
          ›
        </span>
      </div>
    </button>
  );
}

export default function RendimientoVisualClient({
  groups,
  records,
  recordBreakdowns,
}: {
  groups: ExerciseResultGroup[];
  records: Record<string, PlayExerciseRecord | null>;
  recordBreakdowns: Record<string, PlayRecordEntry[]>;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [recordIndex, setRecordIndex] = useState(0);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-orion-navy-200 bg-white p-6 text-sm text-orion-navy-600">
        <p className="font-semibold text-orion-navy-900">Sin resultados de ORION Play todavía</p>
        <p className="mt-2">
          Cuando este deportista complete algún ejercicio de ORION Play (Go/No Go, Tiempo de
          reacción, Click Targets o Visual Memory Precision), aparecerá aquí.
        </p>
      </div>
    );
  }

  const selectedGroup = groups.find((g) => g.exerciseId === selectedExerciseId) ?? null;

  if (selectedGroup) {
    return (
      <ExerciseDetail
        group={selectedGroup}
        record={records[selectedGroup.exerciseId] ?? null}
        recordBreakdown={recordBreakdowns[selectedGroup.exerciseId] ?? []}
        recordIndex={Math.min(recordIndex, selectedGroup.results.length - 1)}
        onIndexChange={setRecordIndex}
        onBack={() => {
          setSelectedExerciseId(null);
          setRecordIndex(0);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <ExerciseRow
          key={group.exerciseId}
          group={group}
          record={records[group.exerciseId] ?? null}
          onSelect={() => {
            setSelectedExerciseId(group.exerciseId);
            setRecordIndex(0);
          }}
        />
      ))}
    </div>
  );
}
