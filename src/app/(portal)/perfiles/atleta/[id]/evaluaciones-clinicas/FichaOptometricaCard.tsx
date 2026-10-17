import { getOpticalProfile, getOptometriaList } from "@/lib/data/opticalProfile";
import FichaOptometricaForm from "./FichaOptometricaForm";

/**
 * Estado optico-visual del atleta, con historial de optometrias — distinto
 * del historico de realizaciones en Clinical Evaluations (misma pestaña,
 * columna derecha). Server Component: lee la lista de optometrias y la mas
 * reciente ("ficha actual") via opticalProfile.ts; toda la interactividad
 * (navegacion ‹ ›, modo edicion, guardado, Nueva optometria) vive en
 * FichaOptometricaForm, que mantiene su propio estado cliente para poder
 * cambiar de optometria sin recargar la pagina.
 */
export default async function FichaOptometricaCard({
  athleteId,
  canEdit,
}: {
  athleteId: string;
  canEdit: boolean;
}) {
  const [optometrias, profile] = await Promise.all([
    getOptometriaList(athleteId),
    getOpticalProfile(athleteId),
  ]);

  return (
    <div className="rounded-xl border border-orion-navy-100 bg-white p-4">
      <FichaOptometricaForm
        athleteId={athleteId}
        initialProfile={profile}
        initialOptometrias={optometrias}
        canEdit={canEdit}
      />
    </div>
  );
}
