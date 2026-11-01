"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { loginPath } from "~/lib/return-path";

export function SignInRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const destination = loginPath(pathname + (params.size ? `?${params}` : ""));
  useEffect(() => {
    router.replace(destination);
  }, [router, destination]);
  return (
    <p role="status" className="p-6">
      Tu sesión terminó. Te llevamos a iniciar sesión…
    </p>
  );
}
