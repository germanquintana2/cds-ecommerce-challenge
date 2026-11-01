import { CategoryForm } from "../_components/category-editor-form";
export const instant = false;
export default function NewCategoryPage() {
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Crear categoría</h1>
      <CategoryForm />
    </section>
  );
}
