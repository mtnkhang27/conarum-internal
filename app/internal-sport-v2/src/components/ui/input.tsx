import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const inputVariants = cva(
  // Base styles applied to all variants
  "flex h-8 w-full min-w-0 rounded-md border-2 px-3 py-1 text-sm transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
  {
    variants: {
      variant: {
        default: [
          "bg-card border-[var(--input-border)]",
          "hover:border-[var(--input-border-hover)]",
          "focus:border-[var(--color-brand)]",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        ],
        readonly: [
          "bg-muted border-border text-muted-foreground",
          "cursor-not-allowed",
        ],
        info: [
          "bg-[var(--info-bg)] border-[var(--info)] text-foreground",
          "cursor-not-allowed pointer-events-none",
        ],
        success: [
          "bg-[var(--success-bg)] border-[var(--success)] text-foreground",
          "cursor-not-allowed pointer-events-none",
        ],
        warning: [
          "bg-[var(--warning-bg)] border-[var(--warning)] text-foreground",
          "cursor-not-allowed pointer-events-none",
        ],
        destructive: [
          "bg-destructive/10 border-destructive text-foreground",
          "cursor-not-allowed pointer-events-none",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends React.ComponentProps<"input">,
  VariantProps<typeof inputVariants> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, disabled, readOnly, ...props }, ref) => {
    // Auto-detect readonly variant if disabled/readOnly is set but no variant specified
    const effectiveVariant = variant ?? (disabled || readOnly ? "readonly" : "default");

    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(inputVariants({ variant: effectiveVariant }), className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
