import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";

const imageSchema = z.object({
  file: z.string().regex(/^[a-f0-9]{64}\.webp$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export const snapshotSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    categories: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        image: imageSchema.nullable(),
      }),
    ),
    products: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().min(1),
        priceCents: z.number().int().positive(),
        active: z.boolean(),
        categoryId: z.string().nullable(),
        createdAt: z.iso.datetime(),
        image: imageSchema.nullable(),
      }),
    ),
  })
  .superRefine((snapshot, ctx) => {
    const categories = new Set(snapshot.categories.map((item) => item.id));
    if (
      categories.size !== snapshot.categories.length ||
      new Set(snapshot.products.map((item) => item.id)).size !==
        snapshot.products.length
    )
      ctx.addIssue({
        code: "custom",
        message: "IDs duplicados en el catálogo.",
      });
    for (const product of snapshot.products) {
      if (
        (product.categoryId && !categories.has(product.categoryId)) ||
        (product.active && !product.image)
      )
        ctx.addIssue({
          code: "custom",
          message: "Producto activo sin imagen o categoría inexistente.",
        });
    }
  });
export type CatalogSnapshot = z.infer<typeof snapshotSchema>;
export const catalogDirectory = new URL("../../data/catalog/", import.meta.url);
export const digest = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

export async function readSnapshot() {
  const snapshot = snapshotSchema.parse(
    JSON.parse(
      await readFile(new URL("catalog.json", catalogDirectory), "utf8"),
    ),
  );
  const images = new Map<string, Buffer>();
  for (const item of [...snapshot.categories, ...snapshot.products]) {
    if (!item.image || images.has(item.image.file)) continue;
    const bytes = await readFile(
      new URL(`images/${item.image.file}`, catalogDirectory),
    );
    if (
      !bytes.length ||
      digest(bytes) !== item.image.sha256 ||
      item.image.file !== `${item.image.sha256}.webp`
    )
      throw new Error("Una imagen de la seed falta o fue modificada.");
    images.set(item.image.file, bytes);
  }
  return { snapshot, images };
}
