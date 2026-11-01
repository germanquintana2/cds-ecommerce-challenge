import { TRPCError } from "@trpc/server";
import { publicProcedure } from "~/server/api/trpc";
import { productIdSchema } from "~/server/validation/product";
import { safeProductImageUrl } from "~/server/integrations/product-images";

export const byId = publicProcedure
  .input(productIdSchema)
  .query(async ({ ctx, input }) => {
    const product = await ctx.db.product.findFirst({
      where: { id: input.id, active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        category: { select: { id: true, name: true } },
        description: true,
        priceCents: true,
        imageKey: true,
      },
    });
    if (!product)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Este producto no está disponible.",
      });
    const { imageKey, ...details } = product;
    return { ...details, imageUrl: await safeProductImageUrl(imageKey) };
  });
