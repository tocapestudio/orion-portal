export const PRISMA_PROCESS_STATUSES = [
  "en_espera",
  "en_valoracion",
  "en_tratamiento",
  "pausado",
  "alta",
  "abandono",
] as const;

export type PrismaProcessStatus = (typeof PRISMA_PROCESS_STATUSES)[number];

const LABELS: Record<PrismaProcessStatus, string> = {
  en_espera: "En espera",
  en_valoracion: "En valoración",
  en_tratamiento: "En tratamiento",
  pausado: "Pausado",
  alta: "Alta",
  abandono: "Abandono",
};

export function prismaProcessStatusLabel(status: string | null): string {
  return LABELS[status as PrismaProcessStatus] ?? "En espera";
}
