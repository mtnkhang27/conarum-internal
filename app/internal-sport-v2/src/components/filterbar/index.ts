/**
 * FilterBar System
 * 
 * A configuration-driven filter bar following SAP UI5 patterns.
 */

// Main component
export { FilterBar } from './FilterBar';
export { FilterBarField } from './FilterBarField';
export { FilterSettingsDialog } from './FilterSettingsDialog';
export type { FilterSettingItem } from './FilterSettingsDialog';

// Utilities
export { initializeFilterValues, transformFiltersForAPI } from './utils';

// Individual filters (for custom compositions)
// export { TextFilter } from '../ui/text-filter';
// export { MultiSelectFilter } from '../ui/multi-select-filter';
// export { DateRangeFilter } from '../ui/date-range-filter';
// export { ValueHelpFilter } from '../ui/value-help-filter';

// Types
export type {
    FilterBarProps,
    FilterFieldConfig,
    FilterValues,
    FilterComponentProps,
    TextFilterConfig,
    SelectFilterConfig,
    MultiSelectFilterConfig,
    DateRangeFilterConfig,
    ValueHelpFilterConfig,
    DateRange,
    SelectOption,
    ValueHelpComponentProps,
} from './types';
