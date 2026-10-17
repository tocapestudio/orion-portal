# ORION Visual Lab — Portal

Portal profesional del ecosistema ORION Visual Lab. Next.js (App Router) + TypeScript +
Supabase Auth, apoyado directamente en el modelo de datos de **ORION Core** (schema
`core` en el mismo proyecto Supabase usado por ORION Track/React). No tiene base de
datos propia ni sistema de autenticación propio.

**Estado: Fase 1 — esqueleto real del Portal.** Estructura, navegación y autenticación
funcionando contra datos reales de Core; los constructores de Diseñar/Biblioteca quedan
deliberadamente pendientes de una fase posterior (ver `docs` de ORION Core -
`ORION_Core_Fase8_DEVICE_FOUNDATION_DESIGN_v1.md` y los documentos de la fase de
Provisioning/Auth para contexto de arquitectura).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4
- [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) para Auth
  en Server Components / Server Actions / middleware
- Tipos generados directamente desde el schema real de Core
  (`src/types/database.types.ts`, vía `supabase gen types typescript`)

## Requisitos

- Node.js 20+
- Acceso al proyecto Supabase de ORION (URL + anon key)

## Configuración local

1. Copia `.env.example` a `.env.local` y rellena las dos variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   Ambas son públicas por diseño de Supabase (se embeben en el navegador). La
   autorización real la garantiza siempre Row Level Security en Postgres — **nunca**
   añadas aquí la `service_role` key.

2. Instala dependencias:

   ```bash
   npm install
   ```

3. Arranca el entorno de desarrollo:

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |

## Regenerar los tipos de Core

Si el schema de `core` cambia (nueva migración en `ORION-MainDatabase`), regenera los
tipos desde el repo de la base de datos:

```bash
supabase gen types typescript --linked --schema core > src/types/database.types.ts
```

## Estructura

- `src/app/(portal)/` — pantallas protegidas (layout universal: sidebar + header).
- `src/app/login`, `src/app/registro` — pantallas públicas.
- `src/lib/supabase/` — clientes de Supabase (browser/server/middleware).
- `src/lib/auth/` — sesión y roles del usuario actual.
- `src/lib/data/` — funciones de lectura de datos, siempre respetando RLS (nunca se
  bypassea, nunca se usa `service_role`).
- `middleware.ts` — refresco de sesión y protección de rutas.

## Despliegue (Vercel)

No desplegado todavía. Cuando se autorice:

1. Conectar el repositorio de GitHub a un proyecto de Vercel.
2. Configurar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` como
   variables de entorno del proyecto en Vercel (nunca en el repositorio).
3. Deploy.

## Seguridad

- La autorización de datos vive exclusivamente en RLS (Postgres), nunca en el
  frontend. Ningún `professional_id`/`athlete_id`/`device_id` enviado por el cliente
  se usa como fuente de autorización.
- Sin `service_role` en el frontend, sin secretos hardcodeados.
- `.env.local` nunca se sube al repositorio (`.gitignore`).
