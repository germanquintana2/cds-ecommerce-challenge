import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { categoryIdSchema } from "~/server/validation/category";
export const byId = publicProcedure
  .input(z.object({ id: categoryIdSchema }))
  .query(async ({ ctx, input }) => {
    const category = await ctx.db.category.findUnique({
      where: { id: input.id },
      select: { id: true, name: true },
    });
    if (!category)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Categoría no encontrada.",
      });
    return category;
  });
