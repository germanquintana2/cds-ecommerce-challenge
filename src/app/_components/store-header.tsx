import Link from "next/link";
import { Suspense } from "react";
import { MobileCategoryMenu } from "./mobile-category-menu";
import { StoreSidebar } from "./store-sidebar";
import { getStoreSession } from "~/lib/store-session";
import { Button } from "~/components/ui/button";
import { CartButton } from "./cart-panel";
import { UserMenu } from "./user-menu";
import { StoreSearch } from "./store-search";

export async function StoreHeader() {
  const session = await getStoreSession();
  return (
    <header className="border-b bg-background">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-y-4 py-4 md:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-2 pl-4 sm:pl-6 md:gap-3 md:pr-6">
          <MobileCategoryMenu>
            <Suspense
              fallback={
                <p className="p-3 text-sm text-muted-foreground">
                  Cargando categorías…
                </p>
              }
            >
              <StoreSidebar />
            </Suspense>
          </MobileCategoryMenu>
          <Link
            href="/"
            className="whitespace-nowrap text-base font-semibold tracking-tight sm:text-xl"
          >
            CDS · Tienda
          </Link>
        </div>
        <div className="contents md:mx-auto md:flex md:w-full md:max-w-6xl md:items-center md:gap-4 md:px-6">
          <div className="order-3 col-span-2 min-w-0 px-4 sm:px-6 md:order-none md:max-w-xl md:flex-1 md:px-0">
            <StoreSearch />
          </div>
          <nav
            aria-label="Accesos personales"
            className="order-2 ml-auto flex items-center gap-2 pr-4 sm:pr-6 md:order-none md:gap-3 md:pr-0"
          >
            {session ? (
              <UserMenu
                name={session.user.name}
                isAdmin={session.user.role === "ADMIN"}
              />
            ) : (
              <Button
                variant="secondary"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Iniciar sesión
              </Button>
            )}
            {session ? <CartButton iconOnly /> : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
