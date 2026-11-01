# Preparación de Stripe en modo de prueba

Estado: configuración local y acceso API verificados el 27 de octubre de 2026. Entorno activo: **Entorno de prueba de CDS**, sandbox `acct_1UVBynRubgeiixMA`. Checkout y el endpoint del webhook están implementados localmente; el candidato confirmó que las pruebas manuales de sandbox se completaron correctamente.

## Decisiones

- Stripe Checkout alojado, con pago único en USD.
- Entorno de pruebas asociado al acceso del candidato, para conservarlo durante la entrega y la defensa.
- Sin activación de pagos reales.
- La creación de sesiones ocurre en el backend. Para redirigir a la URL de Checkout no se requiere inicialmente una clave pública de Stripe.js.
- El backend confirma el pago mediante un webhook firmado. Volver a la página de éxito no constituye confirmación de pago.

## Acceso

Crear el acceso desde https://dashboard.stripe.com/register y verificar el correo. Si el asistente solicita activar un negocio, completar esa activación no forma parte del challenge. No ingresar datos ficticios de país o empresa para habilitar pagos reales.

Con el acceso creado, autorizar Stripe CLI y seleccionar únicamente un sandbox o entorno de pruebas. La disponibilidad y los pasos del dashboard pueden variar según el acceso.

```sh
stripe login
```

## Variables locales

```dotenv
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Guardar los valores reales solo en `.env`, que está excluido de Git. Preferir una clave restringida de pruebas con permisos necesarios para la integración. Las credenciales de CLI no deben asumirse como credenciales permanentes de la aplicación.

No compartir claves por chat ni agregar `NEXT_PUBLIC_` a estas variables. El secreto del webhook es independiente de la clave de API.

## Webhook local

Ruta elegida: `http://localhost:3100/api/webhooks/stripe`.

Con la aplicación ejecutándose:

```sh
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to http://localhost:3100/api/webhooks/stripe
```

Usar el secreto de firma de ese listener local como `STRIPE_WEBHOOK_SECRET`. Un endpoint desplegado tendrá su propio secreto. Reiniciar la aplicación después de modificar variables de entorno.

La implementación limita Checkout a tarjetas. Se comprueba que la sesión esté efectivamente pagada, y se validan total, moneda e identificador del intento. Si se habilitan métodos de pago diferidos, se deberán agregar los eventos de pago asíncrono correspondientes.

## Verificación realizada

- CLI autorizada exclusivamente en el sandbox de CDS.
- Clave de pruebas del backend y secreto del listener local presentes en `.env`, sin registrar sus valores en documentación ni salida de comandos.
- Consulta de solo lectura a Checkout Sessions aceptada por Stripe.
- Identidad de la clave del backend coincidente con el sandbox de la CLI.
- Esa comprobación inicial fue de solo lectura. Posteriormente el candidato realizó compras de sandbox y verificó la confirmación y el detalle de órdenes.

## Pruebas manuales

- Arrancar el listener durante la prueba local y verificar que su secreto coincide con STRIPE_WEBHOOK_SECRET.
- [Guía de pago, rechazo y cancelación](pruebas-pagos.md), completada correctamente según confirmación del candidato. Las pruebas automáticas verifican firma, idempotencia y creación de orden con transporte simulado; no sustituyen una compra real de sandbox.

## Referencias

- [CLI y autenticación](https://docs.stripe.com/cli)
- [Claves y separación de entornos](https://docs.stripe.com/keys)
- [Sandbox temporal y vencimiento](https://docs.stripe.com/cli/sandbox)

## Implementación

El SDK oficial `stripe` crea sesiones con `allowed_payment_method_types: ["card"]` (API 2026-09-30.endive), precios del snapshot y clave de idempotencia por intento. No se activa conversión automática de moneda. Se exige una clave `sk_test_` o `rk_test_` y se rechazan eventos de producción.

La ruta `/api/webhooks/stripe` verifica la firma antes de recuperar la sesión desde Stripe. La confirmación serializa eventos por intento en PostgreSQL, registra una única orden y limpia el carrito solo si su versión no cambió. El retorno del navegador consulta estado; no confirma pagos.

El total mínimo para Checkout en USD es 50 centavos. Las sesiones inciertas sin ID de más de 23 horas requieren revisión administrativa antes de reintentar con la misma clave. No se automatiza esa reconciliación en este challenge.

Para el arranque habitual usar `bun run dev:payments`, que verifica el listener y después inicia Next.js. No ejecutar simultáneamente `bun run dev` en el mismo puerto. El comando requiere Node, Bun y Stripe CLI disponibles, autorización de CLI vigente y variables de prueba completas. Si el listener o la aplicación terminan, el supervisor detiene ambos.
