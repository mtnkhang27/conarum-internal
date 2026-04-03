import * as React from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

export interface TokenProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
    onRemove?: (e: React.MouseEvent) => void;
    removable?: boolean;
}

/**
 * Token component for displaying removable tags/chips
 * Used in MultiSelectFilter, ValueHelpFilter, etc.
 */
const Token = React.forwardRef<HTMLSpanElement, TokenProps>(
    ({ className, children, onRemove, removable = true, ...props }, ref) => {
        const handleRemoveMouseDown = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
        };

        const handleRemoveClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove?.(e);
        };

        return (
            <span
                ref={ref}
                className={cn(
                    "inline-flex items-center gap-1 text-sm h-6 px-1.5 bg-transparent text-foreground border border-primary rounded-md shrink-0 min-w-0",
                    className
                )}
                {...props}
            >
                <span className="truncate">{children}</span>
                {removable && onRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 p-0.5 hover:bg-primary/20"
                        onMouseDown={handleRemoveMouseDown}
                        onClick={handleRemoveClick}
                    >
                        <X className="w-3 h-3 text-primary" />
                    </Button>
                )}
            </span>
        );
    }
);

Token.displayName = "Token";

export { Token };
