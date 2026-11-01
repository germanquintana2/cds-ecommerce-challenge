# Prueba manual: catálogo y carrito

Guía actualizada al 31 de octubre de 2026. Describe resultados esperados, no una lista de pruebas ya completadas. El registro de evidencia está en [validacion.md](validacion.md).

## Preparación

Abrir http://localhost:3100 con productos activos e imágenes cargadas. Usar incógnito para el acceso público y disponer de cuentas CUSTOMER y ADMIN. Para probar pagos, arrancar con `bun run dev:payments`; para catálogo/carrito basta `bun run dev`. No ejecutar ambos a la vez en el puerto 3100.

## Catálogo y búsqueda

1. Sin sesión, abrir `/`: categorías con portada, nombre y cantidad de productos activos. Abrir una categoría y comprobar nombre, descripción, precio e imagen de sus productos.
2. Cualquier parte de la tarjeta de producto debe abrir el detalle. El botón para agregar aparece en el detalle, no en las tarjetas.
3. Escribir en el buscador del header: tras 300 ms aparecen hasta cuatro productos activos. Primero nombres que empiezan con el texto, luego los que lo contienen; no se muestran borradores ni bajas lógicas.
4. Con tres nombres que empiezan con «iphone» y una funda que lo contiene, comprobar que la funda completa la cuarta sugerencia. Si hay más de cuatro coincidencias principales, las secundarias quedan para los resultados completos.
5. Elegir una sugerencia por clic o teclado abre el detalle. Enter sin opción resaltada o la lupa abre todos los resultados, con la misma prioridad y sin excluir las coincidencias secundarias.
6. Escape y clic fuera cierran el menú. La cruz monocromática sin fondo vacía el texto y cierra las sugerencias. Para volver al inicio usar Catálogo o Todas las categorías.
7. Probar mayúsculas, ausencia de resultados y producto inexistente/inactivo por URL directa.
8. Más de 20 categorías o productos deben paginar con Atrás/Adelante, contador y página en la URL. Cambiar categoría o iniciar otra búsqueda comienza en la primera página. Recargar y Atrás deben respetar la URL.
9. Al abrir catálogo o detalle sin datos aún disponibles deben verse skeletons con la estructura de las tarjetas o del detalle.

## Navegación y móvil

- En escritorio: sidebar con Catálogo y categorías, sin accesos personales. Header con buscador y acceso de usuario; el carrito aparece con sesión.
- Sin sesión: botón negro Iniciar sesión. Con sesión: nombre con menú Mi perfil, Mis compras y Cerrar sesión. ADMIN incluye Productos y Categorías.
- En móvil: menú de tres barras, marca, usuario y carrito arriba; buscador debajo. El sidebar está oculto y se abre en un panel lateral. Elegir categoría cierra el panel.
- Categorías y productos: dos tarjetas por fila en móvil. Probar nombres largos y ausencia de desborde horizontal.
- En el inicio, contador de categorías y flechas de paginación permanecen en la misma fila; en móvil se oculta el texto de los botones.
- Login y registro tienen marca enlazada al inicio, sin header, sidebar ni carrito. Revisar acceso con sesión vencida y retorno al destino solicitado.

## Carrito y cantidades

1. Sin sesión, intentar agregar: login y retorno al producto; agregar nuevamente después de ingresar.
2. Elegir cantidad 3 en el detalle y agregar: muestra confirmación, no abre el panel y el contador del header suma tres unidades.
3. Agregar dos unidades más del mismo producto: una sola línea con cinco unidades.
4. Abrir el icono: panel lateral con título Mi carrito, productos, cantidades, subtotal y total. Ambos importes coinciden porque no hay envío, impuestos ni descuentos adicionales.
5. Cambiar cantidad: guarda automáticamente tras 450 ms sin nuevas ediciones, sin botón Actualizar; contador e importes se recalculan.
6. Escribir dos cifras, vaciar el campo y probar 0, negativos, decimales y 100. Los inválidos deben informarse sin persistirse; nunca permitir más de 99 unidades acumuladas.
7. Quitar una línea mientras hay una edición pendiente: no debe reaparecer ni enviarse después una cantidad obsoleta.
8. Recargar, cerrar sesión y volver a ingresar: conserva el carrito guardado. Vaciarlo muestra estado vacío.
9. Desactivar o eliminar un producto desde ADMIN: deja de aparecer públicamente; el carrito existente lo marca no disponible y permite quitarlo, bloqueando el pago.
10. Dos pestañas editando un carrito desactualizado: informar conflicto y actualizar el resumen antes de reintentar.

Límites: 100 productos distintos, 99 unidades por producto, total máximo de USD 999.999,99. El servidor calcula precios en centavos y valida el resumen antes de Checkout. Las imágenes pueden requerir renovar la sesión temporal de AWS; no copiar credenciales a `.env`.

Continuar con [pruebas de pago](pruebas-pagos.md). Automatización y pendientes actuales: [validación](validacion.md).
