import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type BoardPost = Database["core"]["Tables"]["board_posts"]["Row"];
export type BoardPostMedia = Database["core"]["Tables"]["board_post_media"]["Row"];
export type Goal = Database["core"]["Tables"]["goals"]["Row"];
export type Evaluation = Database["core"]["Tables"]["evaluations"]["Row"];
export type EvaluationResultRow = Database["core"]["Tables"]["evaluation_results"]["Row"];
export type EvaluationTemplateRow = Database["core"]["Tables"]["evaluation_templates"]["Row"];
export type EvaluationResultMeasureRow = Database["core"]["Tables"]["evaluation_result_measures"]["Row"];

/** Bucket privado creado en la migracion 20260929170000 — sin URLs
 * publicas, siempre se accede via signed URL (ver mas abajo). */
export const BOARD_MEDIA_BUCKET = "board-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface BoardPostMediaResolved extends BoardPostMedia {
  /** Solo para media_type "image" — null si aun no se ha podido firmar. */
  signedUrl: string | null;
}

export interface BoardWithMedia extends BoardPost {
  media: BoardPostMediaResolved[];
}

/**
 * El Tablon es conceptualmente UNICO por atleta — no es un feed ni un
 * historial de publicaciones. core.board_posts permite tecnicamente mas
 * de una fila por athlete_id, pero el Portal nunca debe mostrar mas de
 * una: si por cualquier motivo hubiera varias, se toma solo la mas
 * reciente (published_at desc) y el resto se ignora en la UI. Se llama
 * siempre desde el lado profesional (ve el tablon aunque este caducado,
 * gracias a su propia policy RLS) — el atleta tiene su propia policy que
 * ya excluye lo caducado/archivado, sin logica adicional aqui.
 */
export async function getAthleteBoard(athleteId: string): Promise<BoardWithMedia | null> {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("board_posts")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("published_at", { ascending: false })
    .limit(1);

  const post = posts?.[0];
  if (!post) return null;

  const { data: media } = await supabase
    .from("board_post_media")
    .select("*")
    .eq("board_post_id", post.id)
    .order("position", { ascending: true });

  const imagePaths = (media ?? [])
    .filter((m) => m.media_type === "image")
    .map((m) => m.url);

  const signedUrlByPath = new Map<string, string>();
  if (imagePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BOARD_MEDIA_BUCKET)
      .createSignedUrls(imagePaths, SIGNED_URL_TTL_SECONDS);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedUrlByPath.set(s.path, s.signedUrl);
    }
  }

  const resolvedMedia: BoardPostMediaResolved[] = (media ?? []).map((m) => ({
    ...m,
    signedUrl: m.media_type === "image" ? (signedUrlByPath.get(m.url) ?? null) : null,
  }));

  return { ...post, media: resolvedMedia };
}

export async function getGoals(athleteId: string): Promise<Goal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Un valor de medida ya situado en su historico: la fila real de
 * evaluation_result_measures mas los campos de su definicion
 * (evaluation_template_measures) necesarios para mostrarlo sin una
 * segunda consulta — nombre, si es la medida principal, su orden de
 * presentacion y su tipo de valor.
 */
export interface ClinicalMeasureValue extends EvaluationResultMeasureRow {
  measureName: string;
  measureIsPrimary: boolean;
  measureDisplayOrder: number | null;
  measureValueType: "numeric" | "categorical";
}

/**
 * Una "realizacion" es UNA prueba clinica hecha en una fecha concreta:
 * la visita (core.evaluations, nature='clinical') que la contiene mas
 * el resultado (core.evaluation_results) de esa plantilla concreta.
 * Cada realizacion es independiente — no se agrupan varias por
 * coincidir en fecha (decision explicita: sin concepto de "visita
 * compartida" todavia). measures va vacio para evaluaciones simples —
 * una realizacion sigue siendo una realizacion tenga 0 o N medidas.
 */
export interface ClinicalRealization {
  evaluation: Evaluation;
  result: EvaluationResultRow;
  template: EvaluationTemplateRow;
  measures: ClinicalMeasureValue[];
}

export interface ClinicalEvaluationSummary {
  template: EvaluationTemplateRow;
  latest: ClinicalRealization;
  count: number;
}

type ClinicalResultJoinRow = EvaluationResultRow & {
  evaluations: Evaluation;
  evaluation_templates: EvaluationTemplateRow | null;
};

function toRealizations(rows: ClinicalResultJoinRow[]): ClinicalRealization[] {
  const realizations: ClinicalRealization[] = [];
  for (const row of rows) {
    const { evaluations: evaluation, evaluation_templates: template, ...result } = row;
    if (!template) continue;
    realizations.push({ evaluation, template, result: result as EvaluationResultRow, measures: [] });
  }
  return realizations;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type MeasureJoinRow = EvaluationResultMeasureRow & {
  evaluation_template_measures: {
    name: string;
    is_primary: boolean;
    display_order: number | null;
    value_type: string;
  } | null;
};

/**
 * Trae en UNA sola consulta las medidas de varias realizaciones a la
 * vez (evita N+1: nunca se llama una vez por realizacion). Devuelve un
 * mapa evaluation_result_id -> sus medidas, ya ordenadas por
 * display_order de la medida.
 */
async function fetchMeasuresForResults(
  supabase: SupabaseServerClient,
  resultIds: string[]
): Promise<Map<string, ClinicalMeasureValue[]>> {
  const map = new Map<string, ClinicalMeasureValue[]>();
  if (resultIds.length === 0) return map;

  const { data } = await supabase
    .from("evaluation_result_measures")
    .select("*, evaluation_template_measures(name, is_primary, display_order, value_type)")
    .in("evaluation_result_id", resultIds);

  for (const row of (data ?? []) as unknown as MeasureJoinRow[]) {
    const { evaluation_template_measures: def, ...measure } = row;
    if (!def) continue;
    const value: ClinicalMeasureValue = {
      ...(measure as EvaluationResultMeasureRow),
      measureName: def.name,
      measureIsPrimary: def.is_primary,
      measureDisplayOrder: def.display_order,
      measureValueType: def.value_type === "categorical" ? "categorical" : "numeric",
    };
    const list = map.get(value.evaluation_result_id) ?? [];
    list.push(value);
    map.set(value.evaluation_result_id, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => (a.measureDisplayOrder ?? 0) - (b.measureDisplayOrder ?? 0));
  }
  return map;
}

/**
 * Un tipo de evaluacion (plantilla) solo aparece aqui si el atleta
 * tiene al menos una realizacion real — nunca se muestra un catalogo
 * de pruebas pendientes. Se agrupa por evaluation_template_id y se
 * queda con la mas reciente de cada grupo para el resumen. Si esa mas
 * reciente es de una plantilla compuesta, trae tambien sus medidas
 * (en una unica consulta batched, no una por realizacion) para poder
 * mostrar su valor principal sin inventarlo.
 */
export async function getClinicalEvaluationSummaries(
  athleteId: string
): Promise<ClinicalEvaluationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluation_results")
    .select("*, evaluations!inner(*), evaluation_templates(*)")
    .eq("evaluations.athlete_id", athleteId)
    .eq("evaluations.nature", "clinical");

  const realizations = toRealizations((data ?? []) as unknown as ClinicalResultJoinRow[]);

  const byTemplate = new Map<string, ClinicalRealization[]>();
  for (const r of realizations) {
    const list = byTemplate.get(r.template.id) ?? [];
    list.push(r);
    byTemplate.set(r.template.id, list);
  }
  for (const list of byTemplate.values()) {
    list.sort((a, b) => b.evaluation.date.localeCompare(a.evaluation.date));
  }

  const latestCompositeResultIds = [...byTemplate.values()]
    .map((list) => list[0])
    .filter((r) => r.template.is_composite)
    .map((r) => r.result.id);
  const measuresByResult = await fetchMeasuresForResults(supabase, latestCompositeResultIds);

  const summaries: ClinicalEvaluationSummary[] = [];
  for (const list of byTemplate.values()) {
    const latest = list[0];
    const latestWithMeasures: ClinicalRealization = {
      ...latest,
      measures: latest.template.is_composite ? (measuresByResult.get(latest.result.id) ?? []) : [],
    };
    summaries.push({ template: latest.template, latest: latestWithMeasures, count: list.length });
  }
  summaries.sort((a, b) => b.latest.evaluation.date.localeCompare(a.latest.evaluation.date));
  return summaries;
}

/**
 * Historico completo (todas las realizaciones) de un tipo de
 * evaluacion. Si la plantilla es compuesta, trae las medidas de TODAS
 * las realizaciones en una unica consulta batched (no una por
 * realizacion).
 */
export async function getClinicalEvaluationHistory(
  athleteId: string,
  templateId: string
): Promise<ClinicalRealization[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluation_results")
    .select("*, evaluations!inner(*), evaluation_templates(*)")
    .eq("evaluations.athlete_id", athleteId)
    .eq("evaluations.nature", "clinical")
    .eq("evaluation_template_id", templateId);

  const realizations = toRealizations((data ?? []) as unknown as ClinicalResultJoinRow[]);
  realizations.sort((a, b) => b.evaluation.date.localeCompare(a.evaluation.date));

  if (realizations.length === 0 || !realizations[0].template.is_composite) {
    return realizations;
  }

  const measuresByResult = await fetchMeasuresForResults(
    supabase,
    realizations.map((r) => r.result.id)
  );
  return realizations.map((r) => ({
    ...r,
    measures: measuresByResult.get(r.result.id) ?? [],
  }));
}

/** Valores de medida de UNA realizacion compuesta concreta — usado solo
 * por EvaluationModal al cargar una realizacion existente para editarla
 * (no por el historico, que se aborda en otro bloque). */
export async function getEvaluationResultMeasures(
  evaluationResultId: string
): Promise<EvaluationResultMeasureRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("evaluation_result_measures")
    .select("*")
    .eq("evaluation_result_id", evaluationResultId);
  return data ?? [];
}

export async function getAthleteClubTeam(athleteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athlete_team")
    .select("position, dorsal, status, teams(id, name, category, sport_id, club_id, clubs(name))")
    .eq("athlete_id", athleteId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}
