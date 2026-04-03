import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';

// ============================================
// Filter Value Types
// ============================================

export interface DateRange {
    from: Date | undefined;
    to: Date | undefined;
}

export interface SelectOption {
    value: string;
    label: string;
    icon?: LucideIcon;
}

// ============================================
// Filter Field Configuration Types
// ============================================

interface BaseFilterConfig {
    /** Unique key for the filter (used in filter values object) */
    key: string;
    /** Display label for the filter */
    label: string;
    /** Translation key for the label (optional) */
    labelKey?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Whether the filter is required */
    required?: boolean;
    /** Whether the filter is visible by default */
    visible?: boolean;
    /** Custom width (e.g., '200px', '1fr') */
    width?: string;

    /** API parameter name (defaults to 'key' if not specified) */
    apiKey?: string;

    /** Transform function to convert UI value to API value */
    apiTransform?: (value: any) => any;
}

/** Text input filter */
export interface TextFilterConfig extends BaseFilterConfig {
    type: 'text';
    /** Max length for input */
    maxLength?: number;
}

/** Single select dropdown */
export interface SelectFilterConfig extends BaseFilterConfig {
    type: 'select';
    /** Static options */
    options?: SelectOption[];
    /** Async options loader */
    optionsLoader?: () => Promise<SelectOption[]>;
}

/** Multi-select dropdown with checkboxes (SAP UI5 style - for small lists like Status) */
export interface MultiSelectFilterConfig extends BaseFilterConfig {
    type: 'multiselect';
    /** Static options */
    options?: SelectOption[];
    /** Async options loader */
    optionsLoader?: () => Promise<SelectOption[]>;
    /** Show "Select All" button */
    showSelectAll?: boolean;
}

/** Date range picker */
export interface DateRangeFilterConfig extends BaseFilterConfig {
    type: 'dateRange';
    /** Number of months to show in calendar */
    numberOfMonths?: 1 | 2;
}

/** Value Help popup (SAP UI5 style - for large lists like Supplier, Appraiser) */
export interface ValueHelpFilterConfig<T = any> extends BaseFilterConfig {
    type: 'valueHelp';
    /** The ValueHelp dialog component to render */
    valueHelpComponent: ComponentType<ValueHelpComponentProps<T>>;
    /** Field from selected item to display as token */
    displayField: keyof T | ((item: T) => string);
    /** Field from selected item to use as value */
    valueField: keyof T;
    /** Whether to allow multiple selection */
    multiple?: boolean;
}

/** Union type for all filter configurations */
export type FilterFieldConfig =
    | TextFilterConfig
    | SelectFilterConfig
    | MultiSelectFilterConfig
    | DateRangeFilterConfig
    | ValueHelpFilterConfig;

// ============================================
// Filter Values Type
// ============================================

export type FilterValues = Record<string, any>;

// ============================================
// ValueHelp Component Props Interface
// ============================================

export interface ValueHelpComponentProps<T = any> {
    open: boolean;
    onClose: () => void;
    onSelect: (items: T[]) => void;
    selectedIds: string[];
}

// ============================================
// FilterBar Component Props
// ============================================

export interface FilterBarProps {
    /** Filter field configurations */
    config: FilterFieldConfig[];
    /** Current filter values */
    values: FilterValues;
    /** Called when any filter value changes */
    onChange: (values: FilterValues) => void;
    /** Called when "Go" button is clicked */
    onApply: (values: FilterValues) => void;
    /** Called when "Clear" button is clicked */
    onClear?: () => void;
    /** Whether data is loading */
    isLoading?: boolean;
    /** Whether filter bar is initially expanded */
    defaultExpanded?: boolean;
    /** Custom class name */
    className?: string;
    /** Optional content rendered on the left side of the header row (e.g. VariantSelector) */
    headerLeft?: React.ReactNode;
    /** Full list of all available filter fields (for Adapt Filter dialog). Falls back to `config` if not provided. */
    allFilterConfig?: FilterFieldConfig[];
    /** Called when user applies filter settings via Adapt Filter dialog. Receives the updated filter settings with visibility and order. */
    onAdaptFilter?: (filters: import('./FilterSettingsDialog').FilterSettingItem[]) => void;
}

// ============================================
// Individual Filter Component Props
// ============================================

export interface FilterComponentProps<T = any> {
    config: T;
    value: any;
    onChange: (value: any) => void;
}
