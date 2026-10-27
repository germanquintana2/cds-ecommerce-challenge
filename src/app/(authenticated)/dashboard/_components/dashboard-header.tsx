import { headers } from "next/headers";
import { auth } from "~/lib/auth";
import { api } from "~/lib/trpc/server";
import { CreateItemDialog } from "./create-item-dialog";
import DeleteAllItemsButton from "./delete-all-items-button";

export default async function Header() {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const user = await auth.api.getSession({
    headers: await headers(),
  });

  const itemCount = await api.toDoItem.count();

  return (
    <div className="flex justify-between">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold">Hello {user?.user.name},</h1>

        <h2 className="text-lg font-medium">
          You have {itemCount} items in your to-do list
        </h2>
      </div>

      <div className="flex gap-2">
        <CreateItemDialog />

        <DeleteAllItemsButton />
      </div>
    </div>
  );
}
