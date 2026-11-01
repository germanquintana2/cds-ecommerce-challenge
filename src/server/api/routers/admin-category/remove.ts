import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure } from "~/server/api/trpc";
import { categoryIdSchema } from "~/server/validation/category";
export const remove = adminProcedure
  .input(z.object({ id: categoryIdSchema }))
  .mutation(({ ctx, input }) =>
    ctx.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM category WHERE id = ${input.id} FOR UPDATE`;
      if (
        !(await tx.category.findUnique({
          where: { id: input.id },
          select: { id: true },
        }))
      )
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Categoría no encontrada.",
        });
      await tx.product.updateMany({
        where: { categoryId: input.id },
        data: { categoryId: null },
      });
      await tx.category.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
  );
