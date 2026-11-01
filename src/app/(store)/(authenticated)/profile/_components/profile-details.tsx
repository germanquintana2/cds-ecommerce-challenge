import { loginPath } from "~/lib/return-path";
import { getStoreSession } from "~/lib/store-session";
import { format } from "date-fns";
import { redirect } from "next/navigation";

export async function ProfileDetails() {
  const session = await getStoreSession();
  if (!session) redirect(loginPath("/profile"));

  const { user } = session;

  return (
    <dl className="grid gap-6 text-sm sm:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-1.5">
        <dt className="text-muted-foreground">Nombre</dt>
        <dd className="break-words font-medium">{user.name}</dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <dt className="text-muted-foreground">Correo electrónico</dt>
        <dd className="break-words font-medium">{user.email}</dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <dt className="text-muted-foreground">Miembro desde</dt>
        <dd className="break-words font-medium">
          {format(user.createdAt, "dd/MM/yyyy")}
        </dd>
      </div>
    </dl>
  );
}
