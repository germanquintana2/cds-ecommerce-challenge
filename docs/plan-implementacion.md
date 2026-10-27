# Plan de implementación y validación

Documento de trabajo. El usuario autorizó publicar la preparación e iniciar la implementación el 27 de octubre de 2026.

## Avance

- Preparación publicada en `51c4ef5`.
- Primera etapa: esquema y migración, restricciones SQL, registro CUSTOMER, adminProcedure con rol consultado en base, seed administrativo y acceso al panel.
- Validación de permisos y restricciones en una base `_test` independiente.
- El CRUD de productos, la integración de imágenes, el carrito y el checkout siguen pendientes.

## Orden de trabajo

| Etapa                   | Trabajo                                                                                         | Condición para darla por terminada                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 0. Preparación          | Plantilla, PostgreSQL, variables, S3, Stripe y documentación                                    | Base compilable, auth original comprobada, accesos externos verificados; completado localmente                   |
| 1. Datos y permisos     | Migraciones del modelo, rol CUSTOMER por defecto, adminProcedure, datos iniciales y registro UI | Usuario registrado no puede asignarse ADMIN; administrador puede entrar al panel; datos de ejemplo reproducibles |
| 2. Productos e imágenes | CRUD requerido, activación/desactivación, validación y subida a S3                              | ADMIN crea/edita producto con imagen; CUSTOMER no puede invocar estas operaciones                                |
| 3. Tienda y carrito     | Catálogo público, búsqueda, detalle, carrito persistente y versión                              | Solo activos visibles; cantidades y totales correctos; sesión y persistencia comprobadas                         |
| 4. Compra y órdenes     | Snapshot, idempotencia, Checkout, webhook y pantallas de órdenes                                | Compra de prueba completa produce una sola orden; historial propio con precios históricos                        |
| 5. Entrega              | Pruebas críticas, responsive, errores, README y defensa                                         | Escenarios completos, arranque limpio reproducible y decisiones explicables                                      |

La prioridad es completar el recorrido administrador crea producto → cliente compra → cliente consulta orden. Los extras no desplazan requisitos obligatorios.

## Ventana hasta la entrega

- Martes 27: preparación y decisiones; estado actual.
- Miércoles 28: datos, permisos y administración de productos.
- Jueves 29: catálogo y carrito.
- Viernes 30: checkout y órdenes de punta a punta.
- Sábado 31: errores, pruebas de seguridad y concurrencia, ajustes visuales.
- Domingo 1: ejecución limpia, README y ensayo de defensa; reserva para corregir fallos.
- Lunes 2: entrega según el horario indicado por la empresa.

Es una distribución objetivo, no una estimación de horas disponibles. Si hay retraso, se recortan adornos visuales, despliegue público y extras; se conservan permisos, integridad de pagos y requisitos obligatorios.

## Pruebas prioritarias

| Área                 | Casos                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Registro y sesión    | Registrar CUSTOMER, email duplicado, contraseña incorrecta, login y logout; no aceptar rol privilegiado enviado por cliente |
| Permisos             | Acceso directo CUSTOMER a API/handler ADMIN rechazado; usuario A no consulta órdenes, intentos ni carrito de B              |
| Catálogo             | Búsqueda, detalle inexistente, producto inactivo oculto tanto del listado como del acceso por ID                            |
| Carrito              | Persistencia, agregar repetido, editar/eliminar, 0/negativos/fracciones/más de 99, mutaciones concurrentes                  |
| Precios              | Precio enviado por cliente ignorado; cambio de precio o activación antes de checkout exige actualizar resumen               |
| Imágenes             | Archivo permitido, exceso de tamaño, extensión falsa y contenido inválido; subida sin rol ADMIN; lectura por URL firmada    |
| Pago                 | Éxito, tarjeta rechazada, cancelación, expiración, caída al crear sesión y retorno antes del webhook                        |
| Confirmación         | Firma inválida, evento repetido y concurrente, importe/moneda/referencia incorrectos, evento de otro entorno                |
| Carrito durante pago | Si permanece igual se limpia una vez; si cambia se conserva, incluyendo cambios concurrentes con webhook                    |
| Historial            | Compra conserva nombre/precio/cantidades aunque el administrador edite o desactive el producto                              |
| Reproducibilidad     | Clon limpio, `.env.example`, PostgreSQL nuevo, migraciones, seed y arranque; secretos ausentes de Git                       |

Se automatizan reglas de negocio y límites de autorización con pruebas que puedan detectar regresiones reales. Para las comprobaciones de infraestructura se registran los resultados manuales. El pago se verifica de punta a punta con Stripe real en sandbox; un mock aislado no sustituye esa prueba.

## Checks de cierre de cada etapa

Ejecutar lint, typecheck y las pruebas relacionadas con el cambio. Ejecutar build al integrar cada etapa relevante. No reformatear todas las skills ni reescribir componentes heredados sin necesidad.

## Antes de entregar

- Completar README con funcionalidades finales, supuestos, comandos y datos de demostración locales.
- Documentar cómo obtener las credenciales propias de AWS/Stripe y ejecutar el listener; no entregar secretos del candidato.
- Definir permisos mínimos de la identidad S3 del backend antes de un despliegue; el perfil local de preparación tiene acceso amplio.
- Preparar explicación de monolito Next.js, tRPC, sesiones, roles, centavos enteros, snapshots, S3 privado e idempotencia.
- Ensayar un cambio pequeño en vivo: un campo del producto, una regla de cantidad o un filtro.
- Comparar el producto con cada requisito del PDF y declarar cualquier limitación pendiente.
- Publicar los cambios en el repositorio independiente cuando el usuario lo autorice; confirmar acceso para los evaluadores.

## Documentos relacionados

- [Alcance](alcance.md).
- [Arquitectura y modelo](arquitectura.md).
- [S3](aws/s3.md).
- [Stripe](stripe.md).
