/**
 * Shared helper to load overallStatus filter options from ObjectSchema.statusConfig.
 * Used by per-object-type worklist filter configs (ASN, INV, POC).
 * Falls back to system statuses if no DB config exists.
 *
 * Also maintains a shared status label cache (code → label) used by
 * worklistColumnHelpers to display the label instead of the raw code.
 */
import type { SelectOption } from '@/components/filterbar';
import { axiosInstance } from '@/services/core';

// ── Shared status label cache ────────────────────────────────────────────────
// Maps: objectType → { code → label }
// - Per-object-type entries populated by createStatusOptionsLoader
// - Global ('*') entry populated by loadSystemStatuses (for Standard tab)
const statusLabelCache: Record<string, Record<string, string>> = {};

/**
 * Look up the display label for a status code.
 * Falls back to the code itself if no mapping exists.
 *
 * @param code - The raw status code (e.g., "Verified")
 * @param objectType - Optional objectType to look up type-specific labels first
 */
export function getStatusLabel(code: string, objectType?: string): string {
    if (!code) return code;
    // Try type-specific label first
    if (objectType && statusLabelCache[objectType]?.[code]) {
        return statusLabelCache[objectType][code];
    }
    // Fall back to global (system) labels
    if (statusLabelCache['*']?.[code]) {
        return statusLabelCache['*'][code];
    }
    // No mapping found — return the code as-is
    return code;
}

/**
 * Creates an optionsLoader that fetches status options from the ObjectSchema
 * for a specific objectType. Returns the statuses defined in statusConfig.
 * Also populates the shared status label cache.
 */
export function createStatusOptionsLoader(objectType: string): () => Promise<SelectOption[]> {
    return async () => {
        try {
            const res = await axiosInstance.get<{ value: { statusConfig?: string }[] }>(
                `odata/v4/extraction/ObjectSchema?$filter=objectType eq '${objectType}'&$select=statusConfig`
            );
            const schema = res.data?.value?.[0];
            if (!schema?.statusConfig) return getFallbackStatuses();

            const config = typeof schema.statusConfig === 'string'
                ? JSON.parse(schema.statusConfig)
                : schema.statusConfig;

            const statuses: Array<{ code: string; label?: string; showInFilter?: boolean }> = config.statuses || [];

            // Populate label cache for this object type (all statuses, not just filterable ones)
            statusLabelCache[objectType] = {};
            for (const s of statuses) {
                if (s.code) {
                    statusLabelCache[objectType][s.code] = s.label || s.code;
                }
            }

            return statuses
                .filter(s => s.code && s.showInFilter !== false)
                .map(s => ({ value: s.code, label: s.label || s.code }));
        } catch (error) {
            console.error(`[statusOptionsLoader] Failed to load statuses for ${objectType}:`, error);
            return getFallbackStatuses();
        }
    };
}

/**
 * Populate the global status label cache from system statuses.
 * Called by documentFilterConfig's loadSystemStatuses.
 */
export function populateGlobalStatusLabels(statuses: Array<{ code: string; label: string }>): void {
    statusLabelCache['*'] = {};
    for (const s of statuses) {
        statusLabelCache['*'][s.code] = s.label;
    }
}

/** Minimal fallback if API call fails */
function getFallbackStatuses(): SelectOption[] {
    return [
        { value: 'New', label: 'New' },
        { value: 'Extracted', label: 'Extracted' },
        { value: 'Error', label: 'Error' },
        { value: 'Posted', label: 'Posted' },
    ];
}
