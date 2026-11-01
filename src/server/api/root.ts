import { categoryRouter } from "~/server/api/routers/category";
import { adminCategoryRouter } from "~/server/api/routers/admin-category";
import { adminRouter } from "~/server/api/routers/admin";
import { adminProductRouter } from "~/server/api/routers/admin-product";
import { catalogRouter } from "~/server/api/routers/catalog";
import { cartRouter } from "~/server/api/routers/cart";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { orderRouter } from "~/server/api/routers/order";

import { checkoutRouter } from "~/server/api/routers/checkout";

export const appRouter = createTRPCRouter({
  admin: adminRouter,
  category: categoryRouter,
  adminCategory: adminCategoryRouter,
  adminProduct: adminProductRouter,
  catalog: catalogRouter,
  cart: cartRouter,
  order: orderRouter,
  checkout: checkoutRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
