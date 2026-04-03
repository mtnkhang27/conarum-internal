import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Loader2, X, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterBarField } from './FilterBarField';
import { FilterSettingsDialog, type FilterSettingItem } from './FilterSettingsDialog';
import type { FilterBarProps, FilterValues } from './types';

/**
 * FilterBar (SAP UI5 Style)
 * 
 * Configuration-driven filter bar with:
 * - Go button to apply filters
 * - Hide/Show toggle for filter area
 * - Adapt Filter dialog to choose visible filter fields and reorder them
 * - Clear button to reset all filters
 * - Responsive grid layout for filter fields
 */
export function FilterBar({
    config,
    values,
    onChange,
    onApply,
    onClear,
    isLoading = false,
    defaultExpanded = true,
    className = '',
    headerLeft,
    allFilterConfig,
    onAdaptFilter,
}: FilterBarProps) {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [showFilterSettings, setShowFilterSettings] = useState(false);

    // Build filter settings items for the dialog from allFilterConfig
    const allFilters = allFilterConfig ?? config;
    const visibleKeys = useMemo(() => new Set(config.map(f => f.key)), [config]);
    const filterSettingsItems: FilterSettingItem[] = useMemo(() => {
        return allFilters.map(f => ({
            name: f.key,
            label: f.labelKey ? t(f.labelKey, f.label) : f.label,
            visible: visibleKeys.has(f.key),
        }));
    }, [allFilters, visibleKeys, t]);

    // Handle individual field change
    const handleFieldChange = useCallback((key: string, value: any) => {
        onChange({
            ...values,
            [key]: value,
        });
    }, [values, onChange]);

    // Handle apply (Go button)
    const handleApply = () => {
        onApply(values);
    };

    // Handle clear all filters
    const handleClear = () => {
        // Reset all values to their default (empty) state
        const clearedValues: FilterValues = {};
        config.forEach((field) => {
            switch (field.type) {
                case 'text':
                    clearedValues[field.key] = '';
                    break;
                case 'multiselect':
                    clearedValues[field.key] = [];
                    break;
                case 'dateRange':
                    clearedValues[field.key] = { from: undefined, to: undefined };
                    break;
                case 'valueHelp':
                    clearedValues[field.key] = [];
                    break;
                default:
                    clearedValues[field.key] = undefined;
            }
        });
        onChange(clearedValues);
        onClear?.();
    };

    // Get visible filters (respect visible property, default to true)
    const visibleFilters = config.filter((f) => f.visible !== false);

    // Handle Enter key to trigger Go
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.defaultPrevented) {
            e.preventDefault();
            handleApply();
        }
    }, [handleApply]);

    // Handle filter settings apply from dialog
    const handleFilterSettingsApply = useCallback((filters: FilterSettingItem[]) => {
        onAdaptFilter?.(filters);
    }, [onAdaptFilter]);

    return (
        <>
            <div
                className={`bg-primary-foreground rounded-xl border-1  hover:border-primary transition-all hover:shadow-lg ${className}`}
                onKeyDown={handleKeyDown}
            >
                {/* Header row with Go button and toggle */}
                <div className={`flex items-center gap-2 sm:gap-3 px-4 py-2 ${isExpanded ? 'border-b border-border' : ''}`}>
                    {/* Left slot (e.g. VariantSelector) */}
                    {headerLeft && <div className="mr-auto">{headerLeft}</div>}

                    {/* Right-aligned actions */}
                    <div className={`flex items-center gap-1.5 sm:gap-3 ${!headerLeft ? 'ml-auto' : ''}`}>
                        {/* Go Button */}
                        <Button
                            onClick={handleApply}
                            variant="default"
                            disabled={isLoading}
                            className="min-w-0  px-2.5 sm:px-3"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                                    <span className="hidden sm:inline">{t('filterbar.loading', 'Loading...')}</span>
                                </>
                            ) : (
                                t('filterbar.go', 'Go')
                            )}
                        </Button>

                        {/* Adapt Filter Button (opens dialog) */}
                        {onAdaptFilter && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary hover:text-primary hover:bg-primary/5 sm:w-auto sm:px-3 sm:h-9"
                                title={t('filterbar.adaptFilter', 'Adapt Filter')}
                                onClick={() => setShowFilterSettings(true)}
                            >
                                <ListFilter className="w-3.5 h-3.5 sm:mr-2" />
                                <span className="hidden sm:inline">
                                    {t('filterbar.adaptFilter', 'Adapt Filter')}
                                </span>
                            </Button>
                        )}

                        {/* Hide/Show Filter Bar Toggle */}
                        <Button
                            onClick={() => setIsExpanded(!isExpanded)}
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary hover:bg-primary/5 sm:w-auto sm:px-3 sm:h-9"
                            title={isExpanded
                                ? t('filterbar.hideFilterBar', 'Hide Filter Bar')
                                : t('filterbar.showFilterBar', 'Show Filter Bar')}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5 sm:mr-2" />
                            <span className="hidden sm:inline">
                                {isExpanded
                                    ? t('filterbar.hideFilterBar', 'Hide Filter Bar')
                                    : t('filterbar.showFilterBar', 'Show Filter Bar')}
                            </span>
                        </Button>

                        {/* Clear Filters */}
                        <Button
                            onClick={handleClear}
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:text-primary hover:bg-primary/5 sm:w-auto sm:px-3 sm:h-9"
                            title={t('filterbar.clearFilters', 'Clear Filters')}
                        >
                            <X className="w-3.5 h-3.5 sm:mr-2" />
                            <span className="hidden sm:inline">{t('filterbar.clearFilters', 'Clear Filters')}</span>
                        </Button>
                    </div>
                </div>

                {/* Filter Fields Area (Collapsible) */}
                {isExpanded && (
                    <div className="px-4 py-4">
                        {isLoading ? (
                            /* Skeleton loading state */
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                                        <div className="h-9 w-full bg-muted rounded animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Responsive grid: auto-fill columns */
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-4">
                                {visibleFilters.map((fieldConfig) => (
                                    <FilterBarField
                                        key={fieldConfig.key}
                                        config={fieldConfig}
                                        value={values[fieldConfig.key]}
                                        onChange={(value) => handleFieldChange(fieldConfig.key, value)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Filter Settings Dialog */}
            {onAdaptFilter && (
                <FilterSettingsDialog
                    open={showFilterSettings}
                    onOpenChange={setShowFilterSettings}
                    filters={filterSettingsItems}
                    onApply={handleFilterSettingsApply}
                />
            )}
        </>
    );
}
