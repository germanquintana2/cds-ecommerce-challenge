import { remove } from "./remove";
import { createTRPCRouter } from "~/server/api/trpc";
import { list } from "./list";
import { create } from "./create";
import { update } from "./update";
import { searchProducts } from "./search-products";
import { byId } from "./by-id";
export { remove, list, create, update, searchProducts, byId };
export const adminCategoryRouter = createTRPCRouter({
  remove,
  list,
  create,
  update,
  searchProducts,
  byId,
});
