"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

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
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setError("root", {
        message: signInError.message ?? "Failed to sign in.",
      });
      return;
    }

    router.push("/dashboard");
  });

  return (
    <div className="flex min-h-full flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-foreground/10 p-6">
        <h1 className="text-xl font-semibold">Log in</h1>

        <form onSubmit={onSubmit} className="space-y-4">
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
            label="Password"
            autoComplete="current-password"
            errorMessage={errors.password?.message}
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            <p className="text-sm text-red-500">{errors.root.message}</p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            variant="outline"
            className="w-full"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
