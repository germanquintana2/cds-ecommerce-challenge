# Pruebas de categorías

1. Abrir el inicio sin sesión: muestra tarjetas de categorías y el sidebar permite seleccionarlas. No aparecen accesos personales en el sidebar.
2. Abrir General: deben aparecer los productos que existían antes de la migración.
3. Como ADMIN, abrir el menú con el nombre del usuario y entrar a Categorías.
4. Agregar una categoría, por ejemplo Tecnología. Repetir el nombre en mayúsculas: debe rechazarlo. Un nombre vacío también debe rechazarse.
5. En Productos, editar un producto y asignarle Tecnología. Guardar y comprobar que desaparece de General y aparece en Tecnología.
6. Crear un producto nuevo: se debe seleccionar una categoría válida para guardarlo.
7. Si la categoría no tiene imagen propia, activar un producto con imagen: usa una foto de producto activo como portada. Si tiene varios, usa el más reciente.
8. Desactivar el producto: desaparece de su categoría. Si no quedan productos activos, muestra estado vacío; conserva su portada propia si tiene una, y de lo contrario muestra un marcador.
9. Renombrar una categoría: cambia su título en inicio y sidebar, conservando los productos asignados.
10. Buscar desde el header: los resultados pueden incluir productos de distintas categorías. Abrir un producto y volver mediante su enlace de categoría.
11. Como CUSTOMER, abrir `/admin/categories`: debe impedir el acceso. El menú personal no muestra administración.
12. Comprobar una compra anterior: nombre, precio y total históricos se mantienen después de mover el producto de categoría.

Pruebas automáticas: `tests/integration/categories.test.js`, en base exclusiva `_test`, sin llamadas a S3 ni Stripe.

## Nueva página de creación

- Pulsar Crear categoría: debe navegar a `/admin/categories/new`, sin modal.
- Escribir un nombre y seleccionar una imagen JPEG/PNG/WebP válida: comprobar vista previa y Quitar imagen.
- Buscar por nombre; deben aparecer coincidencias con su categoría actual, incluyendo productos en borrador. Los seleccionados desaparecen de los resultados y aparecen debajo sin duplicarse.
- Quitar un producto de la selección y comprobar que vuelve a poder seleccionarse. Todavía no debe haberse movido ni borrado ningún producto.
- Guardar: debe volver a la tabla; en el catálogo la nueva categoría usa su propia imagen y contiene los productos elegidos que estén activos.
- Los productos seleccionados dejan su categoría anterior. Los quitados de la selección conservan la anterior. Las compras históricas no cambian.
- Cancelar antes de guardar no crea la categoría ni modifica productos.
- Probar nombre duplicado, archivo inválido y más de 5 MB. Debe mostrar el error y conservar nombre/selección para corregirlo.
- Crear sin imagen ni productos sigue siendo válido; se verá un marcador de portada hasta asignar un producto activo con imagen.
- El botón Editar de la tabla abre `/admin/categories/[id]/edit`, con el mismo diseño del formulario de creación.

## Edición completa

- Abrir Editar: comprobar nombre, imagen propia (si tiene) y productos asignados, incluyendo borradores.
- Cambiar nombre y guardar: vuelve a la tabla con el nuevo nombre.
- Reemplazar la imagen y guardar: comprobar la nueva portada en el catálogo.
- Quitar imagen y guardar: debe volver a la portada automática de producto, o al marcador si no tiene productos activos con imagen.
- Agregar productos y quitar otros: al guardar, los quitados quedan sin categoría y siguen disponibles en administración. Los agregados pertenecen a esta categoría. No se elimina ningún producto.
- Las listas de resultados y seleccionados mantienen tres filas visibles con scroll.
- Cancelar no debe modificar nombre, portada ni asignaciones.
- En dos pestañas, editar el mismo nombre: guardar en la primera y luego en la segunda. La segunda debe informar el conflicto y pedir recargar.
- Un nombre duplicado o un producto inexistente no deben dejar cambios parciales.
- CUSTOMER no puede leer el editor ni invocar actualización o búsqueda administrativa.

## Descartar cambios al cancelar

- Editar una categoría, borrar parte del nombre, cambiar la imagen y modificar la selección sin guardar.
- Pulsar Cancelar y volver a Editar: debe restaurar nombre, imagen y productos guardados, sin conservar el borrador.
- Repetir con una categoría nueva: Cancelar y volver a Crear categoría debe mostrar el formulario vacío.

## Eliminar categoría

- Pulsar Eliminar y cancelar: conserva categoría y productos.
- Confirmar la eliminación de una categoría de prueba con productos: desaparece del listado, sidebar y catálogo; sus productos quedan sin categoría sin borrarse ni desactivarse.
- Comprobar que las compras anteriores de esos productos se conservan.
- CUSTOMER no puede invocar la eliminación de productos ni categorías.

## Paginación y móvil

- Con más de 20 categorías, el inicio muestra 20 y permite Atrás/Adelante con conteo y página en la URL; no debe repetir ni omitir categorías entre páginas.
- Con más de 20 productos activos en una categoría, cada página muestra hasta 20. Cambiar de categoría reinicia la página.
- En móvil se muestran dos categorías o productos por fila. El menú del header abre un panel lateral, sin lista fija encima del catálogo, y se cierra al elegir categoría.
- En escritorio se conserva el sidebar. La navegación del sidebar incluye todas las categorías, independientemente de la página de tarjetas.

Esta guía define expectativas; [validacion.md](validacion.md) registra lo comprobado y lo pendiente.
