import { adminProcedure } from "~/server/api/trpc";
export const list = adminProcedure.query(({ ctx }) =>
  ctx.db.category.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  }),
);
