# Referencia de la API

Implementación local al 31 de octubre de 2026. La API usa tRPC sobre `/api/trpc/[trpc]`, con tipos compartidos desde `src/server/api/root.ts`. Consultas mediante GET, mutaciones mediante POST y autenticación por cookie de Better Auth. No hay una API REST duplicada ni contrato OpenAPI generado.

Los esquemas Zod de cada procedimiento y `src/server/validation/` son la fuente exacta de entradas y límites. Usar el cliente tRPC para escrituras; no enviar precios ni identificadores de propietario para autorizar operaciones.

## Procedimientos

| Router          | Consultas                        | Mutaciones                                               | Acceso                                   |
| --------------- | -------------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `catalog`       | `list`, `byId`, `suggestions`    | —                                                        | Público, productos activos no eliminados |
| `category`      | `list`, `byId`, `navigation`     | —                                                        | Público                                  |
| `cart`          | `get`, `count`                   | `addItem`, `setQuantity`, `removeItem`                   | Sesión, carrito propio                   |
| `checkout`      | `byId`                           | `start`                                                  | Sesión, intento propio                   |
| `order`         | `list`, `byId`                   | —                                                        | Sesión, órdenes propias                  |
| `admin`         | `currentUser`                    | —                                                        | ADMIN                                    |
| `adminProduct`  | `list`, `byId`                   | `create`, `update`, `setActive`, `attachImage`, `remove` | ADMIN                                    |
| `adminCategory` | `list`, `byId`, `searchProducts` | `create`, `update`, `remove`                             | ADMIN                                    |

El rol se comprueba en servidor con datos actuales. CUSTOMER no puede invocar administración aunque construya la petición manualmente. El proxy facilita navegación, pero no sustituye estos controles.

## Entradas y comportamiento principales

- `catalog.list`: `{ search?, categoryId?, page? }`. Devuelve `{ items, total, page, pages }`, 20 productos por página. Prioriza inicio de nombre antes de coincidencias internas, sin distinguir mayúsculas. Ambas clases participan en conteo y paginación.
- `catalog.suggestions`: `{ search }`, texto no vacío de hasta 120 caracteres; máximo cuatro productos con la misma prioridad.
- `catalog.byId` y `category.byId`: `{ id }`; inexistentes o productos no públicos devuelven NOT_FOUND.
- `category.list`: `{ page? }` opcional, páginas de 20 categorías con portada y cantidad de productos activos. `navigation` devuelve todos los enlaces para el menú.
- `cart.get`: resumen calculado en servidor con líneas, cantidades, importes, disponibilidad, versión y huella del resumen. `count` sirve al indicador del header.
- `cart.addItem`: producto y cantidad; acumula unidades. `setQuantity` y `removeItem` requieren la versión esperada para detectar ediciones concurrentes. Cantidades de 1 a 99; máximo 100 productos distintos.
- `checkout.start`: `expectedVersion`, `quoteHash`, `requestKey` UUID. Recalcula el carrito y guarda un snapshot antes de abrir Stripe. Reintentar con la misma clave reutiliza el intento; no permite imponer precios del navegador.
- `checkout.byId`: intento propio, estado y orden asociada cuando se confirmó. La consulta nunca confirma un pago por sí sola.
- `order.list`: paginado del historial propio. `order.byId`: snapshot con cantidades, nombres, precios, total, moneda y fecha de pago. Las órdenes del alcance son pagadas; no hay devolución ni cancelación posterior.
- `adminProduct.create`: crea borrador. La publicación requiere imagen válida; `remove` aplica baja lógica sin borrar compras.
- `adminCategory.create/update`: nombre, portada y selección de productos. Actualizar valida la versión temporal para evitar sobrescribir una edición concurrente. Quitar asignaciones deja productos sin categoría; `remove` elimina la categoría y desasigna sus productos.

Ejemplo de consulta pública desde la terminal:

```sh
curl --get 'http://localhost:3100/api/trpc/catalog.suggestions' \
  --data-urlencode 'input={"search":"iphone"}'
```

Para una consulta tipada desde servidor o cliente, respectivamente:

```ts
await api.catalog.list({ search: "iphone", page: 1 });
api.catalog.suggestions.useQuery({ search: "iphone" });
```

Los dos ejemplos usan imports distintos: `~/lib/trpc/server` y `~/lib/trpc/react`. No usar el caller de servidor desde componentes cliente.

## Handlers HTTP

| Ruta                      | Método         | Protección y uso                                                                        |
| ------------------------- | -------------- | --------------------------------------------------------------------------------------- |
| `/api/auth/[...all]`      | GET/POST       | Endpoints de Better Auth para registro, sesiones y logout                               |
| `/api/uploads/products`   | POST multipart | ADMIN y origen válido; campos `file` y `productId`; imagen validada y normalizada en S3 |
| `/api/uploads/categories` | POST multipart | ADMIN y origen válido; campos `file` y `categoryId`; portada validada en S3             |
| `/api/webhooks/stripe`    | POST           | Cuerpo original y firma `Stripe-Signature`, solo eventos de prueba admitidos            |

Archivos: JPEG, PNG o WebP; máximo 5 MB, 16 megapíxeles y cuerpo multipart de 6 MB. Se convierten a WebP de hasta 2000 × 2000. PostgreSQL almacena la clave S3, no bytes ni URLs temporales. No compartir las URLs firmadas.

El webhook maneja `checkout.session.completed` y `checkout.session.expired`. Verifica el estado actual en Stripe, referencia, importe y moneda; crea una única orden y conserva el carrito si cambió durante el pago. No acepta `isPaid` del frontend.

## Errores

| Código tRPC  | Situación                                                      |
| ------------ | -------------------------------------------------------------- |
| BAD_REQUEST  | Entrada o regla de negocio inválida                            |
| UNAUTHORIZED | Sesión ausente o vencida                                       |
| FORBIDDEN    | Rol insuficiente                                               |
| NOT_FOUND    | Recurso inexistente, no público o perteneciente a otro usuario |
| CONFLICT     | Versión del carrito, resumen o edición desactualizados         |

Los handlers de archivos y Stripe usan respuestas HTTP propias. No registrar claves, cookies, datos de tarjeta, cuerpos sensibles ni enlaces firmados. Ver [arquitectura](arquitectura.md), [Stripe](stripe.md) y [S3](aws/s3.md).
