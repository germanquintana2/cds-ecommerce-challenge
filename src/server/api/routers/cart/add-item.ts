import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "~/server/api/trpc";
import { cartAddSchema, MAX_CART_ITEMS } from "~/server/validation/cart";

export const addItem = protectedProcedure
  .input(cartAddSchema)
  .mutation(({ ctx, input }) => {
    return ctx.db.$transaction(async (tx) => {
      // The upsert increments the version and locks this user's cart until commit.
      const cart = await tx.cart.upsert({
        where: { userId: ctx.session.user.id },
        create: { userId: ctx.session.user.id, version: 1 },
        update: { version: { increment: 1 } },
      });
      const [product, existing] = await Promise.all([
        tx.product.findFirst({
          where: { id: input.productId, active: true, deletedAt: null },
          select: { id: true },
        }),
        tx.cartItem.findUnique({
          where: {
            cartId_productId: { cartId: cart.id, productId: input.productId },
          },
        }),
      ]);
      if (!product)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Este producto ya no está disponible.",
        });
      const quantity = (existing?.quantity ?? 0) + input.quantity;
      if (quantity > 99)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Podés agregar hasta 99 unidades de cada producto.",
        });
      if (
        !existing &&
        (await tx.cartItem.count({ where: { cartId: cart.id } })) >=
          MAX_CART_ITEMS
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El carrito admite hasta 100 productos diferentes.",
        });
      }
      await tx.cartItem.upsert({
        where: {
          cartId_productId: { cartId: cart.id, productId: input.productId },
        },
        create: { cartId: cart.id, productId: input.productId, quantity },
        update: { quantity },
      });
      return { version: cart.version };
    });
  });
