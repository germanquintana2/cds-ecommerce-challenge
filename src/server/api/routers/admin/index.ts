import { createTRPCRouter } from "~/server/api/trpc";
import { currentUser } from "./current-user";

export { currentUser };

export const adminRouter = createTRPCRouter({ currentUser });
