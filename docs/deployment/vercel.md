# Versión pública

La tienda utiliza Vercel (Next.js), Neon (PostgreSQL) y Vercel Blob para las fotos públicas de productos y categorías. Stripe permanece en modo de pruebas y envía las confirmaciones a `/api/webhooks/stripe` por HTTPS.

Docker/local conserva S3 privado y URLs temporales. El proyecto AWS de la nueva experiencia impide configurar el proveedor OIDC con su política administrada; no se activaron funciones avanzadas ni se cambió su plan.

## Configuración de producción

- `DATABASE_URL`: conexión agrupada de Neon.
- `BETTER_AUTH_URL`: URL pública final.
- `BETTER_AUTH_SECRET`: secreto exclusivo de producción.
- `STRIPE_SECRET_KEY`: clave del sandbox.
- `STRIPE_WEBHOOK_SECRET`: secreto del endpoint público, distinto del listener local.
- `IMAGE_STORAGE_PROVIDER=vercel-blob`.
- `BLOB_READ_WRITE_TOKEN`: inyectado al conectar el almacén Blob al proyecto.
- `BLOB_PUBLIC_BASE_URL`: origen HTTPS del almacén público.

Los secretos quedan fuera de Git. No copiar las credenciales de la base local ni sesiones temporales de AWS a Vercel. Las fotos se normalizan a WebP; el límite de archivo es 4 MB para respetar el límite de cuerpo de las funciones de Vercel.

Las migraciones y la seed se ejecutan explícitamente antes del despliegue usando la conexión directa de Neon. No se ejecutan desde una solicitud web. La cuenta administradora tiene una contraseña exclusiva, guardada localmente en `.env.deployment.secrets`; no se entrega al navegador ni se configura como variable de ejecución.

`scripts/deployment/upload-blob-catalog.ts` publica las fotos verificadas de la instantánea conservando las claves que usa la seed. Requiere el token de Blob en el entorno. Las imágenes del catálogo son públicas; el token de escritura solo se utiliza en el servidor.
