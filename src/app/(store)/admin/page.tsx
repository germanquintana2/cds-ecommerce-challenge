import { redirect } from "next/navigation";

// The admin layout intentionally omits this page when access is denied.
// Do not validate instant rendering for a segment that may not be rendered.
export const instant = false;

export default function AdminPage() {
  redirect("/admin/products");
}
