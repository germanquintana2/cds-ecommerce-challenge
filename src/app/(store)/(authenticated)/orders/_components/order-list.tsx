import { loginPath } from "~/lib/return-path";
import Link from "next/link";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "~/lib/trpc/server";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { formatPrice } from "~/lib/money";

export async function OrderList({
  searchParams,
}: Pick<PageProps<"/orders">, "searchParams">) {
  const params = await searchParams;
  const rawPage = Number(params.page ?? 1);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage <= 100000
      ? rawPage
      : 1;
  let result;
  try {
    result = await api.order.list({ page });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "UNAUTHORIZED")
      redirect(loginPath("/orders"));
    throw error;
  }
  return (
    <div className="flex flex-col gap-6">
      {result.items.length ? (
        result.items.map((order) => (
          <article
            key={order.id}
            className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="text-lg font-semibold">
                <Link href={`/orders/${order.id}`} className="hover:underline">
                  Compra del {format(order.paidAt, "dd/MM/yyyy HH:mm")}
                </Link>
              </h2>
              <Badge variant="secondary">Pagada</Badge>
            </div>
            <p className="break-all text-xs text-muted-foreground">
              Referencia: {order.id}
            </p>
            <ul className="flex flex-col gap-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span className="min-w-0 break-words">
                    {item.quantity} × {item.productName}
                  </span>
                  <span className="shrink-0">
                    {formatPrice(
                      item.quantity * item.unitPriceCents,
                      order.currency,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t pt-5">
              <p className="text-lg font-semibold">
                Total: {formatPrice(order.totalCents, order.currency)}
              </p>
              <Button
                variant="secondary"
                nativeButton={false}
                render={<Link href={`/orders/${order.id}`} />}
              >
                Ver compra
              </Button>
            </footer>
          </article>
        ))
      ) : (
        <section className="flex flex-col gap-2 rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">
            Todavía no tenés compras registradas
          </h2>
          <p className="text-sm text-muted-foreground">
            Tus compras confirmadas aparecerán acá.
          </p>
        </section>
      )}
      {page > 1 || page < result.pages ? (
        <nav aria-label="Páginas de compras" className="flex gap-4 text-sm">
          {page > 1 ? (
            <Link className="underline" href={`/orders?page=${page - 1}`}>
              Anterior
            </Link>
          ) : null}
          {page < result.pages ? (
            <Link className="underline" href={`/orders?page=${page + 1}`}>
              Siguiente
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
