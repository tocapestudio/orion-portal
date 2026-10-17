"use client";

import { useRef, useState, useTransition } from "react";
import type { OpticalProfile, OptometriaSummary } from "@/lib/data/opticalProfile";
import {
  saveRefraction,
  saveKeratometry,
  saveAcuityManual,
  savePrism,
  savePio,
  saveObservations,
  createOptometria,
  deleteOptometria,
  updateOptometriaDate,
  fetchOpticalProfile,
  fetchOptometriaList,
  type FichaFormState,
} from "./fichaOptometricaActions";
import RxFields from "./RxFields";
import KeratometryTable from "./KeratometryTable";
import AcuityFields from "./AcuityFields";
import PrismFields from "./PrismFields";
import PioFields from "./PioFields";
import ObservationsField from "./ObservationsField";

const EMPTY_STATE: FichaFormState = { error: null, success: false };

function formatDate(d: string) {
  const [year, month, day] = d.split("-");
  if (!year || !month || !day) return d;
  return `${day}/${month}/${year}`;
}

/**
 * Orquestador de la Ficha: modo de edicion unico (sin boton "Editar" por
 * bloque) + navegacion entre optometrias (‹ fecha ›) + "Nueva optometria".
 * Cada bloque sigue siendo "tonto" y expone su propio <form> via ref; al
 * pulsar "Guardar ficha" se llama directamente a las Server Actions
 * existentes (sin <form action> nativo) con el FormData leido de cada ref.
 * Las acciones NO cambian en su logica interna, solo ahora escriben contra
 * una optometria (evaluation_id) concreta en vez de "el atleta".
 *
 * "Ficha actual" = la optometria mas reciente (primera de la lista, que
 * llega ordenada por fecha desc). profile/optometrias viven en estado
 * cliente (no solo props) para poder cambiar de optometria sin recargar
 * la pagina — se piden a fetchOpticalProfile/fetchOptometriaList, que son
 * los mismos wrappers "use server" fichaOptometricaActions.ts.
 */
export default function FichaOptometricaForm({
  athleteId,
  initialProfile,
  initialOptometrias,
  canEdit,
}: {
  athleteId: string;
  initialProfile: OpticalProfile | null;
  initialOptometrias: OptometriaSummary[];
  canEdit: boolean;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [optometrias, setOptometrias] = useState(initialOptometrias);
  const [editing, setEditing] = useState(false);
  const [editedDate, setEditedDate] = useState("");
  const [pending, startTransition] = useTransition();
  const [navPending, startNavTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);

  const rxRef = useRef<HTMLFormElement>(null);
  const keratRef = useRef<HTMLFormElement>(null);
  const scRef = useRef<HTMLFormElement>(null);
  const ccRef = useRef<HTMLFormElement>(null);
  const prismRef = useRef<HTMLFormElement>(null);
  const pioRef = useRef<HTMLFormElement>(null);
  const obsRef = useRef<HTMLFormElement>(null);

  const currentIndex = profile ? optometrias.findIndex((o) => o.evaluationId === profile.evaluationId) : -1;
  const hasOlder = currentIndex !== -1 && currentIndex < optometrias.length - 1;
  const hasNewer = currentIndex > 0;
  const navDisabled = editing || pending || navPending;

  function goTo(evaluationId: string) {
    setErrors([]);
    startNavTransition(async () => {
      const next = await fetchOpticalProfile(athleteId, evaluationId);
      setProfile(next);
      setEditing(false);
    });
  }

  function handleOlder() {
    if (hasOlder) goTo(optometrias[currentIndex + 1].evaluationId);
  }

  function handleNewer() {
    if (hasNewer) goTo(optometrias[currentIndex - 1].evaluationId);
  }

  function handleCreate() {
    setErrors([]);
    startNavTransition(async () => {
      const res = await createOptometria(athleteId);
      if (res.error || !res.evaluationId) {
        setErrors([res.error ?? "No se pudo crear la optometría."]);
        return;
      }
      const [list, newProfile] = await Promise.all([
        fetchOptometriaList(athleteId),
        fetchOpticalProfile(athleteId, res.evaluationId),
      ]);
      setOptometrias(list);
      setProfile(newProfile);
      setEditedDate(list.find((o) => o.evaluationId === res.evaluationId)?.date ?? "");
      setEditing(true);
    });
  }

  function handleEdit() {
    setEditedDate(optometrias[currentIndex]?.date ?? "");
    setEditing(true);
  }

  function handleSave() {
    if (!profile) return;
    const evaluationId = profile.evaluationId;
    setErrors([]);
    startTransition(async () => {
      const jobs: { label: string; run: () => Promise<FichaFormState> }[] = [
        { label: "Rx", run: () => saveRefraction(EMPTY_STATE, new FormData(rxRef.current!)) },
        { label: "Queratometría", run: () => saveKeratometry(EMPTY_STATE, new FormData(keratRef.current!)) },
        { label: "AV SC", run: () => saveAcuityManual(EMPTY_STATE, new FormData(scRef.current!)) },
        { label: "AV CC", run: () => saveAcuityManual(EMPTY_STATE, new FormData(ccRef.current!)) },
        { label: "Prismas", run: () => savePrism(EMPTY_STATE, new FormData(prismRef.current!)) },
        { label: "PIO", run: () => savePio(EMPTY_STATE, new FormData(pioRef.current!)) },
        { label: "Observaciones", run: () => saveObservations(EMPTY_STATE, new FormData(obsRef.current!)) },
        {
          label: "Fecha",
          run: () => {
            const fd = new FormData();
            fd.set("athlete_id", athleteId);
            fd.set("evaluation_id", evaluationId);
            fd.set("date", editedDate);
            return updateOptometriaDate(EMPTY_STATE, fd);
          },
        },
      ];

      const results = await Promise.all(jobs.map((j) => j.run()));
      const newErrors = results
        .map((r, i) => (r.error ? `${jobs[i].label}: ${r.error}` : null))
        .filter((e): e is string => e != null);

      if (newErrors.length > 0) {
        setErrors(newErrors);
        return;
      }

      // La fecha pudo cambiar: se refresca tambien la lista para que el
      // historial se reordene y la navegacion ‹ › quede consistente.
      const [refreshed, list] = await Promise.all([
        fetchOpticalProfile(athleteId, evaluationId),
        fetchOptometriaList(athleteId),
      ]);
      setProfile(refreshed);
      setOptometrias(list);
      setEditing(false);
    });
  }

  function handleCancel() {
    setErrors([]);
    setEditing(false);
  }

  function handleDelete() {
    if (!profile) return;
    const date = optometrias[currentIndex]?.date ? formatDate(optometrias[currentIndex].date) : "";
    if (
      !window.confirm(
        `¿Eliminar la optometría del ${date}? Esta acción no se puede deshacer y borrará todos sus datos (Rx, Queratometría, AV, Prismas, PIO, Observaciones).`
      )
    ) {
      return;
    }
    const evaluationId = profile.evaluationId;
    setErrors([]);
    startNavTransition(async () => {
      const res = await deleteOptometria(athleteId, evaluationId);
      if (res.error) {
        setErrors([res.error]);
        return;
      }
      const list = await fetchOptometriaList(athleteId);
      setOptometrias(list);
      if (list.length > 0) {
        const newProfile = await fetchOpticalProfile(athleteId, list[0].evaluationId);
        setProfile(newProfile);
      } else {
        setProfile(null);
      }
    });
  }

  const sc = profile?.acuity.filter((r) => r.correction_type === "sc") ?? [];
  const cc = profile?.acuity.filter((r) => r.correction_type === "cc") ?? [];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-orion-navy-500">Ficha Optométrica</p>
        <div className="flex items-center gap-2">
          {profile && optometrias.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-orion-navy-500">
              {/* "X de N": X = currentIndex+1 (optometrias ya llega
                  ordenada por fecha desc - mas reciente primero, mismo
                  orden que ya usan handleOlder/handleNewer, sin cambiarlo).
                  N = optometrias.length, el total REAL de fichas
                  optometricas de este atleta (lib/data/opticalProfile.ts,
                  fetchOptometriaList) - nunca las evaluaciones clinicas
                  del panel contiguo (otra lista, otro componente). Flechas
                  flanqueando el contador (mismos handlers/estado de
                  siempre, solo reordenados); fecha en su propia caja
                  independiente justo despues. */}
              <button
                type="button"
                onClick={handleOlder}
                disabled={!hasOlder || navDisabled}
                title="Optometría anterior"
                className="rounded px-1.5 py-1 text-base leading-none text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700 disabled:opacity-30"
              >
                ‹
              </button>
              <span className="min-w-[56px] whitespace-nowrap text-center text-orion-navy-400">
                {currentIndex + 1} de {optometrias.length}
              </span>
              <button
                type="button"
                onClick={handleNewer}
                disabled={!hasNewer || navDisabled}
                title="Optometría siguiente"
                className="rounded px-1.5 py-1 text-base leading-none text-orion-navy-400 hover:bg-orion-navy-100 hover:text-orion-navy-700 disabled:opacity-30"
              >
                ›
              </button>
              <div className="ml-1 rounded border border-orion-navy-200 px-1.5 py-0.5 text-[11px] text-orion-navy-600">
                {editing ? (
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="w-[84px] bg-transparent text-[11px] outline-none"
                  />
                ) : (
                  <span className="min-w-[72px] text-center">{formatDate(optometrias[currentIndex]?.date ?? "")}</span>
                )}
              </div>
            </div>
          )}
          {canEdit && !editing && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCreate}
                disabled={navPending}
                title="Nueva optometría"
                className="rounded-lg border border-orion-navy-200 p-1.5 text-orion-navy-700 hover:bg-orion-navy-100 disabled:opacity-60"
              >
                <PlusIcon />
              </button>
              {profile && (
                <>
                  <button
                    type="button"
                    onClick={handleEdit}
                    title="Editar ficha"
                    className="rounded-lg border border-orion-navy-200 p-1.5 text-orion-navy-700 hover:bg-orion-navy-100"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={navPending}
                    title="Eliminar optometría"
                    className="rounded-lg border border-orion-navy-200 p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <TrashIcon />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mb-3 space-y-0.5 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      {!profile ? (
        <p className="text-xs text-orion-navy-400">
          Sin optometrías registradas{canEdit ? " — pulsa “+” para crear la primera." : "."}
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <div className="border-b border-orion-navy-100 pb-1">
              <RxFields
                ref={rxRef}
                athleteId={athleteId}
                evaluationId={profile.evaluationId}
                rows={profile.refraction}
                editing={editing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-b border-orion-navy-100 pb-1">
              <AcuityFields
                ref={scRef}
                athleteId={athleteId}
                evaluationId={profile.evaluationId}
                correctionType="sc"
                label="AV SC"
                rows={sc}
                editing={editing}
              />
              <AcuityFields
                ref={ccRef}
                athleteId={athleteId}
                evaluationId={profile.evaluationId}
                correctionType="cc"
                label="AV CC"
                rows={cc}
                editing={editing}
              />
            </div>

            <div className="border-b border-orion-navy-100 pb-1">
              <KeratometryTable
                ref={keratRef}
                athleteId={athleteId}
                evaluationId={profile.evaluationId}
                rows={profile.keratometry}
                editing={editing}
              />
            </div>

            <div className="border-b border-orion-navy-100 pb-1">
              <PrismFields
                ref={prismRef}
                athleteId={athleteId}
                evaluationId={profile.evaluationId}
                rows={profile.prism}
                editing={editing}
              />
            </div>

            <div className="border-b border-orion-navy-100 pb-1">
              <PioFields
                ref={pioRef}
                athleteId={athleteId}
                evaluationId={profile.evaluationId}
                rows={profile.pio}
                editing={editing}
              />
            </div>

            <ObservationsField
              ref={obsRef}
              athleteId={athleteId}
              evaluationId={profile.evaluationId}
              observations={profile.header?.observations ?? null}
              editing={editing}
            />
          </div>

          {editing && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Guardando…" : "Guardar ficha"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={pending}
                className="rounded-lg border border-orion-navy-200 px-4 py-2 text-sm font-medium text-orion-navy-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Mismo patron de iconos inline SVG ya usado en el resto del Portal
 * (p.ej. LinkIcon en InviteSection) — no hay libreria de iconos instalada. */
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
