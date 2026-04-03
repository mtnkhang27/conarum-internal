/**
 * SO Worklist — Filter Configuration
 * Order: filename, source, customer, sales order, customer PO,
 *        status, uploaded by, uploaded at
 */

import type { FilterFieldConfig } from '@/components/filterbar';
import { createStatusOptionsLoader } from './statusOptionsLoader';

export const soFilterConfig: FilterFieldConfig[] = [
    {
        key: 'fileName',
        label: 'File Name',
        labelKey: 'File Name',
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
        key: 'soldToParty',
        label: 'Customer',
        labelKey: 'Customer',
        type: 'text',
        placeholder: 'Search customer number...',
        apiTransform: (value: string) => value ? { contains: value, field: 'soldToParty' } : undefined,
    },
    {
        key: 'sapSalesOrder',
        label: 'SAP Sales Order',
        labelKey: 'SAP Sales Order',
        type: 'text',
        placeholder: 'Search sales order number...',
        apiTransform: (value: string) => value ? { contains: value, field: 'sapSalesOrder' } : undefined,
    },
    {
        key: 'purchaseOrderByCustomer',
        label: 'Customer PO',
        labelKey: 'Customer PO',
        type: 'text',
        placeholder: 'Search customer PO...',
        apiTransform: (value: string) => value ? { contains: value, field: 'purchaseOrderByCustomer' } : undefined,
    },
    {
        key: 'overallStatus',
        label: 'Status',
        labelKey: 'Status',
        type: 'multiselect',
        placeholder: 'All Status',
        optionsLoader: createStatusOptionsLoader('SO'),
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
