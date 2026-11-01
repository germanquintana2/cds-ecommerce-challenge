"use client";

import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth/client";
import { useState } from "react";
import { toast } from "~/components/ui/toast";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error("No se pudo cerrar la sesión.");
      // A fresh document discards cached protected routes and in-flight
      // redirects triggered when the session disappears from the profile.
      window.location.replace("/");
    } catch {
      toast.add({
        title: "No se pudo cerrar la sesión. Intentá nuevamente.",
        type: "error",
      });
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={busy}
      className="w-full"
    >
      {busy ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
