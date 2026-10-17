import Image from "next/image";

/** Miniatura de persona: foto si existe, si no un icono generico. Reutilizable en cualquier lista/ficha. */
export default function Avatar({
  src,
  size = 40,
  className = "",
}: {
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-orion-navy-100 ${className}`}
    >
      {src ? (
        <Image src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-[60%] w-[60%] text-orion-navy-400"
        >
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.6-5-8-5Z" />
        </svg>
      )}
    </div>
  );
}
