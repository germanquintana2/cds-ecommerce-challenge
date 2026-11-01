import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "~/lib/trpc/server";
import { CategoryForm } from "../../../_components/category-editor-form";
export async function EditCategory({
  params,
}: Pick<PageProps<"/admin/categories/[id]/edit">, "params">) {
  const { id } = await params;
  let category;
  try {
    category = await api.adminCategory.byId({ id });
  } catch (error) {
    if (
      error instanceof TRPCError &&
      ["NOT_FOUND", "BAD_REQUEST"].includes(error.code)
    )
      notFound();
    throw error;
  }
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Editar categoría</h1>
      <CategoryForm
        key={`${category.id}-${category.updatedAt}`}
        initial={category}
      />
    </section>
  );
}
