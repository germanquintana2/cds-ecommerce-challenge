import { Skeleton } from "~/components/ui/skeleton";

export function ProductDetailLoading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6"
    >
      <p role="status" className="sr-only">
        Cargando producto…
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-44" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex flex-col items-start gap-5 py-2">
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-8 w-32" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t pt-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
    </main>
  );
}
