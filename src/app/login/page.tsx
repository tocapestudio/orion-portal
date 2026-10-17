import Image from "next/image";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen w-full">
      {/* Panel izquierdo: logo + animacion tech-lab-deportivo (placeholder por ahora) — 65% */}
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-orion-navy-950 via-orion-navy-800 to-orion-navy-600 md:flex md:w-[65%]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(61,220,151,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(74,114,184,0.35), transparent 50%)",
          }}
        />
        <Image
          src="/brand/logo-dark.png"
          alt="ORION Visual Lab"
          width={280}
          height={90}
          className="relative z-10"
          priority
        />
      </div>

      {/* Panel derecho: formulario — 35% */}
      <div className="flex w-full flex-col items-center justify-center gap-8 bg-orion-navy-100 px-6 py-12 md:w-[35%]">
        <Image
          src="/brand/logo-light.png"
          alt="ORION Visual Lab"
          width={200}
          height={64}
          className="md:hidden"
          priority
        />
        <div className="w-full max-w-sm">
          <h1 className="mb-1 text-xl font-semibold text-orion-navy-900">
            ¡Bienvenid@ a ORION!
          </h1>
          <p className="mb-6 text-sm text-orion-navy-500">
            Tu espacio para el entrenamiento visual
          </p>
          <LoginForm next={next || "/inicio"} />
        </div>
      </div>
    </div>
  );
}
