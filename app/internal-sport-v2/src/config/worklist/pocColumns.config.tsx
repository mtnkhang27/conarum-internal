/**
 * POC Worklist — Column Configuration
 * Columns for the PO Confirmation worklist tab.
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

const pocColumnsConfig: WorklistColumnConfig[] = [
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
        key: 'purchaseOrder',
        labelKey: 'PO Number',
        width: 100,
        visible: true,
        render: (value) => (
            <span className="text-sm font-semibold" title={value}>{deduplicateValues(value) || '—'}</span>
        ),
    },
    {
        key: 'orderConfirmationNumber',
        labelKey: 'Confirmation Number',
        width: 110,
        visible: true,
        render: (value) => (
            <span className="text-sm" title={value}>{deduplicateValues(value) || '—'}</span>
        ),
    },
    {
        key: 'orderConfirmationDate',
        labelKey: 'Confirmation Date',
        width: 100,
        visible: true,
        render: (value) => {
            const deduplicated = deduplicateValues(value);
            if (!deduplicated) return <span className="text-sm">—</span>;
            const formatted = deduplicated.split(',').map(d => formatDate(d.trim(), i18n.language)).filter(d => d !== '-').join(', ');
            return <span className="text-sm">{formatted || '—'}</span>;
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

export function getPOCColumns(): DataTableColumn<any>[] {
    return pocColumnsConfig.map((col) => ({
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

export function getPOCColumnSettings(): { name: string; label: string; visible: boolean }[] {
    return pocColumnsConfig.map(col => ({
        name: col.key,
        label: i18n.t(col.labelKey),
        visible: col.visible !== false,
    }));
}
