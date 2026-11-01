"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/lib/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import { toast } from "~/components/ui/toast";

export function DeleteEntityButton({
  id,
  name,
  kind,
}: {
  id: string;
  name: string;
  kind: "product" | "category";
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const onError = (error: { message: string }) =>
    toast.add({ title: error.message, type: "error" });
  const onSuccess = () =>
    startTransition(async () => {
      await Promise.all([
        utils.adminProduct.list.invalidate(),
        utils.adminCategory.list.invalidate(),
      ]);
      router.refresh();
      setOpen(false);
      toast.add({
        title:
          kind === "product" ? "Producto eliminado." : "Categoría eliminada.",
        type: "success",
      });
    });
  const product = api.adminProduct.remove.useMutation({ onError, onSuccess });
  const category = api.adminCategory.remove.useMutation({ onError, onSuccess });
  const mutation = kind === "product" ? product : category;
  const busy = mutation.isPending || refreshing;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      <DialogTrigger
        render={<Button type="button" variant="destructive" size="sm" />}
      >
        Eliminar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {kind === "product" ? "Eliminar producto" : "Eliminar categoría"}
          </DialogTitle>
          <DialogDescription>
            ¿Querés eliminar “{name}”?{" "}
            {kind === "product"
              ? "Dejará de aparecer en el catálogo y en administración. Las compras anteriores se conservan y los carritos que lo incluyan lo mostrarán como no disponible."
              : "Sus productos no se eliminarán: quedarán sin categoría. Esta acción no se puede deshacer."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="outline" disabled={busy} />}
          >
            Cancelar
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => mutation.mutate({ id })}
          >
            {busy ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
