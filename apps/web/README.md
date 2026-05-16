# Soto del Prior — App Control Ganadero

Plataforma web para gestión integral de ganadería extensiva: fincas, animales, eventos sanitarios y de manejo, alimentación, cálculo de rendimiento y recomendaciones nutricionales/genéticas.

## Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Lenguaje:** TypeScript (strict mode)
- **Estilos:** Tailwind CSS 4
- **ORM:** Prisma 5 (PostgreSQL)
- **Auth:** NextAuth v5 (credentials provider, JWT)
- **Validación:** Zod
- **Tests:** Vitest

## Estructura del proyecto

```
apps/web/
├── app/                    # App Router (rutas, layouts, server actions)
│   ├── api/                # Route handlers
│   ├── dashboard/          # Página principal autenticada
│   ├── login/              # Login
│   ├── register/           # Registro
│   └── lib/                # Server actions y schemas Zod
│       ├── actions.ts          # auth (signIn / register / signOut)
│       ├── auth-actions.ts     # reset password
│       ├── user-actions.ts     # CRUD de usuarios (con auth() server-side)
│       ├── farm-actions.ts     # CRUD de fincas
│       ├── animal-actions.ts   # CRUD de animales
│       ├── event-actions.ts    # CRUD de eventos de manejo
│       └── schemas.ts          # Zod schemas compartidos
├── components/             # Componentes cliente (UI)
├── context/                # Context providers (StorageContext)
├── hooks/                  # Hooks reutilizables
├── lib/                    # Utilidades server (prisma client, helpers)
├── prisma/
│   ├── schema.prisma       # Modelo de datos
│   └── seed.js             # Datos iniciales
├── services/               # Motores de negocio (genética, nutrición, clima)
├── tests/                  # Tests Vitest
├── auth.ts                 # Configuración NextAuth (server)
├── auth.config.ts          # Config edge-safe (compartida con middleware)
└── middleware.ts           # Protección de rutas
```

## Requisitos

- Node.js 20+
- PostgreSQL 14+ (local o remoto)

## Setup local

1. **Instalar dependencias** (desde la raíz del monorepo o `apps/web/`):
   ```bash
   npm install
   ```

2. **Configurar variables de entorno** — copia `.env.example` a `.env` y rellena los valores:
   ```bash
   cp .env.example .env
   ```

   Variables obligatorias:
   - `DATABASE_URL` — cadena de conexión PostgreSQL
   - `AUTH_SECRET` — genera con `openssl rand -base64 32`

   Variables opcionales:
   - `MASTER_ADMIN_EMAIL` — email que puede entrar sin aprobación previa
   - `NEXTAUTH_URL` — necesario para enlaces de reset password
   - `SMTP_*` — para envío real de emails (en dev se hace mock por consola)

3. **Generar cliente Prisma y migrar la base de datos:**
   ```bash
   npx prisma generate
   npx prisma db push   # o prisma migrate dev si gestionas migraciones
   ```

4. **(Opcional) Seed inicial:**
   ```bash
   node prisma/seed.js
   ```

5. **Arrancar en desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3001](http://localhost:3001).

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm test` | Tests con Vitest (single run) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Cobertura |

## Conceptos clave

### Server Actions
La capa de datos vive en `app/lib/*-actions.ts` y se invoca desde Server o Client Components vía `'use server'`. Todas las acciones que mutan estado:

- Obtienen la sesión con `auth()` server-side (nunca confían en IDs enviados por el cliente).
- Validan input con Zod (`schemas.ts`, `user-actions.ts`).
- Verifican ownership (`farm.userId === effectiveUserId`) o pertenencia jerárquica (`managedById`).

### Modelo de roles

- `ADMIN` — acceso total.
- `USER` — manager: gestiona sus propios trabajadores (`managedById`).
- `WORKER` — trabajador asignado a un manager; sus datos se resuelven vía `getEffectiveUserId()`.
- `VET` — veterinario.

### Master admin (opcional)
Si defines `MASTER_ADMIN_EMAIL`, ese usuario puede entrar aunque su flag `approved` sea `false`. Útil para arranque inicial.

### Protección de rutas
`middleware.ts` redirige a `/login` cualquier ruta no pública. Para `/api/*` (excepto `/api/auth/*`) devuelve `401 JSON`.

## Tests

```bash
npm test
```

Cobertura actual: validación de schemas Zod, server-utils, y auth-actions (forgot/reset password). Tests de integración con la base de datos requieren `DATABASE_URL` apuntando a una instancia de test.

## Despliegue

La app está pensada para despliegues estilo Vercel o Docker (ver `Dockerfile`). En producción:

1. `NODE_ENV=production` activa cookies `Secure` con prefijo `__Secure-`.
2. `AUTH_SECRET` es obligatorio — la app rehúsa arrancar sin él.
3. Ejecuta `npx prisma migrate deploy` antes del primer arranque.
