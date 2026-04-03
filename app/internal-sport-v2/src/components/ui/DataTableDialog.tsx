import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from './DataTable';

/**
 * DataTableDialog Props
 */
export interface DataTableDialogProps<T = any> {
    /** Whether the dialog is open */
    open: boolean;
    /** Handler to close the dialog */
    onOpenChange: (open: boolean) => void;
    /** Dialog title */
    title: string;
    /** Column definitions for the table */
    columns: DataTableColumn<T>[];
    /** Function to fetch data (returns promise with items) */
    fetchData: (searchTerm?: string) => Promise<T[]>;
    /** Function to search data (optional, if different from fetchData) */
    searchData?: (searchTerm: string) => Promise<T[]>;
    /** Function to get unique ID from a row */
    getRowId: (row: T) => string;
    /** Function to get display name for selected items */
    getDisplayName?: (row: T) => string;
    /** Selection mode */
    selectionMode?: 'single' | 'multiple';
    /** Initially selected items */
    initialSelection?: T[];
    /** Handler called when selection is confirmed */
    onConfirm: (selectedItems: T[]) => void;
    /** Placeholder for search input */
    searchPlaceholder?: string;
    /** Label for confirm button */
    confirmLabel?: string;
    /** Label for cancel button */
    cancelLabel?: string;
    /** Show search bar (default: true) */
    showSearch?: boolean;
    /** Dialog width (default: 'max-w-4xl') */
    width?: string;
}

/**
 * DataTableDialog - A dialog containing a DataTable for selection
 *
 * Use cases:
 * - Add Questionnaires dialog
 * - Add Suppliers dialog
 * - Add Appraisers dialog
 * - Any entity selection with filtering
 */
export function DataTableDialog<T = any>({
    open,
    onOpenChange,
    title,
    columns,
    fetchData,
    searchData,
    getRowId,
    getDisplayName = (row) => getRowId(row),
    selectionMode = 'multiple',
    initialSelection = [],
    onConfirm,
    searchPlaceholder,
    confirmLabel,
    cancelLabel,
    showSearch = true,
    width = 'max-w-4xl',
}: DataTableDialogProps<T>) {
    const { t } = useTranslation();
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(initialSelection.map(getRowId))
    );
    const [selectedItems, setSelectedItems] = useState<T[]>(initialSelection);

    // Fetch data when dialog opens
    useEffect(() => {
        if (open) {
            loadData();
            // Reset selection to initial
            setSelectedIds(new Set(initialSelection.map(getRowId)));
            setSelectedItems(initialSelection);
            setSearchTerm('');
        }
    }, [open]);

    const loadData = useCallback(async (term?: string) => {
        setIsLoading(true);
        try {
            const fetchFn = term && searchData ? searchData : fetchData;
            const result = await fetchFn(term || '');
            setData(result);
        } catch (error) {
            console.error('Failed to fetch data for dialog:', error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchData, searchData]);

    // Handle search
    const handleSearch = useCallback(() => {
        if (searchTerm.trim()) {
            loadData(searchTerm.trim());
        } else {
            loadData();
        }
    }, [searchTerm, loadData]);

    // Handle selection change
    const handleSelectionChange = useCallback(
        (newSelectedIds: Set<string>) => {
            setSelectedIds(newSelectedIds);
            // Update selected items based on current data
            const newSelectedItems = data.filter((item) =>
                newSelectedIds.has(getRowId(item))
            );
            // Merge with previously selected items not in current data
            const previousSelected = selectedItems.filter(
                (item) => newSelectedIds.has(getRowId(item)) && !data.some((d) => getRowId(d) === getRowId(item))
            );
            setSelectedItems([...previousSelected, ...newSelectedItems]);
        },
        [data, selectedItems, getRowId]
    );

    // Remove a selected item
    const handleRemoveSelected = useCallback(
        (id: string) => {
            const newSelectedIds = new Set(selectedIds);
            newSelectedIds.delete(id);
            setSelectedIds(newSelectedIds);
            setSelectedItems((prev) => prev.filter((item) => getRowId(item) !== id));
        },
        [selectedIds, getRowId]
    );

    // Confirm selection
    const handleConfirm = useCallback(() => {
        onConfirm(selectedItems);
        onOpenChange(false);
    }, [selectedItems, onConfirm, onOpenChange]);

    // Cancel
    const handleCancel = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`${width} max-h-[85vh] flex flex-col`}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* Search Bar */}
                    {showSearch && (
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    className="pl-10"
                                    placeholder={searchPlaceholder || t('common.search', 'Search...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <Button onClick={handleSearch} disabled={isLoading}>
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    t('common.search', 'Search')
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Selected Items (for multiple selection) */}
                    {selectionMode === 'multiple' && selectedItems.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg border">
                            <span className="text-sm text-muted-foreground mr-2">
                                {t('common.selected', 'Selected')} ({selectedItems.length}):
                            </span>
                            {selectedItems.map((item) => {
                                const id = getRowId(item);
                                return (
                                    <Badge
                                        key={id}
                                        variant="outline"
                                        className="flex items-center gap-1 text-sm px-2 py-1 bg-background"
                                    >
                                        {getDisplayName(item)}
                                        <X
                                            className="w-3 h-3 cursor-pointer hover:text-primary"
                                            onClick={() => handleRemoveSelected(id)}
                                        />
                                    </Badge>
                                );
                            })}
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="flex-1 overflow-auto min-h-[300px]">
                        <DataTable
                            data={data}
                            columns={columns}
                            isLoading={isLoading}
                            selection={{
                                enabled: true,
                                mode: selectionMode,
                                selectedIds,
                                onSelectionChange: handleSelectionChange,
                                getRowId,
                            }}
                            showFooter={false}
                            emptyMessageKey="common.noResults"
                            className="border-0 shadow-none"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 mt-4">
                    <Button variant="outline" onClick={handleCancel}>
                        {cancelLabel || t('common.cancel', 'Cancel')}
                    </Button>
                    <Button onClick={handleConfirm} disabled={selectedItems.length === 0}>
                        {confirmLabel || t('common.confirm', 'Confirm')} ({selectedItems.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default DataTableDialog;
