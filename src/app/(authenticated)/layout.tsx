import { Suspense } from "react";
import { AccountNavigation } from "./_components/account-navigation";

type AuthenticatedLayoutProps = {
  children: React.ReactNode;
};

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="shrink-0 border-b p-4 md:w-56 md:border-r md:border-b-0">
        <Suspense fallback={<p>Cargando cuenta…</p>}>
          <AccountNavigation />
        </Suspense>
      </aside>

      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
