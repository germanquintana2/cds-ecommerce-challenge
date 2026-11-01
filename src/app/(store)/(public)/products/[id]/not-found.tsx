import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 p-6">
      <h1 className="text-2xl font-semibold">Producto no disponible</h1>
      <p>El producto no existe o ya no forma parte del catálogo.</p>
      <Link href="/" className="underline">
        Volver al catálogo
      </Link>
    </main>
  );
}
