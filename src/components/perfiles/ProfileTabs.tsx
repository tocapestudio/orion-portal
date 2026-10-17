"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "general", label: "General" },
  { key: "evaluaciones-clinicas", label: "Evaluaciones clínicas" },
  { key: "rendimiento-visual", label: "Rendimiento Visual" },
  { key: "objetivos", label: "Objetivos" },
  { key: "agenda", label: "Agenda" },
  { key: "historial", label: "Historial" },
];

export default function ProfileTabs({ athleteId }: { athleteId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-orion-navy-100">
      {TABS.map((tab) => {
        const href = `/perfiles/atleta/${athleteId}/${tab.key}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              active
                ? "border-orion-navy-700 text-orion-navy-900"
                : "border-transparent text-orion-navy-400 hover:text-orion-navy-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
