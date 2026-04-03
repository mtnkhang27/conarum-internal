import React, { useState, useCallback, useRef } from 'react';
import { TableHead } from '@/components/ui/table';

interface ResizableTableHeaderProps {
    children: React.ReactNode;
    columnKey: string;
    initialWidth?: number;
    minWidth?: number;
    onWidthChange?: (key: string, width: number) => void;
    className?: string;
}

/**
 * A resizable table header cell with a draggable right border
 * Drag the right edge to resize the column width
 */
export function ResizableTableHeader({
    children,
    columnKey,
    initialWidth = 150,
    minWidth = 50,
    onWidthChange,
    className = '',
}: ResizableTableHeaderProps) {
    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        startXRef.current = e.clientX;
        startWidthRef.current = width;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startXRef.current;
            const newWidth = Math.max(minWidth, startWidthRef.current + delta);
            setWidth(newWidth);
            onWidthChange?.(columnKey, newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [width, minWidth, columnKey, onWidthChange]);

    return (
        <TableHead
            style={{ width: `${width}px`, minWidth: `${minWidth}px`, position: 'relative' }}
            className={`group select-none ${className}`}
        >
            <div className="flex items-center justify-between pr-2">
                <span className="truncate">{children}</span>
            </div>
            {/* Resize handle */}
            <div
                className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize 
          hover:bg-[var(--color-primary)] transition-colors
          ${isResizing ? 'bg-[var(--color-primary)]' : 'bg-transparent group-hover:bg-border'}`}
                onMouseDown={handleMouseDown}
                onClick={(e) => e.stopPropagation()}
            />
        </TableHead>
    );
}

/**
 * Hook to manage column widths state
 */
export function useColumnWidths(columns: { key: string; width?: number }[]) {
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        columns.forEach((col) => {
            initial[col.key] = col.width || 150;
        });
        return initial;
    });

    const handleWidthChange = useCallback((key: string, width: number) => {
        setColumnWidths((prev) => ({ ...prev, [key]: width }));
    }, []);

    return { columnWidths, handleWidthChange };
}
