import { loginPath } from "~/lib/return-path";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { format } from "date-fns";
import { api } from "~/lib/trpc/server";
import { formatPrice } from "~/lib/money";
export async function OrderDetail({
  params,
}: Pick<PageProps<"/orders/[id]">, "params">) {
  const { id } = await params;
  let order;
  try {
    order = await api.order.byId({ id });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "UNAUTHORIZED")
      redirect(loginPath(`/orders/${id}`));
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  return (
    <article className="flex flex-col gap-6">
      <Button
        variant="outline"
        className="self-start"
        nativeButton={false}
        render={<Link href="/orders" />}
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Volver a mis compras
      </Button>
      <h1 className="text-3xl font-semibold">Detalle de compra</h1>
      <p>Pagada el {format(order.paidAt, "dd/MM/yyyy HH:mm")}</p>
      <p className="break-all text-sm text-muted-foreground">
        Referencia: {order.id}
      </p>
      <ul className="divide-y">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-4">
            <div>
              <h2 className="font-medium">{item.productName}</h2>
              <p className="text-sm text-muted-foreground">
                {item.quantity} ×{" "}
                {formatPrice(item.unitPriceCents, order.currency)}
              </p>
            </div>
            <p>
              {formatPrice(item.unitPriceCents * item.quantity, order.currency)}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-right text-xl font-semibold">
        Total: {formatPrice(order.totalCents, order.currency)}
      </p>
    </article>
  );
}
