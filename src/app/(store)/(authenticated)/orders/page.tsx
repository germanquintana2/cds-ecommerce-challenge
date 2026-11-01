import { OrdersLoading } from "~/app/_components/page-skeletons";
import { Suspense } from "react";
import { OrderList } from "./_components/order-list";

export default function OrdersPage({ searchParams }: PageProps<"/orders">) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Mis compras</h1>
        <p className="text-muted-foreground">
          Consultá el historial y el detalle de tus compras.
        </p>
      </header>
      <Suspense fallback={<OrdersLoading />}>
        <OrderList searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
