import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "~/lib/auth";

// Deduplicate session reads within this server render, never across users.
export const getStoreSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
