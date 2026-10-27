"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toast } from "~/components/ui/toast";
import { api } from "~/lib/trpc/react";

const formSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

type FormSchema = z.infer<typeof formSchema>;

type Props = {
  onSuccess: () => void;
};

export function CreateItemForm({ onSuccess }: Props) {
  const [isRefreshing, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormSchema>({
    defaultValues: { title: "", description: "" },
    resolver: zodResolver(formSchema),
  });

  const { mutate: createToDoItem, isPending } = api.toDoItem.create.useMutation(
    {
      onSuccess: () => {
        startTransition(() => {
          onSuccess();
        });
      },

      onError: (error) => {
        toast.add({ title: error.message, type: "error" });
      },
    },
  );

  const onSubmit = handleSubmit((data) => {
    createToDoItem(data);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        id="title"
        label="Title"
        errorMessage={errors.title ? "Title is required." : undefined}
        {...register("title", { required: true })}
      />

      <Input
        id="description"
        label="Description"
        {...register("description")}
      />

      <Button
        type="submit"
        className="w-full"
        variant="secondary"
        disabled={isPending || isRefreshing}
      >
        {isPending || isRefreshing ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}
