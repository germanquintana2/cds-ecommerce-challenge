import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";

export async function AccountNavigation() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <nav aria-label="Mi cuenta" className="flex flex-col gap-2">
      <Link
        href="/dashboard"
        className="rounded-md px-3 py-2 text-sm hover:bg-muted"
      >
        Mi cuenta
      </Link>
      <Link
        href="/profile"
        className="rounded-md px-3 py-2 text-sm hover:bg-muted"
      >
        Mi perfil
      </Link>
      {session.user.role === "ADMIN" ? (
        <Link
          href="/admin"
          className="rounded-md px-3 py-2 text-sm hover:bg-muted"
        >
          Administración
        </Link>
      ) : null}
    </nav>
  );
}
