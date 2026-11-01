import { Suspense } from "react";
import { StoreHeader } from "~/app/_components/store-header";
import { StoreSidebar } from "~/app/_components/store-sidebar";
import { CartPanelProvider } from "~/app/_components/cart-panel";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartPanelProvider>
      <Suspense
        fallback={
          <div className="h-20 border-b" aria-label="Cargando navegación" />
        }
      >
        <StoreHeader />
      </Suspense>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="hidden w-56 shrink-0 border-r p-3 md:block">
          <Suspense
            fallback={
              <p className="p-3 text-sm text-muted-foreground">
                Cargando navegación…
              </p>
            }
          >
            <StoreSidebar />
          </Suspense>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </CartPanelProvider>
  );
}
