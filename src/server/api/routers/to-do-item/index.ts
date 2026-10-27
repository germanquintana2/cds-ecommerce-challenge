import { createTRPCRouter } from "~/server/api/trpc";

import { byId } from "./by-id";
import { countByAuthor } from "./count-by-author";
import { create } from "./create";
import { deleteAllByAuthor } from "./delete-all-by-author";
import { listByAuthor } from "./list-by-author";

export { byId, countByAuthor, create, deleteAllByAuthor, listByAuthor };

export const toDoItemRouter = createTRPCRouter({
  list: listByAuthor,
  count: countByAuthor,
  create,
  byId,
  deleteAll: deleteAllByAuthor,
});
