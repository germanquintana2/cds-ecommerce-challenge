"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { X } from "lucide-react";
import { api } from "~/lib/trpc/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/toast";
import { categoryFieldsSchema } from "~/server/validation/category";
import { MAX_IMAGE_BYTES } from "~/server/validation/product";

type SelectedProduct = {
  id: string;
  name: string;
  category: { name: string } | null;
  active: boolean;
};
export type InitialCategory = {
  id: string;
  name: string;
  imageKey: string | null;
  imageUrl: string | null;
  updatedAt: string;
  products: SelectedProduct[];
};
export function CategoryForm({ initial }: { initial?: InitialCategory }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [refreshing, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof categoryFieldsSchema>>({
    resolver: zodResolver(categoryFieldsSchema),
    defaultValues: { name: initial?.name ?? "" },
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const localUrl = useRef<string | null>(null);
  const categoryId = useRef<string | null>(initial?.id ?? null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const uploadedKey = useRef<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<SelectedProduct[]>(
    initial?.products ?? [],
  );
  const create = api.adminCategory.create.useMutation();
  const update = api.adminCategory.update.useMutation();
  const busy = isSubmitting || refreshing;
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(
    () => () => {
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    },
    [],
  );
  const results = api.adminCategory.searchProducts.useQuery(
    {
      search: debouncedSearch,
      excludeIds: selected.map((product) => product.id),
    },
    { enabled: Boolean(debouncedSearch), retry: false },
  );
  function discardChanges() {
    // Next can retain this route's React state when navigating away and back.
    // Cancel explicitly restores every field instead of relying on unmounting.
    reset({ name: initial?.name ?? "" });
    setSelected(initial?.products ?? []);
    setFile(null);
    setPreview(initial?.imageUrl ?? null);
    setImageError(null);
    setImageRemoved(false);
    setSearch("");
    setDebouncedSearch("");
    uploadedKey.current = null;
    categoryId.current = initial?.id ?? null;
    if (fileInput.current) fileInput.current.value = "";
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    localUrl.current = null;
  }
  function chooseImage(selectedFile: File | undefined) {
    if (!selectedFile) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type) ||
      !selectedFile.size ||
      selectedFile.size > MAX_IMAGE_BYTES
    ) {
      setImageError("Elegí una imagen JPEG, PNG o WebP de hasta 4 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setImageError(null);
    setImageRemoved(false);
    uploadedKey.current = null;
    setFile(selectedFile);
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    localUrl.current = URL.createObjectURL(selectedFile);
    setPreview(localUrl.current);
  }
  async function submit(values: z.infer<typeof categoryFieldsSchema>) {
    if (imageError) return;
    try {
      const id = (categoryId.current ??= crypto.randomUUID());
      if (file && !uploadedKey.current) {
        const body = new FormData();
        body.set("categoryId", id);
        body.set("file", file);
        const response = await fetch("/api/uploads/categories", {
          method: "POST",
          body,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || typeof payload?.imageKey !== "string")
          throw new Error(payload?.error ?? "No se pudo subir la imagen.");
        uploadedKey.current = payload.imageKey;
      }
      if (initial) {
        await update.mutateAsync({
          id: initial.id,
          name: values.name,
          productIds: selected.map((product) => product.id),
          imageKey: file
            ? (uploadedKey.current ?? undefined)
            : imageRemoved
              ? null
              : undefined,
          expectedUpdatedAt: initial.updatedAt,
        });
      } else {
        await create.mutateAsync({
          id,
          name: values.name,
          imageKey: uploadedKey.current ?? undefined,
          productIds: selected.map((product) => product.id),
        });
      }
      toast.add({
        title: initial ? "Categoría actualizada." : "Categoría creada.",
        type: "success",
      });
      await utils.adminCategory.list.invalidate();
      startTransition(() => {
        router.push("/admin/categories");
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar la categoría.";
      setError("root", { message });
      toast.add({ title: message, type: "error" });
    }
  }
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
    >
      <Input
        id="category-name"
        label="Nombre"
        maxLength={80}
        disabled={busy}
        errorMessage={errors.name?.message}
        {...register("name")}
      />
      <section
        aria-labelledby="category-image-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="category-image-heading" className="sr-only">
          Imagen de portada
        </h2>
        <Input
          id="category-image"
          ref={fileInput}
          type="file"
          label="Imagen de la categoría"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => chooseImage(event.target.files?.[0])}
          errorMessage={imageError ?? undefined}
          aria-describedby="category-image-help"
        />
        <p id="category-image-help" className="text-sm text-muted-foreground">
          JPEG, PNG o WebP, hasta 4 MB y 16 megapíxeles. Se convertirá a WebP.
        </p>
        {preview ? (
          <div className="flex flex-col items-start gap-3">
            <Image
              src={preview}
              alt="Vista previa de la categoría"
              width={320}
              height={240}
              unoptimized
              className="max-h-60 w-full rounded-md object-contain"
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setFile(null);
                setPreview(null);
                setImageRemoved(true);
                setImageError(null);
                uploadedKey.current = null;
                if (localUrl.current) URL.revokeObjectURL(localUrl.current);
                localUrl.current = null;
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              Quitar imagen
            </Button>
          </div>
        ) : null}
      </section>
      <section
        aria-labelledby="category-products-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="category-products-heading" className="text-sm font-medium">
          Asignar productos
        </h2>
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <Input
            id="category-product-search"
            type="search"
            aria-label="Buscar productos por nombre"
            placeholder="Escribí el nombre de un producto"
            value={search}
            maxLength={120}
            disabled={busy}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search.trim() ? (
            <div aria-live="polite">
              {search.trim() !== debouncedSearch || results.isPending ? (
                <p className="text-sm text-muted-foreground">
                  Buscando productos…
                </p>
              ) : results.isError ? (
                <p role="alert" className="text-sm text-destructive">
                  No pudimos buscar productos.{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void results.refetch()}
                  >
                    Reintentar
                  </button>
                </p>
              ) : (
                <>
                  <ul
                    aria-label="Resultados de búsqueda de productos"
                    className="max-h-60 divide-y overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]"
                  >
                    {results.data?.items.map((product) => (
                      <li
                        key={product.id}
                        className="flex h-20 items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p
                            className="truncate font-medium"
                            title={product.name}
                          >
                            {product.name}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {product.category?.name ?? "Sin categoría"}
                            {product.active ? "" : " · Borrador"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy || selected.length >= 200}
                          onClick={() =>
                            setSelected((previous) =>
                              previous.some((item) => item.id === product.id)
                                ? previous
                                : [...previous, product],
                            )
                          }
                        >
                          Agregar
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {results.data?.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay coincidencias sin seleccionar.
                    </p>
                  ) : null}
                  {results.data?.hasMore ? (
                    <p className="text-sm text-muted-foreground">
                      Hay más resultados. Afiná la búsqueda para encontrarlos.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          <div className="mt-2 flex flex-col gap-1">
            <h3 className="font-medium">
              Productos seleccionados ({selected.length})
            </h3>
            {selected.length ? (
              <ul
                aria-label="Productos seleccionados"
                className="max-h-48 divide-y overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]"
              >
                {selected.map((product) => (
                  <li
                    key={product.id}
                    className="flex h-16 items-center justify-between gap-4 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={product.name}>
                        {product.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        Categoría actual:{" "}
                        {product.category?.name ?? "Sin categoría"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${product.name} de la selección`}
                      disabled={busy}
                      onClick={() =>
                        setSelected((previous) =>
                          previous.filter((item) => item.id !== product.id),
                        )
                      }
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no seleccionaste productos.
              </p>
            )}
          </div>
        </div>
      </section>
      {errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? "Guardando categoría…" : "Guardar categoría"}
        </Button>
        {!busy ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/admin/categories" onClick={discardChanges} />}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
