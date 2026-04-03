import { useState, createElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, X } from 'lucide-react';
import { Button } from './button';
import { Token } from './token';
import { cn } from './utils';
import type { FilterComponentProps, ValueHelpFilterConfig } from '../filterbar/types';

/**
 * Value Help Filter (SAP UI5 Style)
 * Input with value help icon on the right - opens popup dialog/table
 * Shows selected items as removable tokens
 */
export function ValueHelpFilter<T extends Record<string, any>>({
    config,
    value,
    onChange,
}: FilterComponentProps<ValueHelpFilterConfig<T>>) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // Ensure value is always an array of selected items
    const selectedItems: T[] = Array.isArray(value) ? value : [];

    const handleSelect = (items: T[]) => {
        onChange(items);
        setIsOpen(false);
    };

    const handleRemoveItem = (item: T) => {
        const valueField = config.valueField as keyof T;
        onChange(selectedItems.filter((i) => i[valueField] !== item[valueField]));
    };

    const getDisplayValue = (item: T): string => {
        if (typeof config.displayField === 'function') {
            return config.displayField(item);
        }
        return String(item[config.displayField] || '');
    };

    const getValueFieldValue = (item: T): string => {
        return String(item[config.valueField] || '');
    };

    const placeholder = config.placeholder
        ? t(config.placeholder, config.placeholder)
        : '';

    return (
        <>
            {/* SAP UI5 style input with value help icon on right */}
            <div
                className={cn(
                    "min-h-8 w-full flex items-center gap-1 px-2 py-1 border-2 rounded-md bg-card cursor-pointer transition-all",
                    "border-[var(--input-border)] hover:border-[var(--input-border-hover)]",
                    "focus-within:border-2 focus-within:border-[var(--color-brand)]"
                )}
                onClick={() => setIsOpen(true)}
            >
                {/* Content area - single line with horizontal scroll, hidden scrollbar */}
                <div 
                    className="flex-1 flex items-center gap-1 min-h-[20px] overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    onWheel={(e) => {
                        e.currentTarget.scrollLeft += e.deltaY;
                    }}
                >
                    {selectedItems.length > 0 ? (
                        <>
                            {/* Show all items using Token component */}
                            {selectedItems.map((item) => (
                                <Token
                                    key={getValueFieldValue(item)}
                                    onRemove={() => handleRemoveItem(item)}
                                    className="max-w-[100px]"
                                >
                                    {getDisplayValue(item)}
                                </Token>
                            ))}
                        </>
                    ) : (
                        <span className="text-muted-foreground text-sm">{placeholder}</span>
                    )}
                </div>

                {/* Clear button - only show when there are selected values */}
                {selectedItems.length > 0 && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onChange([]);
                        }}
                    >
                        <X className="h-3 w-3 text-muted-foreground" />
                    </Button>
                )}
                {/* Value Help icon on RIGHT side - SAP UI5 style (Copy icon) */}
                <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            {/* Render the ValueHelp component only when open */}
            {isOpen && createElement(config.valueHelpComponent, {
                open: isOpen,
                onClose: () => setIsOpen(false),
                onSelect: handleSelect,
                selectedIds: selectedItems.map(getValueFieldValue),
                // Pass selected items data with multiple prop names to cover all ValueHelp components
                // Each component will only use the prop name suitable for it
                selectedSuppliers: selectedItems,    // For SupplierValueHelp
                selectedAppraisers: selectedItems,   // For AppraiserValueHelp  
                selectedQuestionnaires: selectedItems, // For QuestionnaireValueHelp
            } as any)}
        </>
    );
}
