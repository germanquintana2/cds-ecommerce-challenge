import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { productUpdateSchema } from "~/server/validation/product";

export const update = adminProcedure
  .input(productUpdateSchema)
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    if (
      !(await ctx.db.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      }))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Seleccioná una categoría válida.",
      });
    // The SQL CHECK also protects against concurrent removal of the image.
    const result = await ctx.db.product.updateMany({
      where: {
        id,
        deletedAt: null,
        ...(input.active ? { imageKey: { not: null } } : {}),
      },
      data,
    });
    if (result.count === 0) {
      const exists = await ctx.db.product.findUnique({
        where: { id, deletedAt: null },
        select: { id: true },
      });
      throw new TRPCError({
        code: exists ? "BAD_REQUEST" : "NOT_FOUND",
        message: exists
          ? "Subí una imagen antes de activar el producto."
          : "No se encontró el producto.",
      });
    }
    return { id };
  });
