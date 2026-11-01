import { Suspense } from "react";
import { ProductDetailLoading } from "./_components/product-detail-loading";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "~/lib/trpc/server";
import { formatPrice } from "~/lib/money";
import { AddToCartButton } from "../../_components/add-to-cart-button";

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product;
  try {
    product = await api.catalog.byId({ id });
  } catch (error) {
    if (
      error instanceof TRPCError &&
      ["NOT_FOUND", "BAD_REQUEST"].includes(error.code)
    )
      notFound();
    throw error;
  }
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Button
        variant="outline"
        className="self-start"
        nativeButton={false}
        render={
          <Link
            href={
              product.category
                ? `/?category=${encodeURIComponent(product.category.id)}`
                : "/"
            }
          />
        }
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Volver a {product.category?.name ?? "Catálogo"}
      </Button>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              unoptimized
              className="object-contain"
            />
          ) : (
            <p className="text-muted-foreground">Imagen no disponible</p>
          )}
        </div>
        <section className="flex flex-col items-start gap-5 py-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="text-2xl font-semibold">
            {formatPrice(product.priceCents)}
          </p>
          <AddToCartButton productId={product.id} />
        </section>
      </div>
      <section
        aria-labelledby="product-description"
        className="flex flex-col gap-3 border-t pt-6"
      >
        <h2 id="product-description" className="text-xl font-semibold">
          Descripción
        </h2>
        <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      </section>
    </main>
  );
}

export default function ProductPage(props: PageProps<"/products/[id]">) {
  return (
    <Suspense fallback={<ProductDetailLoading />}>
      <ProductDetail params={props.params} />
    </Suspense>
  );
}
