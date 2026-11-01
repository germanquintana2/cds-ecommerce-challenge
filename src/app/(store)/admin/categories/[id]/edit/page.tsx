import { Suspense } from "react";
import { ProductFormLoading } from "~/app/_components/page-skeletons";
import { EditCategory } from "./_components/edit-category";
export const instant = false;
export default function EditCategoryPage({
  params,
}: PageProps<"/admin/categories/[id]/edit">) {
  return (
    <Suspense fallback={<ProductFormLoading />}>
      <EditCategory params={params} />
    </Suspense>
  );
}
