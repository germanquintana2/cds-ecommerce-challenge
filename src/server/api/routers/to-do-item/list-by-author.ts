import { protectedProcedure } from "~/server/api/trpc";

export const listByAuthor = protectedProcedure.query(({ ctx }) => {
  return ctx.db.toDoItem.findMany({
    where: { createdBy: ctx.session.user.id },
    orderBy: { createdAt: "asc" },
  });
});
