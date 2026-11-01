import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
export const byId = protectedProcedure
  .input(z.object({ id: z.string().min(1).max(128) }))
  .query(async ({ ctx, input }) => {
    const order = await ctx.db.order.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
      select: {
        id: true,
        paidAt: true,
        totalCents: true,
        currency: true,
        items: {
          select: {
            id: true,
            productName: true,
            unitPriceCents: true,
            quantity: true,
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!order)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Compra no encontrada.",
      });
    return order;
  });
