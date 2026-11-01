import { createTRPCRouter } from "~/server/api/trpc";
import { list } from "./list";
import { byId } from "./by-id";

import { suggestions } from "./suggestions";
export { list, byId, suggestions };
export const catalogRouter = createTRPCRouter({ list, byId, suggestions });
