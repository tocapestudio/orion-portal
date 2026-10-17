/**
 * Metadatos de UI compartidos por programa (PRISMA/KERATOS/AVANZA) — misma
 * paleta que ya usaba ProgramCard (src/components/perfiles/ProgramCard.tsx)
 * para las tarjetas con degradado, aqui en version solida para los
 * indicadores pequeños de color. No vive en Core: es solo presentacion.
 */
export const PROGRAM_COLOR: Record<string, string> = {
  prisma: "bg-amber-600",
  keratos: "bg-orion-navy-800",
  avanza: "bg-teal-600",
};

export const PROGRAM_DESCRIPTIONS: Record<string, string> = {
  prisma: "Terapia visual infantil",
  keratos: "Entrenamiento visual deportivo",
  avanza: "Entrenamiento visual y cognitivo para adultos",
};
