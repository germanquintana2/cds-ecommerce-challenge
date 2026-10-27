import { protectedProcedure } from "~/server/api/trpc";

export const countByAuthor = protectedProcedure.query(({ ctx }) => {
  return ctx.db.toDoItem.count({
    where: { createdBy: ctx.session.user.id },
  });
});
