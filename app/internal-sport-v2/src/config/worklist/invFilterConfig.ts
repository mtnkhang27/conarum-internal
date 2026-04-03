/**
 * INV Worklist — Filter Configuration
 * Order: filename, source, supplier, supplier invoice no, invoice date,
 *        company, sap invoice no, posting date, status, posting status,
 *        uploaded by, uploaded at
 */

import type { FilterFieldConfig } from '@/components/filterbar';
import { createStatusOptionsLoader } from './statusOptionsLoader';

export const invFilterConfig: FilterFieldConfig[] = [
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
        key: 'supplierInvoiceNumber',
        label: 'Supplier Invoice No.',
        labelKey: 'Supplier Invoice No.',
        type: 'text',
        placeholder: 'Search supplier invoice number...',
        apiTransform: (value: string) => value ? { contains: value, field: 'supplierInvoiceNumber' } : undefined,
    },
    {
        key: 'invoiceDate',
        label: 'Invoice Date',
        labelKey: 'Invoice Date',
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
        key: 'companyCode',
        label: 'Company',
        labelKey: 'Company',
        type: 'text',
        placeholder: 'Search company code or name...',
        apiTransform: (value: string) => value ? { contains: value, fields: ['companyCode', 'companyName'] } : undefined,
    },
    {
        key: 'sapInvoiceNumber',
        label: 'SAP Invoice No.',
        labelKey: 'SAP Invoice No.',
        type: 'text',
        placeholder: 'Search SAP invoice number...',
        apiTransform: (value: string) => value ? { contains: value, field: 'sapInvoiceNumber' } : undefined,
    },
    {
        key: 'postingDate',
        label: 'Posting Date',
        labelKey: 'Posting Date',
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
        key: 'overallStatus',
        label: 'Status',
        labelKey: 'Status',
        type: 'multiselect',
        placeholder: 'All Status',
        optionsLoader: createStatusOptionsLoader('INV'),
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
