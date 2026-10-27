# CDS E-commerce Challenge

Base del challenge técnico de CodigoDelSur: Next.js, TypeScript, tRPC, Better Auth y PostgreSQL con Prisma.

Actualmente conserva la aplicación de tareas de la plantilla. El catálogo, los roles, el carrito, las órdenes y Stripe todavía no están implementados. El bucket S3 ya está configurado; la integración con la aplicación está pendiente.

## Requisitos

- Node.js 24.
- Bun 1.2.20, versión declarada en `package.json`.
- Docker con Docker Compose.

## Ejecutar localmente

### 1. Variables de entorno

```sh
cp .env.example .env
```

Editar `.env` antes de continuar:

- Reemplazar `POSTGRES_PASSWORD` por una contraseña local generada con `openssl rand -hex 16`.
- Usar la misma contraseña en `DATABASE_URL`.
- Reemplazar `BETTER_AUTH_SECRET` con el resultado de `openssl rand -hex 32`.
- Mantener `BETTER_AUTH_URL=http://localhost:3100`.

No subir `.env` a Git. `.env.example` contiene únicamente ejemplos y parámetros no secretos. El entorno ya preparado en la computadora del candidato tiene sus propios secretos aleatorios.

### 2. Instalar dependencias

```sh
bun install --frozen-lockfile
```

### 3. Iniciar PostgreSQL

```sh
docker compose up -d --wait
```

Se crea una base exclusiva del challenge en `localhost:5433`, accesible únicamente desde esta computadora, con datos persistentes en el volumen `cds-ecommerce-challenge_postgres_data`. No utiliza ni modifica otros contenedores PostgreSQL existentes.

Si se cambia `POSTGRES_PORT`, actualizar también el puerto de `DATABASE_URL`. Las credenciales de PostgreSQL inicializan un volumen nuevo; cambiarlas en `.env` no cambia automáticamente la contraseña de una base ya creada.

### 4. Generar el cliente y aplicar migraciones existentes

```sh
bun run db:generate
bun run db:deploy
```

Para crear migraciones futuras durante el desarrollo se usa `bun run db:migrate`. No es necesario crear nuevas migraciones para arrancar esta base.

### 5. Iniciar Next.js

```sh
bun run dev
```

Abrir [http://localhost:3100/login](http://localhost:3100/login). El puerto `3100` evita interferir con otros proyectos locales. Si se cambia, actualizar los scripts de Next.js y `BETTER_AUTH_URL`.

La plantilla incluye pantalla de login y endpoints de registro y sesión de Better Auth, pero no incluye pantalla de registro ni usuarios precargados. Durante la preparación se verificó el flujo mediante la API con un usuario temporal que fue eliminado al terminar.

## Comprobaciones

```sh
bun run lint
bun run typecheck
bun run build
```

`typecheck` genera primero los tipos de rutas de Next.js. `build` utiliza las fuentes de Google declaradas en la plantilla y puede requerir acceso a internet.

Para ejecutar la compilación de producción, detener antes el servidor de desarrollo y ejecutar:

```sh
bun run start
```

## Base de datos

```sh
docker compose ps
bun run db:studio
docker compose stop
```

Detener el contenedor conserva los datos. Eliminar el volumen con `docker compose down -v` borra definitivamente la base local; no se necesita para el arranque normal.

## AWS S3

Consultar [configuración y verificación de S3](docs/aws/s3.md). La aplicación local base puede arrancar sin conectarse a AWS. El perfil `cds-challenge` y el bucket documentado pertenecen al entorno del candidato; otro desarrollador debe configurar sus propios recursos para probar la integración futura.

## Stripe

La configuración de pagos de prueba está documentada en [preparación de Stripe](docs/stripe.md). Las claves locales ya fueron verificadas; el checkout y el receptor de webhooks siguen pendientes de implementación.

## Planificación del challenge

- [Alcance y criterios de aceptación](docs/alcance.md).
- [Arquitectura, modelo de datos y flujo de pagos](docs/arquitectura.md).
- [Plan de implementación, validación y entrega](docs/plan-implementacion.md).

## Origen e instrucciones de la plantilla

- [Origen de la plantilla](docs/template-origin.md).
- [Convenciones del proyecto y reglas AWS](AGENTS.md).
- Skills preservadas en `.agents/skills/`, con sus enlaces en `.claude/skills/`.
