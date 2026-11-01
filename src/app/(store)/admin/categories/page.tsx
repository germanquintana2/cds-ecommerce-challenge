import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Suspense } from "react";
import { CategoryList } from "./_components/category-list";
import { Skeleton } from "~/components/ui/skeleton";
export const instant = false;
export default function CategoriesPage() {
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Categorías</h1>
          <p className="text-muted-foreground">
            Organizá los productos del catálogo y sus imágenes de portada.
          </p>
        </div>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/admin/categories/new" />}
        >
          Crear categoría
        </Button>
      </header>
      <Suspense
        fallback={
          <div aria-busy="true" className="flex flex-col gap-4">
            <p role="status" className="sr-only">
              Cargando categorías…
            </p>
            <div aria-hidden="true" className="flex flex-col gap-1">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[2fr_1fr_1fr] items-center gap-4 border-b py-3"
                >
                  <Skeleton className="h-5 w-36 max-w-full" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-8 w-20 justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <CategoryList />
      </Suspense>
    </section>
  );
}
