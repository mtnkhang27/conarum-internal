import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Checkbox } from './checkbox';
import { Button } from './button';
import { Token } from './token';
import { cn } from './utils';
import type { FilterComponentProps, MultiSelectFilterConfig, SelectOption } from '../filterbar/types';

/**
 * Multi-Select Filter (SAP UI5 Style)
 * Dropdown with checkboxes - for small lists like Status
 * Shows selected items as removable tokens inside the trigger
 * Click on "+N more" to expand and show all tokens
 */
export function MultiSelectFilter({
    config,
    value,
    onChange,
}: FilterComponentProps<MultiSelectFilterConfig>) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // Expanded mode shows all tokens
    const [options, setOptions] = useState<SelectOption[]>(config.options || []);
    const [isLoading, setIsLoading] = useState(false);
    const hasLoadedRef = useRef(false); // Track if optionsLoader has already run
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync options when config.options changes (e.g., loaded from API)
    useEffect(() => {
        if (config.options && config.options.length > 0) {
            setOptions(config.options);
        }
    }, [config.options]);

    // Load options from async loader if provided (only once)
    useEffect(() => {
        if (config.optionsLoader && !config.options && !hasLoadedRef.current) {
            hasLoadedRef.current = true;
            setIsLoading(true);
            config.optionsLoader()
                .then(setOptions)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [config.optionsLoader, config.options]);

    // Collapse when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isExpanded && containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExpanded]);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Ensure value is always an array
    const selectedValues: string[] = Array.isArray(value) ? value : [];

    const handleToggle = (optionValue: string) => {
        const isSelected = selectedValues.includes(optionValue);
        const newValues = isSelected
            ? selectedValues.filter((v) => v !== optionValue)
            : [...selectedValues, optionValue];
        onChange(newValues);
    };

    const handleSelectAll = () => {
        onChange(options.map((o) => o.value));
    };

    const handleClearAll = () => {
        onChange([]);
    };

    const handleRemoveToken = (optionValue: string) => {
        onChange(selectedValues.filter((v) => v !== optionValue));
    };

    // Handle keyboard events (backspace to delete last item)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && selectedValues.length > 0) {
            e.preventDefault();
            // Remove the last selected item
            onChange(selectedValues.slice(0, -1));
        } else if (e.key === 'Escape') {
            setIsExpanded(false);
            setIsOpen(false);
        }
    };

    const placeholder = config.placeholder
        ? t(config.placeholder, config.placeholder)
        : t('filterbar.selectOptions', 'Select...');

    const getOptionLabel = (val: string) => {
        const option = options.find((o) => o.value === val);
        return option?.label || val;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div
                    ref={containerRef}
                    className={cn(
                        "w-full border-2 border-[var(--input-border)] rounded-md bg-card cursor-pointer transition-all outline-none",
                        isOpen || isExpanded
                            ? "border-2 border-[var(--color-brand)]"
                            : "hover:border-[var(--input-border-hover)]",
                        isExpanded ? "min-h-8 p-1" : "h-8 px-2"
                    )}
                >
                    {isExpanded ? (
                        /* Expanded mode - show all tokens with input */
                        <div className="flex flex-wrap items-center gap-1">
                            {selectedValues.map((val) => (
                                <Token key={val} onRemove={() => handleRemoveToken(val)}>
                                    {getOptionLabel(val)}
                                </Token>
                            ))}
                            <input
                                ref={inputRef}
                                type="text"
                                className="flex-1 min-w-[60px] h-6 text-sm outline-none border-none bg-transparent caret-primary"
                                placeholder=""
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    ) : (
                        /* Collapsed mode - show first token + more count */
                        <div className="h-full flex items-center gap-1">
                            <div className="flex-1 flex items-center gap-1 overflow-hidden">
                                {selectedValues.length > 0 ? (
                                    <>
                                        {/* Show first token */}
                                        {selectedValues.slice(0, 1).map((val) => (
                                            <Token key={val} onRemove={() => handleRemoveToken(val)}>
                                                {getOptionLabel(val)}
                                            </Token>
                                        ))}
                                        {/* Show +N more - click to expand */}
                                        {selectedValues.length > 1 && (
                                            <span
                                                className="text-sm text-muted-foreground shrink-0 cursor-pointer hover:text-primary hover:underline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setIsExpanded(true);
                                                    setIsOpen(true);
                                                }}
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                }}
                                            >
                                                +{selectedValues.length - 1} more
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground text-sm">{placeholder}</span>
                                )}
                            </div>
                            {/* Clear button - only show when there are selected values */}
                            {selectedValues.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleClearAll();
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                >
                                    <X className="h-3 w-3 text-muted-foreground" />
                                </Button>
                            )}
                            {/* Dropdown chevron */}
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                    )}
                </div>
            </PopoverTrigger>

            <PopoverContent
                className="w-56 p-0"
                align="start"
                onInteractOutside={(e) => {
                    // Allow closing popover but keep expanded state handling to the document click handler
                }}
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    if (isExpanded && inputRef.current) {
                        inputRef.current.focus();
                    }
                }}
            >
                {/* Header with Select All / Clear */}
                {config.showSelectAll !== false && (
                    <div className="p-2 border-b border-border">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSelectAll}
                                className="h-7 text-sm"
                            >
                                {t('filterbar.selectAll', 'Select All')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearAll}
                                className="h-7 text-sm"
                            >
                                {t('filterbar.clear', 'Clear')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Options list */}
                <div className="max-h-60 overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : options.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                            {t('filterbar.noOptions', 'No options available')}
                        </div>
                    ) : (
                        options.map((option) => {
                            const isSelected = selectedValues.includes(option.value);
                            return (
                                <div
                                    key={option.value}
                                    className="flex items-center space-x-2 py-1.5 px-1 rounded hover:bg-muted cursor-pointer"
                                    onClick={() => handleToggle(option.value)}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggle(option.value)}
                                        className="pointer-events-none"
                                    />
                                    <span className="text-sm flex-1">
                                        {option.label}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
