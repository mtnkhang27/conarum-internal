/**
 * StatusBadge — Generic status badge UI component.
 * A simple pill-shaped badge with configurable color classes and optional pulse animation.
 *
 * Usage:
 *   <StatusBadge badgeClass="bg-info-bg text-info border-info/30" label="Pending" animated />
 */

import React from 'react';

const BASE = 'px-2 py-0.5 rounded-lg font-bold border text-sm inline-block text-left w-fit';

export function StatusBadge({ badgeClass, label, animated }: { badgeClass: string; label: string; animated?: boolean }) {
    return (
        <span className={`${BASE} ${badgeClass} ${animated ? 'animate-pulse' : ''}`}>
            {label}
        </span>
    );
}
