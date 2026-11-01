import { AdminProductsLoading } from "~/app/_components/page-skeletons";
import { Suspense } from "react";
import { ProductList } from "./_components/product-list";

// The admin layout intentionally omits this page when access is denied.
// Do not validate instant rendering for a segment that may not be rendered.
export const instant = false;

export default function ProductsPage(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminProductsLoading />}>
      <ProductList searchParams={props.searchParams} />
    </Suspense>
  );
}
