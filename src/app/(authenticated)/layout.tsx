import Link from "next/link";

type AuthenticatedLayoutProps = {
  children: React.ReactNode;
};

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 shrink-0 space-y-1 border-r border-foreground/10 p-4">
        <Link
          href="/dashboard"
          className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-foreground/10"
        >
          Dashboard
        </Link>

        <Link
          href="/profile"
          className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-foreground/10"
        >
          My Profile
        </Link>
      </aside>

      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
