import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { safeProductImageUrl } from "~/server/integrations/product-images";

export const list = publicProcedure
  .input(
    z
      .object({ page: z.number().int().min(1).max(100000).default(1) })
      .default({ page: 1 }),
  )
  .query(async ({ ctx, input }) => {
    const [categories, total] = await Promise.all([
      ctx.db.category.findMany({
        take: 20,
        skip: (input.page - 1) * 20,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          imageKey: true,
          _count: {
            select: { products: { where: { active: true, deletedAt: null } } },
          },
          products: {
            where: { active: true, deletedAt: null, imageKey: { not: null } },
            select: { imageKey: true },
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            take: 1,
          },
        },
      }),
      ctx.db.category.count(),
    ]);
    const items = await Promise.all(
      categories.map(async (category) => ({
        id: category.id,
        name: category.name,
        productCount: category._count.products,
        imageUrl: await safeProductImageUrl(
          category.imageKey ?? category.products[0]?.imageKey ?? null,
        ),
      })),
    );
    return {
      items,
      total,
      page: input.page,
      pages: Math.max(1, Math.ceil(total / 20)),
    };
  });
