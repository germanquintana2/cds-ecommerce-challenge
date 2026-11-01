import { z } from "zod";
import { adminProcedure } from "~/server/api/trpc";
import { categoryIdSchema } from "~/server/validation/category";
export const searchProducts = adminProcedure
  .input(
    z.object({
      search: z.string().trim().min(1).max(120),
      excludeIds: z.array(categoryIdSchema).max(200).default([]),
    }),
  )
  .query(async ({ ctx, input }) => {
    const items = await ctx.db.product.findMany({
      where: {
        deletedAt: null,
        name: { contains: input.search, mode: "insensitive" },
        id: { notIn: input.excludeIds },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 21,
      select: {
        id: true,
        name: true,
        active: true,
        category: { select: { name: true } },
      },
    });
    return { items: items.slice(0, 20), hasMore: items.length > 20 };
  });
