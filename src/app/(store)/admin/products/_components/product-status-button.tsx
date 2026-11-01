"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { toast } from "~/components/ui/toast";
import { api } from "~/lib/trpc/react";

export function ProductStatusButton({
  id,
  active,
  hasImage,
}: {
  id: string;
  active: boolean;
  hasImage: boolean;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const mutation = api.adminProduct.setActive.useMutation({
    onError: (error) => toast.add({ title: error.message, type: "error" }),
    onSuccess: () =>
      startTransition(() => {
        router.refresh();
      }),
  });
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={mutation.isPending || refreshing || (!active && !hasImage)}
      title={
        !active && !hasImage
          ? "Subí una imagen para activar el producto."
          : undefined
      }
      onClick={() => mutation.mutate({ id, active: !active })}
    >
      {mutation.isPending || refreshing
        ? "Guardando…"
        : active
          ? "Desactivar"
          : "Activar"}
    </Button>
  );
}
