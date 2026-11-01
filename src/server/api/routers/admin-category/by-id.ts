import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure } from "~/server/api/trpc";
import { categoryIdSchema } from "~/server/validation/category";
import { safeProductImageUrl } from "~/server/integrations/product-images";
export const byId = adminProcedure
  .input(z.object({ id: categoryIdSchema }))
  .query(async ({ ctx, input }) => {
    const category = await ctx.db.category.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        name: true,
        imageKey: true,
        updatedAt: true,
        products: {
          where: { deletedAt: null },
          orderBy: [{ name: "asc" }, { id: "asc" }],
          select: { id: true, name: true, active: true },
        },
      },
    });
    if (!category)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Categoría no encontrada.",
      });
    return {
      ...category,
      updatedAt: category.updatedAt.toISOString(),
      imageUrl: await safeProductImageUrl(category.imageKey),
      products: category.products.map((product) => ({
        ...product,
        category: { name: category.name },
      })),
    };
  });
