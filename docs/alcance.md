# Alcance del challenge

Fecha de definición: 27 de octubre de 2026. Objetivo: entrega el lunes 2 de noviembre de 2026. Documento de planificación; no describe funcionalidades ya implementadas.

## Producto

Tienda web con catálogo público, usuarios registrados, carrito persistente, pago de prueba y consulta de órdenes propias. Un administrador gestiona los productos y sus imágenes.

## Decisiones

| Tema                                  | Decisión                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Arquitectura                          | Un proyecto Next.js con frontend y API tRPC; webhook y subida de archivos mediante Route Handlers          |
| Base                                  | PostgreSQL y Prisma de la plantilla                                                                        |
| Autenticación                         | Better Auth con email, contraseña y sesiones                                                               |
| Roles                                 | CUSTOMER y ADMIN; registro público siempre CUSTOMER                                                        |
| Administrador inicial                 | Comando de datos iniciales con credenciales por variables de entorno; contraseña procesada por Better Auth |
| Moneda                                | USD, importes enteros en centavos                                                                          |
| Productos                             | Nombre, descripción, precio mayor que cero, una imagen y estado activo                                     |
| Cantidades                            | Enteros de 1 a 99 por producto; eliminar mediante una operación explícita                                  |
| Carrito                               | Uno por usuario, persistido en PostgreSQL; requiere sesión                                                 |
| Imágenes                              | S3 privado en us-east-2, JPEG/PNG/WebP hasta 5 MB, lectura por enlaces temporales                          |
| Pago                                  | Stripe Checkout alojado, solo tarjetas y entorno de pruebas                                                |
| Orden                                 | Se crea al confirmar el pago; conserva nombres, precios y cantidades de la compra                          |
| Impuestos y envío                     | Sin cálculo adicional; total igual al subtotal                                                             |
| Stock, variantes y cupones            | Fuera del alcance                                                                                          |
| Devoluciones y cancelación de órdenes | Fuera del alcance                                                                                          |
| Idioma e interfaz                     | Español y diseño responsive                                                                                |
| Ejecución                             | Next.js en localhost:3100 y PostgreSQL en localhost:5433                                                   |
| Publicación                           | Ejecución local reproducible obligatoria; despliegue público solo si queda tiempo                          |

No se implementarán microservicios, una API REST duplicada ni funcionalidades de IA. La carpeta de frontend/backend separada es una sugerencia del enunciado; se explicará en el README la separación lógica dentro de Next.js.

## Pantallas

| Ruta propuesta              | Acceso  | Contenido                                                   |
| --------------------------- | ------- | ----------------------------------------------------------- |
| `/`                         | Público | Catálogo, búsqueda y enlaces a productos                    |
| `/products/[id]`            | Público | Detalle de producto activo y acción de agregar              |
| `/login`                    | Público | Inicio de sesión                                            |
| `/signup`                   | Público | Registro como CUSTOMER                                      |
| `/cart`                     | Sesión  | Productos, cantidades, subtotal, total e inicio de checkout |
| `/checkout/result`          | Sesión  | Estado del intento propio; contempla confirmación pendiente |
| `/orders`                   | Sesión  | Historial propio                                            |
| `/orders/[id]`              | Sesión  | Detalle de orden propia                                     |
| `/admin/products`           | ADMIN   | Todos los productos y su estado                             |
| `/admin/products/new`       | ADMIN   | Crear producto y subir imagen                               |
| `/admin/products/[id]/edit` | ADMIN   | Editar, reemplazar imagen y activar/desactivar              |

El catálogo puede explorarse sin sesión. Al intentar agregar sin autenticación, se dirige a login; no se implementará carrito anónimo ni combinación de carritos. Los destinos de retorno después de autenticarse serán rutas locales validadas.

## Criterios de aceptación

| Requisito      | Resultado verificable                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Catálogo       | Listado, búsqueda por nombre sin distinguir mayúsculas y detalle; un producto inactivo no se expone por ID público |
| Carrito        | Agregar, cambiar cantidad y eliminar; recargar o volver a iniciar sesión conserva el carrito                       |
| Precios        | El backend calcula todo; un precio manipulado desde el navegador no afecta el cobro                                |
| Autenticación  | Registro, login y logout; contraseñas gestionadas por Better Auth                                                  |
| Autorización   | CUSTOMER recibe rechazo al invocar operaciones ADMIN directamente                                                  |
| Administración | Crear, editar y activar/desactivar productos; todos visibles en el panel                                           |
| Imágenes       | Archivo guardado en S3, clave en PostgreSQL, tipo y tamaño validados en servidor                                   |
| Checkout       | Pago exitoso crea una orden; cancelar o rechazar una tarjeta no crea una orden pagada                              |
| Idempotencia   | Reintentar una petición de checkout o repetir un webhook no duplica esa sesión/orden                               |
| Órdenes        | Otro usuario no puede consultar una orden ajena; cambiar el producto no cambia una compra anterior                 |
| Ejecución      | Un evaluador puede instalar, migrar, cargar ejemplos y ejecutar siguiendo el README                                |

Se documentarán por separado las pruebas completadas y las pendientes. Una credencial válida o un webhook configurado no demuestra que el checkout funcione hasta probar la compra completa.

## Situación actual

- Plantilla importada con sus convenciones y siete skills preservadas.
- PostgreSQL local, migraciones originales, compilación y autenticación base verificados.
- S3 configurado y probado; falta integración con el producto.
- CLI, clave y secreto local de Stripe preparados; falta integración de pagos.
- El modelo del e-commerce, los roles, el registro y el administrador inicial ya están implementados. El ejemplo de tareas se conserva temporalmente; el catálogo, carrito y checkout siguen pendientes.
- El usuario autorizó publicar la preparación e iniciar la implementación el 27 de octubre de 2026.
