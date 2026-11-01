"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth/client";
import { safeReturnPath } from "~/lib/return-path";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresá al menos 2 caracteres.").max(100),
    email: z.email("Ingresá un email válido."),
    password: z.string().min(12, "Usá al menos 12 caracteres.").max(128),
    confirmation: z.string(),
  })
  .refine((data) => data.password === data.confirmation, {
    path: ["confirmation"],
    message: "Las contraseñas no coinciden.",
  });

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmation: "" },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    try {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
      });
      if (error) {
        setError("root", {
          message:
            "No pudimos crear la cuenta. Revisá los datos o probá iniciar sesión.",
        });
        return;
      }
      startTransition(() => {
        router.replace(
          safeReturnPath(
            new URLSearchParams(window.location.search).get("next"),
          ),
        );
        router.refresh();
      });
    } catch {
      setError("root", { message: "No se pudo conectar. Intentá nuevamente." });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        id="name"
        label="Nombre"
        autoComplete="name"
        maxLength={100}
        errorMessage={errors.name?.message}
        {...register("name")}
      />
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
        type="password"
        label="Contraseña"
        autoComplete="new-password"
        maxLength={128}
        errorMessage={errors.password?.message}
        {...register("password")}
      />
      <Input
        id="confirmation"
        type="password"
        label="Repetir contraseña"
        autoComplete="new-password"
        maxLength={128}
        errorMessage={errors.confirmation?.message}
        {...register("confirmation")}
      />
      {errors.root ? (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting || pending}>
        {isSubmitting || pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
