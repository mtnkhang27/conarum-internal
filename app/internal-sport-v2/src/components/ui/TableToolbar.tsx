
import React from 'react';
import { cn } from '@/utils/cn';

interface TableToolbarProps {
    title: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

export function TableToolbar({ title, children, className }: TableToolbarProps) {
    return (
        <div className={cn("px-6 py-4 border-b rounded-t-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white relative z-10", className)}>
            <div className="text-lg font-semibold text-foreground shrink-0">
                {title}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {children}
            </div>
        </div>
    );
}
