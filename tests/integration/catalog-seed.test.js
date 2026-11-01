import { afterAll, beforeAll, expect, test } from "bun:test";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("_test"))
  throw new Error("TEST_DATABASE_URL must end in _test");
process.env.DATABASE_URL = testUrl;
if (
  Bun.spawnSync(["bun", "run", "db:deploy"], {
    env: { ...process.env, DATABASE_URL: testUrl },
  }).exitCode
)
  throw new Error("Test migration failed");
const { prisma } = await import("../../src/lib/prisma");
const { importCatalog } = await import("../../scripts/catalog-seed/import");
const { readSnapshot } = await import("../../scripts/catalog-seed/snapshot");
let newProductIds = [];
let newCategoryIds = [];
let baselineProducts;
let baselineCategories;
let originalGeneral;
beforeAll(async () => {
  originalGeneral = await prisma.category.findUnique({
    where: { id: "category-general" },
  });
  baselineProducts = new Set(
    (await prisma.product.findMany({ select: { id: true } })).map(
      (item) => item.id,
    ),
  );
  baselineCategories = new Set(
    (await prisma.category.findMany({ select: { id: true } })).map(
      (item) => item.id,
    ),
  );
});
afterAll(async () => {
  await prisma.product.deleteMany({ where: { id: { in: newProductIds } } });
  await prisma.category.deleteMany({ where: { id: { in: newCategoryIds } } });
  if (originalGeneral)
    await prisma.category.update({
      where: { id: originalGeneral.id },
      data: { name: originalGeneral.name, imageKey: originalGeneral.imageKey },
    });
  await prisma.$disconnect();
});

test("bundled catalog imports photos, repeats without writes, and preserves edited or removed products", async () => {
  const { snapshot, images } = await readSnapshot();
  expect(images.size).toBeGreaterThan(0);
  const uploads = [];
  const upload = async (namespace, id, image) => {
    expect(images.has(image.file)).toBe(true);
    uploads.push(image.file);
    return `${namespace}/${id}/seed-${image.sha256}.webp`;
  };
  try {
    await importCatalog(prisma, snapshot, upload);
  } finally {
    newProductIds = (await prisma.product.findMany({ select: { id: true } }))
      .map((item) => item.id)
      .filter((id) => !baselineProducts.has(id));
    newCategoryIds = (await prisma.category.findMany({ select: { id: true } }))
      .map((item) => item.id)
      .filter((id) => !baselineCategories.has(id));
  }
  expect(newProductIds).toHaveLength(snapshot.products.length);
  expect(
    (
      await prisma.category.findUniqueOrThrow({
        where: { id: "category-general" },
      })
    ).name,
  ).toBe("Celulares");
  const first = await prisma.product.findUniqueOrThrow({
    where: { id: newProductIds[0] },
  });
  expect(first.imageKey).toContain(`/seed-`);
  await prisma.product.update({
    where: { id: first.id },
    data: {
      name: "Edited seed product",
      priceCents: 123,
      active: false,
      deletedAt: new Date(),
    },
  });
  const uploadCount = uploads.length;
  expect(await importCatalog(prisma, snapshot, upload)).toEqual({
    categories: 0,
    products: 0,
  });
  expect(uploads).toHaveLength(uploadCount);
  const preserved = await prisma.product.findUniqueOrThrow({
    where: { id: first.id },
  });
  expect(preserved.name).toBe("Edited seed product");
  expect(preserved.priceCents).toBe(123);
  expect(preserved.deletedAt).not.toBeNull();
});

test("failed image upload does not leave categories or products partially inserted", async () => {
  const { snapshot } = await readSnapshot();
  const image = snapshot.products.find((item) => item.image).image;
  const id = crypto.randomUUID();
  await expect(
    importCatalog(
      prisma,
      {
        ...snapshot,
        categories: [{ id, name: `Upload failure ${id}`, image }],
        products: [],
      },
      async () => {
        throw new Error("Simulated upload failure");
      },
    ),
  ).rejects.toThrow("Simulated upload failure");
  expect(await prisma.category.findUnique({ where: { id } })).toBeNull();
});
