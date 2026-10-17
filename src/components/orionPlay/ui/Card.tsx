import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Adaptacion minima del Card.tsx original de ORION Play: mismas props
 * (children/hover/className/onClick), pero con clases Tailwind nativas
 * del Portal en vez de las clases "card"/"card-hover" (definidas en el
 * CSS propio de ORION Play, inexistente aqui). Ningun componente que lo
 * usa (ReactionTimeExercise, ExerciseRunner, ResultSummary) cambia su
 * JSX por este motivo.
 */
export default function Card({ children, hover = false, className = "", onClick }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-orion-navy-100 bg-white shadow-sm ${
        hover ? "cursor-pointer transition hover:border-orion-navy-400 hover:shadow-md" : ""
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
