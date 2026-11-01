import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
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
mock.module("server-only", () => ({}));
const validCategoryImages = new Set();
mock.module("../../src/server/integrations/product-images", () => ({
  productImageUrl: async (key) =>
    key ? "https://example.invalid/image.webp" : null,
  logStorageError: () => {},
  verifyCategoryImage: async (id, key) =>
    key.startsWith(`categories/${id}/`) && validCategoryImages.has(key),
  safeProductImageUrl: async (key) =>
    key
      ? key.startsWith("categories/")
        ? "https://example.invalid/category.webp"
        : "https://example.invalid/image.webp"
      : null,
}));
const { prisma } = await import("../../src/lib/prisma");
const { createTRPCRouter } = await import("../../src/server/api/trpc");
const { adminCategoryRouter } =
  await import("../../src/server/api/routers/admin-category");
const { categoryRouter } =
  await import("../../src/server/api/routers/category");
const { list } = await import("../../src/server/api/routers/catalog/list");
const { create } =
  await import("../../src/server/api/routers/admin-product/create");
const { update } =
  await import("../../src/server/api/routers/admin-product/update");
const { remove } =
  await import("../../src/server/api/routers/admin-product/remove");
const { setActive } =
  await import("../../src/server/api/routers/admin-product/set-active");
const { byId: adminById } =
  await import("../../src/server/api/routers/admin-product/by-id");
const { byId: publicById } =
  await import("../../src/server/api/routers/catalog/by-id");
const { list: adminList } =
  await import("../../src/server/api/routers/admin-product/list");
const { addItem } = await import("../../src/server/api/routers/cart/add-item");
const { get: getCart } = await import("../../src/server/api/routers/cart/get");
const { suggestions } =
  await import("../../src/server/api/routers/catalog/suggestions");
const productsRouter = createTRPCRouter({
  suggestions,
  create,
  update,
  list,
  remove,
  setActive,
  adminById,
  publicById,
  adminList,
  addItem,
  getCart,
});
const users = [randomUUID(), randomUUID()];
const categories = [];
const products = [];
const context = (id) => ({
  db: prisma,
  headers: new Headers(),
  session: id ? { user: { id } } : null,
});
const admin = () => adminCategoryRouter.createCaller(context(users[0]));
const productCaller = () => productsRouter.createCaller(context(users[0]));
let first;
let second;
beforeAll(async () => {
  for (const [i, id] of users.entries())
    await prisma.user.create({
      data: {
        id,
        email: `category-${id}@example.invalid`,
        name: "Category test",
        role: i === 0 ? "ADMIN" : "CUSTOMER",
      },
    });
  first = await admin().create({ name: `Category A ${randomUUID()}` });
  categories.push(first.id);
  second = await admin().create({ name: `Category B ${randomUUID()}` });
  categories.push(second.id);
});
afterAll(async () => {
  await prisma.order.deleteMany({ where: { userId: { in: users } } });
  await prisma.checkoutAttempt.deleteMany({ where: { userId: { in: users } } });
  await prisma.cart.deleteMany({ where: { userId: { in: users } } });
  await prisma.product.deleteMany({ where: { id: { in: products } } });
  await prisma.category.deleteMany({ where: { id: { in: categories } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});
describe("categories and product assignment", () => {
  test("migration preserves a default category and blocks guest/customer writes", async () => {
    expect(
      (await prisma.category.findUnique({ where: { id: "category-general" } }))
        .name,
    ).toBe("General");
    for (const id of [null, users[1]])
      await expect(
        adminCategoryRouter
          .createCaller(context(id))
          .create({ name: "Unauthorized" }),
      ).rejects.toMatchObject({ code: id ? "FORBIDDEN" : "UNAUTHORIZED" });
  });
  test("names are trimmed and duplicate case variants are rejected", async () => {
    await expect(
      admin().create({ name: `  ${first.name.toUpperCase()}  ` }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(admin().create({ name: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
  test("products require a real category and assignments can be changed", async () => {
    const fields = {
      name: "Category product",
      description: "Test",
      priceCents: 100,
    };
    await expect(productCaller().create(fields)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      productCaller().create({ ...fields, categoryId: "missing" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const draft = await productCaller().create({
      ...fields,
      categoryId: first.id,
    });
    products.push(draft.id);
    expect(draft.categoryId).toBe(first.id);
    await prisma.product.update({
      where: { id: draft.id },
      data: { imageKey: `products/${draft.id}/test.webp` },
    });
    await productCaller().update({
      ...fields,
      id: draft.id,
      categoryId: second.id,
      active: true,
    });
    expect(
      (await prisma.product.findUnique({ where: { id: draft.id } })).categoryId,
    ).toBe(second.id);
  });
  test("category filtering never includes drafts or another category", async () => {
    for (const [categoryId, active] of [
      [first.id, true],
      [first.id, false],
    ]) {
      const id = randomUUID();
      products.push(id);
      await prisma.product.create({
        data: {
          id,
          name: "Filter test",
          description: "Test",
          priceCents: 100,
          categoryId,
          active,
          imageKey: `products/${id}/test.webp`,
        },
      });
    }
    const caller = productsRouter.createCaller(context(null));
    const a = await caller.list({ categoryId: first.id, page: 1 });
    const b = await caller.list({ categoryId: second.id, page: 1 });
    expect(a.total).toBe(1);
    expect(b.total).toBe(1);
    expect(a.items[0].id).not.toBe(b.items[0].id);
    const publicCategories = await categoryRouter
      .createCaller(context(null))
      .list();
    expect(
      publicCategories.items.find((c) => c.id === first.id).productCount,
    ).toBe(1);
    expect(publicCategories.items.find((c) => c.id === first.id).imageUrl).toBe(
      "https://example.invalid/image.webp",
    );
    expect(
      publicCategories.items.find((c) => c.id === first.id),
    ).not.toHaveProperty("products");
  });
  test("renaming preserves product relations and missing categories are not found", async () => {
    await admin().update({ id: first.id, name: `Renamed ${randomUUID()}` });
    expect(
      await prisma.product.count({ where: { categoryId: first.id } }),
    ).toBe(2);
    await expect(
      categoryRouter.createCaller(context(null)).byId({ id: "missing" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  test("creation assigns selected products atomically and leaves unselected products alone", async () => {
    const ids = [randomUUID(), randomUUID()];
    for (const id of ids) {
      products.push(id);
      await prisma.product.create({
        data: {
          id,
          name: `Assignment ${id}`,
          description: "Test",
          priceCents: 100,
          categoryId: first.id,
        },
      });
    }
    const created = await admin().create({
      name: `Assigned ${randomUUID()}`,
      productIds: [ids[0]],
    });
    categories.push(created.id);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids[0] } }))
        .categoryId,
    ).toBe(created.id);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids[1] } }))
        .categoryId,
    ).toBe(first.id);
    const failedName = `Rollback ${randomUUID()}`;
    await expect(
      admin().create({
        name: failedName,
        productIds: [ids[1], "missing-product"],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await prisma.category.count({ where: { name: failedName } })).toBe(
      0,
    );
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids[1] } }))
        .categoryId,
    ).toBe(first.id);
    await expect(
      admin().create({
        name: `Duplicate ids ${randomUUID()}`,
        productIds: [ids[1], ids[1]],
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  test("search is administrator-only and excludes already selected products", async () => {
    for (const id of [null, users[1]])
      await expect(
        adminCategoryRouter
          .createCaller(context(id))
          .searchProducts({ search: "Assignment" }),
      ).rejects.toMatchObject({ code: id ? "FORBIDDEN" : "UNAUTHORIZED" });
    const match = await admin().searchProducts({ search: "Assignment" });
    expect(match.items.length).toBe(2);
    expect(match.items[0]).toHaveProperty("category.name");
    const filtered = await admin().searchProducts({
      search: "Assignment",
      excludeIds: match.items.map((product) => product.id),
    });
    expect(filtered.items).toEqual([]);
  });
  test("category covers must be verified and take priority over product images", async () => {
    const id = randomUUID();
    const imageKey = `categories/${id}/${randomUUID()}.webp`;
    await expect(
      admin().create({ id, name: `Unverified ${randomUUID()}`, imageKey }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    validCategoryImages.add(imageKey);
    const created = await admin().create({
      id,
      name: `Own image ${randomUUID()}`,
      imageKey,
    });
    categories.push(created.id);
    const result = await categoryRouter.createCaller(context(null)).list();
    expect(result.items.find((category) => category.id === id).imageUrl).toBe(
      "https://example.invalid/category.webp",
    );
    await expect(
      admin().create({
        id: randomUUID(),
        name: `Wrong cover ${randomUUID()}`,
        imageKey,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  test("editing loads assigned products and protects reads and writes", async () => {
    const detail = await admin().byId({ id: first.id });
    expect(detail.id).toBe(first.id);
    expect(
      detail.products.every((product) => product.category.name === detail.name),
    ).toBe(true);
    for (const id of [null, users[1]]) {
      await expect(
        adminCategoryRouter.createCaller(context(id)).byId({ id: first.id }),
      ).rejects.toMatchObject({ code: id ? "FORBIDDEN" : "UNAUTHORIZED" });
      await expect(
        adminCategoryRouter
          .createCaller(context(id))
          .update({ id: first.id, name: "Denied", productIds: [] }),
      ).rejects.toMatchObject({ code: id ? "FORBIDDEN" : "UNAUTHORIZED" });
    }
    await expect(admin().byId({ id: "missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  test("editing changes cover and membership and leaves removed products unassigned", async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of ids) {
      products.push(id);
      await prisma.product.create({
        data: {
          id,
          name: `Edit ${id}`,
          description: "Test",
          priceCents: 100,
          categoryId: first.id,
        },
      });
    }
    const category = await admin().create({
      name: `Editable ${randomUUID()}`,
      productIds: ids.slice(0, 2),
    });
    categories.push(category.id);
    const original = await admin().byId({ id: category.id });
    expect(original.products).toHaveLength(2);
    const imageKey = `categories/${category.id}/${randomUUID()}.webp`;
    validCategoryImages.add(imageKey);
    await admin().update({
      id: category.id,
      name: `Updated ${randomUUID()}`,
      productIds: ids.slice(1),
      imageKey,
      expectedUpdatedAt: original.updatedAt,
    });
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: ids[0] } }))
        .categoryId,
    ).toBeNull();
    for (const id of ids.slice(1))
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id } })).categoryId,
      ).toBe(category.id);
    const saved = await admin().byId({ id: category.id });
    expect(saved.imageKey).toBe(imageKey);
    expect(saved.imageUrl).toBe("https://example.invalid/category.webp");
    expect(await prisma.product.count({ where: { id: { in: ids } } })).toBe(3);
    await admin().update({
      id: category.id,
      name: saved.name,
      productIds: [],
      imageKey: null,
      expectedUpdatedAt: saved.updatedAt,
    });
    const cleared = await admin().byId({ id: category.id });
    expect(cleared.imageKey).toBeNull();
    expect(cleared.products).toEqual([]);
    expect(
      await prisma.product.count({
        where: { id: { in: ids }, categoryId: null },
      }),
    ).toBe(3);
  });
  test("failed and stale category edits do not partially rename or reassign products", async () => {
    const original = await admin().byId({ id: second.id });
    const ids = original.products.map((product) => product.id);
    await expect(
      admin().update({
        id: second.id,
        name: `Invalid ${randomUUID()}`,
        productIds: ["missing-product"],
        imageKey: null,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await admin().byId({ id: second.id })).name).toBe(original.name);
    await expect(
      admin().update({
        id: second.id,
        name: "Stale",
        productIds: [],
        expectedUpdatedAt: "2000-01-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      admin().update({
        id: second.id,
        name: (await admin().byId({ id: first.id })).name,
        productIds: [],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const after = await admin().byId({ id: second.id });
    expect(after.name).toBe(original.name);
    expect(after.products.map((product) => product.id)).toEqual(ids);
    await expect(
      admin().update({
        id: second.id,
        name: original.name,
        imageKey: `categories/${randomUUID()}/${randomUUID()}.webp`,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  test("catalog pages contain at most twenty products and keep category isolation", async () => {
    const category = await admin().create({
      name: `Pagination ${randomUUID()}`,
    });
    categories.push(category.id);
    const rows = Array.from({ length: 21 }, (_, index) => ({
      id: randomUUID(),
      name: `Paged product ${index}`,
      description: "Pagination test",
      priceCents: 100,
      categoryId: category.id,
      active: true,
      imageKey: "products/pagination/test.webp",
    }));
    products.push(...rows.map((row) => row.id));
    await prisma.product.createMany({ data: rows });
    const publicCaller = productsRouter.createCaller(context(null));
    const firstPage = await publicCaller.list({
      categoryId: category.id,
      page: 1,
    });
    const secondPage = await publicCaller.list({
      categoryId: category.id,
      page: 2,
    });
    expect(firstPage.items).toHaveLength(20);
    expect(secondPage.items).toHaveLength(1);
    expect(firstPage.total).toBe(21);
    expect(firstPage.pages).toBe(2);
    expect(secondPage.page).toBe(2);
    const all = [...firstPage.items, ...secondPage.items].map(
      (item) => item.id,
    );
    expect(new Set(all).size).toBe(21);
    expect(all.every((id) => rows.some((row) => row.id === id))).toBe(true);
  });
  test("product removal preserves paid snapshots and makes existing cart items unavailable", async () => {
    const category = await admin().create({ name: `Removal ${randomUUID()}` });
    categories.push(category.id);
    const id = randomUUID();
    products.push(id);
    await prisma.product.create({
      data: {
        id,
        name: `Remove ${id}`,
        description: "Test",
        priceCents: 100,
        categoryId: category.id,
        active: true,
        imageKey: `products/${id}/test.webp`,
      },
    });
    const customer = productsRouter.createCaller(context(users[0]));
    await customer.addItem({ productId: id, quantity: 1 });
    const cart = await prisma.cart.findUniqueOrThrow({
      where: { userId: users[0] },
    });
    const attempt = await prisma.checkoutAttempt.create({
      data: {
        userId: users[0],
        cartId: cart.id,
        cartVersion: cart.version,
        requestKey: randomUUID(),
        status: "PAID",
        stripeSessionId: `cs_test_${randomUUID()}`,
        stripePaymentIntentId: `pi_${randomUUID()}`,
        totalCents: 100,
      },
    });
    const order = await prisma.order.create({
      data: {
        userId: users[0],
        checkoutAttemptId: attempt.id,
        totalCents: 100,
        paidAt: new Date(),
        items: {
          create: {
            productId: id,
            productName: "Historical removal name",
            unitPriceCents: 100,
            quantity: 1,
          },
        },
      },
    });
    for (const user of [null, users[1]])
      await expect(
        productsRouter.createCaller(context(user)).remove({ id }),
      ).rejects.toMatchObject({ code: user ? "FORBIDDEN" : "UNAUTHORIZED" });
    await customer.remove({ id });
    await customer.remove({ id });
    const row = await prisma.product.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.active).toBe(false);
    const saved = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(saved.items[0].productName).toBe("Historical removal name");
    expect(saved.totalCents).toBe(100);
    const current = await customer.getCart();
    expect(current.canCheckout).toBe(false);
    expect(current.items.find((item) => item.productId === id).available).toBe(
      false,
    );
    await expect(customer.adminById({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(customer.publicById({ id })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await customer.adminList({ search: row.name })).items).toEqual([]);
    expect((await customer.list({ search: row.name })).items).toEqual([]);
    expect((await admin().searchProducts({ search: row.name })).items).toEqual(
      [],
    );
    expect((await admin().byId({ id: category.id })).products).toEqual([]);
    await expect(
      customer.setActive({ id, active: true }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      customer.update({
        id,
        categoryId: category.id,
        name: row.name,
        description: "Test",
        priceCents: 100,
        active: false,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      admin().create({ name: `No archived ${randomUUID()}`, productIds: [id] }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      Promise.resolve(
        prisma.product.update({ where: { id }, data: { active: true } }),
      ),
    ).rejects.toThrow();
  });
  test("category deletion unassigns its products without deleting or deactivating them", async () => {
    const category = await admin().create({
      name: `Delete category ${randomUUID()}`,
    });
    categories.push(category.id);
    const id = randomUUID();
    products.push(id);
    await prisma.product.create({
      data: {
        id,
        name: `Keep ${id}`,
        description: "Test",
        priceCents: 100,
        categoryId: category.id,
        active: true,
        imageKey: `products/${id}/test.webp`,
      },
    });
    for (const user of [null, users[1]])
      await expect(
        adminCategoryRouter
          .createCaller(context(user))
          .remove({ id: category.id }),
      ).rejects.toMatchObject({ code: user ? "FORBIDDEN" : "UNAUTHORIZED" });
    await admin().remove({ id: category.id });
    expect(
      await prisma.category.findUnique({ where: { id: category.id } }),
    ).toBeNull();
    const product = await prisma.product.findUniqueOrThrow({ where: { id } });
    expect(product.categoryId).toBeNull();
    expect(product.active).toBe(true);
    expect(product.deletedAt).toBeNull();
    expect(
      (await productsRouter.createCaller(context(null)).publicById({ id }))
        .category,
    ).toBeNull();
    await expect(
      categoryRouter.createCaller(context(null)).byId({ id: category.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(
      (await categoryRouter.createCaller(context(null)).navigation()).some(
        (item) => item.id === category.id,
      ),
    ).toBe(false);
  });
  test("search ranks names starting with the query before contained text", async () => {
    const query = `Phone ${randomUUID()}`;
    const rows = [query, `${query} Pro`, `Case for ${query}`].map((name) => ({
      id: randomUUID(),
      name,
      description: "Search ranking test",
      priceCents: 100,
      categoryId: first.id,
      active: true,
      imageKey: "products/suggestions/test.webp",
    }));
    products.push(...rows.map((row) => row.id));
    await prisma.product.createMany({ data: rows });
    const caller = productsRouter.createCaller(context(null));
    const matches = await caller.suggestions({ search: query.toUpperCase() });
    expect(matches.map((item) => item.id)).toEqual([
      rows[0].id,
      rows[1].id,
      rows[2].id,
    ]);
    const catalogMatches = await caller.list({ search: query.toUpperCase() });
    expect(catalogMatches.total).toBe(3);
    expect(
      catalogMatches.items
        .slice(0, 2)
        .every((item) =>
          item.name.toLowerCase().startsWith(query.toLowerCase()),
        ),
    ).toBe(true);
    const emptyPage = await caller.list({ search: query, page: 2 });
    expect(emptyPage.total).toBe(3);
    expect(emptyPage.pages).toBe(1);
    expect(emptyPage.items).toHaveLength(0);
    await prisma.product.updateMany({
      where: { id: { in: rows.slice(0, 2).map((row) => row.id) } },
      data: { active: false },
    });
    const fallback = await caller.suggestions({ search: query });
    expect(fallback.map((item) => item.id)).toEqual([rows[2].id]);
    const catalogFallback = await caller.list({ search: query });
    expect(catalogFallback.total).toBe(1);
    expect(catalogFallback.items.map((item) => item.id)).toEqual([rows[2].id]);
  });
  test("ranked search keeps secondary matches after prefixes across page boundaries", async () => {
    const query = `Rank ${randomUUID()}`;
    const rows = Array.from({ length: 23 }, (_, index) => ({
      id: randomUUID(),
      name: index < 21 ? `${query} ${index}` : `Case ${index} for ${query}`,
      description: "Pagination ranking test",
      priceCents: 100,
      categoryId: first.id,
      active: true,
      imageKey: "products/suggestions/test.webp",
    }));
    products.push(...rows.map((row) => row.id));
    await prisma.product.createMany({ data: rows });
    const caller = productsRouter.createCaller(context(null));
    const firstPage = await caller.list({ search: query });
    const secondPage = await caller.list({ search: query, page: 2 });
    expect(firstPage.total).toBe(23);
    expect(firstPage.pages).toBe(2);
    expect(firstPage.items).toHaveLength(20);
    expect(firstPage.items.every((item) => item.name.startsWith(query))).toBe(
      true,
    );
    expect(secondPage.items).toHaveLength(3);
    expect(secondPage.items[0].name.startsWith(query)).toBe(true);
    expect(
      secondPage.items.slice(1).every((item) => item.name.startsWith("Case")),
    ).toBe(true);
    expect(
      new Set([...firstPage.items, ...secondPage.items].map((item) => item.id))
        .size,
    ).toBe(23);
  });
  test("public category pages contain at most twenty categories without duplicates", async () => {
    const rows = Array.from({ length: 21 }, () => ({
      id: randomUUID(),
      name: `Paged ${randomUUID()}`,
    }));
    categories.push(...rows.map((row) => row.id));
    await prisma.category.createMany({ data: rows });
    const caller = categoryRouter.createCaller(context(null));
    const firstPage = await caller.list({ page: 1 });
    expect(firstPage.items).toHaveLength(20);
    expect(firstPage.pages).toBe(Math.ceil(firstPage.total / 20));
    const all = [];
    for (let page = 1; page <= firstPage.pages; page++) {
      const result = await caller.list({ page });
      expect(result.items.length).toBeLessThanOrEqual(20);
      all.push(...result.items.map((item) => item.id));
    }
    expect(new Set(all).size).toBe(firstPage.total);
    expect(rows.every((row) => all.includes(row.id))).toBe(true);
  });
  test("public suggestions return at most four active products without removed items", async () => {
    const prefix = `Suggest ${randomUUID()}`;
    const rows = Array.from({ length: 6 }, (_, index) => ({
      id: randomUUID(),
      name: `${prefix} ${index}`,
      description: "Suggestion test",
      priceCents: 100,
      categoryId: first.id,
      active: index < 5,
      imageKey: "products/suggestions/test.webp",
    }));
    products.push(...rows.map((row) => row.id));
    await prisma.product.createMany({ data: rows });
    const caller = productsRouter.createCaller(context(null));
    const result = await caller.suggestions({
      search: `  ${prefix.toUpperCase()}  `,
    });
    expect(result).toHaveLength(4);
    expect(
      result.every((item) =>
        rows.slice(0, 5).some((row) => row.id === item.id),
      ),
    ).toBe(true);
    expect(result[0]).not.toHaveProperty("imageKey");
    expect(result[0]).not.toHaveProperty("deletedAt");
    await productCaller().remove({ id: rows[0].id });
    const refreshed = await caller.suggestions({ search: prefix });
    expect(refreshed).toHaveLength(4);
    expect(
      refreshed.some(
        (item) => item.id === rows[0].id || item.id === rows[5].id,
      ),
    ).toBe(false);
    await expect(caller.suggestions({ search: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
