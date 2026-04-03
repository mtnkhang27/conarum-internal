/**
 * ScrollContainer
 * A reusable scrollable container for areas needing both horizontal and vertical scroll.
 * Uses the app's global thin scrollbar styles from theme.css.
 * 
 * Replaces Radix ScrollArea for cases where:
 * - Both horizontal AND vertical scroll are needed
 * - Dynamic height in flex/dialog layouts
 * - Native scrollbar behavior is preferred
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Maximum height — triggers vertical scroll when content exceeds this */
    maxHeight?: string;
    /** Scroll direction: 'vertical' | 'horizontal' | 'both' (default: 'both') */
    direction?: 'vertical' | 'horizontal' | 'both';
}

const ScrollContainer = forwardRef<HTMLDivElement, ScrollContainerProps>(
    ({ className, maxHeight, direction = 'both', style, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                direction === 'vertical' && 'overflow-y-auto overflow-x-hidden',
                direction === 'horizontal' && 'overflow-x-scroll overflow-y-hidden',
                direction === 'both' && 'overflow-y-auto overflow-x-scroll',
                className
            )}
            style={{ maxHeight, ...style }}
            {...props}
        >
            {children}
        </div>
    )
);
ScrollContainer.displayName = 'ScrollContainer';

export { ScrollContainer };
