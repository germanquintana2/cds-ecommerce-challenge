import { api } from "~/lib/trpc/server";
import Link from "next/link";

export default async function ItemsList() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const items = await api.toDoItem.list();

  return (
    <>
      {items.length === 0 ? (
        <p className="text-sm text-foreground/60">No to-do items yet.</p>
      ) : (
        <ul className="flex flex-col gap-2 px-4">
          {items.map((item) => (
            <li key={item.id} className="list-decimal">
              <Link
                href={`/to-do/${item.id}`}
                className="font-medium hover:underline"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
