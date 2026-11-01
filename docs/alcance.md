# Alcance del challenge

Fecha de definición: 27 de octubre de 2026. Objetivo: entrega el lunes 2 de noviembre de 2026. Actualizado el 31 de octubre de 2026 para reflejar la implementación local.

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

No se implementarán microservicios, una API REST duplicada ni funcionalidades de IA. La carpeta de frontend/backend separada es una sugerencia del enunciado; se explica en el README la separación lógica dentro de Next.js.

## Pantallas

| Ruta propuesta              | Acceso  | Contenido                                                   |
| --------------------------- | ------- | ----------------------------------------------------------- |
| `/`                         | Público | Catálogo, búsqueda y enlaces a productos                    |
| `/products/[id]`            | Público | Detalle de producto activo y acción de agregar              |
| `/login`                    | Público | Inicio de sesión                                            |
| `/signup`                   | Público | Registro como CUSTOMER                                      |
| Panel lateral del carrito   | Sesión  | Productos, cantidades, subtotal, total e inicio de checkout |
| `/checkout/result`          | Sesión  | Estado del intento propio; contempla confirmación pendiente |
| `/orders`                   | Sesión  | Historial propio                                            |
| `/orders/[id]`              | Sesión  | Detalle de orden propia                                     |
| `/admin/products`           | ADMIN   | Todos los productos y su estado                             |
| `/admin/products/new`       | ADMIN   | Crear producto y subir imagen                               |
| `/admin/products/[id]/edit` | ADMIN   | Editar, reemplazar imagen y activar/desactivar              |

El catálogo puede explorarse sin sesión. Al intentar agregar sin autenticación, se dirige a login; no se implementará carrito anónimo ni combinación de carritos. Los destinos de retorno después de autenticarse son rutas locales validadas.

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

Se documentan por separado las pruebas completadas y las pendientes. Una credencial válida o un webhook configurado no demuestra que el checkout funcione hasta probar la compra completa.

## Situación actual

- Plantilla importada con sus convenciones y siete skills preservadas.
- PostgreSQL local, migraciones originales, compilación y autenticación base verificados.
- S3 configurado e integrado con la administración; se cargaron imágenes desde administración; el candidato confirmó también los casos negativos.
- CLI, clave y secreto local de Stripe preparados; Checkout y webhook implementados, con compras exitosas de sandbox verificadas; el candidato confirmó las pruebas manuales completas.
- Modelo, roles, registro, administrador, gestión de productos, catálogo y carrito implementados. Checkout, resultado e historial/detalle de órdenes propios implementados localmente. El dashboard redirige al perfil.
- El usuario autorizó publicar la preparación e iniciar la implementación el 27 de octubre de 2026.

## Ampliación: categorías (30 de octubre)

- El inicio muestra categorías con portada propia, o imagen de un producto activo si no hay portada propia. Si no hay ninguna imagen disponible, muestra un marcador.
- El sidebar contiene Catálogo y categorías; perfil, compras y administración se acceden desde el menú del usuario.
- ADMIN puede crear, editar y eliminar categorías; nombres únicos sin distinguir mayúsculas/minúsculas.
- Cada producto puede pertenecer a una categoría; al quitarlo desde la edición queda sin categoría. La migración asigna los productos anteriores a General sin modificar precios, imágenes ni órdenes.
- Al abrir una categoría se muestran solo sus productos activos, con búsqueda y paginación. El buscador global conserva búsqueda transversal de productos.
- Se permite eliminar categorías, dejando sus productos sin categoría. No hay subcategorías.

### Creación de categorías con portada y selección de productos

La creación usa una página propia en lugar de un modal, con nombre, imagen opcional en S3 y búsqueda para seleccionar/quitar productos antes de confirmar. Las asignaciones solo cambian al guardar y se realizan atómicamente con la categoría. La portada propia tiene prioridad sobre la imagen automática de productos. La edición también usa página propia y permite modificar nombre, imagen y productos. Los quitados quedan sin categoría sin eliminarse.

### Eliminación de productos y categorías

Se agrega eliminación confirmada para ADMIN: productos mediante baja lógica con `deletedAt` e inactivación, conservando compras e intentos; categorías mediante borrado y desasignación transaccional de sus productos. No hay borrado de compras, archivos S3 ni recuperación de productos eliminados desde la interfaz.

## Cierre del alcance

El enunciado obligatorio está cubierto a nivel de implementación, incluido subtotal y total en el carrito. Hay 20 categorías/productos por página y sugerencias globales de hasta cuatro productos con prioridad por inicio de nombre. La validación automatizada y las pruebas manuales pendientes están en [validacion.md](validacion.md); una funcionalidad implementada no implica que todos sus escenarios de navegador estén verificados. Los cambios finales permanecen locales hasta autorizar su publicación.
