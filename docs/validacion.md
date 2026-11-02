# Cumplimiento y validación

Actualización: 31 de octubre de 2026. Este registro distingue implementación, comprobaciones automatizadas y evidencia manual. El candidato confirmó que las pruebas manuales se completaron y funcionaron correctamente.

## Comparación con el PDF

| Requisito obligatorio                                                 | Implementación                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Catálogo público, búsqueda por nombre, detalle e imagen; solo activos | Implementado, con exclusión de borradores y bajas lógicas       |
| Carrito autenticado, agregar, cantidades, eliminar, subtotal y total  | Implementado, persistido en PostgreSQL                          |
| Precios y reglas validados en backend                                 | Implementado, centavos enteros y resumen recalculado            |
| Registro, login, logout; CUSTOMER y ADMIN                             | Implementado con Better Auth y autorización en servidor         |
| Panel ADMIN: listar, crear, editar, subir imagen                      | Implementado; incluye activación, eliminación y categorías      |
| Almacenamiento de imágenes y validación de tipo/tamaño                | S3 privado, Sharp, máximo 4 MB y 16 megapíxeles                 |
| Checkout de prueba, errores y orden después del pago                  | Stripe Checkout y webhook firmado, confirmación idempotente     |
| Productos, cantidades, precios históricos y total de la orden         | Snapshots persistidos                                           |
| Historial, detalle, estado y acceso solo al propietario               | Implementado; órdenes pagadas y estado del intento consultables |
| Frontend, API, base persistente y README                              | Next.js, tRPC, PostgreSQL y guía local                          |

Extras implementados: S3 en la nube, responsive, pruebas automatizadas, webhook y tratamiento de concurrencia/errores. La API está descrita en [api.md](api.md). La demo pública está disponible en https://cds-ecommerce-challenge.vercel.app con Vercel, Neon y Blob; la separación frontend/backend sugerida se resuelve lógicamente dentro del monolito.

## Comprobación automatizada actual

Ejecutados en esta versión: `bun run typecheck`, `bun run lint`, `bun run build`, `bun run test:unit` y `bun run test:integration`, todos aprobados. Totales: **16 pruebas unitarias y 38 de integración**.

Las pruebas cubren sesiones y destinos seguros, roles e intentos de escalamiento, cantidades/precios, concurrencia del carrito, aislamiento entre usuarios, snapshots, idempotencia, firmas de webhook, importes/monedas/referencias alterados, categorías, baja lógica, búsqueda priorizada y paginación. Integración exige una base terminada en `_test`, aplica migraciones y limpia sus propios registros. Stripe se simula salvo la verificación criptográfica de firmas; no se hacen llamadas a AWS ni pagos externos.

La compilación comprueba rutas y tipos; no sustituye una inspección visual ni una instalación desde cero.

## Evidencia manual disponible

- Registro/login/logout y navegación fueron ejercitados durante el desarrollo y corregidos a partir de reportes del candidato.
- Se cargaron imágenes de productos en S3 y se visualizaron en catálogo y administración.
- Se crearon y editaron categorías y asignaciones desde la interfaz.
- Se realizaron pagos válidos de sandbox; las capturas muestran compra confirmada, total y detalle de la orden.
- Se revisó la interfaz móvil de catálogo, categorías, búsqueda y compra mediante capturas del candidato.
- Se verificó acceso al bucket y respuesta HTTP 200 de localhost durante el arranque conjunto con Stripe.

Hubo pagos pendientes por listener detenido. Se recuperaron eventos auténticos y se procesaron por el webhook idempotente sin nuevos cobros. El comando `dev:payments` inicia la tienda solo después de verificar el listener y su secreto.

## Cierre de pruebas manuales

El candidato confirmó que completó las pruebas manuales y que funcionaron correctamente, incluyendo los recorridos de las guías de productos, categorías, catálogo/carrito y pagos. La confirmación incluye los escenarios antes pendientes de rechazo, cancelación y navegación, carrito durante el pago, aislamiento de órdenes, archivos/formularios y revisión móvil. Esta evidencia es el reporte del candidato; no se presenta como ejecución automatizada del navegador por el agente.

## Estado de entrega

La ejecución con Docker se verificó con una base nueva, migraciones y seed con fotos. La demo pública utiliza Neon y Vercel Blob; se comprobaron acceso anónimo, imágenes, login administrativo y firma del webhook. La verificación automatizada del webhook no sustituye un recorrido completo de pago desde el navegador en la URL pública.

Las descripciones de los 38 productos se actualizaron en la seed y en las bases local y pública. La paginación se unificó y administración de productos tiene una presentación móvil con tarjetas.

Guías: [productos](pruebas-productos.md), [catálogo/carrito](pruebas-catalogo-carrito.md), [categorías](pruebas-categorias.md) y [pagos](pruebas-pagos.md).

## Parche de desarrollo

`patches/next@16.3.2.patch`, aplicado por Bun, evita tiempos negativos en mediciones de ramas abortadas de los clientes RSC de desarrollo. No cambia autorización, datos ni el build de producción. Revisarlo al actualizar Next y retirarlo si ya no es necesario. Referencia histórica: https://github.com/vercel/next.js/issues/86060.

## Seed de catálogo con imágenes

Se exportó el catálogo actual a `data/catalog/`: 5 categorías, 38 productos no eliminados y 36 imágenes WebP únicas. El manifiesto excluye datos de usuarios y compras. `db:seed:catalog --check` verifica integridad por SHA-256 sin servicios externos. Las pruebas de integración adicionales comprueban la importación en `_test`, la repetición sin subidas ni duplicados, la conservación de ediciones/bajas y el fallo de subida sin inserciones parciales. El transporte S3 se sustituye en esas pruebas; la exportación sí descargó los objetos reales del catálogo.

## Instalador local

`bun run setup` prepara `.env`, dependencias, PostgreSQL, migraciones, administrador y catálogo con fotos en S3. Solicita solamente accesos externos faltantes, no registra secretos y conserva valores existentes. El secreto del webhook se obtiene con Stripe CLI usando la clave de prueba de la aplicación; el supervisor de desarrollo usa la misma clave.

Las pruebas unitarias del instalador verifican generación de secretos, preservación de configuración, reemplazo de placeholders, caracteres especiales y rechazo de claves Stripe live o bases remotas/inconsistentes. `setup --check --non-interactive` verificó los accesos reales sin modificar base ni S3. La ejecución completa sobre el entorno existente finalizó correctamente: dependencias instaladas, PostgreSQL saludable, migraciones aplicadas, administrador conservado y seed sin duplicaciones. Se reinició la tienda con el listener sincronizado. Esto no sustituye una instalación desde una computadora vacía.

## Docker Compose

Se agregan pruebas unitarias de generación persistente de secretos para contenedores, conexión al host interno PostgreSQL y rechazo de claves live. La imagen se compila en Linux desde dependencias limpias, sin `.env` ni credenciales en el contexto. La instalación nueva se ejecutó con un proyecto Compose y puertos separados de la base local: migraciones aplicadas, 5 categorías y 38 productos cargados, fotos reales en S3, HTTP 200 en inicio e imagen, login ADMIN HTTP 200 y listado administrativo de 38 productos. La base original no se utilizó para esa comprobación.

La prueba detectó que el perfil AWS de macOS no era utilizable desde Linux mediante el Llavero. La primera solución exportaba una sesión temporal a `.env.aws-docker`. Fue reemplazada por el servicio AWS CLI de Docker y el volumen `aws_session`, por lo que ese archivo ya no se usa. No se ejecutan pagos reales durante estas verificaciones.

La repetición de Compose con la imagen final conservó administrador y catálogo (0 categorías y 0 productos nuevos). Se retiró el proyecto temporal y se pasó la instalación principal a Compose, manteniendo su volumen PostgreSQL. La versión anterior usó un archivo local ignorado para exportar credenciales; la versión vigente lo sustituye por autenticación dentro de Docker. Para desarrollo en el host se conserva `compose.database.yaml`.

## AWS CLI dentro de Docker

Se reemplazó el requisito de instalar AWS CLI en el host por la imagen oficial `amazon/aws-cli:2.38.6`, disponible mediante el servicio `aws` (perfil Compose `tools`). `docker compose run --rm aws login --remote` realiza la autenticación interactiva; CLI y SDK comparten `aws_session`. No hay montaje de `~/.aws` ni uso de `.env.aws-docker`. El helper de exportación del host se retiró. La renovación de sesión se hace con el mismo comando, o con el flujo SSO correspondiente.

La imagen oficial respondió con su versión correcta. El candidato autorizó y completó el login remoto; STS confirmó la identidad del proyecto y el SDK accedió a S3 desde un contenedor usando solo `aws_session`, sin archivos ni credenciales del host. Se verificaron lint, tipos, 16 pruebas unitarias y build Linux.
