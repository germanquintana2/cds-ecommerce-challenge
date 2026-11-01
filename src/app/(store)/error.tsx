"use client";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function StoreError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <section
      role="alert"
      className="mx-auto flex max-w-xl flex-col items-start gap-4 p-6"
    >
      <h1 className="text-2xl font-semibold">No pudimos cargar esta página</h1>
      <p className="text-muted-foreground">
        Ocurrió un problema al consultar la tienda. Podés volver a intentarlo.
      </p>
      <Button onClick={retry}>Reintentar</Button>
      <Link href="/" className="text-sm underline">
        Volver al catálogo
      </Link>
    </section>
  );
}
