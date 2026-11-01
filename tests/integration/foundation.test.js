import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("_test")) {
  throw new Error(
    "TEST_DATABASE_URL debe apuntar a una base exclusiva con nombre terminado en _test.",
  );
}
// Select the isolated DB before importing application modules or Better Auth.
process.env.DATABASE_URL = testUrl;
const migration = Bun.spawnSync(["bun", "run", "db:deploy"], {
  env: { ...process.env, DATABASE_URL: testUrl },
});
if (migration.exitCode !== 0) {
  throw new Error(
    "No se pudieron aplicar migraciones a la base de pruebas. Creala siguiendo el README.",
  );
}
const { auth } = await import("../../src/lib/auth");
const { prisma } = await import("../../src/lib/prisma");
const { adminRouter } = await import("../../src/server/api/routers/admin");
const { orderRouter } = await import("../../src/server/api/routers/order");
const origin = process.env.BETTER_AUTH_URL;
const password = randomUUID() + randomUUID();
const userIds = [];
const productIds = [];
let cookie;
let user;
let cart;

async function authRequest(path, body, sessionCookie = cookie) {
  return auth.handler(
    new Request(`${origin}/api/auth/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

function caller(session) {
  return adminRouter.createCaller({
    db: prisma,
    session,
    headers: new Headers(),
  });
}

beforeAll(async () => {
  const response = await authRequest(
    "sign-up/email",
    {
      name: "Integration customer",
      email: `integration-${randomUUID()}@example.invalid`,
      password,
      role: "ADMIN",
    },
    "",
  );
  expect(response.status).toBe(200);
  const data = await response.json();
  user = data.user;
  userIds.push(user.id);
  cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  cart = await prisma.cart.create({ data: { userId: user.id } });
});

afterAll(async () => {
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.checkoutAttempt.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("authentication and current database permissions", () => {
  test("public signup ignores an injected administrator role and stores a hash", async () => {
    const record = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { accounts: true },
    });
    expect(record.role).toBe("CUSTOMER");
    expect(record.accounts[0].password).not.toBe(password);
    expect(record.accounts[0].password.length).toBeGreaterThan(50);
    expect(cookie).toContain("session_token");
  });

  test("role cannot be promoted through the public update endpoint", async () => {
    const response = await authRequest("update-user", {
      name: "Updated customer",
      role: "ADMIN",
    });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("FIELD_NOT_ALLOWED");
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role,
    ).toBe("CUSTOMER");
  });

  test("admin procedures reject guests and customers, and honor a revoked role", async () => {
    await expect(caller(null).currentUser()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const session = await auth.api.getSession({
      headers: new Headers({ Cookie: cookie }),
    });
    expect(session.user.id).toBe(user.id);
    await expect(caller(session).currentUser()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
    expect((await caller(session).currentUser()).id).toBe(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "CUSTOMER" },
    });
    await expect(caller(session).currentUser()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("password policy and logout are enforced by Better Auth", async () => {
    const short = await authRequest(
      "sign-up/email",
      {
        name: "Short password",
        email: `integration-${randomUUID()}@example.invalid`,
        password: "short",
      },
      "",
    );
    expect(short.status).toBe(400);
    expect((await authRequest("sign-out", {})).status).toBe(200);
    // Reusing the old cookie must not restore the deleted session.
    const response = await authRequest("get-session");
    expect(await response.json()).toBeNull();
  });
});

describe("database business constraints", () => {
  test("rejects invalid prices and active products without images", async () => {
    const id = randomUUID();
    productIds.push(id);
    const product = {
      id,
      name: "Test product",
      description: "Description",
      priceCents: 100,
    };
    await expect(
      Promise.resolve(
        prisma.product.create({ data: { ...product, priceCents: 0 } }),
      ),
    ).rejects.toThrow();
    await expect(
      Promise.resolve(
        prisma.product.create({ data: { ...product, active: true } }),
      ),
    ).rejects.toThrow();
    await prisma.product.create({ data: product });
  });

  test("rejects invalid quantities, duplicate cart lines and duplicate carts", async () => {
    const productId = productIds[0];
    for (const quantity of [0, -1, 100]) {
      await expect(
        Promise.resolve(
          prisma.cartItem.create({
            data: { cartId: cart.id, productId, quantity },
          }),
        ),
      ).rejects.toThrow();
    }
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity: 1 },
    });
    await expect(
      Promise.resolve(
        prisma.cartItem.create({
          data: { cartId: cart.id, productId, quantity: 1 },
        }),
      ),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      Promise.resolve(prisma.cart.create({ data: { userId: user.id } })),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  test("enforces one order per checkout and preserves purchase snapshots", async () => {
    const productId = productIds[0];
    const checkout = await prisma.checkoutAttempt.create({
      data: {
        userId: user.id,
        cartId: cart.id,
        cartVersion: cart.version,
        requestKey: randomUUID(),
        totalCents: 200,
        stripeSessionId: `cs_test_${randomUUID()}`,
        stripePaymentIntentId: `pi_${randomUUID()}`,
        status: "PAID",
        items: {
          create: {
            productId,
            productName: "Original name",
            unitPriceCents: 100,
            quantity: 2,
          },
        },
      },
    });
    const orderData = {
      userId: user.id,
      checkoutAttemptId: checkout.id,
      totalCents: 200,
      paidAt: new Date(),
    };
    const order = await prisma.order.create({
      data: {
        ...orderData,
        items: {
          create: {
            productId,
            productName: "Original name",
            unitPriceCents: 100,
            quantity: 2,
          },
        },
      },
    });
    await expect(
      Promise.resolve(prisma.order.create({ data: orderData })),
    ).rejects.toMatchObject({ code: "P2002" });
    await prisma.product.update({
      where: { id: productId },
      data: { name: "New name", priceCents: 500 },
    });
    const historical = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(historical.totalCents).toBe(200);
    expect(historical.items[0].productName).toBe("Original name");
    expect(historical.items[0].unitPriceCents).toBe(100);
    const orderCaller = (session) =>
      orderRouter.createCaller({ db: prisma, session, headers: new Headers() });
    const purchases = await orderCaller({ user: { id: user.id } }).list({
      page: 1,
    });
    expect(purchases.total).toBe(1);
    expect(purchases.items[0].items[0].productName).toBe("Original name");
    expect(
      (
        await orderCaller({ user: { id: randomUUID() } }).list({
          page: 1,
          userId: user.id,
        })
      ).items,
    ).toEqual([]);
    await expect(orderCaller(null).list({ page: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    await expect(
      Promise.resolve(prisma.product.delete({ where: { id: productId } })),
    ).rejects.toMatchObject({ code: "P2003" });
  });
});
