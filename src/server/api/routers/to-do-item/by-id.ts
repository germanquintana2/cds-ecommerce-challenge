import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "~/server/api/trpc";

export const byId = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const item = await ctx.db.toDoItem.findFirst({
      where: { id: input.id, createdBy: ctx.session.user.id },
    });

    if (!item) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    return item;
  });
