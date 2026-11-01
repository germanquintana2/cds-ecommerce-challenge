"use client";

import { Button } from "~/components/ui/button";

export default function StoreError({ reset }: { reset: () => void }) {
  return (
    <section
      role="alert"
      className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 p-6"
    >
      <h1 className="text-2xl font-semibold">No pudimos cargar esta página</h1>
      <p>Intentá nuevamente en unos momentos.</p>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}
