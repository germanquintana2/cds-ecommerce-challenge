import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { productImageSchema } from "~/server/validation/product";
import {
  verifyProductImage,
  deleteProductImage,
  logStorageError,
} from "~/server/integrations/product-images";

export const attachImage = adminProcedure
  .input(productImageSchema)
  .mutation(async ({ ctx, input }) => {
    if (!(await verifyProductImage(input.id, input.imageKey))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La imagen no corresponde a este producto.",
      });
    }
    const product = await ctx.db.product.findUnique({
      where: { id: input.id, deletedAt: null },
    });
    if (!product)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No se encontró el producto.",
      });
    const result = await ctx.db.product.updateMany({
      where: { id: input.id, deletedAt: null, imageKey: product.imageKey },
      data: { imageKey: input.imageKey },
    });
    if (!result.count)
      throw new TRPCError({
        code: "CONFLICT",
        message: "La imagen cambió en otra ventana. Recargá el producto.",
      });
    if (product.imageKey && product.imageKey !== input.imageKey) {
      try {
        await deleteProductImage(product.imageKey);
      } catch (error) {
        logStorageError(error);
      }
    }
    return { id: input.id, imageKey: input.imageKey };
  });
