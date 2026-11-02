"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { api } from "~/lib/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";
import { toast } from "~/components/ui/toast";
import {
  MAX_IMAGE_BYTES,
  productFormSchema,
} from "~/server/validation/product";

type InitialProduct = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  active: boolean;
  imageUrl: string | null;
  hasImage: boolean;
  categoryId: string | null;
};

export function ProductForm({ initial }: { initial?: InitialProduct }) {
  const router = useRouter();
  const categories = api.adminCategory.list.useQuery();
  const [refreshing, startTransition] = useTransition();
  const [productId, setProductId] = useState(initial?.id);
  const [hasImage, setHasImage] = useState(initial?.hasImage ?? false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.imageUrl ?? null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const localUrl = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const createProduct = api.adminProduct.create.useMutation();
  const updateProduct = api.adminProduct.update.useMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof productFormSchema>,
    unknown,
    z.output<typeof productFormSchema>
  >({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      categoryId: initial?.categoryId ?? "",
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      price: initial ? (initial.priceCents / 100).toFixed(2) : "",
      active: initial?.active ?? false,
    },
  });
  useEffect(
    () => () => {
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    },
    [],
  );
  const busy = isSubmitting || refreshing;

  function selectImage(selected: File | undefined) {
    setImageError(null);
    if (!selected) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > MAX_IMAGE_BYTES ||
      !selected.size
    ) {
      setImageError("Elegí una imagen JPEG, PNG o WebP de hasta 4 MB.");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
      localUrl.current = null;
      setPreview(initial?.imageUrl ?? null);
      return;
    }
    if (localUrl.current) URL.revokeObjectURL(localUrl.current);
    localUrl.current = URL.createObjectURL(selected);
    setPreview(localUrl.current);
    setFile(selected);
  }

  async function submit(values: z.output<typeof productFormSchema>) {
    if (imageError) return;
    if (values.active && !hasImage && !file) {
      setImageError("Subí una imagen antes de activar el producto.");
      return;
    }
    let id = productId;
    try {
      const fields = {
        categoryId: values.categoryId,
        name: values.name,
        description: values.description,
        priceCents: values.price,
      };
      if (!id) {
        const created = await createProduct.mutateAsync(fields);
        id = created.id;
        setProductId(id);
      }
      if (file) {
        setUploading(true);
        const body = new FormData();
        body.set("productId", id);
        body.set("file", file);
        const response = await fetch("/api/uploads/products", {
          method: "POST",
          body,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "No se pudo subir la imagen.");
        }
        setHasImage(true);
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
      }
      await updateProduct.mutateAsync({ id, ...fields, active: values.active });
      toast.add({ title: "Producto guardado.", type: "success" });
      startTransition(() => {
        router.push("/admin/products");
        router.refresh();
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el producto.";
      setError("root", {
        message: `${message}${id && !initial ? " El borrador se conservó; podés reintentar sin duplicarlo." : ""}`,
      });
      toast.add({ title: message, type: "error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
      className="flex flex-col gap-5"
    >
      <Input
        id="product-name"
        label="Nombre"
        maxLength={120}
        disabled={busy}
        errorMessage={errors.name?.message}
        {...register("name")}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="product-category" className="text-sm font-medium">
          Categoría
        </label>
        <div className="relative">
          <select
            id="product-category"
            className="h-8 w-full appearance-none rounded-lg border border-input bg-background pl-2.5 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={busy || categories.isPending || categories.isError}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? "category-error" : undefined}
            {...register("categoryId")}
          >
            <option value="">
              {categories.isPending
                ? "Cargando categorías…"
                : "Seleccioná una categoría"}
            </option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
        {errors.categoryId ? (
          <p id="category-error" className="text-sm text-destructive">
            Seleccioná una categoría.
          </p>
        ) : null}
        {categories.isError ? (
          <p role="alert" className="text-sm text-destructive">
            No pudimos cargar las categorías.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void categories.refetch()}
            >
              Reintentar
            </button>
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="product-description" className="text-sm font-medium">
          Descripción
        </label>
        <Textarea
          id="product-description"
          rows={5}
          maxLength={5000}
          disabled={busy}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
          {...register("description")}
        />
        {errors.description ? (
          <p id="description-error" className="text-sm text-destructive">
            {errors.description.message}
          </p>
        ) : null}
      </div>
      <Input
        id="product-price"
        label="Precio en USD"
        inputMode="decimal"
        placeholder="19,99"
        disabled={busy}
        errorMessage={errors.price?.message}
        {...register("price")}
      />
      <div className="flex flex-col gap-3">
        <Input
          id="product-image"
          ref={fileInput}
          type="file"
          label="Imagen del producto"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => selectImage(event.target.files?.[0])}
          aria-describedby="image-help"
          errorMessage={imageError ?? undefined}
        />
        <p id="image-help" className="text-sm text-muted-foreground">
          JPEG, PNG o WebP, hasta 4 MB y 16 megapíxeles. Se convertirá a WebP.
        </p>
        {preview ? (
          <Image
            src={preview}
            alt="Vista previa del producto"
            width={320}
            height={240}
            unoptimized
            className="max-h-60 w-full rounded-md object-contain"
          />
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="product-active"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={busy || (!hasImage && !file)}
            />
          )}
        />
        <label htmlFor="product-active" className="text-sm">
          Producto activo
        </label>
      </div>
      {!hasImage && !file ? (
        <p className="text-sm text-muted-foreground">
          Podés guardar un borrador. Para activarlo, primero seleccioná una
          imagen.
        </p>
      ) : null}
      {errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy
            ? uploading
              ? "Subiendo imagen…"
              : "Guardando…"
            : "Guardar producto"}
        </Button>
        {busy ? null : (
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/admin/products" />}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
