import { Suspense } from "react";
import { redirect } from "next/navigation";

async function CatalogRedirect({ searchParams }: PageProps<"/products">) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["search", "page"]) {
    if (typeof params[key] === "string") query.set(key, params[key]);
  }
  return redirect(query.size ? `/?${query}` : "/");
}

export default function LegacyCatalogPage(props: PageProps<"/products">) {
  return (
    <Suspense fallback={null}>
      <CatalogRedirect {...props} />
    </Suspense>
  );
}
