import Link from "next/link";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";

/**
 * Hub real de ORION Tools (pisa al [modality] generico para id='tools',
 * mismo mecanismo ya usado por visual-lab/play y visual-lab/react -
 * confirmado en la auditoria previa, ningun cambio a ese mecanismo).
 *
 * 3er incremento (rediseño visual): de una lista estrecha de 2 enlaces
 * apilados (max-w-xl) a una cuadricula de tarjetas, mismo lenguaje visual
 * que el hub principal de Visual Lab (icono + titulo + descripcion,
 * borde propio, ver visual-lab/page.tsx) - deliberadamente NO se
 * reutiliza moduleMeta.tsx (eso describe los 4 MODULOS de Visual Lab,
 * no las herramientas DENTRO de Tools, un concepto distinto) ni se toca
 * ese archivo. ESCALABLE por diseño: añadir una herramienta futura
 * (fisica o digital) es una entrada mas en TOOLS_ENTRIES, nunca JSX
 * repetido a mano.
 */

interface ToolEntry {
  id: string;
  label: string;
  description: string;
  /** null = todavia no disponible (tarjeta deshabilitada, "Próximamente" -
   * nunca un enlace roto). */
  href: string | null;
  icon: (props: { className?: string }) => React.ReactElement;
}

function StimulusGeneratorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
      <circle cx="9.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M13.5 8.3l2.7 2.7-2.7 2.7" />
    </svg>
  );
}

function OptotypesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7h11M4 11h8M4 15h6M4 19h4" />
    </svg>
  );
}

function OculomotorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CartasIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2.5" y="5.5" width="11" height="15" rx="1.5" transform="rotate(-8 8 13)" />
      <rect x="10.5" y="4.5" width="11" height="15" rx="1.5" />
      <path d="M14 10h4M14 13.5h4" />
    </svg>
  );
}

const TOOLS_ENTRIES: ToolEntry[] = [
  {
    id: "stimulus-generator",
    label: "Generador de estímulos",
    description: "Estímulos visuales configurables (colores, números, letras, formas) para terapia, consulta y entrenamiento.",
    href: "/visual-lab/tools/stimulus-generator",
    icon: StimulusGeneratorIcon,
  },
  {
    id: "oculomotricidad",
    label: "Oculomotricidad",
    description: "Seguimiento visual y movimientos sacádicos con trayectorias y estímulos configurables.",
    href: "/visual-lab/tools/oculomotricidad",
    icon: OculomotorIcon,
  },
  {
    id: "cartas",
    label: "Cartas",
    description: "Cartas visuales configurables para entrenamiento optométrico.",
    // Abre Hart directamente: todavia no existe un submenu/hub intermedio
    // de Cartas (solo esta implementada esta herramienta de momento).
    href: "/visual-lab/tools/cartas/hart",
    icon: CartasIcon,
  },
  {
    id: "optotypes",
    label: "Optotipos",
    description: "Tabla optométrica digital configurable.",
    href: null,
    icon: OptotypesIcon,
  },
];

export default function VisualLabToolsPage() {
  return (
    <SecondaryScreenShell backHref="/visual-lab">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1a8f60]">ORION TOOLS</p>
          <h1 className="text-xl font-bold text-orion-navy-900">Herramientas digitales y material físico para terapia visual</h1>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {TOOLS_ENTRIES.map((tool) => {
            const Icon = tool.icon;
            const disabled = !tool.href;
            const content = (
              <>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orion-accent/10 text-[#1a8f60]">
                  <Icon className="h-6 w-6" />
                </div>
                <p className="text-base font-bold text-orion-navy-900">{tool.label}</p>
                <p className="text-sm leading-snug text-orion-navy-500">{tool.description}</p>
                {disabled && (
                  <span className="mt-1 inline-block w-fit rounded-full bg-orion-navy-50 px-2 py-0.5 text-[11px] font-medium text-orion-navy-300">
                    Próximamente
                  </span>
                )}
              </>
            );
            if (disabled) {
              return (
                <div
                  key={tool.id}
                  aria-disabled="true"
                  className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-orion-navy-100 bg-white p-6 text-center opacity-70"
                >
                  {content}
                </div>
              );
            }
            return (
              <Link
                key={tool.id}
                href={tool.href as string}
                className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-orion-accent bg-white p-6 text-center shadow-sm transition hover:border-[#28b87b] hover:shadow-lg"
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
