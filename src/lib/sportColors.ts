/**
 * Etiquetas y colores por deporte — recuperados TAL CUAL de ORION
 * Track (frontend/src/types/index.ts, SPORT_LABELS/SPORT_COLORS),
 * no reinventados. Los ids coinciden exactamente con core.sports.id.
 * Se usan como acento visual (borde/indicador), nunca como fondo
 * completo, para no convertir la interfaz en un arcoiris.
 */
export const SPORT_LABELS: Record<string, string> = {
  football: "Fútbol",
  basketball: "Baloncesto",
  handball: "Balonmano",
  volleyball: "Voleibol",
  esports: "eSports",
  padel: "Pádel",
  tennis: "Tenis",
  athletics: "Atletismo",
  shooting: "Tiro",
  motor: "Motor",
  baseball: "Béisbol/Softball",
  hockey: "Hockey",
  cricket: "Cricket",
  golf: "Golf",
  swimming: "Natación",
  combat: "Deportes de combate",
  futsal: "Fútbol Sala",
};

export const SPORT_COLORS: Record<string, string> = {
  football: "#32CD32",
  basketball: "#FFA500",
  padel: "#4169E1",
  tennis: "#9ACD32",
  athletics: "#800020",
  handball: "#FF4500",
  volleyball: "#DAA520",
  esports: "#8B5CF6",
  shooting: "#8B4513",
  motor: "#4A4A4A",
  baseball: "#F5F5F5",
  hockey: "#FF6347",
  cricket: "#228B22",
  golf: "#2E8B57",
  swimming: "#4169E1",
  combat: "#2C2C2C",
  futsal: "#50C878",
};

export function sportLabel(sportId: string | null): string {
  if (!sportId) return "Sin deporte";
  return SPORT_LABELS[sportId] ?? sportId;
}

export function sportColor(sportId: string | null): string {
  if (!sportId) return "#94A3B8"; // gris neutro para "sin deporte"
  return SPORT_COLORS[sportId] ?? "#94A3B8";
}
