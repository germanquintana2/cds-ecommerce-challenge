import { publicProcedure } from "~/server/api/trpc";
export const navigation = publicProcedure.query(({ ctx }) =>
  ctx.db.category.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  }),
);
