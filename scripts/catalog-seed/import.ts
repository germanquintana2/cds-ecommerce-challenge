import type { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import type { CatalogSnapshot } from "./snapshot";

type Upload = (
  namespace: "products" | "categories",
  id: string,
  image: NonNullable<CatalogSnapshot["products"][number]["image"]>,
) => Promise<string>;

export async function importCatalog(
  db: PrismaClient,
  snapshot: CatalogSnapshot,
  upload: Upload,
) {
  const categoryIds = new Map<string, string>();
  const newCategories: Prisma.CategoryCreateManyInput[] = [];
  const newProducts: Prisma.ProductCreateManyInput[] = [];
  let bootstrapCategory: Prisma.CategoryCreateManyInput | undefined;
  for (const category of snapshot.categories) {
    const existing = await db.category.findFirst({
      where: {
        OR: [
          { id: category.id },
          { name: { equals: category.name, mode: "insensitive" } },
        ],
      },
    });
    const id = existing?.id ?? category.id;
    categoryIds.set(category.id, id);
    const isMigrationPlaceholder =
      existing?.id === "category-general" &&
      existing.name === "General" &&
      !existing.imageKey &&
      (await db.product.count({ where: { categoryId: existing.id } })) === 0;
    if (existing && !isMigrationPlaceholder) continue;
    const categoryData = {
      id,
      name: category.name,
      imageKey: category.image
        ? await upload("categories", id, category.image)
        : null,
    };
    if (isMigrationPlaceholder) bootstrapCategory = categoryData;
    else newCategories.push(categoryData);
  }
  for (const product of snapshot.products) {
    // Include removed products: a rerun must never resurrect them.
    const existing = await db.product.findFirst({
      where: {
        OR: [
          { id: product.id },
          { name: { equals: product.name, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (existing) continue;
    const categoryId = product.categoryId
      ? categoryIds.get(product.categoryId)
      : null;
    if (product.categoryId && !categoryId)
      throw new Error("Categoría de seed no encontrada.");
    const { image, createdAt, ...data } = product;
    newProducts.push({
      ...data,
      categoryId,
      createdAt: new Date(createdAt),
      imageKey: image ? await upload("products", product.id, image) : null,
    });
  }
  await db.$transaction(
    async (tx) => {
      // Initialize only the untouched, empty placeholder created by the migrations.
      if (bootstrapCategory) {
        const updated = await tx.category.updateMany({
          where: {
            id: "category-general",
            name: "General",
            imageKey: null,
            products: { none: {} },
          },
          data: {
            name: bootstrapCategory.name,
            imageKey: bootstrapCategory.imageKey,
          },
        });
        if (updated.count !== 1)
          throw new Error("La categoría inicial cambió; reintentá la seed.");
      }
      for (const category of newCategories)
        await tx.category.create({ data: category });
      for (const product of newProducts)
        await tx.product.create({ data: product });
    },
    { maxWait: 10000, timeout: 30000 },
  );
  return { categories: newCategories.length, products: newProducts.length };
}
