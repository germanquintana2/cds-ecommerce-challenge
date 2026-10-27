import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

export default function ToDoDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm text-foreground/60 hover:underline"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to dashboard
      </Link>

      {children}
    </div>
  );
}
