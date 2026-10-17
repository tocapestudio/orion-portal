import { notFound } from "next/navigation";
import { getModalities } from "@/lib/data/visualLab";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { ModuleIcon, MODULE_LABELS, MODULE_DEFINITIONS, StatusPill } from "../moduleMeta";

const NOTES: Record<string, string> = {
  react:
    "ORION React ya tiene una aplicación web propia y funcional (PWA, control BLE de los nodos). En una fase posterior se enlazará aquí en vez de reimplementarla dentro del Portal.",
  frame:
    "ORION Frame está en fase de diseño de hardware/firmware — todavía no existe un prototipo físico funcional. Ver ORION_Core_Fase8_DEVICE_FOUNDATION_DESIGN_v1.md para el estado del diseño.",
  play: "ORION Play (orion-lab-fe) usa su propio sistema de autenticación (Clerk). Se enlazará como módulo externo una vez definida la integración con ORION Core.",
  manual: "Registro manual de actividad sin dispositivo — utiliza directamente el flujo de sesiones de ORION Core.",
};

export default async function ModalityPage({
  params,
}: {
  params: Promise<{ modality: string }>;
}) {
  const { modality } = await params;
  const modalities = await getModalities();
  const found = modalities.find((m) => m.id === modality);
  if (!found) notFound();

  return (
    <SecondaryScreenShell fallbackHref="/visual-lab">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-dashed border-orion-navy-200 bg-white p-6">
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
          <p className="text-sm text-orion-navy-600">
            {NOTES[found.id] ?? "Módulo pendiente de integración."}
          </p>
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
