/**
 * POC Worklist — Filter Configuration
 * Order: filename, source, supplier, PO number, confirmation number,
 *        status, posting status, uploaded by, uploaded at
 */

import type { FilterFieldConfig } from '@/components/filterbar';
import { createStatusOptionsLoader } from './statusOptionsLoader';

export const pocFilterConfig: FilterFieldConfig[] = [
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
        key: 'supplierID',
        label: 'Supplier',
        labelKey: 'Supplier',
        type: 'text',
        placeholder: 'Search supplier number or name...',
        apiTransform: (value: string) => value ? { contains: value, fields: ['supplierID', 'supplierName'] } : undefined,
    },
    {
        key: 'purchaseOrder',
        label: 'PO Number',
        labelKey: 'PO Number',
        type: 'text',
        placeholder: 'Search PO number...',
        apiTransform: (value: string) => value ? { contains: value, field: 'purchaseOrder' } : undefined,
    },
    {
        key: 'orderConfirmationNumber',
        label: 'Confirmation Number',
        labelKey: 'Confirmation Number',
        type: 'text',
        placeholder: 'Search confirmation number...',
        apiTransform: (value: string) => value ? { contains: value, field: 'orderConfirmationNumber' } : undefined,
    },
    {
        key: 'overallStatus',
        label: 'Status',
        labelKey: 'Status',
        type: 'multiselect',
        placeholder: 'All Status',
        optionsLoader: createStatusOptionsLoader('POC'),
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
