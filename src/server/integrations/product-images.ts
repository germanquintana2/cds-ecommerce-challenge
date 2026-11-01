import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAX_IMAGE_BYTES } from "~/server/validation/product";

const client = new S3Client({ region: process.env.AWS_REGION, maxAttempts: 2 });

function bucket() {
  const name = process.env.S3_BUCKET_NAME;
  if (!name || !process.env.AWS_REGION)
    throw new Error("S3 no está configurado en el servidor.");
  return name;
}

export class ImageValidationError extends Error {}

export async function uploadProductImage(productId: string, file: File) {
  return uploadImage("products", productId, file);
}

export async function uploadCategoryImage(categoryId: string, file: File) {
  return uploadImage("categories", categoryId, file);
}

async function uploadImage(
  namespace: "products" | "categories",
  entityId: string,
  file: File,
) {
  const formats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!formats[file.type] || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new ImageValidationError(
      "Elegí una imagen JPEG, PNG o WebP de hasta 5 MB.",
    );
  }

  let body: Buffer;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 16_000_000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    if (metadata.format !== formats[file.type] || (metadata.pages ?? 1) > 1) {
      throw new Error("Formato de imagen inválido.");
    }
    body = await image
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    if (body.length > MAX_IMAGE_BYTES)
      throw new Error("La imagen convertida es demasiado grande.");
  } catch {
    throw new ImageValidationError(
      "El archivo no es una imagen válida o supera el límite de 16 megapíxeles.",
    );
  }

  const key = `${namespace}/${entityId}/${randomUUID()}.webp`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: "image/webp",
      ServerSideEncryption: "AES256",
      Metadata: {
        [namespace === "products" ? "productid" : "categoryid"]: entityId,
      },
      CacheControl: "private, max-age=300",
    }),
  );
  return key;
}

export async function verifyProductImage(productId: string, key: string) {
  if (!key.startsWith(`products/${productId}/`)) return false;
  const object = await client.send(
    new HeadObjectCommand({ Bucket: bucket(), Key: key }),
  );
  return (
    object.Metadata?.productid === productId &&
    object.ContentType === "image/webp" &&
    (object.ContentLength ?? 0) > 0 &&
    (object.ContentLength ?? Infinity) <= MAX_IMAGE_BYTES
  );
}

export async function productImageUrl(key: string | null) {
  if (!key) return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: 900 },
  );
}

export async function deleteProductImage(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export function logStorageError(error: unknown) {
  // Never log signed URLs, request bodies, credential objects or raw SDK errors.
  console.error(
    "Product image storage operation failed",
    error instanceof Error ? error.name : "UnknownError",
  );
}

export async function safeProductImageUrl(key: string | null) {
  try {
    return await productImageUrl(key);
  } catch (error) {
    logStorageError(error);
    return null;
  }
}

export async function verifyCategoryImage(categoryId: string, key: string) {
  if (!key.startsWith(`categories/${categoryId}/`)) return false;
  const object = await client.send(
    new HeadObjectCommand({ Bucket: bucket(), Key: key }),
  );
  return (
    object.Metadata?.categoryid === categoryId &&
    object.ContentType === "image/webp" &&
    (object.ContentLength ?? 0) > 0 &&
    (object.ContentLength ?? Infinity) <= MAX_IMAGE_BYTES
  );
}
