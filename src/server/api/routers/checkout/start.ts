import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { cartSummary } from "~/server/cart-summary";
import { getStripe } from "~/server/integrations/stripe";

export const start = protectedProcedure
  .input(
    z.object({
      expectedVersion: z.number().int().min(0),
      quoteHash: z.string().regex(/^[a-f0-9]{64}$/),
      requestKey: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const stripe = getStripe();
    const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
    const attempt = await ctx.db.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId: ctx.session.user.id },
      });
      if (!cart)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El carrito está vacío.",
        });
      // All cart writes and checkout snapshots serialize on this same row.
      await tx.$queryRaw`SELECT id FROM cart WHERE id = ${cart.id} FOR UPDATE`;
      const existing = await tx.checkoutAttempt.findUnique({
        where: {
          userId_requestKey: {
            userId: ctx.session.user.id,
            requestKey: input.requestKey,
          },
        },
        include: { items: true },
      });
      if (existing) {
        const quote = cartSummary(
          existing.cartId,
          existing.cartVersion,
          existing.items.map((item) => ({
            productId: item.productId,
            name: item.productName,
            priceCents: item.unitPriceCents,
            quantity: item.quantity,
            lineTotalCents: item.unitPriceCents * item.quantity,
            available: true,
            imageUrl: null,
          })),
        );
        if (
          existing.cartVersion !== input.expectedVersion ||
          quote.quoteHash !== input.quoteHash
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "La referencia de compra ya corresponde a otro resumen.",
          });
        return existing;
      }
      const current = await tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: {
          items: { include: { product: true }, orderBy: { productId: "asc" } },
        },
      });
      const quote = cartSummary(
        current.id,
        current.version,
        current.items.map(({ product, quantity }) => ({
          productId: product.id,
          name: product.name,
          priceCents: product.priceCents,
          quantity,
          lineTotalCents: product.priceCents * quantity,
          available: product.active && !product.deletedAt,
          imageUrl: null,
        })),
      );
      if (
        quote.version !== input.expectedVersion ||
        quote.quoteHash !== input.quoteHash
      )
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "El carrito o sus precios cambiaron. Revisá el resumen actualizado antes de pagar.",
        });
      if (!quote.canCheckout)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El carrito no está disponible para pagar.",
        });
      if (quote.totalCents < 50)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El total mínimo para pagar con Stripe es USD 0,50. Agregá más unidades o productos.",
        });
      return tx.checkoutAttempt.create({
        data: {
          userId: ctx.session.user.id,
          cartId: current.id,
          cartVersion: current.version,
          requestKey: input.requestKey,
          currency: "USD",
          totalCents: quote.totalCents,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              productName: item.name,
              unitPriceCents: item.priceCents,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      });
    });
    const resultUrl = `${origin}/checkout/result?attempt=${encodeURIComponent(attempt.id)}`;
    if (attempt.status === "PAID") return { url: resultUrl };
    if (attempt.status !== "PENDING")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Este intento terminó. Volvé a abrir el carrito para iniciar otro pago.",
      });
    // Never repeat an uncertain creation after Stripe's idempotency retention.
    if (
      !attempt.stripeSessionId &&
      Date.now() - attempt.createdAt.getTime() > 23 * 60 * 60 * 1000
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Este intento requiere revisar su estado antes de reintentarlo. Contactá al administrador.",
      });
    try {
      const session = attempt.stripeSessionId
        ? await stripe.checkout.sessions.retrieve(attempt.stripeSessionId)
        : await stripe.checkout.sessions.create(
            {
              mode: "payment",
              allowed_payment_method_types: ["card"],
              locale: "es",
              client_reference_id: attempt.id,
              metadata: { attemptId: attempt.id },
              success_url: resultUrl,
              cancel_url: `${origin}/`,
              adaptive_pricing: { enabled: false },
              line_items: attempt.items.map((item) => ({
                quantity: item.quantity,
                price_data: {
                  currency: "usd",
                  unit_amount: item.unitPriceCents,
                  product_data: { name: item.productName },
                },
              })),
            },
            { idempotencyKey: `checkout-${attempt.id}` },
          );
      if (session.livemode) throw new Error("Unexpected live session");
      // A fast webhook may have set PAID already; do not overwrite its status.
      await ctx.db.checkoutAttempt.update({
        where: { id: attempt.id },
        data: {
          stripeSessionId: session.id,
          expiresAt: new Date(session.expires_at * 1000),
        },
      });
      if (session.status === "expired") {
        await ctx.db.checkoutAttempt.updateMany({
          where: { id: attempt.id, status: "PENDING" },
          data: { status: "EXPIRED" },
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El pago venció. Volvé a abrir el carrito para iniciar otro.",
        });
      }
      if (session.status === "complete") return { url: resultUrl };
      if (
        !session.url ||
        new URL(session.url).hostname !== "checkout.stripe.com"
      )
        throw new Error("Missing checkout URL");
      return { url: session.url };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      // Keep PENDING and the request key: a timeout does not prove creation failed.
      console.error(
        "Stripe checkout creation failed",
        error instanceof Error ? error.name : "UnknownError",
      );
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message:
          "No pudimos abrir el pago. Reintentá con el mismo botón; no se duplicará este intento.",
      });
    }
  });
