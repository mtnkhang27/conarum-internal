/**
 * ResizablePanel Component
 * A split panel layout with a draggable divider for resizing
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface ResizablePanelProps {
    leftPanel: ReactNode;
    rightPanel: ReactNode;
    initialLeftWidth?: number; // Percentage (0-100)
    minLeftWidth?: number; // Percentage (0-100)
    maxLeftWidth?: number; // Percentage (0-100)
    className?: string;
    onResize?: (leftWidth: number) => void;
}

export function ResizablePanel({
    leftPanel,
    rightPanel,
    initialLeftWidth = 40,
    minLeftWidth = 20,
    maxLeftWidth = 80,
    className = '',
    onResize,
}: ResizablePanelProps) {
    const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

            // Clamp to min/max
            const clampedWidth = Math.max(minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));

            setLeftWidth(clampedWidth);
            onResize?.(clampedWidth);
        },
        [isDragging, minLeftWidth, maxLeftWidth, onResize]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add/remove event listeners for drag
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Prevent text selection while dragging
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={containerRef}
            className={cn('flex h-full w-full relative', className)}
        >
            {/* Left Panel */}
            <div
                className="h-full min-h-0 min-w-0 overflow-hidden flex flex-col p-1"
                style={{ width: `${leftWidth}%`, pointerEvents: isDragging ? 'none' : undefined }}
            >
                {leftPanel}
            </div>

            {/* Divider */}
            <div
                className={cn(
                    'relative flex-shrink-0 transition-all',
                    isDragging ? 'w-1' : 'w-0.5',
                    isHovering || isDragging
                        ? 'bg-primary'
                        : 'bg-border'
                )}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {/* Expanded Hit Area */}
                <div
                    className={cn(
                        'absolute inset-y-0 -left-1 -right-1 cursor-col-resize z-10',
                        'hover:bg-primary/10 transition-colors'
                    )}
                    onMouseDown={handleMouseDown}
                />
            </div>

            {/* Right Panel */}
            <div
                className="h-full overflow-hidden flex-1 p-1"
                style={{ width: `${100 - leftWidth}%`, pointerEvents: isDragging ? 'none' : undefined }}
            >
                {rightPanel}
            </div>
        </div>
    );
}
