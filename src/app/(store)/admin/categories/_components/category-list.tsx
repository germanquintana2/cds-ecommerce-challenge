import { DeleteEntityButton } from "../../_components/delete-entity-button";
import { api } from "~/lib/trpc/server";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "~/components/ui/table";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export async function CategoryList() {
  const categories = await api.adminCategory.list();
  return (
    <div className="flex flex-col gap-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoría</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length ? (
            categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category._count.products}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      nativeButton={false}
                      render={
                        <Link href={`/admin/categories/${category.id}/edit`} />
                      }
                    >
                      Editar
                    </Button>
                    <DeleteEntityButton
                      id={category.id}
                      name={category.name}
                      kind="category"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-8 text-center text-muted-foreground"
              >
                Todavía no hay categorías.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <p className="text-sm">
        {categories.length}{" "}
        {categories.length === 1 ? "categoría" : "categorías"}
      </p>
    </div>
  );
}
