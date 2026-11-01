import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "~/server/api/trpc";
import { cartSetQuantitySchema } from "~/server/validation/cart";

export const setQuantity = protectedProcedure
  .input(cartSetQuantitySchema)
  .mutation(({ ctx, input }) => {
    return ctx.db.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId: ctx.session.user.id },
        create: { userId: ctx.session.user.id, version: 1 },
        update: { version: { increment: 1 } },
      });
      if (cart.version - 1 !== input.expectedVersion) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "El carrito cambió en otra ventana. Se actualizará para que puedas reintentar.",
        });
      }
      const product = await tx.product.findFirst({
        where: { id: input.productId, active: true, deletedAt: null },
        select: { id: true },
      });
      if (!product)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Este producto ya no está disponible. Podés quitarlo del carrito.",
        });
      const result = await tx.cartItem.updateMany({
        where: { cartId: cart.id, productId: input.productId },
        data: { quantity: input.quantity },
      });
      if (!result.count)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "El producto ya no está en tu carrito.",
        });
      return { version: cart.version };
    });
  });
