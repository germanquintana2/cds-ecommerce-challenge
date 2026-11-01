"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api } from "~/lib/trpc/react";
import { Button } from "~/components/ui/button";
import { CartButton, useCartPanel } from "~/app/_components/cart-panel";
import { SignInRedirect } from "~/app/_components/sign-in-redirect";
import { formatPrice } from "~/lib/money";

export function CheckoutResult({ id }: { id: string }) {
  const [startedAt] = useState(() => Date.now());
  const result = api.checkout.byId.useQuery(
    { id },
    {
      enabled: Boolean(id),
      retry: false,
      refetchInterval: (query) =>
        query.state.data?.status === "PENDING" && Date.now() - startedAt < 60000
          ? 2000
          : false,
    },
  );
  const { refreshCart } = useCartPanel();
  const paid = result.data?.status === "PAID";
  useEffect(() => {
    if (paid) void refreshCart();
  }, [paid, refreshCart]);
  if (result.error?.data?.code === "UNAUTHORIZED") return <SignInRedirect />;
  if (!id || result.error)
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          No pudimos consultar esta compra
        </h1>
        <p>{result.error?.message ?? "Falta la referencia del intento."}</p>
        <Link className="underline" href="/orders">
          Ver mis compras
        </Link>
      </div>
    );
  if (!result.data) return <p role="status">Consultando compra…</p>;
  const attempt = result.data;
  return (
    <section className="flex flex-col items-start gap-5">
      <h1 className="text-3xl font-semibold">
        {paid
          ? "¡Compra confirmada!"
          : attempt.status === "EXPIRED"
            ? "El pago venció"
            : "Estamos confirmando tu pago"}
      </h1>
      <p>Total: {formatPrice(attempt.totalCents, attempt.currency)}</p>
      <p className="text-muted-foreground">
        {paid
          ? "Tu compra ya está registrada. Si modificaste el carrito durante el pago, conservamos esos cambios."
          : attempt.status === "EXPIRED"
            ? "Tu carrito se conserva. Podés iniciar otro pago desde allí."
            : "Esperamos la confirmación de Stripe. Si tarda, podés volver a consultar el estado o revisar Mis compras."}
      </p>
      {attempt.order ? (
        <Button
          nativeButton={false}
          render={<Link href={`/orders/${attempt.order.id}`} />}
        >
          Ver compra
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            disabled={result.isFetching}
            onClick={() => void result.refetch()}
          >
            Consultar estado
          </Button>
          <CartButton label="Revisar mi carrito" />
        </>
      )}
      <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Volver al catálogo
      </Button>
    </section>
  );
}
