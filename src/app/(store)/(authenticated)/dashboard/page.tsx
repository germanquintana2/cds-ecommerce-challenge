import { redirect } from "next/navigation";

// Preserve existing bookmarks without keeping a redundant account screen.
export default function DashboardPage() {
  redirect("/profile");
}
