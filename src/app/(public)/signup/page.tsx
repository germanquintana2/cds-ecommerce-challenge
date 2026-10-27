import Link from "next/link";
import { SignupForm } from "./_components/signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="flex w-full max-w-sm flex-col gap-6 rounded-lg border p-6">
        <div>
          <h1 className="text-2xl font-semibold">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Registrate para comprar y consultar tus órdenes.
          </p>
        </div>
        <SignupForm />
        <p className="text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="underline">
            Iniciá sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
