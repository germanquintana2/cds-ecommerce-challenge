import { redirect } from "next/navigation";
import { DeleteEntityButton } from "../../_components/delete-entity-button";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
                        className="size-14 rounded-md object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {product.imageKey
                          ? "Imagen no disponible"
                          : "Sin imagen"}
                      </span>
                    )}
                    <div className="max-w-xs whitespace-normal">
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
      ) : (
        <p>
          No hay productos que coincidan. Podés crear uno nuevo o cambiar la
          búsqueda.
        </p>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-4 text-sm">
        <p>
          {result.total} productos · Página {result.page} de {result.pages}
        </p>
        <nav aria-label="Páginas de productos" className="flex gap-3">
          {page > 1 ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={pageUrl(page - 1)} />}
            >
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Anterior
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <ArrowLeft data-icon="inline-start" aria-hidden="true" />
              Anterior
            </Button>
          )}
          {page < result.pages ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={pageUrl(page + 1)} />}
            >
              Siguiente
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="outline" disabled>
              Siguiente
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          )}
        </nav>
      </footer>
    </section>
  );
}
