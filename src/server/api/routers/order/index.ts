import { createTRPCRouter } from "~/server/api/trpc";
import { list } from "./list";

import { byId } from "./by-id";
export { list, byId };
export const orderRouter = createTRPCRouter({ list, byId });
