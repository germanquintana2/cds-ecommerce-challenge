"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  Package,
  UserRound,
  Settings,
  Tags,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { authClient } from "~/lib/auth/client";
import { toast } from "~/components/ui/toast";

export function UserMenu({
  name,
  isAdmin = false,
}: {
  name: string;
  isAdmin?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error("Sign out failed");
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="secondary" disabled={busy} />}
      >
        <UserRound data-icon="inline-start" />
        <span className="max-w-16 truncate sm:max-w-40">
          {busy ? "Cerrando sesión…" : name}
        </span>
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/profile" />}>
            <UserRound />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/orders" />}>
            <Package />
            Mis compras
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/admin/products" />}>
                <Settings />
                Productos
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/admin/categories" />}>
                <Tags />
                Categorías
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={busy} onClick={() => void signOut()}>
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
