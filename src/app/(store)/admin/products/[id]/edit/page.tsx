import { ProductFormLoading } from "~/app/_components/page-skeletons";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "~/lib/trpc/server";
import { ProductForm } from "../../_components/product-form";

async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product;
  try {
    product = await api.adminProduct.byId({ id });
  } catch (error) {
    if (
      error instanceof TRPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    )
      notFound();
    throw error;
  }
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar producto</h1>
      <ProductForm
        initial={{
          id: product.id,
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          active: product.active,
          imageUrl: product.imageUrl,
          hasImage: Boolean(product.imageKey),
        }}
      />
    </section>
  );
}

// The admin layout intentionally omits this page when access is denied.
// Do not validate instant rendering for a segment that may not be rendered.
export const instant = false;

export default function EditProductPage(
  props: PageProps<"/admin/products/[id]/edit">,
) {
  return (
    <Suspense fallback={<ProductFormLoading />}>
      <EditProduct params={props.params} />
    </Suspense>
  );
}
