import { Skeleton } from "~/components/ui/skeleton";

function LoadingStatus({ children }: { children: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}

export function ProfileDetailsLoading() {
  return (
    <div aria-busy="true">
      <LoadingStatus>Cargando perfil…</LoadingStatus>
      <div aria-hidden="true" className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-48 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrdersLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <LoadingStatus>Cargando compras…</LoadingStatus>
      <div aria-hidden="true" className="flex flex-col gap-6">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6"
          >
            <div className="flex justify-between gap-4">
              <Skeleton className="h-7 w-64 max-w-full" />
              <Skeleton className="h-5 w-16 shrink-0" />
            </div>
            <Skeleton className="h-4 w-56 max-w-full" />
            <div className="flex justify-between gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex justify-between gap-4 border-t pt-5">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
        <Skeleton className="h-8 w-36" />
      </div>
    </div>
  );
}

export function AccountLoading() {
  return (
    <div aria-busy="true" className="p-4 sm:p-6">
      <LoadingStatus>Cargando cuenta…</LoadingStatus>
      <div
        aria-hidden="true"
        className="mx-auto flex w-full max-w-4xl flex-col gap-6"
      >
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-72 max-w-full" />
        </div>
        <div className="flex flex-col gap-6 rounded-xl border bg-card p-5 sm:p-6">
          <Skeleton className="h-7 w-44" />
          <ProfileDetailsLoading />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}

export function AdminProductsLoading() {
  return (
    <section aria-busy="true" className="flex flex-col gap-6">
      <LoadingStatus>Cargando administración…</LoadingStatus>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-32" />
        </header>
        <div className="flex items-end gap-3">
          <div className="flex w-full max-w-sm flex-col gap-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[540px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b py-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-5 w-20" />
              ))}
            </div>
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b py-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-14 shrink-0" />
                  <div className="flex min-w-0 flex-col gap-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-36 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-5 w-48" />
      </div>
    </section>
  );
}

export function ProductFormLoading() {
  return (
    <section aria-busy="true" className="flex max-w-2xl flex-col gap-6">
      <LoadingStatus>Cargando producto…</LoadingStatus>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-52" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </section>
  );
}

export function OrderDetailLoading() {
  return (
    <article aria-busy="true" className="flex flex-col gap-6">
      <LoadingStatus>Cargando compra…</LoadingStatus>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="h-5 w-72 max-w-full" />
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex justify-between gap-4 border-b py-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
        <Skeleton className="h-7 w-40 self-end" />
      </div>
    </article>
  );
}
