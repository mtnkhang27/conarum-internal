import { useState } from 'react';
import { TextFilter } from '../ui/text-filter';
import { MultiSelectFilter } from '../ui/multi-select-filter';
import { DateRangeFilter } from '../ui/date-range-filter';
import { ValueHelpFilter } from '../ui/value-help-filter';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import type { DateRange } from '../filterbar/types';

// Mock Data
const STATUS_OPTIONS = [
    { value: 'new', label: 'New' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
];

const SUPPLIERS = [
    { id: '1', name: 'Acme Corp', country: 'USA' },
    { id: '2', name: 'Globex', country: 'Germany' },
    { id: '3', name: 'Soylent Corp', country: 'Japan' },
    { id: '4', name: 'Umbrella Corp', country: 'UK' },
];

// Mock Value Help Component
function MockSupplierValueHelp({ open, onClose, onSelect, selectedIds }: any) {
    const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds || []));

    const toggle = (id: string) => {
        const newSet = new Set(selected);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelected(newSet);
    };

    const handleConfirm = () => {
        const items = SUPPLIERS.filter(s => selected.has(s.id));
        onSelect(items);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select Suppliers</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    {SUPPLIERS.map(supplier => (
                        <div
                            key={supplier.id}
                            className={`p-2 border rounded cursor-pointer ${selected.has(supplier.id) ? 'bg-primary/10 border-primary' : 'hover:bg-accent'}`}
                            onClick={() => toggle(supplier.id)}
                        >
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-xs text-muted-foreground">{supplier.country}</div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm}>Select</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function FilterBarDemo() {
    // State
    const [textValue, setTextValue] = useState('');
    const [statusValue, setStatusValue] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [suppliers, setSuppliers] = useState<any[]>([]);

    return (
        <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
                {/* Text Filter */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-medium mb-2">Text Filter</h3>
                        <TextFilter
                            config={{
                                key: 'search',
                                label: 'Search',
                                type: 'text',
                                placeholder: 'Search...'
                            }}
                            value={textValue}
                            onChange={setTextValue}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        Value: {JSON.stringify(textValue)}
                    </div>
                </div>

                {/* Multi Select Filter */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-medium mb-2">Multi Select Filter</h3>
                        <MultiSelectFilter
                            config={{
                                key: 'status',
                                label: 'Status',
                                type: 'multiselect',
                                options: STATUS_OPTIONS
                            }}
                            value={statusValue}
                            onChange={setStatusValue}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        Value: {JSON.stringify(statusValue)}
                    </div>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-medium mb-2">Date Range Filter</h3>
                        <DateRangeFilter
                            config={{
                                key: 'date',
                                label: 'Date',
                                type: 'dateRange'
                            }}
                            value={dateRange}
                            onChange={setDateRange}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        From: {dateRange.from?.toLocaleDateString() || '-'}, To: {dateRange.to?.toLocaleDateString() || '-'}
                    </div>
                </div>

                {/* Value Help Filter */}
                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-medium mb-2">Value Help Filter</h3>
                        <ValueHelpFilter
                            config={{
                                key: 'supplier',
                                label: 'Supplier',
                                type: 'valueHelp',
                                valueHelpComponent: MockSupplierValueHelp,
                                displayField: 'name',
                                valueField: 'id'
                            }}
                            value={suppliers}
                            onChange={setSuppliers}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        Value: {JSON.stringify(suppliers)}
                    </div>
                </div>
            </div>

            <div className="rounded-md border p-4 bg-card">
                <h3 className="font-semibold mb-2">About Filter Components</h3>
                <p className="text-sm text-muted-foreground">
                    These components are designed to be used within the <code>FilterBar</code> component but can also be used independently.
                    They follow SAP UI5 design patterns including:
                </p>
                <ul className="list-disc pl-5 mt-2 text-sm text-muted-foreground space-y-1">
                    <li>Consistent height and border styling</li>
                    <li>Token-based selection for multi-value inputs</li>
                    <li>Right-aligned icons (calendar, copy, chevron)</li>
                    <li>Hover and focus states aligned with the theme</li>
                </ul>
            </div>
        </div>
    );
}
