import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export function ListPagination({
  total,
  label,
  page,
  pages,
  pageUrl,
  ariaLabel,
}: {
  total: number;
  label: string;
  page: number;
  pages: number;
  pageUrl: (page: number) => string;
  ariaLabel: string;
}) {
  return (
    <footer className="flex items-center justify-between gap-2 text-xs sm:gap-4 sm:text-sm">
      <p>
        {total} {label} · Página {page} de {pages}
      </p>
      <nav aria-label={ariaLabel} className="flex shrink-0 gap-2 sm:gap-3">
        {page > 1 ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={pageUrl(page - 1)} />}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Atrás</span>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Atrás</span>
          </Button>
        )}
        {page < pages ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={pageUrl(page + 1)} />}
          >
            <span className="sr-only sm:not-sr-only">Adelante</span>
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="outline" disabled>
            <span className="sr-only sm:not-sr-only">Adelante</span>
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        )}
      </nav>
    </footer>
  );
}
