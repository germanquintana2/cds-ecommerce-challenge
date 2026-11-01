import "server-only";
import type Stripe from "stripe";
import { prisma } from "~/lib/prisma";

export class PaymentMismatchError extends Error {}

// Only the verified webhook calls this service with a session retrieved from Stripe.
export async function confirmSession(session: Stripe.Checkout.Session) {
  const attemptId = session.metadata?.attemptId;
  if (!attemptId) return; // Unrelated Checkout session from the same sandbox.
  if (
    session.livemode ||
    session.mode !== "payment" ||
    session.client_reference_id !== attemptId
  )
    throw new PaymentMismatchError("Invalid payment reference");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM checkout_attempt WHERE id = ${attemptId} FOR UPDATE`;
    const attempt = await tx.checkoutAttempt.findUnique({
      where: { id: attemptId },
      include: { items: true, order: true },
    });
    if (!attempt) throw new PaymentMismatchError("Unknown attempt");
    if (
      (attempt.stripeSessionId && attempt.stripeSessionId !== session.id) ||
      session.amount_total !== attempt.totalCents ||
      session.currency?.toUpperCase() !== attempt.currency
    )
      throw new PaymentMismatchError("Payment does not match snapshot");
    if (attempt.order) return attempt.order;
    if (session.status === "expired") {
      await tx.checkoutAttempt.updateMany({
        where: { id: attempt.id, status: "PENDING" },
        data: { status: "EXPIRED", stripeSessionId: session.id },
      });
      return;
    }
    if (session.status !== "complete" || session.payment_status !== "paid")
      return;
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!paymentIntent)
      throw new PaymentMismatchError("Missing payment intent");
    const order = await tx.order.create({
      data: {
        userId: attempt.userId,
        checkoutAttemptId: attempt.id,
        totalCents: attempt.totalCents,
        currency: attempt.currency,
        paidAt: new Date(),
        items: {
          create: attempt.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
          })),
        },
      },
    });
    await tx.checkoutAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "PAID",
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntent,
      },
    });
    const unchanged = await tx.cart.updateMany({
      where: { id: attempt.cartId, version: attempt.cartVersion },
      data: { version: { increment: 1 } },
    });
    if (unchanged.count)
      await tx.cartItem.deleteMany({ where: { cartId: attempt.cartId } });
    return order;
  });
}
