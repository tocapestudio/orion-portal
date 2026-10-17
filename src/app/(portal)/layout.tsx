import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import NavigationTracker from "@/components/layout/NavigationTracker";

/**
 * Layout universal de todas las pantallas protegidas del Portal:
 * menu lateral + header + logo, siempre presentes. El middleware
 * ya protege estas rutas a nivel de peticion; esta comprobacion
 * server-side es una segunda capa de defensa, no la unica.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <NavigationTracker />
      <Sidebar />
      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-orion-navy-100/40 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
