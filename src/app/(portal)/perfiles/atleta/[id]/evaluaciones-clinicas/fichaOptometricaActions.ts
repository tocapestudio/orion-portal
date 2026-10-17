"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { getOpticalProfile, getOptometriaList, type OpticalProfile, type OptometriaSummary } from "@/lib/data/opticalProfile";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type PrismInsert = Database["core"]["Tables"]["athlete_optical_profile_prism"]["Insert"];
type AcuityInsert = Database["core"]["Tables"]["athlete_optical_profile_acuity"]["Insert"];

export interface FichaFormState {
  error: string | null;
  success: boolean;
}

function toNumberOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function revalidateFicha(athleteId: string) {
  revalidatePath(`/perfiles/atleta/${athleteId}/evaluaciones-clinicas`);
}

async function requireUser(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Crea la cabecera de la optometria (evaluation_id concreto) si todavia no
 * existe, sin tocar observations si ya la hay (upsert solo escribe las
 * columnas incluidas aqui). Cada bloque la activa de paso la primera vez
 * que se guarda algo para esa optometria.
 */
async function ensureOpticalProfileHeader(
  supabase: SupabaseServerClient,
  athleteId: string,
  evaluationId: string,
  userId: string
): Promise<void> {
  await supabase.from("athlete_optical_profile").upsert(
    { evaluation_id: evaluationId, athlete_id: athleteId, updated_at: new Date().toISOString(), updated_by: userId },
    { onConflict: "evaluation_id" }
  );
}

// ----------------------------------------------------------------------------
// Lectura — wrappers "use server" finos para que el cliente (navegacion
// entre optometrias, sin recarga de pagina) pueda llamar a la capa de
// datos directamente, igual que ya hacen las acciones de guardado.
// ----------------------------------------------------------------------------
export async function fetchOptometriaList(athleteId: string): Promise<OptometriaSummary[]> {
  return getOptometriaList(athleteId);
}

export async function fetchOpticalProfile(athleteId: string, evaluationId: string): Promise<OpticalProfile | null> {
  return getOpticalProfile(athleteId, evaluationId);
}

// ----------------------------------------------------------------------------
// Nueva optometria — crea la visita (core.evaluations) + su cabecera de
// ficha, ambas en blanco. El resto de bloques se rellenan al guardar, igual
// que con cualquier optometria. Nunca copia valores de una optometria
// anterior.
// ----------------------------------------------------------------------------
export async function createOptometria(
  athleteId: string
): Promise<{ error: string | null; evaluationId: string | null }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", evaluationId: null };
  if (!athleteId) return { error: "Falta el atleta.", evaluationId: null };

  const evaluationId = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);

  const { error: evalError } = await supabase.from("evaluations").insert({
    id: evaluationId,
    athlete_id: athleteId,
    professional_id: user.id,
    date: today,
    nature: "clinical",
  });
  if (evalError) return { error: `No se pudo crear la optometría: ${evalError.message}`, evaluationId: null };

  await ensureOpticalProfileHeader(supabase, athleteId, evaluationId, user.id);

  revalidateFicha(athleteId);
  return { error: null, evaluationId };
}

/**
 * Elimina UNA optometria completa: borra su core.evaluations, que en
 * cascada (ON DELETE CASCADE ya existente en evaluation_id de las 6
 * tablas, ver 20261001160000) elimina sus datos asociados (Rx,
 * Queratometria, AV, Prismas, PIO, Observaciones de esa visita). No afecta
 * al atleta ni a ninguna otra optometria — cada una tiene su propia fila
 * de evaluations. Mismo criterio que deleteEvaluation en
 * evaluacionesActions.ts: si hay un objetivo/evento de agenda enlazado
 * (FK sin cascada), se devuelve un mensaje claro en vez de fallar sin mas.
 */
export async function deleteOptometria(
  athleteId: string,
  evaluationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida." };
  if (!athleteId || !evaluationId) return { error: "Falta la optometría." };

  const { error } = await supabase.from("evaluations").delete().eq("id", evaluationId);
  if (error) {
    if (error.code === "23503") {
      return { error: "No se pudo eliminar: hay un objetivo o evento de agenda enlazado a esta optometría." };
    }
    return { error: `No se pudo eliminar: ${error.message}` };
  }

  revalidateFicha(athleteId);
  return { error: null };
}

// ----------------------------------------------------------------------------
// Fecha de la optometria — edita core.evaluations.date (NO created_at). Es
// la fecha que ordena el historial y que decide cual es "la mas reciente"
// (ficha actual). Se guarda junto al resto de bloques al pulsar "Guardar
// ficha" (ver FichaOptometricaForm), no requiere su propio modo de edicion.
// ----------------------------------------------------------------------------
export async function updateOptometriaDate(
  _prev: FichaFormState,
  formData: FormData
): Promise<FichaFormState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!athleteId || !evaluationId || !date) return { error: "Falta la fecha de la optometría.", success: false };

  const { error } = await supabase.from("evaluations").update({ date }).eq("id", evaluationId);
  if (error) return { error: `No se pudo actualizar la fecha: ${error.message}`, success: false };

  revalidateFicha(athleteId);
  return { error: null, success: true };
}

// ----------------------------------------------------------------------------
// Rx (refraccion subjetiva) — siempre manual, no existe evaluacion equivalente
// ----------------------------------------------------------------------------
export async function saveRefraction(_prev: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  if (!athleteId || !evaluationId) return { error: "Falta la optometría.", success: false };

  const rows = (["OD", "OI"] as const).map((eye) => {
    const prefix = eye.toLowerCase();
    return {
      evaluation_id: evaluationId,
      athlete_id: athleteId,
      eye,
      sphere: toNumberOrNull(formData.get(`${prefix}_sphere`)),
      cylinder: toNumberOrNull(formData.get(`${prefix}_cylinder`)),
      axis_deg: toNumberOrNull(formData.get(`${prefix}_axis_deg`)),
      add_vi: toNumberOrNull(formData.get(`${prefix}_add_vi`)),
      add_vp: toNumberOrNull(formData.get(`${prefix}_add_vp`)),
      source: "manual" as const,
      source_result_measure_id: null,
      source_evaluation_date: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
  });

  await ensureOpticalProfileHeader(supabase, athleteId, evaluationId, user.id);
  const { error } = await supabase
    .from("athlete_optical_profile_refraction")
    .upsert(rows, { onConflict: "evaluation_id,eye" });
  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidateFicha(athleteId);
  return { error: null, success: true };
}

// ----------------------------------------------------------------------------
// Queratometria — radius_mm/axis_deg editables; power_d NUNCA se envia (es
// columna GENERATED en Core, calculada por Postgres a partir del radio).
// ----------------------------------------------------------------------------
const KERATOMETRY_COMBOS = [
  { eye: "OD", meridian: "H" },
  { eye: "OD", meridian: "V" },
  { eye: "OI", meridian: "H" },
  { eye: "OI", meridian: "V" },
] as const;

export async function saveKeratometry(_prev: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  if (!athleteId || !evaluationId) return { error: "Falta la optometría.", success: false };

  const rows = KERATOMETRY_COMBOS.map(({ eye, meridian }) => {
    const prefix = `${eye.toLowerCase()}_${meridian.toLowerCase()}`;
    return {
      evaluation_id: evaluationId,
      athlete_id: athleteId,
      eye,
      meridian,
      radius_mm: toNumberOrNull(formData.get(`${prefix}_radius_mm`)),
      axis_deg: toNumberOrNull(formData.get(`${prefix}_axis_deg`)),
      source: "manual" as const,
      source_result_measure_id: null,
      source_evaluation_date: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
  });

  await ensureOpticalProfileHeader(supabase, athleteId, evaluationId, user.id);
  const { error } = await supabase
    .from("athlete_optical_profile_keratometry")
    .upsert(rows, { onConflict: "evaluation_id,eye,meridian" });
  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidateFicha(athleteId);
  return { error: null, success: true };
}

// ----------------------------------------------------------------------------
// Prismas OD/OI — correccion prismatica ACTUAL (no confundir con
// binocularidad en Clinical Evaluations). No existe un prisma binocular
// independiente: cada ojo tiene horizontal/vertical (magnitude_pd + base)
// y ademas 'resultant' (magnitude_pd + axis_deg, manual, sin componente ni
// base). Combinaciones realmente opcionales: si se guarda sin magnitud, se
// borra la fila (a diferencia de Rx/Queratometria/PIO, que siempre tienen
// sus filas fijas).
// ----------------------------------------------------------------------------
const PRISM_COMBOS = [
  { eye: "OD", component: "horizontal" },
  { eye: "OD", component: "vertical" },
  { eye: "OD", component: "resultant" },
  { eye: "OI", component: "horizontal" },
  { eye: "OI", component: "vertical" },
  { eye: "OI", component: "resultant" },
] as const;

export async function savePrism(_prev: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  if (!athleteId || !evaluationId) return { error: "Falta la optometría.", success: false };

  const toUpsert: PrismInsert[] = [];
  const toDelete: { eye: string; component: string }[] = [];

  for (const { eye, component } of PRISM_COMBOS) {
    const prefix = `${eye}_${component}`;
    const magnitude = toNumberOrNull(formData.get(`${prefix}_magnitude`));

    if (magnitude == null) {
      toDelete.push({ eye, component });
      continue;
    }

    const isResultant = component === "resultant";
    const base = isResultant ? null : String(formData.get(`${prefix}_base`) ?? "").trim() || null;
    const axisDeg = isResultant ? toNumberOrNull(formData.get(`${prefix}_axis_deg`)) : null;

    toUpsert.push({
      evaluation_id: evaluationId,
      athlete_id: athleteId,
      eye,
      component,
      magnitude_pd: magnitude,
      base,
      axis_deg: axisDeg,
      source: "manual",
      source_result_measure_id: null,
      source_evaluation_date: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  }

  await ensureOpticalProfileHeader(supabase, athleteId, evaluationId, user.id);

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("athlete_optical_profile_prism")
      .upsert(toUpsert, { onConflict: "evaluation_id,eye,component" });
    if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };
  }

  for (const d of toDelete) {
    await supabase
      .from("athlete_optical_profile_prism")
      .delete()
      .eq("evaluation_id", evaluationId)
      .eq("eye", d.eye)
      .eq("component", d.component);
  }

  revalidateFicha(athleteId);
  return { error: null, success: true };
}

// ----------------------------------------------------------------------------
// AV SC / AV CC — edicion manual directa. Celdas vacias se dejan intactas
// (igual que saveCompositeMeasures: "combinacion vacia, no se guarda"), las
// que traen valor se escriben SIEMPRE con source='manual' y procedencia
// limpia — es la accion explicita de sobreescritura del profesional, que
// por regla hibrida debe prevalecer sobre cualquier sincronizacion futura.
// ----------------------------------------------------------------------------
const ACUITY_DISTANCES = ["VL", "VP"] as const;
const ACUITY_LATERALITIES = ["OD", "OI", "binocular"] as const;

export async function saveAcuityManual(_prev: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  const correctionType = String(formData.get("correction_type") ?? "");
  if (!athleteId || !evaluationId) return { error: "Falta la optometría.", success: false };
  if (correctionType !== "sc" && correctionType !== "cc") {
    return { error: "Tipo de corrección inválido.", success: false };
  }

  const rows: AcuityInsert[] = [];
  for (const distance of ACUITY_DISTANCES) {
    for (const laterality of ACUITY_LATERALITIES) {
      const key = `${distance.toLowerCase()}_${laterality === "binocular" ? "bin" : laterality.toLowerCase()}`;
      const value = toNumberOrNull(formData.get(key));
      if (value == null) continue;
      rows.push({
        evaluation_id: evaluationId,
        athlete_id: athleteId,
        correction_type: correctionType,
        distance,
        laterality,
        value_numeric: value,
        source: "manual",
        source_result_measure_id: null,
        source_evaluation_date: null,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      });
    }
  }

  if (rows.length === 0) return { error: null, success: true };

  await ensureOpticalProfileHeader(supabase, athleteId, evaluationId, user.id);
  const { error } = await supabase
    .from("athlete_optical_profile_acuity")
    .upsert(rows, { onConflict: "evaluation_id,correction_type,distance,laterality" });
  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidateFicha(athleteId);
  return { error: null, success: true };
}

// ----------------------------------------------------------------------------
// PIO — siempre manual, no existe hoy ningun test_type de PIO en Core.
// ----------------------------------------------------------------------------
export async function savePio(_prev: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  if (!athleteId || !evaluationId) return { error: "Falta la optometría.", success: false };

  const rows = (["OD", "OI"] as const).map((eye) => {
    const prefix = eye.toLowerCase();
    return {
      evaluation_id: evaluationId,
      athlete_id: athleteId,
      eye,
      value_numeric: toNumberOrNull(formData.get(`${prefix}_value`)),
      unit: String(formData.get(`${prefix}_unit`) ?? "").trim() || "mmHg",
      source: "manual" as const,
      source_result_measure_id: null,
      source_evaluation_date: null,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
  });

  await ensureOpticalProfileHeader(supabase, athleteId, evaluationId, user.id);
  const { error } = await supabase
    .from("athlete_optical_profile_pio")
    .upsert(rows, { onConflict: "evaluation_id,eye" });
  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidateFicha(athleteId);
  return { error: null, success: true };
}

// ----------------------------------------------------------------------------
// Observaciones — texto libre en la cabecera, siempre manual.
// ----------------------------------------------------------------------------
export async function saveObservations(_prev: FichaFormState, formData: FormData): Promise<FichaFormState> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) return { error: "Sesión no válida.", success: false };

  const athleteId = String(formData.get("athlete_id") ?? "");
  const evaluationId = String(formData.get("evaluation_id") ?? "");
  if (!athleteId || !evaluationId) return { error: "Falta la optometría.", success: false };

  const observations = String(formData.get("observations") ?? "").trim() || null;

  const { error } = await supabase.from("athlete_optical_profile").upsert(
    {
      evaluation_id: evaluationId,
      athlete_id: athleteId,
      observations,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "evaluation_id" }
  );
  if (error) return { error: `No se pudo guardar: ${error.message}`, success: false };

  revalidateFicha(athleteId);
  return { error: null, success: true };
}

// ----------------------------------------------------------------------------
// Sincronizacion evaluacion -> Ficha, SOLO para AV SC/CC. Se invoca desde
// evaluacionesActions.ts (saveEvaluation), nunca por cargar/consultar el
// historico. Afecta a la optometria ACTUALMENTE ABIERTA = la mas reciente
// del atleta (misma definicion que "ficha actual" en toda la UI) — nunca
// crea una optometria nueva; si el atleta no tiene ninguna todavia, no hay
// donde sincronizar y se omite sin error. AV Dinamica queda deliberadamente
// sin activar todavia (misma forma de medida, pero no incluida en
// AV_SYNC_TEMPLATE_IDS) — para activarla basta con anadir su template id
// aqui, sin tocar nada mas.
// ----------------------------------------------------------------------------
const AV_SYNC_TEMPLATE_IDS: readonly string[] = [
  "a1111111-2222-4333-8444-555555555501", // Agudeza Visual Estatica (consolidada)
  // "68661151-c695-4ee2-b1b1-4972d48c54f8", // Agudeza Visual Dinamica — NO activar en esta fase
];

interface AcuitySyncEntry {
  id: string;
  conditions: {
    distance?: string | null;
    laterality?: string | null;
    correction?: string | null;
  };
  valueNumeric: string | null | undefined;
}

export async function syncAcuityFromEvaluation(
  supabase: SupabaseServerClient,
  params: { athleteId: string; templateId: string; date: string; entries: AcuitySyncEntry[] }
): Promise<void> {
  if (!AV_SYNC_TEMPLATE_IDS.includes(params.templateId)) return;

  // Optometria actual = la mas reciente con cabecera de ficha propia. Si
  // el atleta no tiene ninguna todavia, no se crea una — se omite.
  const { data: latest } = await supabase
    .from("evaluations")
    .select("id, athlete_optical_profile!inner(evaluation_id)")
    .eq("athlete_id", params.athleteId)
    .order("date", { ascending: false })
    .limit(1);
  const evaluationId = latest?.[0]?.id;
  if (!evaluationId) return;

  for (const entry of params.entries) {
    const { distance, laterality, correction } = entry.conditions;
    if (!distance || !laterality || !correction) continue;
    if (entry.valueNumeric == null || entry.valueNumeric.trim() === "") continue;
    const value = Number(entry.valueNumeric);
    if (!Number.isFinite(value)) continue;

    const correctionType = correction === "con" ? "cc" : "sc";

    const { data: existing } = await supabase
      .from("athlete_optical_profile_acuity")
      .select("source")
      .eq("evaluation_id", evaluationId)
      .eq("correction_type", correctionType)
      .eq("distance", distance)
      .eq("laterality", laterality)
      .maybeSingle();

    if (existing && existing.source === "manual") continue;

    await supabase.from("athlete_optical_profile_acuity").upsert(
      {
        evaluation_id: evaluationId,
        athlete_id: params.athleteId,
        correction_type: correctionType,
        distance,
        laterality,
        value_numeric: value,
        source: "evaluation",
        source_result_measure_id: entry.id,
        source_evaluation_date: params.date,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "evaluation_id,correction_type,distance,laterality" }
    );
  }
}
