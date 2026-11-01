import { OrderDetailLoading } from "~/app/_components/page-skeletons";
import { Suspense } from "react";
import { OrderDetail } from "./_components/order-detail";
export default function OrderPage({ params }: PageProps<"/orders/[id]">) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Suspense fallback={<OrderDetailLoading />}>
        <OrderDetail params={params} />
      </Suspense>
    </main>
  );
}
