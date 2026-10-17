'use client'

/**
 * Paso "elegir deportista o modo demo" para Reaction Time V.2.
 *
 * "Ninguno" ELIMINADO a proposito (antes existia aqui, con un `hasInteracted`
 * para distinguir "nada tocado todavia" de "Ninguno elegido explicitamente" -
 * ver historial de este archivo): esta pantalla ya tiene una via
 * independiente para "sin deportista", el bloque "Usar en modo demo" de
 * abajo ("Continuar sin deportista" -> `${basePath}/demo`), asi que
 * "Ninguno" era una segunda forma redundante de llegar a lo mismo y
 * complicaba el estado sin necesidad. AthletePicker sigue siendo el mismo
 * componente compartido, con `allowNone={false}` (prop nueva, por defecto
 * true para el resto de usos del Portal - ver AthletePicker.tsx) para que
 * no renderice ese boton aqui.
 *
 * Sin "Ninguno", el formulario ya no necesita distinguir "nada tocado" de
 * "Ninguno elegido": submit sin atleta seleccionado es simplemente
 * "no ha elegido nada todavia" -> error, sin ninguna ambiguedad.
 *
 * `basePath` parametriza a donde navega ("<basePath>/<athleteId>" o
 * "<basePath>/demo") para que este mismo componente sirva tanto a la
 * ruta de prueba aislada como al catalogo normal, sin duplicar nada.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AthletePicker from '@/components/agenda/AthletePicker'

interface AthleteOption {
  id: string
  label: string
  shortId?: number
}

export default function ReactionTimeV2AthletePicker({ athletes, basePath }: { athletes: AthleteOption[]; basePath: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-orion-navy-100 bg-white p-6">
        <p className="mb-4 text-sm font-medium text-orion-navy-700">
          Selecciona el perfil del deportista para ejecutar este ejercicio
        </p>
        {athletes.length === 0 ? (
          <p className="text-sm text-orion-navy-400">No tienes atletas disponibles todavía.</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const athleteId = String(formData.get('athlete_id') ?? '')
              if (athleteId) {
                setError(null)
                router.push(`${basePath}/${athleteId}`)
                return
              }
              setError('Selecciona un perfil, o usa "Continuar sin deportista" para el modo demo.')
            }}
            className="space-y-4"
          >
            <AthletePicker name="athlete_id" athletes={athletes} allowNone={false} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              className="rounded-lg bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-800"
            >
              Continuar
            </button>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-orion-navy-200 bg-orion-navy-50/40 p-6">
        <p className="mb-1 text-sm font-semibold text-orion-navy-900">Usar en modo demo</p>
        <p className="mb-4 text-sm text-orion-navy-500">
          Ejecutar sin asociar los resultados a ningún perfil.
        </p>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/demo`)}
          className="rounded-lg border border-orion-navy-300 bg-white px-4 py-2 text-sm font-semibold text-orion-navy-700 hover:bg-orion-navy-100"
        >
          Continuar sin deportista
        </button>
      </div>
    </div>
  )
}
