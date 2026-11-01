import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { safeProductImageUrl } from "~/server/integrations/product-images";

const PAGE_SIZE = 20;

export const list = publicProcedure
  .input(
    z.object({
      categoryId: z.string().min(1).max(80).optional(),
      search: z.string().trim().max(120).default(""),
      page: z.number().int().min(1).max(100000).default(1),
    }),
  )
  .query(async ({ ctx, input }) => {
    const baseWhere = {
      active: true,
      deletedAt: null,
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    };
    const where = {
      ...baseWhere,
      ...(input.search
        ? { name: { contains: input.search, mode: "insensitive" as const } }
        : {}),
    };
    const prefixWhere = {
      ...baseWhere,
      name: { startsWith: input.search, mode: "insensitive" as const },
    };
    const [total, prefixCount] = await Promise.all([
      ctx.db.product.count({ where }),
      input.search
        ? ctx.db.product.count({ where: prefixWhere })
        : Promise.resolve(0),
    ]);
    const skip = (input.page - 1) * PAGE_SIZE;
    const select = {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      imageKey: true,
    } as const;
    const orderBy = [{ createdAt: "desc" as const }, { id: "desc" as const }];
    const prefixTake = input.search
      ? Math.min(PAGE_SIZE, Math.max(0, prefixCount - skip))
      : 0;
    const [primary, secondary] = await Promise.all([
      prefixTake
        ? ctx.db.product.findMany({
            where: prefixWhere,
            select,
            orderBy,
            take: prefixTake,
            skip,
          })
        : Promise.resolve([]),
      prefixTake < PAGE_SIZE
        ? ctx.db.product.findMany({
            where: {
              ...where,
              ...(input.search
                ? {
                    NOT: {
                      name: {
                        startsWith: input.search,
                        mode: "insensitive" as const,
                      },
                    },
                  }
                : {}),
            },
            select,
            orderBy,
            take: PAGE_SIZE - prefixTake,
            skip: input.search ? Math.max(0, skip - prefixCount) : skip,
          })
        : Promise.resolve([]),
    ]);
    const products = [...primary, ...secondary];
    const items = await Promise.all(
      products.map(async ({ imageKey, ...product }) => ({
        ...product,
        imageUrl: await safeProductImageUrl(imageKey),
      })),
    );
    return {
      items,
      total,
      page: input.page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  });
