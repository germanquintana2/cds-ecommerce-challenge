import "dotenv/config";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { prisma } from "../src/lib/prisma";
import { importCatalog } from "./catalog-seed/import";
import { readSnapshot } from "./catalog-seed/snapshot";

async function main() {
  const { snapshot, images } = await readSnapshot();
  if (process.argv.includes("--check")) {
    console.log(
      `Seed válida: ${snapshot.categories.length} categorías, ${snapshot.products.length} productos, ${images.size} imágenes verificadas.`,
    );
    return;
  }
  if (!process.env.S3_BUCKET_NAME || !process.env.AWS_REGION)
    throw new Error(
      "Configurá S3_BUCKET_NAME y AWS_REGION antes de cargar el catálogo con fotos.",
    );
  const client = new S3Client({
    region: process.env.AWS_REGION,
    maxAttempts: 2,
  });
  try {
    const result = await importCatalog(
      prisma,
      snapshot,
      async (namespace, id, image) => {
        const key = `${namespace}/${id}/seed-${image.sha256}.webp`;
        const metadata = {
          [namespace === "products" ? "productid" : "categoryid"]: id,
          sha256: image.sha256,
        };
        try {
          const existing = await client.send(
            new HeadObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: key,
            }),
          );
          if (
            existing.Metadata?.sha256 !== image.sha256 ||
            existing.ContentType !== "image/webp"
          )
            throw new Error(
              "Objeto de seed existente con contenido incompatible.",
            );
          return key;
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !["NotFound", "NoSuchKey"].includes(error.name)
          )
            throw error;
        }
        await client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: images.get(image.file)!,
            ContentType: "image/webp",
            ServerSideEncryption: "AES256",
            Metadata: metadata,
            CacheControl: "private, max-age=300",
            IfNoneMatch: "*",
          }),
        );
        return key;
      },
    );
    console.log(
      `Catálogo cargado: ${result.categories} categorías y ${result.products} productos nuevos. Los registros existentes se conservaron.`,
    );
  } finally {
    client.destroy();
  }
}
main()
  .catch((error: unknown) => {
    console.error(
      "No se pudo cargar el catálogo:",
      error instanceof Error ? error.name : "UnknownError",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
