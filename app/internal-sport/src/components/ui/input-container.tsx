import * as React from "react";

import { cn } from "@/lib/utils";

type InputContainerVariant =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "readonly";

export interface InputContainerProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  isOpen?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: InputContainerVariant;
  children?: React.ReactNode;
}

const variantClassMap: Record<InputContainerVariant, string> = {
  default: "",
  info: "border-info bg-info/10 text-foreground",
  success: "border-emerald-600 bg-emerald-600/10 text-foreground",
  warning: "border-amber-500 bg-amber-500/10 text-foreground",
  destructive: "border-destructive bg-destructive/10 text-foreground",
  readonly: "bg-muted text-muted-foreground",
};

const InputContainer = React.forwardRef<HTMLDivElement, InputContainerProps>(
  (
    { className, variant, disabled = false, readOnly = false, isOpen = false, children, ...props },
    ref,
  ) => {
    const effectiveVariant: InputContainerVariant =
      variant ?? (disabled || readOnly ? "readonly" : "default");

    return (
      <div
        ref={ref}
        aria-disabled={disabled}
        aria-readonly={readOnly}
        className={cn(
          "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs",
          "transition-[color,box-shadow,border-color] outline-none md:text-sm",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          variantClassMap[effectiveVariant],
          (disabled || readOnly || effectiveVariant === "readonly") &&
            "pointer-events-none cursor-not-allowed opacity-50",
          isOpen && "border-ring ring-ring/50 ring-[3px]",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
InputContainer.displayName = "InputContainer";

export { InputContainer };
