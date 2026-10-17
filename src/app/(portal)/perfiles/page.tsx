import { getPrograms } from "@/lib/data/programs";
import { getMyAthleteRoster } from "@/lib/data/athletes";
import { getClubNamesForAthletes } from "@/lib/data/clubs";
import { getOccupationsForAthletes } from "@/lib/data/workProfile";
import ProgramCard from "@/components/perfiles/ProgramCard";
import RosterClient from "@/components/perfiles/RosterClient";
import LastVisitedProfileCard from "@/components/perfiles/LastVisitedProfileCard";
import StaticBackLink from "@/components/layout/StaticBackLink";

export default async function PerfilesPage() {
  const [programs, athletes] = await Promise.all([getPrograms(), getMyAthleteRoster()]);
  const keratosAthleteIds = athletes
    .filter((a) => a.programIds.includes("keratos"))
    .map((a) => a.id);
  const avanzaAthleteIds = athletes
    .filter((a) => a.programIds.includes("avanza"))
    .map((a) => a.id);
  const [clubNameByAthleteMap, occupationByAthleteMap] = await Promise.all([
    getClubNamesForAthletes(keratosAthleteIds),
    getOccupationsForAthletes(avanzaAthleteIds),
  ]);
  const clubByAthleteId = Object.fromEntries(clubNameByAthleteMap);
  const occupationByAthleteId = Object.fromEntries(occupationByAthleteMap);

  return (
    // Flecha "Volver" en el margen izquierdo (position:absolute, nunca
    // una fila que empuje el contenido hacia abajo - mismo criterio que
    // SecondaryScreenShell.tsx, aunque aqui no se usa el shell completo
    // para no interponer su propio wrapper de scroll). `pl-12` (48px)
    // reserva el margen para la flecha - vive en el wrapper EXTERIOR
    // (sin max-w propio), para que el bloque centrado de abajo se
    // centre dentro del espacio YA reducido por ese hueco (el area de
    // <main>, nunca ignorando el Sidebar) - asi queda desplazado
    // moderadamente a la izquierda respecto a la pagina completa.
    //
    // `max-w-[1080px] mx-auto`: a proposito MAS ESTRECHO que el ancho
    // disponible tipico en escritorio (Sidebar 240px + padding de
    // <main> + este pl-12 ya restan ~330-480px segun resolucion) - si
    // el max-w fuera mayor (1280px, version anterior), en portatiles de
    // 1366-1440px el bloque llenaba todo el hueco disponible y
    // `mx-auto` no tenia margen que repartir, pareciendo "pegado" pese
    // a estar centrado. Con 1080px queda margen real en resoluciones
    // habituales. El listado conserva ~846-866px (mas que los 896px
    // originales con sidebar en 280px; algo menos con sidebar ahora en
    // 190-210px, ver mas abajo) - sigue siendo el elemento con mas
    // protagonismo, los controles de busqueda/filtros/+Nuevo (ninguno
    // con un ancho minimo mayor a ~700px en conjunto) caben de sobra.
    <div className="relative pl-12">
      <div className="absolute left-0 top-0 z-10">
        <StaticBackLink href="/inicio" />
      </div>

      <div className="mx-auto max-w-[1080px]">
        {/* `items-start`: "Último perfil" mide SOLO su propio contenido,
            nunca se estira a la altura del listado. Columna
            `minmax(190px,210px)` (antes 230-280px, con demasiado
            protagonismo visual para una tarjeta pensada como discreta) -
            en el rango 190-210px pedido. */}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(190px,210px)]">
          <div className="min-w-0 space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {programs.map((p) => (
                <ProgramCard key={p.id} id={p.id} label={p.label} description={p.description} />
              ))}
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-orion-navy-500">
                Todos tus perfiles
              </p>
              <RosterClient
                athletes={athletes}
                programs={programs}
                clubByAthleteId={clubByAthleteId}
                occupationByAthleteId={occupationByAthleteId}
              />
            </div>
          </div>

          {/* "Último perfil": columna lateral REAL dentro del grid,
              siempre presente cuando hay un perfil accesible - NO
              depende de ningun umbral de ancho ni de position:absolute
              (ver LastVisitedProfileCard.tsx: logica de datos sin
              cambios - localStorage + verificacion de acceso real -,
              solo cambia COMO se posiciona). Devuelve null (ningun
              hueco visible, pero tampoco nada que mostrar) si no hay
              ningun perfil cacheado en localStorage de ESTE navegador
              (visitar un perfil de atleta lo registra) o si ese
              perfil ya no es accesible por RLS - eso no es un fallo
              visual, es la ausencia real de un "ultimo perfil" que
              mostrar. */}
          <LastVisitedProfileCard />
        </div>
      </div>
    </div>
  );
}
