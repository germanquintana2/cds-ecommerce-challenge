import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";

export const create = protectedProcedure
  .input(
    z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    }),
  )
  .mutation(({ ctx, input }) => {
    return ctx.db.toDoItem.create({
      data: {
        title: input.title,
        description: input.description,
        createdBy: ctx.session.user.id,
      },
    });
  });
