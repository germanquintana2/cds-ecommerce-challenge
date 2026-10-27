import { format } from "date-fns";
import { api } from "~/lib/trpc/server";

type ToDoDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ToDoDetailPage({ params }: ToDoDetailPageProps) {
  const { id } = await params;
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const item = await api.toDoItem.byId({ id });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col ">
        <h1 className="text-xl font-semibold">{item.title}</h1>

        <p className="text-sm text-foreground/60">
          Created {format(item.createdAt, "d/M/yyyy")}
        </p>
      </div>

      {item.description && <p>{item.description}</p>}
    </div>
  );
}
