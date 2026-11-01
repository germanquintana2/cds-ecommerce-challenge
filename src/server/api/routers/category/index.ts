import { createTRPCRouter } from "~/server/api/trpc";
import { list } from "./list";
import { byId } from "./by-id";
import { navigation } from "./navigation";
export { list, byId, navigation };
export const categoryRouter = createTRPCRouter({ list, byId, navigation });
