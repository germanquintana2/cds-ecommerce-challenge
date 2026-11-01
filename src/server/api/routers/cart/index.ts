import { createTRPCRouter } from "~/server/api/trpc";
import { get } from "./get";
import { addItem } from "./add-item";
import { setQuantity } from "./set-quantity";
import { removeItem } from "./remove-item";
import { count } from "./count";

export { get, addItem, setQuantity, removeItem, count };
export const cartRouter = createTRPCRouter({
  get,
  addItem,
  setQuantity,
  removeItem,
  count,
});
