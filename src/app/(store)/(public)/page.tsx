import { Suspense } from "react";
import { CatalogLoading } from "./_components/catalog-loading";
import { Catalog } from "./_components/catalog";

export default function HomePage(props: PageProps<"/">) {
  return (
    <Suspense fallback={<CatalogLoading />}>
      <Catalog searchParams={props.searchParams} />
    </Suspense>
  );
}
