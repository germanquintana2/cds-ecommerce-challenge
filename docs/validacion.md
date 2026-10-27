# Validación de la primera etapa

Ejecutada el 27 de octubre de 2026.

## Comprobaciones aprobadas

- Instalación con `bun install --frozen-lockfile`, sin cambios de versiones.
- Migración `20261027161016_ecommerce_foundation` aplicada a la base local y a una base de pruebas independiente.
- Generación del cliente Prisma.
- `bun run lint`.
- `bun run build`, incluyendo TypeScript y generación de rutas `/signup` y `/admin`.
- Formato de los archivos agregados y modificados.
- HTTP 200 en la nueva pantalla de registro.
- Seed administrativo ejecutado dos veces; la segunda ejecución conserva usuario y credenciales.
- Inicio de sesión del administrador real local, consulta a `admin.currentUser`, visualización del panel y logout, sin mostrar credenciales.
- El servidor de desarrollo fue reiniciado después de generar Prisma y modificar la configuración de auth, para descartar módulos antiguos en memoria.

## Integración automatizada

`bun run test:integration`: siete pruebas aprobadas, 27 aserciones.

1. El registro público ignora una inyección de rol ADMIN y guarda un hash de contraseña.
2. El endpoint público de actualización rechaza intentar modificar el rol.
3. Las operaciones ADMIN rechazan invitados/clientes y vuelven a rechazar una sesión existente después de revocar el rol en base de datos.
4. Better Auth aplica la longitud mínima y una cookie antigua no restaura una sesión cerrada.
5. PostgreSQL rechaza precios inválidos y productos activos sin imagen.
6. PostgreSQL rechaza cantidades inválidas, líneas repetidas y más de un carrito por usuario.
7. PostgreSQL impide duplicar una orden para el mismo intento; los snapshots conservan el nombre y precio después de editar el producto, y las referencias históricas impiden su borrado.

Las pruebas usan únicamente una base cuyo nombre termina en `_test`, aplican migraciones y eliminan sus registros al terminar. No realizan pagos ni suben archivos a S3.

## Límites

No se implementó ni probó todavía el recorrido completo de compra, el CRUD de productos, la subida desde la aplicación ni el webhook. La prueba de unicidad de órdenes verifica una restricción de datos; no sustituye la futura prueba de pagos repetidos o concurrentes. No se realizó una prueba visual automatizada en navegador.
