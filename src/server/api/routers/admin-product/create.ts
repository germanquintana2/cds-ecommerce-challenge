import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { productFieldsSchema } from "~/server/validation/product";

export const create = adminProcedure
  .input(productFieldsSchema)
  .mutation(async ({ ctx, input }) => {
    if (
      !(await ctx.db.category.findUnique({
        where: { id: input.categoryId },
        select: { id: true },
      }))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Seleccioná una categoría válida.",
      });
    return ctx.db.product.create({ data: { ...input, active: false } });
  });
