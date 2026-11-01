import { protectedProcedure } from "~/server/api/trpc";

export const count = protectedProcedure.query(async ({ ctx }) => {
  const result = await ctx.db.cartItem.aggregate({
    where: { cart: { userId: ctx.session.user.id } },
    _sum: { quantity: true },
  });
  return { quantity: result._sum.quantity ?? 0 };
});
