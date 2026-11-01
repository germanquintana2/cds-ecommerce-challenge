import { AdminProductsLoading } from "~/app/_components/page-skeletons";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "~/lib/trpc/server";

async function AdminAccess({ children }: { children: React.ReactNode }) {
  try {
    await api.admin.currentUser();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "UNAUTHORIZED")
      redirect("/login");
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      return (
        <section className="flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-semibold">Acceso restringido</h1>
          <p>Tu cuenta no tiene permisos de administrador.</p>
          <Link href="/profile" className="underline">
            Ir a mi perfil
          </Link>
        </section>
      );
    }
    throw error;
  }
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {children}
    </main>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
          <AdminProductsLoading />
        </div>
      }
    >
      <AdminAccess>{children}</AdminAccess>
    </Suspense>
  );
}
