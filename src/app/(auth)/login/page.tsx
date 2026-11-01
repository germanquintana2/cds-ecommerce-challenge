"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth/client";
import { safeReturnPath } from "~/lib/return-path";

const loginSchema = z.object({
  email: z.email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError("root", {
          message: "No pudimos iniciar sesión. Revisá tu email y contraseña.",
        });
        return;
      }

      const target = safeReturnPath(
        new URLSearchParams(window.location.search).get("next"),
      );
      startTransition(() => {
        router.replace(target);
        router.refresh();
      });
    } catch {
      setError("root", { message: "No se pudo conectar. Intentá nuevamente." });
    }
  });

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 p-6">
      <Link
        href="/"
        className="rounded-sm text-2xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-ring"
        aria-label="CDS · Tienda, ir al catálogo"
      >
        CDS · Tienda
      </Link>
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Email"
            autoComplete="email"
            errorMessage={errors.email?.message}
            {...register("email")}
          />

          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            label="Contraseña"
            autoComplete="current-password"
            errorMessage={errors.password?.message}
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="text-foreground/50 hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            }
            {...register("password")}
          />

          {errors.root && (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || pending}
            variant="outline"
            className="w-full"
          >
            {isSubmitting || pending ? "Ingresando…" : "Iniciar sesión"}
          </Button>
        </form>
        <p className="text-sm">
          ¿Todavía no tenés cuenta?{" "}
          <a href="/signup" className="underline">
            Registrate
          </a>
        </p>
      </div>
    </main>
  );
}
