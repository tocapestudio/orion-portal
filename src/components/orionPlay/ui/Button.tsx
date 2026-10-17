import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

/**
 * Adaptacion minima del Button.tsx original de ORION Play: mismas
 * props/variantes, clases Tailwind nativas del Portal en vez de las
 * clases "btn"/"btn-primary"/... del CSS propio de ORION Play.
 */
export default function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-orion-navy-700 text-white hover:bg-orion-navy-800",
    secondary: "border border-orion-navy-200 text-orion-navy-700 hover:bg-orion-navy-100",
    ghost: "text-orion-navy-700 hover:bg-orion-navy-100",
  };
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
