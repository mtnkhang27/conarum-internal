import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { inputVariants } from "./input";
import { cn } from "./utils";

/**
 * InputContainer - A div-based component that extends Input's styling
 * Used for composite filter components that need to contain multiple elements (tokens, icons, nested inputs)
 * while maintaining the EXACT same visual style and behavior as the standard Input component.
 * 
 * This component shares the same variant logic as Input.tsx to ensure consistency.
 */
export interface InputContainerProps
    extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof inputVariants> {
    isOpen?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    children?: React.ReactNode;
}

const InputContainer = React.forwardRef<HTMLDivElement, InputContainerProps>(
    ({ className, variant, disabled, readOnly, isOpen, children, ...props }, ref) => {
        // Use the SAME variant detection logic as Input component
        // This ensures InputContainer behaves identically to Input
        const effectiveVariant = variant ?? (disabled || readOnly ? "readonly" : "default");

        return (
            <div
                ref={ref}
                aria-disabled={disabled}
                aria-readonly={readOnly}
                className={cn(
                    // Use the exact same inputVariants as Input component
                    inputVariants({ variant: effectiveVariant }),
                    // Override cursor and height for container use case
                    "cursor-pointer font-normal",
                    // Override fixed height to allow flexible content (tokens, multiple lines)
                    "!h-auto min-h-[2rem]",
                    // When open/focused, apply focus border (simulates focus state)
                    isOpen && "!border-2 !border-[var(--color-brand)]",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
InputContainer.displayName = "InputContainer";

export { InputContainer };
