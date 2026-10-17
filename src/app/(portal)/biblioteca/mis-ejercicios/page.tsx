import { getMyExercises } from "@/lib/data/library";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import ExercisesClient from "./ExercisesClient";

export default async function MisEjerciciosPage() {
  const exercises = await getMyExercises();

  return (
    <SecondaryScreenShell fallbackHref="/biblioteca">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-orion-navy-500">
          Ejercicios propios (core.activity_catalog). La categoría se mantiene como texto libre
          mientras se cierra la taxonomía definitiva en Diseñar. Asociar material de apoyo estará
          disponible cuando cierre Consulta tu material.
        </p>
        <ExercisesClient exercises={exercises} />
      </div>
    </SecondaryScreenShell>
  );
}
