import { TRPCError } from "@trpc/server";
import { adminProcedure } from "~/server/api/trpc";
import { categoryUpdateSchema } from "~/server/validation/category";
import { verifyCategoryImage } from "~/server/integrations/product-images";
export const update = adminProcedure
  .input(categoryUpdateSchema)
  .mutation(async ({ ctx, input }) => {
    const current = await ctx.db.category.findUnique({
      where: { id: input.id },
      select: { imageKey: true },
    });
    if (!current)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Categoría no encontrada.",
      });
    if (
      input.imageKey &&
      input.imageKey !== current.imageKey &&
      !(await verifyCategoryImage(input.id, input.imageKey))
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "La imagen no es válida para esta categoría.",
      });
    try {
      return await ctx.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM category WHERE id = ${input.id} FOR UPDATE`;
        const category = await tx.category.findUnique({
          where: { id: input.id },
          select: { updatedAt: true },
        });
        if (!category)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Categoría no encontrada.",
          });
        if (
          input.expectedUpdatedAt &&
          category.updatedAt.toISOString() !== input.expectedUpdatedAt
        )
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "La categoría cambió en otra ventana. Recargá la página antes de guardar.",
          });
        if (
          input.productIds &&
          (await tx.product.count({
            where: { id: { in: input.productIds }, deletedAt: null },
          })) !== input.productIds.length
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Uno de los productos seleccionados ya no existe. Revisá la selección.",
          });
        const saved = await tx.category.update({
          where: { id: input.id },
          data: {
            name: input.name,
            ...(input.imageKey !== undefined
              ? { imageKey: input.imageKey }
              : {}),
          },
          select: { id: true, name: true },
        });
        if (input.productIds !== undefined) {
          await tx.product.updateMany({
            where: { categoryId: input.id, id: { notIn: input.productIds } },
            data: { categoryId: null },
          });
          if (input.productIds.length) {
            const assigned = await tx.product.updateMany({
              where: { id: { in: input.productIds }, deletedAt: null },
              data: { categoryId: input.id },
            });
            if (assigned.count !== input.productIds.length)
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "La selección de productos cambió. Revisala antes de guardar.",
              });
          }
        }
        return saved;
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
