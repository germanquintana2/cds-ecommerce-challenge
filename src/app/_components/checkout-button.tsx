"use client";
import { useRef } from "react";
import { flushSync } from "react-dom";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/toast";
import { api } from "~/lib/trpc/react";
import type { CartView } from "~/lib/cart-types";

export function CheckoutButton({
  cart,
  onChanged,
  onClose,
  disabled = false,
}: {
  disabled?: boolean;
  cart: CartView;
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const request = useRef<{ quote: string; key: string } | null>(null);
  const checkout = api.checkout.start.useMutation({
    onSuccess: ({ url }) => {
      // Commit the closed drawer before the browser snapshots this page for Back.
      flushSync(onClose);
      window.location.assign(url);
    },
    onError: async (error) => {
      toast.add({ title: error.message, type: "error" });
      if (error.data?.code === "CONFLICT") {
        request.current = null;
        await onChanged();
      }
    },
  });
  return (
    <Button
      disabled={
        disabled || !cart.canCheckout || !cart.quoteHash || checkout.isPending
      }
      onClick={() => {
        if (!cart.quoteHash) return;
        if (request.current?.quote !== cart.quoteHash)
          request.current = { quote: cart.quoteHash, key: crypto.randomUUID() };
        checkout.mutate({
          expectedVersion: cart.version,
          quoteHash: cart.quoteHash,
          requestKey: request.current.key,
        });
      }}
    >
      {checkout.isPending ? "Abriendo pago…" : "Continuar al pago"}
    </Button>
  );
}
