const PATHS: Record<string, string> = {
  "/inicio": "M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9",
  "/mi-agenda":
    "M7 3v3M17 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z",
  "/perfiles":
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 9c0-3 2.5-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M21 20c0-2.4-1.8-4.2-4-4.8",
  "/visual-lab":
    "M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  "/disenar": "M4 20l4-1 11-11-3-3L5 16l-1 4Zm10-13 3 3",
  "/biblioteca": "M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z",
  "/chat": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  "/configuracion":
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a7.97 7.97 0 0 0-.15-1.5l2.02-1.58-2-3.46-2.4.96a8 8 0 0 0-2.6-1.5L14.5 2h-4l-.37 2.92a8 8 0 0 0-2.6 1.5l-2.4-.96-2 3.46L4.15 10.5A7.97 7.97 0 0 0 4 12c0 .51.05 1.01.15 1.5l-2.02 1.58 2 3.46 2.4-.96a8 8 0 0 0 2.6 1.5L9.5 22h4l.37-2.92a8 8 0 0 0 2.6-1.5l2.4.96 2-3.46-2.02-1.58c.1-.49.15-.99.15-1.5Z",
};

export default function NavIcon({ href, className = "h-4 w-4" }: { href: string; className?: string }) {
  const d = PATHS[href];
  if (!d) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}
