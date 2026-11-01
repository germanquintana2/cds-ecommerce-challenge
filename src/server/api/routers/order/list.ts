import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";

export const list = protectedProcedure
  .input(z.object({ page: z.number().int().min(1).max(100000).default(1) }))
  .query(async ({ ctx, input }) => {
    const where = { userId: ctx.session.user.id };
    const [items, total] = await ctx.db.$transaction([
      ctx.db.order.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (input.page - 1) * 20,
        take: 20,
        select: {
          id: true,
          paidAt: true,
          totalCents: true,
          currency: true,
          items: {
            select: {
              id: true,
              productName: true,
              unitPriceCents: true,
              quantity: true,
            },
            orderBy: { id: "asc" },
          },
        },
      }),
      ctx.db.order.count({ where }),
    ]);
    return { items, total, pages: Math.max(1, Math.ceil(total / 20)) };
  });
