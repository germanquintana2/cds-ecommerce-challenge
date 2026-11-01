import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { productIdSchema } from "~/server/validation/product";

export const setActive = adminProcedure
  .input(productIdSchema.extend({ active: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const result = await ctx.db.product.updateMany({
      where: {
        id: input.id,
        deletedAt: null,
        ...(input.active ? { imageKey: { not: null } } : {}),
      },
      data: { active: input.active },
    });
    if (!result.count)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El producto no existe o necesita una imagen para activarse.",
      });
    return { id: input.id, active: input.active };
  });
