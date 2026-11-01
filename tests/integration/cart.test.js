import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("_test"))
  throw new Error(
    "Configurá una TEST_DATABASE_URL exclusiva terminada en _test.",
  );
process.env.DATABASE_URL = testUrl;
const migration = Bun.spawnSync(["bun", "run", "db:deploy"], {
  env: { ...process.env, DATABASE_URL: testUrl },
});
if (migration.exitCode)
  throw new Error("No se pudo preparar la base de pruebas.");
const { prisma } = await import("../../src/lib/prisma");
const { createTRPCRouter } = await import("../../src/server/api/trpc");
const { addItem } = await import("../../src/server/api/routers/cart/add-item");
const { setQuantity } =
  await import("../../src/server/api/routers/cart/set-quantity");
const { removeItem } =
  await import("../../src/server/api/routers/cart/remove-item");
const { count } = await import("../../src/server/api/routers/cart/count");
// Test real mutation procedures without importing image signing or contacting S3.
const router = createTRPCRouter({ addItem, setQuantity, removeItem, count });
const ids = [randomUUID(), randomUUID()];
const productId = randomUUID();
const caller = (id) =>
  router.createCaller({
    db: prisma,
    headers: new Headers(),
    session: { user: { id } },
  });

beforeAll(async () => {
  for (const id of ids)
    await prisma.user.create({
      data: { id, email: `cart-${id}@example.invalid`, name: "Cart test" },
    });
  await prisma.product.create({
    data: {
      id: productId,
      name: "Cart test",
      description: "Test",
      priceCents: 1999,
      active: true,
      imageKey: `products/${productId}/test.webp`,
    },
  });
});

afterAll(async () => {
  await prisma.cart.deleteMany({ where: { userId: { in: ids } } });
  await prisma.product.deleteMany({ where: { id: productId } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe("cart ownership and concurrent mutations", () => {
  test("two simultaneous first additions create one cart without losing quantities", async () => {
    const customer = caller(ids[0]);
    await Promise.all([
      customer.addItem({ productId, quantity: 1 }),
      customer.addItem({ productId, quantity: 1 }),
    ]);
    const cart = await prisma.cart.findUniqueOrThrow({
      where: { userId: ids[0] },
      include: { items: true },
    });
    expect(cart.version).toBe(2);
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].quantity).toBe(2);
    expect((await customer.count()).quantity).toBe(2);
  });

  test("two edits based on one version do not silently overwrite each other", async () => {
    const customer = caller(ids[0]);
    const result = await Promise.allSettled([
      customer.setQuantity({ productId, quantity: 3, expectedVersion: 2 }),
      customer.setQuantity({ productId, quantity: 4, expectedVersion: 2 }),
    ]);
    expect(result.filter((entry) => entry.status === "fulfilled").length).toBe(
      1,
    );
    expect(
      result.find((entry) => entry.status === "rejected").reason.code,
    ).toBe("CONFLICT");
    const cart = await prisma.cart.findUniqueOrThrow({
      where: { userId: ids[0] },
      include: { items: true },
    });
    expect(cart.version).toBe(3);
    expect([3, 4]).toContain(cart.items[0].quantity);
  });

  test("another user cannot remove the owner's item by supplying their userId", async () => {
    await caller(ids[1]).removeItem({
      productId,
      expectedVersion: 0,
      userId: ids[0],
    });
    const owner = await prisma.cart.findUniqueOrThrow({
      where: { userId: ids[0] },
      include: { items: true },
    });
    expect(owner.items.length).toBe(1);
    expect(owner.version).toBe(3);
    expect((await caller(ids[0]).count()).quantity).toBe(
      owner.items[0].quantity,
    );
    expect((await caller(ids[1]).count()).quantity).toBe(0);
    expect(
      await prisma.cartItem.count({ where: { cart: { userId: ids[1] } } }),
    ).toBe(0);
  });

  test("rejects invalid quantities and does not change the version on failure", async () => {
    for (const quantity of [0, -1, 1.5, 100]) {
      await expect(
        caller(ids[0]).addItem({ productId, quantity }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    await expect(
      caller(ids[0]).addItem({ productId, quantity: 99 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      (await prisma.cart.findUniqueOrThrow({ where: { userId: ids[0] } }))
        .version,
    ).toBe(3);
  });

  test("inactive products cannot be added but can still be removed", async () => {
    await prisma.product.update({
      where: { id: productId },
      data: { active: false },
    });
    await expect(caller(ids[0]).addItem({ productId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await caller(ids[0]).removeItem({ productId, expectedVersion: 3 });
    expect(
      await prisma.cartItem.count({ where: { cart: { userId: ids[0] } } }),
    ).toBe(0);
    expect((await caller(ids[0]).count()).quantity).toBe(0);
  });
});
