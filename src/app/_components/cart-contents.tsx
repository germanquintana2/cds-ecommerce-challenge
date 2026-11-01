"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "~/components/ui/toast";
import { api } from "~/lib/trpc/react";
import type { CartLine, CartView } from "~/lib/cart-types";
import { formatPrice } from "~/lib/money";

import { CheckoutButton } from "./checkout-button";

type PanelActions = { onChanged: () => Promise<void>; onClose: () => void };

function CartItem({
  item,
  version,
  onChanged,
  onClose,
  onPendingChange,
}: {
  item: CartLine;
  version: number;
  onPendingChange: (id: string, pending: boolean) => void;
} & PanelActions) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (updateTimer.current) clearTimeout(updateTimer.current);
      onPendingChange(item.productId, false);
    },
    [item.productId, onPendingChange],
  );
  const [refreshing, startTransition] = useTransition();
  const refresh = () =>
    startTransition(async () => {
      await onChanged();
    });
  const onError = (error: { message: string }) => {
    setQuantity(String(item.quantity));
    onPendingChange(item.productId, false);
    toast.add({ title: error.message, type: "error" });
    refresh();
  };
  const update = api.cart.setQuantity.useMutation({
    onError,
    onSuccess: refresh,
  });
  const remove = api.cart.removeItem.useMutation({
    onError,
    onSuccess: refresh,
  });
  const busy = update.isPending || remove.isPending || refreshing;
  const valid = /^[1-9]\d?$/.test(quantity);

  return (
    <li className="flex gap-3 border-b py-5">
      <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted sm:size-20">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="80px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <span className="px-1 text-xs text-muted-foreground">Sin imagen</span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {item.available ? (
          <Link
            href={`/products/${item.productId}`}
            onClick={onClose}
            className="font-medium hover:underline"
          >
            {item.name}
          </Link>
        ) : (
          <h3 className="font-medium">{item.name}</h3>
        )}
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            {formatPrice(item.priceCents)} / unidad
          </p>
          <p className="font-semibold">{formatPrice(item.lineTotalCents)}</p>
        </div>
        {!item.available ? (
          <p className="text-sm text-destructive">
            Este producto ya no está disponible.
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-20">
            <Input
              id={`panel-quantity-${item.productId}`}
              label="Cantidad"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              step={1}
              value={quantity}
              onChange={(event) => {
                const value = event.target.value;
                setQuantity(value);
                onPendingChange(
                  item.productId,
                  Number(value) !== item.quantity,
                );
                if (updateTimer.current) clearTimeout(updateTimer.current);
                if (
                  !/^[1-9]\d?$/.test(value) ||
                  Number(value) === item.quantity
                )
                  return;
                updateTimer.current = setTimeout(() => {
                  update.mutate({
                    productId: item.productId,
                    quantity: Number(value),
                    expectedVersion: version,
                  });
                }, 450);
              }}
              disabled={busy || !item.available}
              aria-label={`Cantidad de ${item.name}`}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (updateTimer.current) clearTimeout(updateTimer.current);
              remove.mutate({
                productId: item.productId,
                expectedVersion: version,
              });
            }}
          >
            {remove.isPending ? "Quitando…" : "Quitar"}
          </Button>
        </div>
        {update.isPending || refreshing ? (
          <p role="status" className="text-xs text-muted-foreground">
            Actualizando carrito…
          </p>
        ) : null}
        {!valid ? (
          <p className="text-sm text-destructive">
            Ingresá una cantidad entera de 1 a 99.
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function CartContents({
  cart,
  onChanged,
  onClose,
}: { cart: CartView } & PanelActions) {
  const [pendingItems, setPendingItems] = useState<Set<string>>(
    () => new Set(),
  );
  const onPendingChange = useCallback((id: string, pending: boolean) => {
    setPendingItems((previous) => {
      if (previous.has(id) === pending) return previous;
      const next = new Set(previous);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  if (!cart.items.length)
    return (
      <div className="flex flex-col items-start gap-4 p-6">
        <h3 className="text-lg font-medium">Tu carrito está vacío</h3>
        <p className="text-muted-foreground">
          Agregá productos desde el catálogo para comenzar.
        </p>
        <Button onClick={onClose}>Explorar productos</Button>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        {!cart.canCheckout ? (
          <p role="alert" className="pt-4 text-sm text-destructive">
            {cart.limitExceeded
              ? "El total supera el máximo permitido. Reducí las cantidades para continuar."
              : "Quitá los productos no disponibles para continuar."}
          </p>
        ) : null}
        <ul>
          {cart.items.map((item) => (
            <CartItem
              key={`${item.productId}-${cart.version}`}
              item={item}
              version={cart.version}
              onPendingChange={onPendingChange}
              onChanged={onChanged}
              onClose={onClose}
            />
          ))}
        </ul>
      </div>
      <aside
        aria-label="Resumen de compra"
        className="flex shrink-0 flex-col gap-4 border-t bg-background p-6"
      >
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between gap-4 text-sm">
            <dt>Subtotal</dt>
            <dd>{formatPrice(cart.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-lg font-semibold">
            <dt>Total</dt>
            <dd>{formatPrice(cart.totalCents)}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          Importes en USD. Sin costos de envío ni impuestos adicionales.
        </p>
        <CheckoutButton
          cart={cart}
          onChanged={onChanged}
          onClose={onClose}
          disabled={pendingItems.size > 0}
        />
        <Button variant="outline" onClick={onClose}>
          Seguir comprando
        </Button>
      </aside>
    </div>
  );
}
