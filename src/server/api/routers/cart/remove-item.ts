import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "~/server/api/trpc";
import { cartRemoveSchema } from "~/server/validation/cart";

export const removeItem = protectedProcedure
  .input(cartRemoveSchema)
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
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id, productId: input.productId },
      });
      return { version: cart.version };
    });
  });
