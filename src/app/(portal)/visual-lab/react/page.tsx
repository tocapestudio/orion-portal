import { notFound } from "next/navigation";
import { getModalities } from "@/lib/data/visualLab";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { ModuleIcon, MODULE_LABELS, MODULE_DEFINITIONS, StatusPill } from "../moduleMeta";

/**
 * Entrada DEDICADA de ORION React desde Visual Lab - ruta estatica
 * (gana sobre `../[modality]/page.tsx` en el enrutado de Next.js, mismo
 * criterio ya usado por `visual-lab/play/page.tsx`), para poder dar a
 * React una pantalla propia sin tocar el stub generico que siguen
 * usando frame/manual.
 *
 * Fase actual (solo navegacion + pantalla de entrada, SIN autenticacion
 * ni intercambio de sesion - eso es la fase siguiente, ya diseñada por
 * separado): el enlace de abajo es un `<a target="_blank">` normal
 * hacia la URL publica de React, sin ningun parametro ni token - abre
 * la app tal cual esta hoy, con su propio login de clave de acceso
 * (sin tocar). `rel="noopener noreferrer"` es higiene estandar al abrir
 * un origen externo en pestaña nueva; en la fase de autenticacion (que
 * necesitara `window.open` + `postMessage` con el `opener`) este enlace
 * se sustituira por un boton que abra la ventana de forma controlada -
 * no antes.
 *
 * `ORION_REACT_URL`: `NEXT_PUBLIC_ORION_REACT_URL` sigue teniendo prioridad
 * (permite apuntar a otra URL - p.ej. una preview - sin tocar codigo), pero
 * ya existe un dominio definitivo y estable para ORION React
 * (react.orionvisuallab.com), asi que ahora se usa como fallback en vez de
 * `null` - evita mostrar "pendiente de configuración" cuando la variable
 * de entorno no esta definida, que ya no es el caso real. La rama de
 * "pendiente de configuración" de abajo queda como proteccion defensiva
 * (nunca deberia alcanzarse ahora, salvo que alguien fije explicitamente
 * la variable de entorno a una cadena vacia).
 */
const ORION_REACT_URL =
  process.env.NEXT_PUBLIC_ORION_REACT_URL || "https://react.orionvisuallab.com";

export default async function OrionReactPage() {
  const modalities = await getModalities();
  const found = modalities.find((m) => m.id === "react");
  if (!found) notFound();

  return (
    <SecondaryScreenShell fallbackHref="/visual-lab">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-orion-navy-100 bg-white p-6">
          <div className="mb-3 flex items-start gap-3">
            <ModuleIcon moduleId={found.id} className="h-8 w-8 shrink-0 text-orion-navy-700" />
            <div>
              <h2 className="text-lg font-semibold text-orion-navy-900">
                {MODULE_LABELS[found.id] ?? found.label}
              </h2>
              {MODULE_DEFINITIONS[found.id] && (
                <p className="text-xs text-orion-navy-400">{MODULE_DEFINITIONS[found.id]}</p>
              )}
            </div>
            <div className="ml-auto">
              <StatusPill moduleId={found.id} />
            </div>
          </div>

          <p className="mb-4 text-sm text-orion-navy-600">
            ORION React es una aplicación independiente (PWA) que controla los nodos físicos por
            Bluetooth. Se abre en una pestaña nueva, con su propia interfaz y su propio inicio de
            sesión — todavía no comparte la sesión del Portal.
          </p>

          {ORION_REACT_URL ? (
            <a
              href={ORION_REACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orion-navy-800"
            >
              Abrir ORION React
              <span aria-hidden>↗</span>
            </a>
          ) : (
            <div className="rounded-lg border border-dashed border-orion-navy-200 bg-orion-navy-50/50 p-4">
              <p className="text-sm font-medium text-orion-navy-600">Pendiente de configuración</p>
              <p className="mt-1 text-xs text-orion-navy-400">
                La URL de ORION React todavía está pendiente de configuración para este entorno,
                y la autenticación compartida entre el Portal y React sigue pendiente de
                implementar. El acceso se habilitará aquí desde el Portal una vez completada esa
                integración segura.
              </p>
            </div>
          )}
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
