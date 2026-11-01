# CDS E-commerce — instalación local

## Requisitos previos

- Node.js 24 o superior y Bun 1.2.20.
- Docker con Docker Compose; el motor de Docker debe estar iniciado.
- Stripe CLI instalada y disponible en `PATH`.
- Un bucket S3 privado y acceso local de AWS para leer, subir y eliminar imágenes bajo `products/` y `categories/`.
- Una clave de API de Stripe de **prueba** (`sk_test_…` o `rk_test_…`) con acceso a Checkout y al listener local.
- Puertos `3100` (tienda) y `5433` (PostgreSQL) disponibles.

### Preparar las herramientas

1. Instalar **Node.js 24** desde la [descarga oficial](https://nodejs.org/en/download), seleccionando la versión 24 y el instalador para tu sistema. Incluye npm.
2. Instalar la versión de Bun del proyecto y Stripe CLI:

   ```sh
   npm install -g bun@1.2.20
   npm install -g @stripe/cli
   ```

   Alternativas por sistema: [instalación de Bun](https://bun.sh/docs/installation) e [instalación de Stripe CLI](https://docs.stripe.com/cli/install).

3. Instalar [Docker Desktop](https://docs.docker.com/get-started/get-docker/) para tu sistema y abrirlo. Esperar a que el motor esté listo. En Linux también se puede utilizar Docker Engine con el plugin Compose.
4. Instalar **AWS CLI v2** siguiendo el [instalador oficial para macOS, Windows o Linux](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). Se requiere 2.32 o superior si se utiliza `aws login`.
5. Si vas a clonar el repositorio, instalar [Git](https://git-scm.com/downloads). No hace falta si recibiste el proyecto en ZIP.

Abrir una terminal nueva y comprobar:

```sh
node --version
bun --version
stripe --version
docker compose version
docker info
aws --version
```

`node` debe indicar 24 o superior y `bun` 1.2.20. `docker info` debe responder sin error. Si algún comando no se reconoce, revisar su instalación y que esté disponible en `PATH`.

### Preparar AWS y el bucket

1. Usar una cuenta/proyecto AWS propio o un acceso proporcionado por tu organización.
2. En la consola de S3, crear un bucket de propósito general con nombre único. En el entorno original se usa `us-east-2`; si tu proyecto tiene una región asignada, usar esa región. Mantener **Block Public Access** activado, ACL deshabilitadas y cifrado SSE-S3. [Guía oficial de creación](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html).
3. El perfil local debe tener `s3:ListBucket` sobre el bucket y `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` sobre `products/*` y `categories/*`. Si no administrás los permisos, solicitar ese acceso al responsable de AWS. No es necesario hacer público el bucket ni habilitar CORS.
4. Para un acceso que utiliza inicio de sesión de consola, autenticar un perfil local:

   ```sh
   aws login --profile cds-challenge
   ```

   Completar el navegador y comprobar el acceso con el nombre real de tu bucket y región:

   ```sh
   aws sts get-caller-identity --profile cds-challenge
   aws s3api head-bucket --bucket TU_BUCKET --region us-east-2 --profile cds-challenge
   ```

   Si tu organización usa IAM Identity Center/SSO, conservar su flujo (`aws sso login --profile TU_PERFIL`) en lugar de `aws login`. [Autenticación local con AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html).

5. Anotar **nombre del bucket, región y nombre del perfil**: son los tres valores que pedirá el instalador. No copiar credenciales temporales a `.env`.

El uso de S3 puede generar cargos según tu plan. Más detalles de la integración: [configuración S3 del proyecto](docs/aws/s3.md).

### Preparar Stripe

1. Crear una cuenta en [Stripe](https://dashboard.stripe.com/register) o usar una existente.
2. Seleccionar o crear un **sandbox/entorno de pruebas** en el Dashboard. No activar pagos reales para probar este proyecto.
3. Abrir la sección [API keys](https://dashboard.stripe.com/apikeys) del entorno de pruebas y obtener su clave secreta `sk_test_…`. Una clave restringida `rk_test_…` también sirve si permite Checkout y el listener; para una primera prueba local, la clave secreta de pruebas simplifica la configuración. [Guía oficial de claves](https://docs.stripe.com/keys).
4. Tener esa clave disponible para pegarla cuando la solicite el instalador. La entrada estará oculta y se guardará únicamente en `.env`.

No hace falta ejecutar `stripe login` ni copiar manualmente un `whsec_…`: el instalador y el comando de arranque usan la clave indicada para sincronizar el listener con la aplicación. No utilizar claves `sk_live_…` ni compartir la clave de pruebas en el repositorio.

Las herramientas y cuentas se preparan una sola vez. El instalador no modifica instalaciones globales ni crea cuentas o buckets. Dejar libres los puertos 3100 y 5433 antes de continuar; si están ocupados por otro proyecto, detener ese servicio o revisar su configuración.

## Instalar

```sh
git clone https://github.com/germanquintana2/cds-ecommerce-challenge.git
cd cds-ecommerce-challenge
bun run setup
```

Si recibiste un ZIP, extraerlo y ejecutar `bun run setup` desde su carpeta.

La primera vez, el asistente solicita el bucket, región y perfil de AWS, y la clave de Stripe de prueba. La entrada de la clave está oculta. Si ya existe un `.env` válido, conserva sus valores y no vuelve a solicitarlos.

El instalador:

1. Comprueba las herramientas y que Docker esté funcionando.
2. Crea o completa `.env`, generando contraseñas y secretos locales.
3. Instala las dependencias con el lockfile del proyecto.
4. Verifica S3 y Stripe sin realizar pagos, y obtiene el secreto del webhook local.
5. Levanta PostgreSQL, genera Prisma y aplica las migraciones.
6. Crea el administrador y carga las **5 categorías, 38 productos y sus fotos** en el bucket configurado.

Puede repetirse si se interrumpe: no borra la base, no reemplaza las credenciales existentes del administrador ni sobrescribe productos ya cargados. Una instalación nueva usa las fotos incluidas en `data/catalog/`; no necesita acceso al bucket original del candidato.

El bucket debe permitir listar/verificar y escribir los objetos de seed, además de leer las imágenes. Si falla la subida, corregir permisos o renovar la sesión y repetir el comando. El uso de S3 puede generar cargos según el plan de AWS.

## Iniciar la tienda

```sh
bun run dev:payments
```

Abrir [http://localhost:3100](http://localhost:3100).

- **Administrador:** las credenciales están en `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `.env`. Desde el menú del usuario se accede a Productos y Categorías.
- **Cliente:** crear una cuenta desde [Registrarse](http://localhost:3100/signup), con contraseña de 12 a 128 caracteres.

Mantener la terminal abierta: el comando inicia Stripe y Next.js juntos y detiene ambos si uno termina. No ejecutar simultáneamente `bun run dev`, porque usa el mismo puerto.

Para probar una compra, agregar un producto al carrito e iniciar el pago. Usar la tarjeta de prueba `4242 4242 4242 4242`, fecha futura y CVC de tres cifras. Total mínimo: USD 0,50. Al regresar se confirma la compra y aparece en Mis compras.

## Detener y volver a iniciar

Ctrl+C detiene la tienda y su listener. Para detener PostgreSQL sin borrar datos:

```sh
docker compose stop
```

Para volver a iniciar:

```sh
docker compose up -d --wait
bun run dev:payments
```

Si AWS venció, renovar la sesión del perfil por su flujo habitual. Si el secreto del listener cambió, volver a ejecutar `bun run setup` para sincronizarlo. Ante `EADDRINUSE`, detener el servidor anterior del puerto 3100.

## Instalación sin asistente

Copiar `.env.example` a `.env` y completar el bucket, región/perfil y la clave de Stripe de prueba. Las contraseñas y secretos locales de ejemplo se reemplazan automáticamente. Después ejecutar:

```sh
bun run setup --non-interactive
```

Para validar accesos sin modificar `.env`, base de datos ni S3, una vez instaladas las dependencias y configurado `.env`:

```sh
bun run setup --check --non-interactive
```

El instalador prepara PostgreSQL local definido en `compose.yaml`. Si se usa otra contraseña o puerto, `DATABASE_URL` debe coincidir con las variables `POSTGRES_*`. Cambiar `.env` no cambia la contraseña de un volumen ya inicializado. No publicar `.env`: contiene credenciales locales.
