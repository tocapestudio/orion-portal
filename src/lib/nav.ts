export interface NavItem {
  label: string;
  href: string;
}

/**
 * Navegacion principal universal del Portal (PDF "FLUJO ORION"):
 * INICIO, MI AGENDA, PERFILES, VISUAL LAB, DISEÑAR, BIBLIOTECA,
 * CHAT, CONFIGURACION. Un unico origen de verdad para el Sidebar
 * y para el panel desplegable movil.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/inicio" },
  { label: "Mi Agenda", href: "/mi-agenda" },
  { label: "Perfiles", href: "/perfiles" },
  { label: "Visual Lab", href: "/visual-lab" },
  { label: "Diseñar", href: "/disenar" },
  { label: "Biblioteca", href: "/biblioteca" },
  { label: "Chat", href: "/chat" },
  { label: "Configuración", href: "/configuracion" },
];
