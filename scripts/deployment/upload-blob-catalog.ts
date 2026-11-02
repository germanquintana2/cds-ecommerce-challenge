import { put } from "@vercel/blob";
import { readSnapshot } from "../catalog-seed/snapshot";

const { snapshot, images } = await readSnapshot();
let count = 0;
for (const [namespace, items] of [
  ["categories", snapshot.categories],
  ["products", snapshot.products],
] as const) {
  for (const item of items) {
    if (!item.image) continue;
    const key = `${namespace}/${item.id}/seed-${item.image.sha256}.webp`;
    const blob = await put(key, images.get(item.image.file)!, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/webp",
    });
    if (!process.env.BLOB_PUBLIC_BASE_URL) {
      console.log(`BLOB_PUBLIC_BASE_URL=${new URL(blob.url).origin}`);
    }
    count++;
  }
}
console.log(`${count} imágenes del catálogo publicadas.`);
