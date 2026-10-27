# CDS E-commerce Challenge

Base del challenge técnico de CodigoDelSur: Next.js, TypeScript, tRPC, Better Auth y PostgreSQL con Prisma.

La primera etapa incluye modelo de datos del e-commerce, registro, roles CUSTOMER/ADMIN, verificación de permisos y administrador inicial. El catálogo, el carrito, la compra y las pantallas de órdenes todavía no están implementados. El ejemplo de tareas de la plantilla se conserva temporalmente hasta reemplazarlo por la tienda. S3 y Stripe están configurados; sus integraciones siguen pendientes.

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

Crear una cuenta de cliente desde [http://localhost:3100/signup](http://localhost:3100/signup). Las contraseñas requieren entre 12 y 128 caracteres. El registro público siempre crea CUSTOMER; no permite elegir rol.

### 6. Preparar el administrador

Configurar `ADMIN_EMAIL`, `ADMIN_PASSWORD` y opcionalmente `ADMIN_NAME` en `.env`. Usar una contraseña propia de 12 a 128 caracteres y ejecutar:

```sh
bun run db:seed
```

El seed crea el usuario mediante Better Auth, asigna ADMIN en servidor y elimina la sesión generada durante el registro. Repetir el comando conserva las credenciales existentes. Si el email ya pertenece a un CUSTOMER, el comando se detiene sin promoverlo. Si falla entre la creación y la asignación del rol, elegir un email nuevo o revisar el registro local antes de reintentar.

En el entorno del candidato ya se creó el administrador. Sus credenciales están únicamente en `.env`. Después de iniciar sesión, abrir [http://localhost:3100/admin](http://localhost:3100/admin). El panel confirma el acceso administrativo; el CRUD de productos se implementará en la siguiente etapa.

## Comprobaciones

```sh
bun run lint
bun run test:unit
bun run typecheck
bun run build
```

`typecheck` genera primero los tipos de rutas de Next.js. `build` utiliza las fuentes de Google declaradas en la plantilla y puede requerir acceso a internet.

### Pruebas de integración

Crear una base de pruebas independiente dentro del mismo contenedor:

```sh
docker compose exec -T postgres createdb -U cds cds_ecommerce_test
```

Reemplazar `cds` si se configuró otro `POSTGRES_USER`. Este comando se ejecuta una sola vez. Configurar `TEST_DATABASE_URL` en `.env` con la misma contraseña/puerto locales y el nombre de esa base; luego ejecutar:

```sh
bun run test:integration
```

Las pruebas exigen un nombre de base terminado en `_test`, aplican las migraciones existentes allí y limpian únicamente sus propios registros. Comprueban escalamiento de privilegios, revocación de rol con sesión existente, logout, restricciones de cantidades/precios y unicidad de orden por intento. No consultan AWS ni Stripe.

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
