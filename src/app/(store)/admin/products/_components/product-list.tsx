import { ListPagination } from "~/app/_components/list-pagination";
import { redirect } from "next/navigation";
import { DeleteEntityButton } from "../../_components/delete-entity-button";
import Link from "next/link";
import Image from "next/image";
import { api } from "~/lib/trpc/server";
import { formatPrice } from "~/lib/money";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ProductSearch } from "./product-search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ProductStatusButton } from "./product-status-button";

export async function ProductList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search =
    typeof params.search === "string" ? params.search.slice(0, 120) : "";
  const rawPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page =
    Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 100000
      ? rawPage
      : 1;
  const result = await api.adminProduct.list({ page, search });
  const pageUrl = (number: number) =>
    `/admin/products?${new URLSearchParams({ search, page: String(number) })}`;

  if (page > result.pages) redirect(pageUrl(result.pages));

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-muted-foreground">
            Gestioná el catálogo y sus imágenes.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/admin/products/new" />}
        >
          Crear producto
        </Button>
      </header>
      <ProductSearch search={search} />
      {result.items.length ? (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {result.items.map((product) => (
              <article
                key={product.id}
                className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="size-16 object-cover"
                      />
                    ) : (
                      <span className="px-1 text-center text-xs text-muted-foreground">
                        Sin imagen
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 className="break-words font-medium">{product.name}</h2>
                    <p className="break-words text-sm text-muted-foreground">
                      {product.category?.name ?? "Sin categoría"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {formatPrice(product.priceCents)}
                  </p>
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active
                      ? "Activo"
                      : product.imageKey
                        ? "Inactivo"
                        : "Borrador"}
                  </Badge>
                </div>
                <div className="flex flex-wrap justify-start gap-2">
                  <Button
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/admin/products/${product.id}/edit`} />
                    }
                  >
                    Editar
                  </Button>
                  <ProductStatusButton
                    id={product.id}
                    active={product.active}
                    hasImage={Boolean(product.imageKey)}
                  />
                  <DeleteEntityButton
                    id={product.id}
                    name={product.name}
                    kind="product"
                  />
                </div>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={56}
                            height={56}
                            unoptimized
                            className="size-14 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {product.imageKey
                              ? "Imagen no disponible"
                              : "Sin imagen"}
                          </span>
                        )}
                        <div className="min-w-40 max-w-xs whitespace-normal">
                          <p className="font-medium">{product.name}</p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {product.category?.name ?? "Sin categoría"} ·{" "}
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatPrice(product.priceCents)}</TableCell>
                    <TableCell>
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active
                          ? "Activo"
                          : product.imageKey
                            ? "Inactivo"
                            : "Borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          nativeButton={false}
                          variant="outline"
                          size="sm"
                          render={
                            <Link href={`/admin/products/${product.id}/edit`} />
                          }
                        >
                          Editar
                        </Button>
                        <ProductStatusButton
                          id={product.id}
                          active={product.active}
                          hasImage={Boolean(product.imageKey)}
                        />
                        <DeleteEntityButton
                          id={product.id}
                          name={product.name}
                          kind="product"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <p>
          No hay productos que coincidan. Podés crear uno nuevo o cambiar la
          búsqueda.
        </p>
      )}
      <ListPagination
        total={result.total}
        label="productos"
        page={page}
        pages={result.pages}
        pageUrl={pageUrl}
        ariaLabel="Páginas de productos"
      />
    </section>
  );
}
