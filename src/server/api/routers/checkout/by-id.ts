import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

export const byId = protectedProcedure
  .input(z.object({ id: z.string().min(1).max(128) }))
  .query(async ({ ctx, input }) => {
    const attempt = await ctx.db.checkoutAttempt.findFirst({
      where: { id: input.id, userId: ctx.session.user.id },
      select: {
        id: true,
        status: true,
        totalCents: true,
        currency: true,
        order: { select: { id: true } },
      },
    });
    if (!attempt)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Intento de compra no encontrado.",
      });
    return attempt;
  });
