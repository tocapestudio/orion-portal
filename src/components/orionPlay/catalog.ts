import type { ReactElement } from "react";
import { BoltIcon, TargetIcon, EyeIcon, StopwatchIcon } from "./icons";

/**
 * Catalogo de ejercicios de ORION Play — recupera DEMO_EXERCISES de
 * app/exercises/page.tsx tal cual (mismos id/name/description), añadiendo
 * solo "available" para distinguir Reaction Time (conectado a Core) de
 * Click Targets / Visual Memory (todavia no implementados en esta fase).
 * No es un nuevo diseño: es el mismo catalogo original, con su propio
 * icono por ejercicio (ver ./icons.tsx).
 */
export interface PlayExerciseMeta {
  id: string;
  name: string;
  description: string;
  available: boolean;
  Icon: (props: { className?: string }) => ReactElement;
}

export const PLAY_EXERCISES: PlayExerciseMeta[] = [
  {
    id: "reaction-time",
    name: "Go/No Go",
    description:
      "Pon a prueba tu tiempo de reacción con ejercicios Go/No-Go. Mejora tu velocidad de respuesta y tu toma de decisiones.",
    available: true,
    Icon: BoltIcon,
  },
  {
    id: "click-targets",
    name: "Click Targets",
    description: "Haz clic en los objetivos a medida que aparecen. Mejora tu coordinación visomotora y tu precisión.",
    available: true,
    Icon: TargetIcon,
  },
  {
    id: "visual-memory-precision",
    name: "Visual Memory Precision",
    description: "Pon a prueba tu memoria visual y tu precisión. Desafía tu capacidad de reconocimiento de patrones.",
    available: true,
    Icon: EyeIcon,
  },
  {
    id: "simple-reaction",
    name: "Tiempo de reacción",
    description:
      "Mide tu tiempo de reacción simple ante un único tipo de estímulo, sin tarea de inhibición. Responde lo más rápido posible en cuanto aparezca.",
    available: true,
    Icon: StopwatchIcon,
  },
];

export function getPlayExercise(id: string): PlayExerciseMeta | undefined {
  return PLAY_EXERCISES.find((e) => e.id === id);
}
