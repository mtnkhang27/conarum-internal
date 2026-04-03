/**
 * Worklist Configuration Registry
 * Central registry for type-specific worklist definitions.
 * Each worklist maps to a CDS view entity and has its own columns, filters, and variant ID.
 */

import type { FilterFieldConfig } from '@/components/filterbar';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { FileText, Truck, Receipt, ClipboardCheck, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Worklist Types ──
export type WorklistType = 'standard' | 'asn' | 'inv' | 'poc' | 'so';

export interface WorklistDefinition {
    /** OData entity name (matches CDS view) */
    entity: string;
    /** objectType code used to look up objectDescription */
    objectType: string | null;
    /** Fallback display label for the tab (used before descriptions load) */
    label: string;
    /** Icon emoji for the tab */
    icon: LucideIcon;
    /** Variant management worklist ID */
    worklistId: string;
    /** Column config loader (lazy) */
    getColumns: () => Promise<{ columns: DataTableColumn<any>[]; allColumnSettings: { name: string; label: string; visible: boolean }[] }>;
    /** Filter config loader (lazy) */
    getFilters: () => Promise<FilterFieldConfig[]>;
}

/**
 * Deduplicate comma-separated values from json_query output.
 * "V123,V456,V123" → "V123, V456"
 * Used by all worklist column renderers.
 */
export function deduplicateValues(value: string | null | undefined): string {
    if (!value || value === 'null') return '';
    const unique = [...new Set(value.split(',').map(v => v.trim()).filter(v => v && v !== 'null'))];
    return unique.join(', ');
}

/**
 * Registry of all worklist types.
 * Standard worklist uses existing DocumentUpload entity (no lazy import needed).
 */
export const WORKLIST_REGISTRY: Record<WorklistType, WorklistDefinition> = {
    standard: {
        entity: 'DocumentUpload',
        objectType: null,
        label: 'Standard',
        icon: FileText,
        worklistId: 'DOCUMENT_WORKLIST',
        getColumns: async () => {
            const { getColumnsConfig, mapColumnsToDataTable, getAllColumnSettings } = await import('@/config/documentColumns.config.tsx');
            return {
                columns: mapColumnsToDataTable(getColumnsConfig()),
                allColumnSettings: getAllColumnSettings(),
            };
        },
        getFilters: async () => {
            const { documentFilterConfig } = await import('@/config/documentFilterConfig');
            return documentFilterConfig;
        },
    },
    asn: {
        entity: 'ASNWorklist',
        objectType: 'ASN',
        label: 'ASN',
        icon: Truck,
        worklistId: 'ASN_WORKLIST',
        getColumns: async () => {
            const { getASNColumns, getASNColumnSettings } = await import('./asnColumns.config');
            return { columns: getASNColumns(), allColumnSettings: getASNColumnSettings() };
        },
        getFilters: async () => {
            const { asnFilterConfig } = await import('./asnFilterConfig');
            return asnFilterConfig;
        },
    },
    inv: {
        entity: 'INVWorklist',
        objectType: 'INV',
        label: 'Invoices',
        icon: Receipt,
        worklistId: 'INV_WORKLIST',
        getColumns: async () => {
            const { getINVColumns, getINVColumnSettings } = await import('./invColumns.config');
            return { columns: getINVColumns(), allColumnSettings: getINVColumnSettings() };
        },
        getFilters: async () => {
            const { invFilterConfig } = await import('./invFilterConfig');
            return invFilterConfig;
        },
    },
    poc: {
        entity: 'POCWorklist',
        objectType: 'POC',
        label: 'PO Confirmations',
        icon: ClipboardCheck,
        worklistId: 'POC_WORKLIST',
        getColumns: async () => {
            const { getPOCColumns, getPOCColumnSettings } = await import('./pocColumns.config');
            return { columns: getPOCColumns(), allColumnSettings: getPOCColumnSettings() };
        },
        getFilters: async () => {
            const { pocFilterConfig } = await import('./pocFilterConfig');
            return pocFilterConfig;
        },
    },
    so: {
        entity: 'SOWorklist',
        objectType: 'SO',
        label: 'Sales Orders',
        icon: ShoppingCart,
        worklistId: 'SO_WORKLIST',
        getColumns: async () => {
            const { getSOColumns, getSOColumnSettings } = await import('./soColumns.config');
            return { columns: getSOColumns(), allColumnSettings: getSOColumnSettings() };
        },
        getFilters: async () => {
            const { soFilterConfig } = await import('./soFilterConfig');
            return soFilterConfig;
        },
    },
};

/** Ordered list of tabs for the dashboard */
export const WORKLIST_TABS: WorklistType[] = ['standard', 'asn', 'inv', 'poc', 'so'];
