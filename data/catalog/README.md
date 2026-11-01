# Catálogo inicial

Snapshot del catálogo del candidato, generado desde la base local y sus imágenes S3. Incluye únicamente categorías y productos no eliminados: nombres, descripciones, precios, estados, asignaciones, fechas de creación y fotos. No contiene usuarios, sesiones, contraseñas, carritos, órdenes, credenciales ni URLs firmadas.

- `catalog.json`: manifiesto versionado, 5 categorías y 38 productos.
- `images/`: 36 imágenes WebP únicas, identificadas y verificadas por SHA-256.

Importar con `bun run db:seed:catalog`. Requiere migraciones aplicadas y S3 configurado. Validar los archivos sin acceso externo con `bun run db:seed:catalog --check`.

Para actualizar este snapshot deliberadamente a partir del catálogo local, ejecutar `bun run db:export:catalog` con acceso a PostgreSQL y al bucket de origen. Ese comando solo lee base y S3; escribe el manifiesto y las fotos locales. Revisar los cambios antes de compartirlos. Las imágenes antiguas que ya no se referencian no se eliminan automáticamente de esta carpeta.

La importación usa el bucket de destino de `.env` y conserva los registros existentes. Reutiliza categorías coincidentes por nombre sin distinguir mayúsculas y evita volver a crear productos existentes por ID o nombre. Las claves S3 incluyen la entidad y el hash de imagen. No se incluyen los productos eliminados del catálogo de origen.

En una instalación nueva, la categoría vacía General creada por las migraciones se inicializa como Celulares, con su portada del snapshot. Esta excepción solo aplica si conserva el nombre General, no tiene imagen y no contiene productos; una categoría ya utilizada se conserva.
