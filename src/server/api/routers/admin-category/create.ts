import { verifyCategoryImage } from "~/server/integrations/product-images";
import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { categoryCreateSchema } from "~/server/validation/category";
export const create = adminProcedure
  .input(categoryCreateSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      if (
        input.imageKey &&
        (!input.id || !(await verifyCategoryImage(input.id, input.imageKey)))
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La imagen no es válida para esta categoría.",
        });
      return await ctx.db.$transaction(async (tx) => {
        if (input.productIds.length) {
          const count = await tx.product.count({
            where: { id: { in: input.productIds }, deletedAt: null },
          });
          if (count !== input.productIds.length)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Uno de los productos seleccionados ya no existe. Revisá la selección.",
            });
        }
        const category = await tx.category.create({
          data: {
            name: input.name,
            ...(input.id ? { id: input.id } : {}),
            imageKey: input.imageKey ?? null,
          },
          select: { id: true, name: true },
        });
        if (input.productIds.length) {
          const assigned = await tx.product.updateMany({
            where: { id: { in: input.productIds }, deletedAt: null },
            data: { categoryId: category.id },
          });
          if (assigned.count !== input.productIds.length)
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "La selección de productos cambió. Revisala antes de guardar.",
            });
        }
        return category;
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      )
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe una categoría con ese nombre.",
        });
      throw error;
    }
  });
