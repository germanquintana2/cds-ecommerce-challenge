"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Search, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/trpc/react";
import { formatPrice } from "~/lib/money";

type Suggestion = {
  id: string;
  name: string;
  priceCents: number;
  category: { name: string } | null;
};

export function StoreSearch() {
  const params = useSearchParams();
  const pathname = usePathname();
  const initialSearch =
    pathname === "/" ? (params.get("search") ?? "").slice(0, 120) : "";
  const router = useRouter();
  const [value, setValue] = useState(initialSearch);
  const [previousSearch, setPreviousSearch] = useState(initialSearch);
  const [debounced, setDebounced] = useState(initialSearch.trim());
  const [open, setOpen] = useState(false);
  if (previousSearch !== initialSearch) {
    setPreviousSearch(initialSearch);
    if (value === previousSearch) setValue(initialSearch);
    setOpen(false);
  }
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);
  const result = api.catalog.suggestions.useQuery(
    { search: debounced },
    { enabled: Boolean(debounced), retry: false },
  );
  const waiting = value.trim() !== debounced || result.isPending;
  const items: Suggestion[] = waiting ? [] : (result.data ?? []);
  return (
    <form
      role="search"
      className="flex w-full gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        const search = value.trim();
        router.push(search ? `/?${new URLSearchParams({ search })}` : "/");
      }}
    >
      <Autocomplete.Root
        items={items}
        value={value}
        onValueChange={(nextValue, details) => {
          setValue(nextValue);
          if (details.reason === "input-change")
            setOpen(Boolean(nextValue.trim()));
          if (!nextValue.trim()) setOpen(false);
        }}
        filter={null}
        open={open && Boolean(value.trim())}
        onOpenChange={setOpen}
        openOnInputClick
        itemToStringValue={(item: Suggestion) => item.name}
      >
        <Autocomplete.InputGroup className="relative min-w-0 flex-1">
          <Autocomplete.Input
            name="search"
            type="text"
            enterKeyHint="search"
            aria-label="Buscar productos por nombre"
            placeholder="¿Qué estás buscando?"
            maxLength={120}
            autoComplete="off"
            className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-9 pl-2.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          />
          <Autocomplete.Clear
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-1 -translate-y-1/2 hover:bg-transparent dark:hover:bg-transparent"
              />
            }
          >
            <X aria-hidden="true" />
          </Autocomplete.Clear>
        </Autocomplete.InputGroup>
        <Autocomplete.Portal>
          <Autocomplete.Positioner
            sideOffset={8}
            align="start"
            className="isolate z-50"
          >
            <Autocomplete.Popup className="w-(--anchor-width) min-w-64 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none">
              <Autocomplete.Status>
                {waiting ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    Buscando productos…
                  </p>
                ) : result.isError ? (
                  <p className="px-3 py-3 text-sm text-destructive">
                    No pudimos buscar productos. Intentá nuevamente.
                  </p>
                ) : items.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    No encontramos productos.
                  </p>
                ) : null}
              </Autocomplete.Status>
              <Autocomplete.List>
                {(product: Suggestion) => (
                  <Autocomplete.Item
                    key={product.id}
                    value={product}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-3 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/products/${product.id}`);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      {product.category ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {product.category.name}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-medium">
                      {formatPrice(product.priceCents)}
                    </span>
                  </Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
      <Button
        type="submit"
        variant="outline"
        size="icon"
        aria-label="Buscar productos"
      >
        <Search />
      </Button>
    </form>
  );
}
