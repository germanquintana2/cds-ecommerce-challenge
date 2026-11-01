import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { productIdSchema } from "~/server/validation/product";
import {
  productImageUrl,
  logStorageError,
} from "~/server/integrations/product-images";

export const byId = adminProcedure
  .input(productIdSchema)
  .query(async ({ ctx, input }) => {
    const product = await ctx.db.product.findUnique({
      where: { id: input.id, deletedAt: null },
    });
    if (!product)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No se encontró el producto.",
      });
    let imageUrl = null;
    try {
      imageUrl = await productImageUrl(product.imageKey);
    } catch (error) {
      logStorageError(error);
    }
    return { ...product, imageUrl };
  });
