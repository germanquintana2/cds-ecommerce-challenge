"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { authClient } from "~/lib/auth/client";
import { api } from "~/lib/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { CartContents } from "./cart-contents";

const CartPanelContext = createContext<{
  closeCart: () => void;
  refreshCart: () => Promise<void>;
  quantity: number;
} | null>(null);

export function useCartPanel() {
  const context = useContext(CartPanelContext);
  if (!context) throw new Error("Cart panel provider is missing.");
  return context;
}

const subscribeToHydration = () => () => {};
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;

export function CartButton({
  iconOnly = false,
  label = "Abrir carrito",
  variant = "outline",
  className = "",
}: {
  iconOnly?: boolean;
  label?: string;
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const { quantity: cachedQuantity } = useCartPanel();
  // Each streamed trigger must hydrate with the server's empty counter, even
  // when the provider has already mounted and the browser cache is populated.
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientHydrationSnapshot,
    serverHydrationSnapshot,
  );
  const quantity = hydrated ? cachedQuantity : 0;
  const accessibleLabel = quantity
    ? `${label}, ${quantity} ${quantity === 1 ? "unidad" : "unidades"}`
    : label;
  return (
    <SheetTrigger
      render={
        <Button
          type="button"
          variant={variant}
          size={iconOnly ? "icon" : "default"}
          aria-label={accessibleLabel}
          className={`relative ${className}`}
        />
      }
    >
      <ShoppingCart data-icon={iconOnly ? undefined : "inline-start"} />
      <span className={iconOnly ? "sr-only" : undefined}>{label}</span>
      {iconOnly && quantity > 0 ? (
        <Badge
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 -right-2 min-w-5 justify-center rounded-full px-1 tabular-nums"
        >
          {quantity > 99 ? "99+" : quantity}
        </Badge>
      ) : null}
    </SheetTrigger>
  );
}

export function CartPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Browser Back can restore a frozen document without mounting React again.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setOpen(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const utils = api.useUtils();
  const queryClient = useQueryClient();
  // Include the authenticated user in the cache key so a different login can
  // never briefly display the previous user's cached cart.
  const cart = useQuery({
    queryKey: ["shopping-cart", userId],
    queryFn: () => utils.client.cart.get.query(),
    enabled: open && Boolean(userId) && !session.isPending,
    staleTime: 0,
    retry: false,
  });
  const count = useQuery({
    queryKey: ["shopping-cart", userId, "count"],
    queryFn: () => utils.client.cart.count.query(),
    enabled: Boolean(userId) && !session.isPending,
    staleTime: 0,
    retry: false,
  });
  const quantity = userId ? (count.data?.quantity ?? 0) : 0;
  const closeCart = () => setOpen(false);
  const refreshCart = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["shopping-cart"] }),
    [queryClient],
  );
  const needsLogin =
    !userId ||
    (cart.error instanceof TRPCClientError &&
      cart.error.data?.code === "UNAUTHORIZED");

  return (
    <CartPanelContext.Provider
      value={{
        closeCart,
        refreshCart,
        quantity,
      }}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        {children}
        <SheetContent
          side="right"
          className="flex flex-col gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          <SheetHeader className="shrink-0 border-b p-6">
            <SheetTitle className="text-2xl font-semibold tracking-tight">
              Mi carrito
            </SheetTitle>
            <SheetDescription>
              Revisá tus productos, cantidades y total.
            </SheetDescription>
          </SheetHeader>
          {session.isPending ? (
            <p role="status" className="p-6">
              Cargando carrito…
            </p>
          ) : needsLogin ? (
            <div className="flex flex-col items-start gap-4 p-6">
              <p>Iniciá sesión para ver tu carrito y guardar tus productos.</p>
              <Button
                nativeButton={false}
                render={<Link href="/login?next=%2F" onClick={closeCart} />}
              >
                Iniciar sesión
              </Button>
            </div>
          ) : cart.isPending ? (
            <p role="status" className="p-6">
              Cargando productos…
            </p>
          ) : cart.isError ? (
            <div role="alert" className="flex flex-col items-start gap-4 p-6">
              <p>No pudimos cargar el carrito. Intentá nuevamente.</p>
              <Button
                onClick={() => {
                  void cart.refetch();
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : cart.data ? (
            <CartContents
              cart={cart.data}
              onChanged={refreshCart}
              onClose={closeCart}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </CartPanelContext.Provider>
  );
}
