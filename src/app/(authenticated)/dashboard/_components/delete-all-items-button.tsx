"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";

import { toast } from "~/components/ui/toast";
import { api } from "~/lib/trpc/react";
import { TrashIcon } from "lucide-react";

export default function DeleteAllItemsButton() {
  const [isRefreshing, startTransition] = useTransition();
  const router = useRouter();

  const { mutate: deleteAllItems, isPending } =
    api.toDoItem.deleteAll.useMutation({
      onSuccess: () => {
        startTransition(() => {
          router.refresh();
        });
      },

      onError: (error) => {
        toast.add({ title: error.message, type: "error" });
      },
    });

  return (
    <div className="w-fit">
      <Button
        variant="destructive"
        disabled={isPending || isRefreshing}
        onClick={() => deleteAllItems()}
      >
        <TrashIcon className="w-4 h-4" />
        {isPending || isRefreshing ? "Deleting…" : "Delete all"}
      </Button>
    </div>
  );
}
