import { ListPagination } from "~/app/_components/list-pagination";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CategoryGrid } from "./category-grid";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import Link from "next/link";
import Image from "next/image";
import { api } from "~/lib/trpc/server";
import { formatPrice } from "~/lib/money";

export async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search =
    typeof params.search === "string" ? params.search.slice(0, 120) : "";
  const categoryId =
    typeof params.category === "string"
      ? params.category.slice(0, 80)
      : undefined;
  if (!search && !categoryId) {
    const rawPage = Number(params.page ?? 1);
    const page =
      Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000
        ? rawPage
        : 1;
    return <CategoryGrid page={page} />;
  }
  let category;
  if (categoryId) {
    try {
      category = await api.category.byId({ id: categoryId });
    } catch (error) {
      if (
        error instanceof TRPCError &&
        (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
      )
        notFound();
      throw error;
    }
  }
  const rawPage = Number(params.page ?? 1);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000
      ? rawPage
      : 1;
  const result = await api.catalog.list({ search, page, categoryId });
  const pageUrl = (number: number) =>
    `/?${new URLSearchParams({ search, page: String(number), ...(categoryId ? { category: categoryId } : {}) })}`;

  if (page > result.pages) redirect(pageUrl(result.pages));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8">
      <div className="self-start">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Todas las categorías
        </Button>
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {category?.name ?? "Resultados de búsqueda"}
        </h1>
        <p className="text-muted-foreground">
          {category
            ? "Explorá los productos de esta categoría."
            : "Productos que coinciden con tu búsqueda."}
        </p>
      </header>
      {result.items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              aria-label={`Ver detalle de ${product.name}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="relative flex aspect-square items-center justify-center bg-muted">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Imagen no disponible
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
                <h2 className="break-words text-sm font-semibold group-hover:underline sm:text-base">
                  {product.name}
                </h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {product.description}
                </p>
                <p className="mt-auto text-base font-semibold sm:text-lg">
                  {formatPrice(product.priceCents)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 py-12">
          <h2 className="text-xl font-medium">
            {search
              ? "No encontramos productos con ese nombre"
              : "Todavía no hay productos disponibles"}
          </h2>
          <p className="text-muted-foreground">
            {search
              ? "Probá otra búsqueda o volvé al catálogo completo."
              : "Volvé más adelante para conocer el catálogo."}
          </p>
        </div>
      )}
      <ListPagination
        total={result.total}
        label="productos"
        page={page}
        pages={result.pages}
        pageUrl={pageUrl}
        ariaLabel="Páginas del catálogo"
      />
    </main>
  );
}
