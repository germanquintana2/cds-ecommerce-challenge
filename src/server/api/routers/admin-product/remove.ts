import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { productIdSchema } from "~/server/validation/product";

// Preserve order/checkout references; removal is distinct from deactivation.
export const remove = adminProcedure
  .input(productIdSchema)
  .mutation(async ({ ctx, input }) => {
    const result = await ctx.db.product.updateMany({
      where: { id: input.id, deletedAt: null },
      data: { active: false, deletedAt: new Date() },
    });
    if (
      !result.count &&
      !(await ctx.db.product.findUnique({
        where: { id: input.id },
        select: { id: true },
      }))
    )
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Producto no encontrado.",
      });
    return { id: input.id };
  });
