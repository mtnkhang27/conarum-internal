/**
 * FilterSettingsDialog Component
 * UI5-style dialog for filter visibility and order
 * Supports drag-and-drop reordering via @dnd-kit (mirrors ColumnSettingsDialog)
 */

import { useState, useMemo, useEffect } from 'react';
import { Search, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface FilterSettingItem {
    name: string;
    label: string;
    visible: boolean;
}

interface FilterSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filters: FilterSettingItem[];
    onApply: (filters: FilterSettingItem[]) => void;
}

/** Sortable row for a single filter */
function SortableFilterRow({
    filter,
    isSelected,
    onSelect,
    onToggle,
    onMove,
    totalCount,
    realIdx,
    searchActive,
}: {
    filter: FilterSettingItem;
    isSelected: boolean;
    onSelect: () => void;
    onToggle: () => void;
    onMove: (from: number, to: number) => void;
    totalCount: number;
    realIdx: number;
    searchActive: boolean;
}) {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: filter.name, disabled: searchActive });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={`flex items-center gap-2 px-2 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                } ${isDragging ? 'shadow-md bg-background' : ''}`}
        >
            {/* Drag handle */}
            {!searchActive && (
                <Button
                    variant="ghost"
                    size="icon"
                    {...attributes}
                    {...listeners}
                    className="p-0.5 h-auto w-auto cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4" />
                </Button>
            )}
            <Checkbox
                checked={filter.visible}
                onCheckedChange={onToggle}
                onClick={e => e.stopPropagation()}
            />
            <span className="text-sm flex-1">{filter.label}</span>
            {isSelected && !searchActive && (
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => { e.stopPropagation(); onMove(realIdx, 0); }}
                        className="p-0.5 h-auto w-auto"
                        title={t('dashboard.moveToTop')}
                        disabled={realIdx === 0}
                    >
                        <ChevronsUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => { e.stopPropagation(); onMove(realIdx, realIdx - 1); }}
                        className="p-0.5 h-auto w-auto"
                        title={t('dashboard.moveUp')}
                        disabled={realIdx === 0}
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => { e.stopPropagation(); onMove(realIdx, realIdx + 1); }}
                        className="p-0.5 h-auto w-auto"
                        title={t('dashboard.moveDown')}
                        disabled={realIdx === totalCount - 1}
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => { e.stopPropagation(); onMove(realIdx, totalCount - 1); }}
                        className="p-0.5 h-auto w-auto"
                        title={t('dashboard.moveToBottom')}
                        disabled={realIdx === totalCount - 1}
                    >
                        <ChevronsDown className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}
        </div>
    );
}

export function FilterSettingsDialog({
    open,
    onOpenChange,
    filters,
    onApply,
}: FilterSettingsDialogProps) {
    const [localFilters, setLocalFilters] = useState<FilterSettingItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [showUnselected, setShowUnselected] = useState(false);
    const { t } = useTranslation();

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    // Initialize local state when dialog opens
    useEffect(() => {
        if (open) {
            setLocalFilters([...filters]);
            setSearchQuery('');
            setSelectedIndex(null);
            setShowUnselected(false);
        }
    }, [open, filters]);

    const filteredList = useMemo(() => {
        let result = localFilters;
        if (searchQuery) {
            result = result.filter(f =>
                f.label.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (showUnselected) {
            result = result.filter(f => f.visible);
        }
        return result;
    }, [localFilters, searchQuery, showUnselected]);

    const visibleCount = localFilters.filter(f => f.visible).length;
    const searchActive = !!searchQuery || showUnselected;

    const toggleVisibility = (name: string) => {
        setLocalFilters(prev =>
            prev.map(f => (f.name === name ? { ...f, visible: !f.visible } : f))
        );
    };

    const moveFilter = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= localFilters.length) return;
        setLocalFilters(prev => arrayMove(prev, fromIndex, toIndex));
        setSelectedIndex(toIndex);
    };

    const getRealIndex = (name: string): number => {
        return localFilters.findIndex(f => f.name === name);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = localFilters.findIndex(f => f.name === active.id);
        const newIndex = localFilters.findIndex(f => f.name === over.id);
        setLocalFilters(prev => arrayMove(prev, oldIndex, newIndex));
        setSelectedIndex(newIndex);
    };

    const handleApply = () => {
        onApply(localFilters);
        onOpenChange(false);
    };

    const filterIds = useMemo(() => localFilters.map(f => f.name), [localFilters]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col bg-primary-foreground">
                <DialogHeader>
                    <DialogTitle>{t('filterbar.adaptFilter', 'Adapt Filter')}</DialogTitle>
                </DialogHeader>

                {/* Search bar */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('common.search')}
                        className="pl-9"
                    />
                </div>

                {/* Toggle unselected */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('dashboard.field')} ({visibleCount}/{localFilters.length})</span>
                    <Button
                        variant="link"
                        onClick={() => setShowUnselected(!showUnselected)}
                        className="text-primary h-auto p-0 text-xs"
                    >
                        {showUnselected ? t('dashboard.showAll') : t('dashboard.hideUnselected')}
                    </Button>
                </div>

                {/* Filter list with DnD */}
                <div className="flex-1 min-h-0 overflow-y-auto border rounded-md divide-y">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={searchActive ? [] : filterIds} strategy={verticalListSortingStrategy}>
                            {filteredList.map(filter => {
                                const realIdx = getRealIndex(filter.name);
                                return (
                                    <SortableFilterRow
                                        key={filter.name}
                                        filter={filter}
                                        isSelected={selectedIndex === realIdx}
                                        onSelect={() => setSelectedIndex(realIdx)}
                                        onToggle={() => toggleVisibility(filter.name)}
                                        onMove={moveFilter}
                                        totalCount={localFilters.length}
                                        realIdx={realIdx}
                                        searchActive={searchActive}
                                    />
                                );
                            })}
                        </SortableContext>
                    </DndContext>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleApply}>{t('common.ok')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
