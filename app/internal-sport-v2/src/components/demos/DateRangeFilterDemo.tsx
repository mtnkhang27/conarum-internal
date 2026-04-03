import { useState } from 'react';
import { DateRangeFilter } from '../ui/date-range-filter';
import type { DateRange } from '../filterbar/types';

export default function DateRangeFilterDemo() {
    const [range, setRange] = useState<DateRange>({ from: undefined, to: undefined });

    return (
        <div className="flex flex-col gap-4 w-full max-w-sm">
            <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Date Range Filter</label>
                <DateRangeFilter
                    config={{
                        key: 'demo-date-range',
                        label: 'Date Range',
                        labelKey: 'dateRange',
                        type: 'dateRange'
                    }}
                    value={range}
                    onChange={setRange}
                />
            </div>

            <div className="rounded-md bg-muted p-4 text-sm">
                <p className="font-semibold mb-2">Selected Range:</p>
                <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-muted-foreground">From:</span>
                    <span className="font-mono">
                        {range.from ? range.from.toLocaleDateString() : '-'}
                    </span>

                    <span className="text-muted-foreground">To:</span>
                    <span className="font-mono">
                        {range.to ? range.to.toLocaleDateString() : '-'}
                    </span>
                </div>
            </div>

            <div className="text-xs text-muted-foreground">
                <p>Features:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Type directly in the input (e.g. "2024-01-01 - 2024-01-31")</li>
                    <li>Select range via calendar popup</li>
                    <li>SAP UI5 style design (Input + Icon on right)</li>
                    <li>Year/Month navigation</li>
                </ul>
            </div>
        </div>
    );
}
