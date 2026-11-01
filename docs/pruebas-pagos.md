# Prueba manual de pagos de sandbox

## Preparación

1. Completar `.env` con clave de Stripe de prueba y secreto del listener, sin compartirlos.
2. Tener Stripe CLI instalada y autorizada en el mismo sandbox de la clave.
3. Detener cualquier servidor previo del puerto 3100 y ejecutar `bun run dev:payments`. Esperar el mensaje de listener verificado y la aplicación lista; mantener la terminal abierta.
4. Abrir http://localhost:3100, ingresar como CUSTOMER y agregar productos activos por al menos USD 0,50.

Si el supervisor detecta un secreto distinto, corregir `STRIPE_WEBHOOK_SECRET` localmente y reiniciar. No copiar secretos a documentación ni capturas. Como alternativa avanzada pueden ejecutarse Next.js y el listener en terminales separadas, manteniendo ambos activos y el secreto sincronizado.

## Compra exitosa

- Abrir el carrito y pulsar Continuar al pago. Debe abrir una página alojada por Stripe en modo prueba.
- Usar tarjeta `4242 4242 4242 4242`, fecha futura y cualquier CVC de tres cifras. Usar datos de prueba propios para los demás campos.
- Completar el pago y volver al resultado: puede mostrar confirmación pendiente hasta que llegue el webhook.
- Comprobar una sola orden en Mis compras, con nombres, cantidades y precios correctos. Abrir su detalle.
- El carrito debe quedar vacío si no se modificó durante el pago.

## Cancelación y rechazo

- Iniciar otra compra y volver desde Stripe sin pagar. Debe volver al catálogo (`/`), sin pantalla de cancelación. Recargar debe mantener el catálogo. No debe aparecer una orden nueva; el carrito se conserva.
- Probar tarjeta de rechazo `4000 0000 0000 0002`. No debe registrarse una orden pagada.

## Cambios durante el pago

- Abrir Checkout. En otra pestaña, modificar el carrito. Completar el pago original.
- La orden debe conservar el resumen original. El carrito modificado debe conservarse.
- Editar nombre/precio del producto desde administración: el historial de compra debe conservar los valores originales.

## Acceso y confirmación demorada

- Abrir el detalle de esa orden desde otro usuario: debe devolver no encontrado.
- En el modo de terminales separadas, detener solo el listener antes de pagar: el retorno debe quedar pendiente, sin inventar una compra pagada. `dev:payments` detiene también Next.js si pierde el listener; para este caso usar el arranque separado.
- Volver a iniciar el listener y reenviar el evento pendiente desde Stripe. Debe confirmarse una sola orden.

Las pruebas automatizadas en `tests/integration/checkout.test.js` cubren idempotencia, firmas inválidas/vencidas, precios desactualizados, importes/monedas/referencias alterados, eventos duplicados concurrentes, snapshots, aislamiento y preservación del carrito. No generan pagos ni llaman a Stripe.

Referencias: [tarjetas de prueba](https://docs.stripe.com/testing), [Stripe CLI](https://docs.stripe.com/stripe-cli).

## Sesión vencida

- Abrir `/checkout/result?attempt=<intento-propio>` sin sesión: iniciar sesión debe volver al mismo resultado, sin confirmar el pago por la URL.
- Abrir una orden propia sin sesión y volver a ingresar: debe conservar el destino.
- Una referencia ajena debe seguir devolviendo no encontrado después del login.

Las sesiones nuevas usan el catálogo como URL de cancelación. Las sesiones anteriores que aún regresen a `/checkout/result?attempt=...&cancelled=1` se redirigen en servidor a `/`, para mantener URL y pantalla coherentes incluso al recargar. Cancelar no marca el intento como pagado ni borra el carrito.

## Atrás del navegador

- Con el carrito abierto, iniciar Checkout y usar Atrás del navegador: debe volver con el panel cerrado.
- Recargar: debe conservar la misma página con el panel cerrado.
- Repetir usando el enlace de regreso de Stripe: mismo comportamiento de panel cerrado.
- Los productos deben permanecer en el carrito y poder verse al abrirlo manualmente.

## Arranque conjunto para pruebas de pago

Detener el servidor de desarrollo anterior y ejecutar `bun run dev:payments`. Este comando inicia Stripe CLI, comprueba que su secreto coincide con `.env` y recién después levanta Next.js. Mantener esa terminal abierta durante las compras. Si el listener termina, también se detiene el servidor que inició el comando, para evitar seguir probando pagos sin recibir confirmaciones. Ctrl+C cierra ambos procesos. El comando `bun run dev` continúa disponible para trabajar sin pagos.

El 30 de octubre se detectaron pagos válidos pendientes porque el listener local estaba detenido. Se recuperaron sus eventos auténticos desde la API de Stripe y se reenviaron con firma local al webhook idempotente, sin nuevos cobros. `pending_webhooks=0` en Stripe no demuestra que un listener local haya recibido un evento.
