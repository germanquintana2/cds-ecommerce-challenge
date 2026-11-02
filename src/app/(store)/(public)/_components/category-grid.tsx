import { ListPagination } from "~/app/_components/list-pagination";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { api } from "~/lib/trpc/server";
export async function CategoryGrid({ page = 1 }: { page?: number }) {
  const result = await api.category.list({ page });
  if (page > result.pages) redirect(`/?page=${result.pages}`);
  const categories = result.items;
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Catálogo
        </h1>
        <p className="text-muted-foreground">
          Elegí una categoría para descubrir sus productos.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/?category=${encodeURIComponent(category.id)}`}
            aria-label={`Ver productos de ${category.name}`}
            className="group flex min-w-0 flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="relative flex aspect-square items-center justify-center bg-muted">
              {category.imageUrl ? (
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw"
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
                {category.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {category.productCount}{" "}
                {category.productCount === 1 ? "producto" : "productos"}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay categorías disponibles.
        </p>
      ) : null}
      <ListPagination
        total={result.total}
        label="categorías"
        page={page}
        pages={result.pages}
        pageUrl={(number) => `/?page=${number}`}
        ariaLabel="Páginas de categorías"
      />
    </main>
  );
}
