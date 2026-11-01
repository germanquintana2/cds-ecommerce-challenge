import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { api } from "~/lib/trpc/server";

const categoryLinkClass =
  "block min-w-0 rounded-md px-3 py-2.5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";
export async function StoreSidebar() {
  const categories = await api.category.navigation();
  return (
    <nav aria-label="Categorías del catálogo" className="flex flex-col gap-1">
      <Link
        href="/"
        className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <LayoutGrid size={22} aria-hidden="true" />
        <span>Catálogo</span>
      </Link>
      <div className="ml-6 flex flex-col gap-1 border-l pl-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/?category=${encodeURIComponent(category.id)}`}
            className={categoryLinkClass}
          >
            <span className="break-words">{category.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
