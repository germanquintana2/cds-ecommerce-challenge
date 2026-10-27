import { headers } from "next/headers";

import { auth } from "~/lib/auth";

export async function ProfileDetails() {
  //add timeout to simulate a slow request
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return <p className="text-sm text-foreground/60">Not signed in.</p>;
  }

  const { user } = session;

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-foreground/60">Name</dt>
        <dd>{user.name}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-foreground/60">Email</dt>
        <dd>{user.email}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-foreground/60">Created at</dt>
        <dd>{new Date(user.createdAt).toLocaleString()}</dd>
      </div>
    </dl>
  );
}
