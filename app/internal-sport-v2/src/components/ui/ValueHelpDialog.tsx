import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface ValueHelpItem {
    id: string;
    name: string;
    description?: string;
}

interface ValueHelpDialogProps {
    title: string;
    triggerLabel: string;
    selectedItems: ValueHelpItem[];
    onSelect: (items: ValueHelpItem[]) => void;
    fetchItems: () => Promise<ValueHelpItem[]>;
    searchItems?: (searchTerm: string) => Promise<ValueHelpItem[]>;
    inputClassName?: string;
}

export function ValueHelpDialog({
    title,
    triggerLabel,
    selectedItems,
    onSelect,
    fetchItems,
    searchItems,
}: ValueHelpDialogProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<ValueHelpItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSelected, setTempSelected] = useState<ValueHelpItem[]>([]);

    // Fetch items when dialog opens
    useEffect(() => {
        if (isOpen) {
            loadItems();
            setTempSelected([...selectedItems]);
        }
    }, [isOpen]);

    // Search when search term changes
    useEffect(() => {
        if (isOpen && searchTerm && searchItems) {
            const delaySearch = setTimeout(() => {
                searchForItems(searchTerm);
            }, 300);
            return () => clearTimeout(delaySearch);
        } else if (isOpen && !searchTerm) {
            loadItems();
        }
    }, [searchTerm, isOpen]);

    const loadItems = async () => {
        setIsLoading(true);
        try {
            const result = await fetchItems();
            setItems(result);
        } catch (error) {
            console.error('Failed to fetch items:', error);
            setItems([]);
        } finally {
            setIsLoading(false);
        }
    };

    const searchForItems = async (term: string) => {
        if (!searchItems) return;
        setIsLoading(true);
        try {
            const result = await searchItems(term);
            setItems(result);
        } catch (error) {
            console.error('Failed to search items:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleItem = (item: ValueHelpItem) => {
        const isSelected = tempSelected.some((s) => s.id === item.id);
        if (isSelected) {
            setTempSelected(tempSelected.filter((s) => s.id !== item.id));
        } else {
            setTempSelected([...tempSelected, item]);
        }
    };

    const handleConfirm = () => {
        onSelect(tempSelected);
        setIsOpen(false);
    };

    const handleClear = () => {
        setTempSelected([]);
    };

    const handleRemoveSelected = (itemId: string) => {
        const newSelected = selectedItems.filter((s) => s.id !== itemId);
        onSelect(newSelected);
    };

    return (
        <div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <div
                        className="min-h-8 w-full flex flex-wrap items-center gap-1 px-3 py-1.5 border-2 rounded-md bg-input-background cursor-pointer transition-all border-[var(--input-border)] hover:border-[var(--input-border-hover)]"
                    >
                        {selectedItems.length > 0 ? (
                            <>
                                {selectedItems.map((item) => (
                                    <Badge
                                        key={item.id}
                                        variant="outline"
                                        className="text-sm px-1.5 py-0.5 bg-transparent text-[var(--color-primary)] border-[var(--color-primary)] hover:bg-primary/10 flex items-center gap-1"
                                    >
                                        {item.name}
                                        <X
                                            className="w-3 h-3 cursor-pointer hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveSelected(item.id);
                                            }}
                                        />
                                    </Badge>
                                ))}
                            </>
                        ) : (
                            <span className="text-muted-foreground text-sm">{triggerLabel}</span>
                        )}
                        <Search className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={t('common.search', 'Search...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Items list */}
                        <div className="max-h-64 overflow-y-auto border rounded-md">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t('common.noResults', 'No items found')}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {items.map((item) => {
                                        const isSelected = tempSelected.some((s) => s.id === item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer"
                                                onClick={() => handleToggleItem(item)}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => handleToggleItem(item)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">{item.name}</div>
                                                    {item.description && (
                                                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Selected count and actions */}
                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-muted-foreground">
                                {tempSelected.length} {t('common.selected', 'selected')}
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleClear}>
                                    {t('common.clear', 'Clear')}
                                </Button>
                                <Button size="sm" onClick={handleConfirm}>
                                    {t('common.confirm', 'Confirm')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
