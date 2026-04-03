/**
 * ASN Worklist — Filter Configuration
 * Order: filename, source, supplier, bill of lading, delivery date,
 *        sap delivery no, sap material doc, is ewm, uploaded by, uploaded at
 */

import type { FilterFieldConfig } from '@/components/filterbar';
import { createStatusOptionsLoader } from './statusOptionsLoader';

export const asnFilterConfig: FilterFieldConfig[] = [
    {
        key: 'fileName',
        label: 'File Name',
        labelKey: 'dashboard.filters.fileName',
        type: 'text',
        placeholder: 'Search file name...',
    },
    {
        key: 'sourceChannel',
        label: 'Source',
        labelKey: 'Source',
        type: 'multiselect',
        placeholder: 'All Sources',
        options: [
            { value: 'EMAIL', label: 'Email' },
            { value: 'API', label: 'API' },
            { value: 'UI', label: 'UI Upload' },
        ],
    },
    {
        key: 'supplierID',
        label: 'Supplier',
        labelKey: 'Supplier',
        type: 'text',
        placeholder: 'Search supplier number or name...',
        apiTransform: (value: string) => value ? { contains: value, fields: ['supplierID', 'supplierName'] } : undefined,
    },
    {
        key: 'billOfLading',
        label: 'Bill Of Lading',
        labelKey: 'Bill Of Lading',
        type: 'text',
        placeholder: 'Search bill of lading...',
        apiTransform: (value: string) => value ? { contains: value, field: 'billOfLading' } : undefined,
    },
    {
        key: 'deliveryDate',
        label: 'Delivery Date',
        labelKey: 'Delivery Date',
        type: 'dateRange',
        numberOfMonths: 2,
        apiTransform: (value: { from?: Date; to?: Date }) => {
            if (!value?.from && !value?.to) return undefined;
            const fmt = (d: Date) => d.toISOString().split('T')[0];
            return {
                from: value.from ? fmt(value.from) : undefined,
                to: value.to ? fmt(value.to) : undefined,
            };
        },
    },
    {
        key: 'sapDelivery',
        label: 'SAP Delivery No.',
        labelKey: 'SAP Delivery No.',
        type: 'text',
        placeholder: 'Search delivery number...',
        apiTransform: (value: string) => value ? { contains: value, field: 'sapDelivery' } : undefined,
    },
    {
        key: 'materialDocument',
        label: 'SAP Material Document',
        labelKey: 'SAP Material Document',
        type: 'text',
        placeholder: 'Search material document...',
        apiTransform: (value: string) => value ? { contains: value, field: 'materialDocument' } : undefined,
    },
    {
        key: 'isEWM',
        label: 'is EWM',
        labelKey: 'is EWM',
        type: 'multiselect',
        placeholder: 'All',
        options: [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
        ],
    },
    {
        key: 'overallStatus',
        label: 'Status',
        labelKey: 'Status',
        type: 'multiselect',
        placeholder: 'All Status',
        optionsLoader: createStatusOptionsLoader('ASN'),
    },
    {
        key: 'uploadedBy',
        label: 'Uploaded By',
        labelKey: 'Uploaded By',
        type: 'text',
        placeholder: 'Search user...',
        apiTransform: (value: string) => value ? { contains: value, field: 'uploadedBy' } : undefined,
    },
    {
        key: 'uploadedAt',
        label: 'Uploaded At',
        labelKey: 'Uploaded At',
        type: 'dateRange',
        numberOfMonths: 2,
        apiTransform: (value: { from?: Date; to?: Date }) => {
            if (!value?.from && !value?.to) return undefined;
            let toISO: string | undefined;
            if (value.to) {
                const endOfDay = new Date(value.to);
                endOfDay.setHours(23, 59, 59, 999);
                toISO = endOfDay.toISOString();
            }
            return { from: value.from?.toISOString(), to: toISO };
        },
    },
];
