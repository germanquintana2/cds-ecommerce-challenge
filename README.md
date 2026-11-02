# CDS E-commerce

## Probar la demo pública

Abrí [CDS · Tienda](https://cds-ecommerce-challenge.vercel.app) para probar la tienda sin instalar herramientas ni configurar AWS, Docker o Stripe.

1. Explorá las categorías y los productos.
2. Creá una cuenta desde **Iniciar sesión → Registrate**.
3. Agregá productos al carrito y continuá al pago.
4. Completá el pago con una tarjeta de prueba de Stripe y consultá el resultado en **Mis compras**. No se realizan cobros reales.

La cuenta administradora se entrega por separado; sus credenciales no se publican en el repositorio.

La demo usa Neon y Vercel Blob. La instalación local conserva S3. [Configuración del despliegue](docs/deployment/vercel.md).

## Instalación local con Docker

## Preparar los requisitos

Solo se necesitan **Docker**, acceso a AWS y una clave de Stripe de prueba. Node, Bun, PostgreSQL, Stripe CLI y las dependencias de la aplicación se ejecutan dentro de los contenedores.

1. Instalar [Docker Desktop](https://docs.docker.com/get-started/get-docker/) y abrirlo. Esperar a que el motor esté listo. En Linux también sirve Docker Engine con Compose 2.24 o superior. Comprobar `docker compose version` y `docker info`.
2. Preparar un bucket privado en Amazon S3 para guardar las fotos. Seguir los pasos de **Preparar S3 para la instalación local**, debajo. Si solo vas a usar la demo pública, podés omitir este requisito.
3. Crear/seleccionar un sandbox en [Stripe](https://dashboard.stripe.com/register) y obtener su clave secreta de prueba `sk_test_…` desde [API keys](https://dashboard.stripe.com/apikeys). [Guía de claves](https://docs.stripe.com/keys).

No se instala AWS CLI, Stripe CLI, Node ni Bun en la computadora: Compose proporciona esas herramientas. Git es opcional si se descarga un ZIP. El uso de S3 puede generar cargos según el plan; no se utilizan pagos reales.

## Preparar S3 para la instalación local

Un **bucket** es un contenedor de archivos en AWS. La aplicación guarda allí las fotos de productos y categorías; PostgreSQL guarda sus datos y la referencia a cada foto. Docker configura la aplicación, pero no crea el bucket ni concede permisos de AWS automáticamente.

### Crear el bucket

1. Ingresar a la [consola de AWS](https://console.aws.amazon.com/) y abrir **Amazon S3 → Buckets → Crear bucket**. Se necesita una cuenta/proyecto propio o acceso a uno que autorice su uso.
2. Seleccionar la región del proyecto. Para este challenge es **US East (Ohio), `us-east-2`**. En la nueva experiencia de AWS, confirmar la región en **AWS Settings → View all projects → Overview → Additional Info → Region**.
3. Seleccionar un bucket de **uso general** y escribir un nombre único, por ejemplo `cds-tienda-tu-nombre-2026`. Si AWS indica que ya existe, elegir otro.
4. Mantener **ACL deshabilitadas**, **Bloquear todo el acceso público** activado y el cifrado **SSE-S3**. No habilitar alojamiento de sitios web. Crear el bucket.
5. Anotar el nombre exacto y la región: se usarán en `S3_BUCKET_NAME` y `AWS_REGION` al completar `.env` en el paso siguiente.

No hace falta crear carpetas ni subir fotos a mano: la inicialización carga las imágenes de la seed bajo `products/` y `categories/`. Esos nombres son prefijos que organizan los archivos dentro del bucket.

### Autorizar el acceso de la aplicación

Crear un bucket y poder iniciar sesión en AWS son cosas distintas de tener permiso para usar sus archivos. La aplicación utiliza el acceso que selecciones al iniciar sesión con el servicio `aws` de Docker, explicado en **2. Autenticar AWS dentro de Docker**.

Ese acceso debe permitir estas operaciones:

| Permiso           | Dónde se necesita                           | Para qué sirve                                                                     |
| ----------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `s3:ListBucket`   | Sobre el bucket elegido                     | Comprobar el acceso al bucket y distinguir archivos inexistentes durante la seed.  |
| `s3:GetObject`    | Archivos bajo `products/*` y `categories/*` | Verificar y leer las imágenes, incluidas las lecturas mediante enlaces temporales. |
| `s3:PutObject`    | Archivos bajo esos mismos prefijos          | Cargar las fotos de la seed y las nuevas imágenes.                                 |
| `s3:DeleteObject` | Archivos bajo esos mismos prefijos          | Limpiar imágenes reemplazadas o subidas que no pudieron asociarse.                 |

Si tu acceso ya permite estas operaciones, no necesitás agregar permisos. En la nueva experiencia de AWS, los permisos del acceso humano los gestiona AWS; no es necesario crear claves permanentes para seguir este README. Si usás un acceso limitado de una organización, su administrador debe habilitar las operaciones de la tabla sobre tu bucket. Crear el bucket desde la consola también requiere permisos de creación y configuración, distintos de los que necesita la aplicación al funcionar.

**No desactives el bloqueo público para solucionar un error de permisos.** Las imágenes de S3 se muestran mediante enlaces temporales generados por el servidor; el bucket permanece privado. Si `head-bucket` del paso 2 devuelve `403`, revisar el nombre del bucket, la sesión y los permisos del acceso seleccionado.

Referencias: [crear un bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html), [bloquear el acceso público](https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html) y [configuración de S3 del proyecto](docs/aws/s3.md).

## 1. Obtener el proyecto

```sh
git clone https://github.com/germanquintana2/cds-ecommerce-challenge.git
cd cds-ecommerce-challenge
cp docker.env.example .env
```

Si recibiste un ZIP, extraerlo y abrir una terminal en la carpeta. Si ya existe un `.env` configurado, conservarlo en lugar de copiar el ejemplo.

Completar en `.env`:

```dotenv
AWS_REGION=us-east-2
S3_BUCKET_NAME=TU_BUCKET
AWS_PROFILE=TU_PERFIL
STRIPE_SECRET_KEY=TU_CLAVE_DE_PRUEBA
```

## 2. Autenticar AWS dentro de Docker

```sh
docker compose run --rm aws login --remote
```

Abrir en tu navegador la URL que muestra el comando, seleccionar el acceso autorizado para el bucket y pegar el código de autorización en esa misma terminal. La región y el nombre de perfil se toman de `.env`.

Comprobar el acceso:

```sh
docker compose run --rm aws s3api head-bucket --bucket TU_BUCKET
```

La sesión temporal queda en el volumen Docker `aws_session`, compartido con el SDK de la aplicación. No se monta `~/.aws`, no interviene el Llavero de macOS y no se exportan claves al repositorio. El volumen es privado del proyecto; no compartirlo ni eliminarlo al detener la aplicación.

Si la organización utiliza IAM Identity Center/SSO, usar su flujo en el mismo contenedor:

```sh
docker compose run --rm aws configure sso --use-device-code
docker compose run --rm aws sso login --use-device-code
```

Configurar el mismo nombre de perfil indicado en `AWS_PROFILE`. [Inicio de sesión remoto](https://docs.aws.amazon.com/cli/latest/reference/login/) y [AWS CLI en Docker](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html).

## 3. Levantar todo

```sh
docker compose up --build
```

La primera ejecución descarga imágenes y compila la aplicación; necesita internet. Compose ejecuta, en orden:

1. **prepare:** genera y conserva las contraseñas y secretos locales en un volumen privado de configuración.
2. **postgres:** levanta la base y espera a que esté disponible.
3. **init:** verifica S3/Stripe, aplica migraciones, crea el administrador y carga las 5 categorías, 38 productos y sus fotos en el bucket configurado.
4. **app:** inicia Stripe CLI y, cuando el listener está listo, Next.js en modo producción. El secreto del webhook se sincroniza automáticamente.

Abrir [http://localhost:3100](http://localhost:3100) cuando aparezca la tienda lista. Es normal que `prepare` e `init` terminen con código 0. En otra terminal se puede revisar el estado con `docker compose ps -a`.

Para ejecutar en segundo plano: `docker compose up --build -d`. Ver los logs con `docker compose logs -f init app`.

Las fotos están incluidas en `data/catalog/`; no se necesita acceso al bucket original del candidato. La inicialización se puede repetir: conserva registros existentes y no duplica ni sobrescribe productos.

## 4. Ingresar y probar

Para consultar las credenciales generadas del administrador, ejecutar explícitamente:

```sh
docker compose exec app node scripts/docker/run.mjs credentials
```

La contraseña no se imprime en los logs de arranque. No compartir la salida del comando. Si configuraste `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes del primer arranque, se usan esos valores; cambiar variables después no restablece una cuenta existente.

Como cliente, crear una cuenta desde [Registrarse](http://localhost:3100/signup), con contraseña de 12 a 128 caracteres.

Para una compra de prueba, agregar un producto al carrito y pagar con `4242 4242 4242 4242`, fecha futura y CVC de tres cifras. Total mínimo: USD 0,50. Esperar la confirmación y consultar Mis compras.

## Detener y volver a iniciar

```sh
docker compose down
docker compose up -d
```

`down` conserva los volúmenes con base de datos, configuración y sesión AWS. **No usar `down -v`** para detener: elimina esos datos. Si cambia el código, volver a ejecutar `docker compose up --build`.

Si venció la sesión AWS, repetir `docker compose run --rm aws login --remote` (o el flujo SSO) y ejecutar de nuevo `docker compose up -d`. Si la aplicación conserva credenciales antiguas, ejecutar `docker compose restart app`. Si falló la carga inicial, repetir el arranque después de corregir el acceso.

## Problemas frecuentes

- **Puerto ocupado:** detener el servidor anterior de localhost:3100 o PostgreSQL:5433. No ejecutar el servidor local con Bun al mismo tiempo que la aplicación de Compose.
- **AWS sin sesión:** completar el login en el contenedor con el perfil de `.env`. La sesión del host o un antiguo `.env.aws-docker` ya no se utilizan.
- **S3 inaccesible:** revisar perfil, región, bucket, permisos y sesión. Los secretos no forman parte de la imagen.
- **Stripe no inicia:** verificar que la clave es de prueba y tiene permisos de Checkout y del listener. El servicio detiene aplicación y listener juntos si alguno falla.
- **Contraseña PostgreSQL cambiada:** modificar `.env` no cambia la contraseña de una base ya inicializada. Conservar la configuración correspondiente al volumen existente.

## Alternativa sin contenerizar la aplicación

Para desarrollo con Node 24+, Bun 1.2.20 y Stripe CLI instalados en la computadora, se conserva `bun run setup` y luego `bun run dev:payments`. El instalador utiliza `compose.database.yaml` exclusivamente para PostgreSQL. No mezclar ambos modos al mismo tiempo.

Para levantar solo esa base: `docker compose -f compose.database.yaml up -d --wait`.
