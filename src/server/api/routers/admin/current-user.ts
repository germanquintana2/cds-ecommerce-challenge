import { adminProcedure } from "~/server/api/trpc";

export const currentUser = adminProcedure.query(({ ctx }) => ({
  id: ctx.session.user.id,
  name: ctx.session.user.name,
}));
