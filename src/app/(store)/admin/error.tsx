"use client";

import { Button } from "~/components/ui/button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="flex flex-col items-start gap-4 p-6">
      <h1 className="text-xl font-semibold">
        No se pudo cargar la administración
      </h1>
      <p>Intentá nuevamente. Si tu sesión terminó, volvé a iniciar sesión.</p>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}
