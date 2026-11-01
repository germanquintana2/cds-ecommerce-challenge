import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith("_test"))
  throw new Error("TEST_DATABASE_URL must end in _test");
process.env.DATABASE_URL = testUrl;
const migration = Bun.spawnSync(["bun", "run", "db:deploy"], {
  env: { ...process.env, DATABASE_URL: testUrl },
});
if (migration.exitCode) throw new Error("Test migration failed");
mock.module("server-only", () => ({}));
const sessions = new Map();
let creations = 0;
let uncertain = false;
const webhookSdk = new Stripe("sk_test_local_signature_test");
const fakeStripe = {
  webhooks: webhookSdk.webhooks,
  checkout: {
    sessions: {
      create: async (params, options) => {
        if (!sessions.has(options.idempotencyKey)) {
          creations++;
          sessions.set(options.idempotencyKey, {
            id: `cs_test_${randomUUID()}`,
            livemode: false,
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            amount_total: params.line_items.reduce(
              (sum, line) => sum + line.quantity * line.price_data.unit_amount,
              0,
            ),
            cancel_url: params.cancel_url,
            currency: "usd",
            metadata: params.metadata,
            client_reference_id: params.client_reference_id,
            expires_at: Math.floor(Date.now() / 1000) + 86400,
            url: "https://checkout.stripe.com/c/pay/test",
          });
        }
        if (uncertain) {
          uncertain = false;
          throw new Error("Simulated lost response");
        }
        return sessions.get(options.idempotencyKey);
      },
      retrieve: async (id) =>
        [...sessions.values()].find((session) => session.id === id),
    },
  },
};
mock.module("../../src/server/integrations/stripe", () => ({
  getStripe: () => fakeStripe,
}));
const { prisma } = await import("../../src/lib/prisma");
const { checkoutRouter } =
  await import("../../src/server/api/routers/checkout");
const { orderRouter } = await import("../../src/server/api/routers/order");
const { confirmSession } =
  await import("../../src/server/payments/confirm-session");
const { cartSummary } = await import("../../src/server/cart-summary");
const users = [randomUUID(), randomUUID()];
const products = [];
const context = (id) => ({
  db: prisma,
  session: id ? { user: { id } } : null,
  headers: new Headers(),
});
const caller = (id) => checkoutRouter.createCaller(context(id));

beforeAll(async () => {
  for (const id of users)
    await prisma.user.create({
      data: {
        id,
        email: `checkout-${id}@example.invalid`,
        name: "Checkout test",
      },
    });
});
afterAll(async () => {
  await prisma.order.deleteMany({ where: { userId: { in: users } } });
  await prisma.checkoutAttempt.deleteMany({ where: { userId: { in: users } } });
  await prisma.cart.deleteMany({ where: { userId: { in: users } } });
  await prisma.product.deleteMany({ where: { id: { in: products } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.$disconnect();
});
async function fixture() {
  const productId = randomUUID();
  products.push(productId);
  await prisma.product.create({
    data: {
      id: productId,
      name: "Historical name",
      description: "Test",
      priceCents: 1250,
      active: true,
      imageKey: `products/${productId}/test.webp`,
    },
  });
  const cart = await prisma.cart.upsert({
    where: { userId: users[0] },
    create: { userId: users[0] },
    update: { version: { increment: 1 } },
  });
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity: 2 },
  });
  const quote = cartSummary(cart.id, cart.version, [
    {
      productId,
      name: "Historical name",
      priceCents: 1250,
      quantity: 2,
      lineTotalCents: 2500,
      available: true,
      imageUrl: null,
    },
  ]);
  return {
    productId,
    cart,
    input: {
      expectedVersion: cart.version,
      quoteHash: quote.quoteHash,
      requestKey: randomUUID(),
    },
  };
}
async function paidSession(input) {
  const attempt = await prisma.checkoutAttempt.findUniqueOrThrow({
    where: {
      userId_requestKey: { userId: users[0], requestKey: input.requestKey },
    },
  });
  return {
    ...sessions.get(`checkout-${attempt.id}`),
    status: "complete",
    payment_status: "paid",
    payment_intent: `pi_${randomUUID()}`,
  };
}

describe("checkout and payment integrity", () => {
  test("webhook validates the original body and rejects missing, invalid and old signatures", async () => {
    const { POST } = await import("../../src/app/api/webhooks/stripe/route");
    const previous = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_signature_only";
    try {
      const body = JSON.stringify({
        id: "evt_test",
        object: "event",
        type: "unrelated.event",
        livemode: false,
        data: { object: {} },
      });
      const signature = await webhookSdk.webhooks.generateTestHeaderStringAsync(
        {
          payload: body,
          secret: process.env.STRIPE_WEBHOOK_SECRET,
        },
      );
      const req = (payload, sig) =>
        new Request("http://localhost/api/webhooks/stripe", {
          method: "POST",
          body: payload,
          headers: sig ? { "stripe-signature": sig } : {},
        });
      expect((await POST(req(body))).status).toBe(400);
      expect((await POST(req(body, "invalid"))).status).toBe(400);
      expect((await POST(req(body + " ", signature))).status).toBe(400);
      const old = await webhookSdk.webhooks.generateTestHeaderStringAsync({
        payload: body,
        secret: process.env.STRIPE_WEBHOOK_SECRET,
        timestamp: 1,
      });
      expect((await POST(req(body, old))).status).toBe(400);
      expect((await POST(req(body, signature))).status).toBe(200);
    } finally {
      if (previous) process.env.STRIPE_WEBHOOK_SECRET = previous;
      else delete process.env.STRIPE_WEBHOOK_SECRET;
    }
  });
  test("guest denied, stale prices rejected, and client totals cannot change the charge", async () => {
    const { productId, input } = await fixture();
    await expect(caller(null).start(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await prisma.product.update({
      where: { id: productId },
      data: { priceCents: 1500 },
    });
    await expect(caller(users[0]).start(input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await prisma.product.update({
      where: { id: productId },
      data: { priceCents: 1250 },
    });
    await caller(users[0]).start({ ...input, totalCents: 1, userId: users[1] });
    const session = await paidSession(input);
    expect(session.amount_total).toBe(2500);
    expect(session.cancel_url).toBe(
      new URL(process.env.BETTER_AUTH_URL).origin + "/",
    );
    const attempt = await caller(users[0]).byId({
      id: session.metadata.attemptId,
    });
    expect(attempt.totalCents).toBe(2500);
    await expect(
      caller(users[1]).byId({ id: attempt.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  test("lost creation response and concurrent retries create one Stripe session", async () => {
    const { input } = await fixture();
    const before = creations;
    uncertain = true;
    await expect(caller(users[0]).start(input)).rejects.toMatchObject({
      code: "BAD_GATEWAY",
    });
    await Promise.all([
      caller(users[0]).start(input),
      caller(users[0]).start(input),
    ]);
    expect(creations - before).toBe(1);
    expect(
      await prisma.checkoutAttempt.count({
        where: { userId: users[0], requestKey: input.requestKey },
      }),
    ).toBe(1);
  });
  test("duplicate concurrent paid events create one historical order and clear once", async () => {
    const { input, productId, cart } = await fixture();
    await caller(users[0]).start(input);
    const session = await paidSession(input);
    await prisma.product.update({
      where: { id: productId },
      data: { name: "Edited name", priceCents: 9999, active: false },
    });
    const results = await Promise.all([
      confirmSession(session),
      confirmSession(session),
    ]);
    expect(results[0].id).toBe(results[1].id);
    const order = await orderRouter
      .createCaller(context(users[0]))
      .byId({ id: results[0].id });
    expect(order.items[0].productName).toBe("Historical name");
    expect(order.totalCents).toBe(2500);
    expect(await prisma.cartItem.count({ where: { cartId: cart.id } })).toBe(0);
    expect(
      (await prisma.cart.findUniqueOrThrow({ where: { id: cart.id } })).version,
    ).toBe(cart.version + 1);
    await expect(
      orderRouter.createCaller(context(users[1])).byId({ id: order.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await confirmSession({
      ...session,
      status: "expired",
      payment_status: "unpaid",
    });
    expect(
      (await caller(users[0]).byId({ id: session.metadata.attemptId })).status,
    ).toBe("PAID");
  });
  test("changes during payment survive confirmation and duplicate deliveries", async () => {
    const { input, cart, productId } = await fixture();
    await caller(users[0]).start(input);
    const session = await paidSession(input);
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        version: { increment: 1 },
        items: { updateMany: { where: { productId }, data: { quantity: 3 } } },
      },
    });
    await confirmSession(session);
    await confirmSession(session);
    expect(
      (await prisma.cartItem.findFirstOrThrow({ where: { cartId: cart.id } }))
        .quantity,
    ).toBe(3);
  });
  test("mismatched amounts, currency, reference, session and live events cannot create orders", async () => {
    const { input } = await fixture();
    await caller(users[0]).start(input);
    const session = await paidSession(input);
    for (const changed of [
      { amount_total: 1 },
      { currency: "eur" },
      { client_reference_id: "other" },
      { id: "cs_test_other" },
      { livemode: true },
    ])
      await expect(
        confirmSession({ ...session, ...changed }),
      ).rejects.toThrow();
    expect(
      await prisma.order.count({
        where: { checkoutAttemptId: session.metadata.attemptId },
      }),
    ).toBe(0);
    await confirmSession({
      ...session,
      status: "expired",
      payment_status: "unpaid",
    });
    expect(
      (await caller(users[0]).byId({ id: session.metadata.attemptId })).status,
    ).toBe("EXPIRED");
  });
});
