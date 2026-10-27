import { protectedProcedure } from "~/server/api/trpc";

export const deleteAllByAuthor = protectedProcedure.mutation(({ ctx }) => {
  return ctx.db.toDoItem.deleteMany({
    where: { createdBy: ctx.session.user.id },
  });
});
