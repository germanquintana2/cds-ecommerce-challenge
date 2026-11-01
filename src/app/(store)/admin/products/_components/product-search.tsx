"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export function ProductSearch({ search }: { search: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(search);
  const [previousSearch, setPreviousSearch] = useState(search);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow navigation/back changes without replacing text typed while an older
  // search request is still rendering. Keep the input mounted to preserve focus.
  if (previousSearch !== search) {
    setPreviousSearch(search);
    if (!pending && value === previousSearch) setValue(search);
  }
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function applySearch(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const query = next.trim();
    startTransition(() => {
      router.replace(
        query
          ? `/admin/products?${new URLSearchParams({ search: query })}`
          : "/admin/products",
        { scroll: false },
      );
    });
  }
  return (
    <form
      role="search"
      aria-busy={pending}
      className="flex items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        applySearch(value);
      }}
    >
      <div className="w-full max-w-sm">
        <Input
          ref={input}
          id="product-search"
          className="[&::-webkit-search-cancel-button]:appearance-none"
          name="search"
          type="search"
          label="Buscar por nombre"
          value={value}
          maxLength={120}
          iconRight={
            value ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Limpiar búsqueda"
                className="hover:bg-transparent dark:hover:bg-transparent"
                onClick={() => {
                  setValue("");
                  applySearch("");
                  input.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </Button>
            ) : undefined
          }
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => applySearch(next), 300);
          }}
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Buscando…" : "Buscar"}
      </Button>
      <span role="status" className="sr-only">
        {pending ? "Actualizando productos…" : ""}
      </span>
    </form>
  );
}
