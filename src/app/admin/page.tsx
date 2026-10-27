import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "~/lib/trpc/server";

async function AdminOverview() {
  let admin;
  try {
    admin = await api.admin.currentUser();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "UNAUTHORIZED")
      redirect("/login");
    if (error instanceof TRPCError && error.code === "FORBIDDEN") {
      return (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">Acceso restringido</h1>
          <p>Tu cuenta no tiene permisos de administrador.</p>
          <Link href="/dashboard" className="underline">
            Volver a mi cuenta
          </Link>
        </section>
      );
    }
    throw error;
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Administración</h1>
      <p>Hola, {admin.name}. Tu acceso de administrador está habilitado.</p>
      <p className="text-muted-foreground">
        La gestión de productos se incorporará en la siguiente etapa.
      </p>
      <Link href="/dashboard" className="underline">
        Volver a mi cuenta
      </Link>
    </section>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <Suspense fallback={<p>Cargando administración…</p>}>
        <AdminOverview />
      </Suspense>
    </main>
  );
}
