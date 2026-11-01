import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";

export const suggestions = publicProcedure
  .input(z.object({ search: z.string().trim().min(1).max(120) }))
  .query(async ({ ctx, input }) => {
    const findMatches = (match: "startsWith" | "contains", take: number) =>
      ctx.db.product.findMany({
        where: {
          active: true,
          deletedAt: null,
          name: { [match]: input.search, mode: "insensitive" },
          ...(match === "contains"
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
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take,
        select: {
          id: true,
          name: true,
          priceCents: true,
          category: { select: { name: true } },
        },
      });

    const primaryMatches = await findMatches("startsWith", 4);
    const secondaryMatches =
      primaryMatches.length < 4
        ? await findMatches("contains", 4 - primaryMatches.length)
        : [];
    return [...primaryMatches, ...secondaryMatches];
  });
