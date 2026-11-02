# Prueba manual: administración de productos

Guía de la implementación actual. Se crearon/editaron productos y se cargaron imágenes en S3 durante el desarrollo. El candidato confirmó las pruebas manuales completas y correctas; el estado verificado está en [validacion.md](validacion.md).

## Preparación

- Docker debe estar ejecutando PostgreSQL y Next.js debe estar disponible en http://localhost:3100.
- Iniciar sesión con `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env` local. No compartir esos valores por chat ni capturas.
- Abrir http://localhost:3100/admin/products. `/admin` ahora redirige a esa página.
- Tener una imagen JPEG, PNG o WebP de menos de 4 MB y 16 megapíxeles.

## Recorrido principal

| Paso | Acción                                                                                   | Resultado esperado                                                                                     |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | Crear un producto llamado “Producto de prueba”, descripción y precio `19,99`, sin imagen | Se guarda un borrador. El precio mostrado corresponde a USD 19,99; “Activar” está deshabilitado        |
| 2    | Recargar el listado y buscar `producto`                                                  | El producto permanece guardado y la búsqueda lo encuentra sin distinguir mayúsculas                    |
| 3    | Editar el borrador, seleccionar una imagen, marcar “Producto activo” y guardar           | Se muestra vista previa; después de guardar el listado muestra imagen y estado Activo                  |
| 4    | Recargar y volver a editar                                                               | Los datos y la imagen permanecen. La base guarda una clave del objeto, no la imagen ni la URL temporal |
| 5    | Cambiar nombre, descripción y precio a `24.50`                                           | El listado refleja los nuevos datos y USD 24,50                                                        |
| 6    | Reemplazar la imagen y guardar                                                           | Se muestra la nueva imagen. El servidor intenta eliminar la anterior de S3                             |
| 7    | Desactivar y volver a activar desde el listado                                           | El estado cambia en ambas direcciones y persiste al recargar                                           |

El catálogo público está en `/` (categorías y productos por categoría); `/products` redirige al inicio: activar o desactivar un producto debe reflejarse al recargar catálogo y detalle. Ver [pruebas de catálogo y carrito](pruebas-catalogo-carrito.md).

## Validaciones y acceso

| Caso                                                                         | Resultado esperado                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Nombre o descripción vacíos, precio `0`, negativo o con más de dos decimales | No se guarda y se muestra un error                                                                        |
| Imagen mayor a 4 MB o con tipo no admitido                                   | Se rechaza y se informa el problema                                                                       |
| Archivo de texto renombrado a `.png`                                         | El servidor rechaza el contenido aunque la extensión parezca válida                                       |
| Imagen de más de 16 megapíxeles o animada                                    | El servidor la rechaza                                                                                    |
| Error de subida al crear un producto                                         | Se informa el error y se conserva el borrador; reintentar desde el mismo formulario no crea otro producto |
| Entrar con una cuenta CUSTOMER a `/admin/products` o a la ruta de edición    | Se muestra “Acceso restringido”                                                                           |
| Entrar sin sesión a administración                                           | Se redirige al login                                                                                      |

La API también aplica permisos: ocultar el panel no es la protección principal. Como comprobación opcional, con una cuenta CUSTOMER se puede abrir en el navegador `/api/trpc/adminProduct.list?input=%7B%22page%22%3A1%2C%22search%22%3A%22%22%7D`; se espera HTTP 403.

## S3 y errores locales

- Si la subida devuelve un error de servicio, comprobar en la terminal de Next.js el nombre del error. No copiar claves ni enlaces firmados en capturas.
- Si las credenciales locales expiraron, ejecutar `aws login --region us-east-2 --profile cds-challenge` y reintentar. Si la aplicación no recoge la sesión renovada, reiniciar `bun run dev`.
- Las imágenes se convierten a WebP, se redimensionan como máximo a 2000 × 2000 y se suben bajo `products/<id>/<uuid>.webp`.
- Las URLs de lectura vencen a los 15 minutos o antes si vencen las credenciales. Recargar el listado o la edición genera una URL nueva.
- La limpieza de objetos reemplazados es best effort. Si falla, se registra el fallo sin deshacer la edición; no hay una tarea de limpieza automática de objetos huérfanos en esta etapa.

## Registro de resultados

Se cargaron imágenes y se crearon/editaron productos durante el desarrollo. El candidato confirmó la regresión manual completa y correcta. Ver [validación](validacion.md). Ante un fallo, indicar paso, acción y mensaje mostrado, sin compartir secretos.

## Eliminación

- En administración, pulsar Eliminar y luego Cancelar: no debe cambiar el producto.
- Confirmar Eliminar en un producto de prueba: desaparece del listado, del catálogo y de búsquedas por categoría. Un enlace anterior de edición o de detalle no debe permitir acceder o reactivarlo.
- Si estaba en un carrito, debe figurar como no disponible y permitir quitarlo. No debe poder pagarse en un checkout nuevo.
- Una compra anterior debe conservar nombre, cantidades y precios.
- Si se elimina el último producto de la última página, la navegación vuelve a una página existente.
- El producto se retira mediante `deletedAt` y se desactiva; se conserva la fila para las referencias históricas. No hay recuperación desde la interfaz.
