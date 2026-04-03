/**
 * ASN Worklist — Column Configuration
 * Columns for the ASN (Inbound Delivery) worklist tab.
 */

import { formatDate, formatDateTime } from '@/utils/formatters/date';
import i18n from '@/i18n';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { deduplicateValues } from './worklistRegistry';
import { renderFileNameCell, renderSourceChannel, renderAIStatusBadge } from './worklistColumnHelpers';

interface WorklistColumnConfig {
    key: string;
    labelKey: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    visible?: boolean;
    renderType?: 'text' | 'badge' | 'date' | 'number';
    className?: string;
    render?: (value: any, row: any) => React.ReactNode;
}

const asnColumnsConfig: WorklistColumnConfig[] = [
    {
        key: 'fileName',
        labelKey: 'dashboard.columns.fileName',
        width: 200,
        minWidth: 100,
        maxWidth: 260,
        visible: true,
        render: renderFileNameCell,
        className: '',
    },
    {
        key: 'sourceChannel',
        labelKey: 'Source',
        width: 60,
        visible: true,
        render: (value) => renderSourceChannel(value),
    },
    {
        key: 'supplierID',
        labelKey: 'Supplier',
        width: 120,
        visible: true,
        render: (value, row) => {
            const id = deduplicateValues(value);
            const name = deduplicateValues(row.supplierName);
            return (
                <div className="flex flex-col">
                    <span className="text-sm font-bold" title={id}>{id || '—'}</span>
                    {name && <span className="text-xs text-muted-foreground truncate" title={name}>{name}</span>}
                </div>
            );
        },
    },
    {
        key: 'billOfLading',
        labelKey: 'Bill Of Lading',
        width: 100,
        visible: true,
        render: (value) => (
            <span className="text-sm" title={value}>{deduplicateValues(value) || '—'}</span>
        ),
    },
    {
        key: 'deliveryDate',
        labelKey: 'Delivery Date',
        width: 90,
        visible: true,
        render: (value) => (
            <span className="text-sm">{formatDate(deduplicateValues(value), i18n.language)}</span>
        ),
    },
    {
        key: 'sapDelivery',
        labelKey: 'SAP Delivery No.',
        width: 100,
        visible: true,
        render: (value) => (
            <span className="text-sm" title={value}>{deduplicateValues(value) || '—'}</span>
        ),
    },
    {
        key: 'materialDocument',
        labelKey: 'SAP Material Document',
        width: 100,
        visible: true,
        render: (value) => (
            <span className="text-sm" title={value}>{deduplicateValues(value) || '—'}</span>
        ),
    },
    {
        key: 'isEWM',
        labelKey: 'is EWM',
        width: 60,
        visible: true,
        render: (value) => {
            const v = deduplicateValues(value);
            if (!v) return <span className="text-xs text-muted-foreground">—</span>;
            return <span className="text-sm">{v.toLowerCase() === 'true' ? '✅' : '—'}</span>;
        },
    },
    {
        key: 'overallStatus',
        labelKey: 'Status',
        width: 100,
        minWidth: 100,
        visible: true,
        renderType: 'badge',
        render: renderAIStatusBadge,
    },
    {
        key: 'uploadedAt',
        labelKey: 'dashboard.columns.uploadedBy',
        width: 100,
        visible: true,
        render: (_, row) => (
            <div className="flex flex-col">
                <span className="font-medium text-sm text-foreground truncate" title={row.uploadedBy}>{row.uploadedBy || '-'}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(row.uploadedAt, i18n.language)}</span>
            </div>
        ),
    },
];

export function getASNColumns(): DataTableColumn<any>[] {
    return asnColumnsConfig.map((col) => ({
        key: col.key,
        labelKey: col.labelKey,
        width: col.width,
        minWidth: col.minWidth,
        maxWidth: col.maxWidth,
        visible: col.visible,
        renderType: col.renderType,
        className: col.className,
        render: col.render,
    }));
}

export function getASNColumnSettings(): { name: string; label: string; visible: boolean }[] {
    return asnColumnsConfig.map(col => ({
        name: col.key,
        label: i18n.t(col.labelKey),
        visible: col.visible !== false,
    }));
}
