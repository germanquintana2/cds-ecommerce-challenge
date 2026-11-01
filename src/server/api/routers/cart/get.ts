import { protectedProcedure } from "~/server/api/trpc";
import { cartSummary } from "~/server/cart-summary";
import { safeProductImageUrl } from "~/server/integrations/product-images";

export const get = protectedProcedure.query(async ({ ctx }) => {
  const cart = await ctx.db.$transaction(
    (tx) =>
      tx.cart.findUnique({
        where: { userId: ctx.session.user.id },
        include: {
          items: { include: { product: true }, orderBy: { productId: "asc" } },
        },
      }),
    { isolationLevel: "RepeatableRead" },
  );
  if (!cart) return cartSummary(null, 0, []);
  const items = await Promise.all(
    cart.items.map(async ({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity,
      lineTotalCents: product.priceCents * quantity,
      available: product.active && !product.deletedAt,
      imageUrl: await safeProductImageUrl(product.imageKey),
    })),
  );
  return cartSummary(cart.id, cart.version, items);
});
