import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import {
  catalogDirectory,
  digest,
  snapshotSchema,
} from "./catalog-seed/snapshot";

async function main() {
  if (!process.env.AWS_REGION || !process.env.S3_BUCKET_NAME)
    throw new Error("Configurá AWS_REGION y S3_BUCKET_NAME.");
  const client = new S3Client({
    region: process.env.AWS_REGION,
    maxAttempts: 2,
  });
  try {
    const [categories, products] = await prisma.$transaction([
      prisma.category.findMany({
        orderBy: { id: "asc" },
        select: { id: true, name: true, imageKey: true },
      }),
      prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          priceCents: true,
          active: true,
          categoryId: true,
          createdAt: true,
          imageKey: true,
        },
      }),
    ]);
    const images = new Map<string, Buffer>();
    const references = new Map<string, { file: string; sha256: string }>();
    for (const key of new Set(
      [...categories, ...products].flatMap((item) =>
        item.imageKey ? [item.imageKey] : [],
      ),
    )) {
      const object = await client.send(
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key }),
      );
      if (!object.Body) throw new Error("S3 devolvió una imagen vacía.");
      const bytes = Buffer.from(await object.Body.transformToByteArray());
      const sha256 = digest(bytes);
      const file = `${sha256}.webp`;
      references.set(key, { file, sha256 });
      images.set(file, bytes);
    }
    const snapshot = snapshotSchema.parse({
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categories.map(({ imageKey, ...item }) => ({
        ...item,
        image: imageKey ? references.get(imageKey) : null,
      })),
      products: products.map(({ imageKey, createdAt, ...item }) => ({
        ...item,
        createdAt: createdAt.toISOString(),
        image: imageKey ? references.get(imageKey) : null,
      })),
    });
    await mkdir(new URL("images/", catalogDirectory), { recursive: true });
    for (const [file, bytes] of images)
      await writeFile(new URL(`images/${file}`, catalogDirectory), bytes);
    // Publish the manifest only once all referenced assets have been downloaded.
    await writeFile(
      new URL("catalog.json", catalogDirectory),
      `${JSON.stringify(snapshot, null, 2)}\n`,
    );
    console.log(
      `Catálogo exportado: ${categories.length} categorías, ${products.length} productos, ${images.size} imágenes únicas.`,
    );
  } finally {
    client.destroy();
  }
}
main()
  .catch((error: unknown) => {
    console.error(
      "No se pudo exportar el catálogo:",
      error instanceof Error ? error.name : "UnknownError",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
