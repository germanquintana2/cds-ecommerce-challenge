import { createTRPCRouter } from "~/server/api/trpc";
import { start } from "./start";
import { byId } from "./by-id";
export { start, byId };
export const checkoutRouter = createTRPCRouter({ start, byId });
