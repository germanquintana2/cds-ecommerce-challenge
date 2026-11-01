"use client";

import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { quantitySchema } from "~/server/validation/cart";
import { Input } from "~/components/ui/input";
import { ShoppingBag } from "lucide-react";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/toast";
import { api } from "~/lib/trpc/react";
import { useCartPanel } from "~/app/_components/cart-panel";

const addQuantitySchema = z.object({ quantity: quantitySchema });

export function AddToCartButton({ productId }: { productId: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof addQuantitySchema>>({
    resolver: zodResolver(addQuantitySchema),
    defaultValues: { quantity: 1 },
    mode: "onChange",
  });
  const router = useRouter();
  const pathname = usePathname();
  const { refreshCart } = useCartPanel();
  const mutation = api.cart.addItem.useMutation({
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        toast.add({
          title: "Iniciá sesión para agregar productos al carrito.",
          type: "info",
        });
        router.push(`/login?${new URLSearchParams({ next: pathname })}`);
        return;
      }
      toast.add({ title: error.message, type: "error" });
    },
    onSuccess: async () => {
      toast.add({ title: "Producto agregado al carrito.", type: "success" });
      await refreshCart();
    },
  });
  return (
    <form
      className="flex flex-col items-start gap-3"
      onSubmit={handleSubmit(({ quantity }) =>
        mutation.mutate({ productId, quantity }),
      )}
    >
      <div className="w-24">
        <Input
          id={`product-quantity-${productId}`}
          label="Cantidad"
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          step={1}
          disabled={mutation.isPending}
          errorMessage={
            errors.quantity
              ? "Ingresá una cantidad entera de 1 a 99."
              : undefined
          }
          {...register("quantity", { valueAsNumber: true })}
        />
      </div>
      <Button
        type="submit"
        disabled={mutation.isPending || Boolean(errors.quantity)}
      >
        <ShoppingBag data-icon="inline-start" />
        {mutation.isPending ? "Agregando…" : "Agregar al carrito"}
      </Button>
    </form>
  );
}
