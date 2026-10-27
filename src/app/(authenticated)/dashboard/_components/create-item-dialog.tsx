"use client";

import { Button } from "~/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

import { CreateItemForm } from "./create-item-form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";

export function CreateItemDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const onSuccess = () => {
    setIsOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="w-fit">
            <PlusIcon className="w-4 h-4" />
            Create
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create to-do item</DialogTitle>

          <DialogDescription>
            Add a new item to your to-do list.
          </DialogDescription>
        </DialogHeader>

        <CreateItemForm onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  );
}
