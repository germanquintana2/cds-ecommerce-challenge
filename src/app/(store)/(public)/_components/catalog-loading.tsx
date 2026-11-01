import { Skeleton } from "~/components/ui/skeleton";

export function CatalogLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Catálogo
        </h1>
        <p className="text-muted-foreground">
          Elegí una categoría para descubrir sus productos.
        </p>
      </header>
      <p role="status" className="sr-only">
        Cargando catálogo…
      </p>
      <div
        aria-hidden="true"
        className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex min-w-0 flex-col overflow-hidden rounded-xl border"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-3 p-4">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="mt-auto h-7 w-24" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
