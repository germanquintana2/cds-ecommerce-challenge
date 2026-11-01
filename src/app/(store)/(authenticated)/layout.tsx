import { AccountLoading } from "~/app/_components/page-skeletons";
import { Suspense } from "react";
import { getStoreSession } from "~/lib/store-session";
import { SignInRedirect } from "~/app/_components/sign-in-redirect";

async function RequireSession({ children }: { children: React.ReactNode }) {
  const session = await getStoreSession();
  if (!session) return <SignInRedirect />;
  return <main className="p-4 sm:p-6">{children}</main>;
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AccountLoading />}>
      <RequireSession>{children}</RequireSession>
    </Suspense>
  );
}
