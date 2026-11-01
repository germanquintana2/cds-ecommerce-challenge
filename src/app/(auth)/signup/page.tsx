import Link from "next/link";
import { SignupForm } from "./_components/signup-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 p-6">
      <Link
        href="/"
        className="rounded-sm text-2xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-ring"
        aria-label="CDS · Tienda, ir al catálogo"
      >
        CDS · Tienda
      </Link>
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
          <a href="/login" className="underline">
            Iniciá sesión
          </a>
        </p>
      </section>
    </main>
  );
}
