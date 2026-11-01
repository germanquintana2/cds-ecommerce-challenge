import { ProductForm } from "../_components/product-form";

// The admin layout intentionally omits this page when access is denied.
// Do not validate instant rendering for a segment that may not be rendered.
export const instant = false;

export default function NewProductPage() {
  return (
    <section className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Crear producto</h1>
      <ProductForm />
    </section>
  );
}
