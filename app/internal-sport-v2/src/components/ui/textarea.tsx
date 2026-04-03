import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const textareaVariants = cva(
  // Base styles applied to all variants
  "flex field-sizing-content min-h-16 w-full resize-y rounded-md border-2 px-3 py-2 text-base transition-[color,box-shadow,border-color] outline-none md:text-sm placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
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
          "cursor-not-allowed pointer-events-none resize-none",
        ],
        info: [
          "bg-[var(--info-bg)] border-[var(--info)] text-foreground",
          "cursor-not-allowed pointer-events-none resize-none",
        ],
        success: [
          "bg-[var(--success-bg)] border-[var(--success)] text-foreground",
          "cursor-not-allowed pointer-events-none resize-none",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
  VariantProps<typeof textareaVariants> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, disabled, readOnly, ...props }, ref) => {
    // Auto-detect readonly variant if disabled/readOnly is set but no variant specified
    const effectiveVariant = variant ?? (disabled || readOnly ? "readonly" : "default");

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(textareaVariants({ variant: effectiveVariant }), className)}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
