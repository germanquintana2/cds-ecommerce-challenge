import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold">Página no encontrada</h1>
      <p className="max-w-md text-muted-foreground">
        El enlace no existe o el contenido ya no está disponible.
      </p>
      <Button nativeButton={false} render={<Link href="/" />}>
        Volver al catálogo
      </Button>
    </main>
  );
}
