import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "~/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  errorMessage?: string;
  iconRight?: React.ReactNode;
};

function Input({
  className,
  type,
  id,
  label,
  errorMessage,
  iconRight,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      )}

      <div className="relative">
        <InputPrimitive
          id={id}
          type={type}
          data-slot="input"
          aria-invalid={!!errorMessage}
          className={cn(
            "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
            iconRight && "pr-9",
            className,
          )}
          {...props}
        />

        {iconRight && (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {iconRight}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}

export { Input };
