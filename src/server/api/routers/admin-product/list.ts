import { z } from "zod";
import { adminProcedure } from "~/server/api/trpc";
import {
  productImageUrl,
  logStorageError,
} from "~/server/integrations/product-images";

export const list = adminProcedure
  .input(
    z.object({
      page: z.number().int().min(1).max(100000).default(1),
      search: z.string().trim().max(120).default(""),
    }),
  )
  .query(async ({ ctx, input }) => {
    const where = {
      deletedAt: null,
      ...(input.search
        ? { name: { contains: input.search, mode: "insensitive" as const } }
        : {}),
    };
    const [products, total] = await Promise.all([
      ctx.db.product.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20,
        skip: (input.page - 1) * 20,
      }),
      ctx.db.product.count({ where }),
    ]);
    const items = await Promise.all(
      products.map(async (product) => {
        let imageUrl = null;
        try {
          imageUrl = await productImageUrl(product.imageKey);
        } catch (error) {
          logStorageError(error);
        }
        return { ...product, imageUrl };
      }),
    );
    return {
      items,
      total,
      page: input.page,
      pages: Math.max(1, Math.ceil(total / 20)),
    };
  });
