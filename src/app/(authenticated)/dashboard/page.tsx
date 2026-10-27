import ItemsList from "./_components/items-list";
import { Suspense } from "react";
import Header from "./_components/dashboard-header";
import Loading from "~/components/ui/loading";

export default async function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<Loading />}>
        <Header />
      </Suspense>

      <Suspense fallback={<Loading />}>
        <ItemsList />
      </Suspense>
    </div>
  );
}
