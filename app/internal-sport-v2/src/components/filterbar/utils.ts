import type { FilterFieldConfig, FilterValues } from './types';

/**
 * Initializes empty filter values from filter configuration
 */
export function initializeFilterValues(config: FilterFieldConfig[]): FilterValues {
    const initialValues: FilterValues = {};

    config.forEach((field) => {
        switch (field.type) {
            case 'text':
                initialValues[field.key] = '';
                break;
            case 'multiselect':
                initialValues[field.key] = [];
                break;
            case 'dateRange':
                initialValues[field.key] = { from: undefined, to: undefined };
                break;
            case 'valueHelp':
                initialValues[field.key] = field.multiple ? [] : undefined;
                break;
            case 'select':
                initialValues[field.key] = undefined;
                break;
            default:
                initialValues[(field as any).key] = undefined;
        }
    });

    return initialValues;
}

/**
 * Transforms UI filter values to API format based on filter configuration
 */
export function transformFiltersForAPI(
    config: FilterFieldConfig[],
    filterValues: FilterValues
): any { // Changed return type to any for simplicity in this port
    const apiFilters: any = {};

    config.forEach((field) => {
        const uiValue = filterValues[field.key];
        const apiKey = (field.apiKey || field.key);

        // Skip undefined/null/empty values
        if (uiValue === undefined || uiValue === null) {
            return;
        }

        // Skip empty arrays
        if (Array.isArray(uiValue) && uiValue.length === 0) {
            return;
        }

        // Skip empty date ranges
        if (field.type === 'dateRange' && !uiValue.from && !uiValue.to) {
            return;
        }

        // Apply custom transformation if provided
        if (field.apiTransform) {
            const transformed = field.apiTransform(uiValue);
            if (transformed !== undefined && transformed !== null) {
                // For arrays, only include if not empty
                if (Array.isArray(transformed)) {
                    if (transformed.length > 0) {
                        apiFilters[apiKey] = transformed;
                    }
                } else {
                    apiFilters[apiKey] = transformed;
                }
            }
        } else {
            // No transformation - use value as-is
            apiFilters[apiKey] = uiValue;
        }
    });

    return apiFilters;
}
