# Preparación de Stripe en modo de prueba

Estado: configuración local y acceso API verificados el 27 de octubre de 2026. Entorno activo: **Entorno de prueba de CDS**, sandbox `acct_1UVBynRubgeiixMA`. Todavía no se implementó checkout ni el endpoint del webhook.

## Decisiones

- Stripe Checkout alojado, con pago único en USD.
- Entorno de pruebas asociado al acceso del candidato, para conservarlo durante la entrega y la defensa.
- Sin activación de pagos reales.
- La creación de sesiones ocurrirá en el backend. Para redirigir a la URL de Checkout no se requiere inicialmente una clave pública de Stripe.js.
- El backend confirmará el pago mediante un webhook firmado. Volver a la página de éxito no constituye confirmación de pago.

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

## Webhook local previsto

Ruta elegida: `http://localhost:3100/api/webhooks/stripe`.

Esta ruta todavía no existe. Cuando esté implementada y la aplicación esté ejecutándose:

```sh
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to http://localhost:3100/api/webhooks/stripe
```

Usar el secreto de firma de ese listener local como `STRIPE_WEBHOOK_SECRET`. Un endpoint desplegado tendrá su propio secreto. Reiniciar la aplicación después de modificar variables de entorno.

La primera implementación limitará Checkout a tarjetas. Se comprobará que la sesión esté efectivamente pagada, y se validarán total, moneda e identificador del intento. Si se habilitan métodos de pago diferidos, se deberán agregar los eventos de pago asíncrono correspondientes.

## Verificación realizada

- CLI autorizada exclusivamente en el sandbox de CDS.
- Clave de pruebas del backend y secreto del listener local presentes en `.env`, sin registrar sus valores en documentación ni salida de comandos.
- Consulta de solo lectura a Checkout Sessions aceptada por Stripe.
- Identidad de la clave del backend coincidente con el sandbox de la CLI.
- No se crearon sesiones de compra ni pagos durante esta verificación.

## Pendiente de implementación

- Endpoint del webhook y arranque del listener durante el desarrollo.
- Prueba completa de pago, firma y creación idempotente de orden, cuando se implemente el checkout.

## Referencias

- [CLI y autenticación](https://docs.stripe.com/cli)
- [Claves y separación de entornos](https://docs.stripe.com/keys)
- [Sandbox temporal y vencimiento](https://docs.stripe.com/cli/sandbox)
