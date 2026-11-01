import { remove } from "./remove";
import { createTRPCRouter } from "~/server/api/trpc";
import { list } from "./list";
import { byId } from "./by-id";
import { create } from "./create";
import { update } from "./update";
import { setActive } from "./set-active";
import { attachImage } from "./attach-image";

export { remove, list, byId, create, update, setActive, attachImage };
export const adminProductRouter = createTRPCRouter({
  remove,
  list,
  byId,
  create,
  update,
  setActive,
  attachImage,
});
