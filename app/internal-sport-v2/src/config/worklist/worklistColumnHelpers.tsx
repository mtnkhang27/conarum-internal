/**
 * Shared rendering helpers for worklist column configs.
 * Provides file icon, fileName cell, sourceChannel, and badge rendering
 * consistent across all worklist tabs (Standard, INV, ASN, POC).
 *
 * Domain-specific badges (AIStatus, PostingStatus, MalwareStatus) live here.
 * They delegate to the generic StatusBadge UI component for rendering.
 */

import React from 'react';
import { StatusBadge } from '@/components/ui/WorklistBadge';
import { getStatusLabel } from '@/config/worklist/statusOptionsLoader';

// ── File Type Badge (Google Drive style) ──────────────────────────────────────
const FileTypeBadge = ({ label, bgColor, textColor }: { label: string; bgColor: string; textColor: string }) => (
    <div className={`w-5 h-5 rounded flex items-center justify-center ${bgColor}`}>
        <span className={`text-[7px] font-extrabold tracking-tight leading-none ${textColor}`}>{label}</span>
    </div>
);

// ── Format file size ──────────────────────────────────────────────────────────
export const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// ── File icon based on extension / media type / source type ──────────────────
export const getFileIconElement = (fileName: string, mediaType?: string, sourceType?: string): { iconElement: React.ReactNode; bg: string } => {
    if (sourceType === 'EMAIL_BODY') {
        return { iconElement: <FileTypeBadge label="MAIL" bgColor="bg-info" textColor="text-primary-foreground" />, bg: 'bg-info-bg' };
    }

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mime = (mediaType || '').toLowerCase();

    if (ext === 'pdf' || mime.includes('pdf'))
        return { iconElement: <FileTypeBadge label="PDF" bgColor="bg-red-600" textColor="text-primary-foreground" />, bg: 'bg-red-50' };
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || mime.includes('image'))
        return { iconElement: <FileTypeBadge label="IMG" bgColor="bg-info" textColor="text-primary-foreground" />, bg: 'bg-info-bg' };
    if (['xlsx', 'xls'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel'))
        return { iconElement: <FileTypeBadge label="XLS" bgColor="bg-success" textColor="text-primary-foreground" />, bg: 'bg-success-bg' };
    if (ext === 'csv' || mime.includes('csv'))
        return { iconElement: <FileTypeBadge label="CSV" bgColor="bg-success" textColor="text-primary-foreground" />, bg: 'bg-success-bg' };
    if (ext === 'html' || ext === 'htm' || mime.includes('html'))
        return { iconElement: <FileTypeBadge label="MAIL" bgColor="bg-info" textColor="text-primary-foreground" />, bg: 'bg-info-bg' };

    return { iconElement: <FileTypeBadge label="FILE" bgColor="bg-muted-foreground" textColor="text-primary-foreground" />, bg: 'bg-muted' };
};

// ── Render fileName cell with icon + email subject ────────────────────────────
export function renderFileNameCell(value: any, row: any): React.ReactNode {
    const isEmailBody = row.sourceType === 'EMAIL_BODY';
    const email = row.inboundEmail;
    const displayName = isEmailBody && email?.subject
        ? email.subject
        : isEmailBody ? '[Email Body]' : String(value);
    const { iconElement, bg } = getFileIconElement(String(value), row.mediaType, row.sourceType);
    const isEmail = row.sourceChannel === 'EMAIL';
    const objCount = row.objectCount ?? 0;

    return (
        <div className="flex items-start gap-3 py-1">
            <div className={`p-2 rounded-lg shrink-0 ${bg}`}>
                {iconElement}
            </div>
            <div className="flex flex-col min-w-0 w-full overflow-hidden">
                <span className="font-semibold text-sm line-clamp-2 break-all block min-w-0" title={isEmailBody ? email?.subject || String(value) : String(value)}>
                    {displayName || '—'}
                </span>
                {isEmail && !isEmailBody && email?.subject ? (
                    <span className="text-xs text-muted-foreground line-clamp-1" title={email.subject}>
                        📧 {email.subject}
                    </span>
                ) : !isEmailBody && row.fileSize ? (
                    <span className="text-xs text-muted-foreground">
                        {formatFileSize(row.fileSize)}
                    </span>
                ) : null}
                {objCount > 1 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-info-bg text-info text-xs font-bold w-fit" title={`${objCount} objects`}>
                        📦 {objCount}
                    </span>
                )}
            </div>
        </div>
    );
}

// ── Render sourceChannel cell ─────────────────────────────────────────────────
export function renderSourceChannel(value: any): React.ReactNode {
    const channel = (value || 'UI').toString();
    let label = 'UI Upload';
    if (channel === 'EMAIL') label = 'Email';
    else if (channel === 'API') label = 'API';
    return <span className="text-sm text-foreground">{label}</span>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Domain-specific badge render helpers (use generic StatusBadge under the hood)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── AI / Overall Status Badge ─────────────────────────────────────────────────
export function renderAIStatusBadge(value: any, row: any): React.ReactNode {
    if (row?.objectType === 'Auto-Detect') {
        return <StatusBadge badgeClass="bg-info-bg text-info border-info/30" label="Classifying" animated />;
    }

    const s = (value || '').toString().toLowerCase();
    let badgeClass = 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
    let animated = false;

    if (s === 'verified') badgeClass = 'bg-status-completed text-status-completed-text border-status-completed-border';
    else if (s === 'posted') badgeClass = 'bg-status-released text-status-released-text border-status-released-border';
    else if (s === 'reprocessing' || s === 'extracting') { badgeClass = 'bg-status-new text-status-new-text border-status-new-border'; animated = true; }
    else if (s === 'extracted') badgeClass = 'bg-status-new text-status-new-text border-status-new-border';
    else if (s === 'queued' || s === 'new' || s === 'uploaded') { badgeClass = 'bg-status-released text-status-released-text border-status-released-border'; animated = true; }
    else if (s === 'partially posted') badgeClass = 'bg-warning-bg text-warning border-warning/40';
    else if (s === 'post failed') badgeClass = 'bg-error-bg text-error border-error';
    else if (s === 'reverted') badgeClass = 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
    else if (s === 'obsoleted') badgeClass = 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
    else if (s === 'error') badgeClass = 'bg-error-bg text-error border-error';

    // Use configured label from statusConfig instead of raw code
    const objectType = row?.objectType;
    const label = value ? getStatusLabel(value.toString(), objectType) : '-';
    return <StatusBadge badgeClass={badgeClass} label={label} animated={animated} />;
}

export const renderOverallStatusBadge = renderAIStatusBadge;

// ── Posting Status Badge ──────────────────────────────────────────────────────
export function renderPostingStatusBadge(value: any): React.ReactNode {
    const s = (value || '').toString();
    if (!s) return <span className="text-xs text-muted-foreground">—</span>;

    let badgeClass = 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
    if (s === 'Posted') badgeClass = 'bg-status-released text-status-released-text border-status-released-border';
    else if (s === 'Post Failed') badgeClass = 'bg-error-bg text-destructive border-destructive/30';
    else if (s === 'Partially Posted' || s === 'Pending Review') badgeClass = 'bg-warning-bg text-warning border-warning/30';
    else if (s === 'Pending') badgeClass = 'bg-info-bg text-info border-info/30';

    return <StatusBadge badgeClass={badgeClass} label={s} />;
}

// ── Malware Status Badge ──────────────────────────────────────────────────────
export function renderMalwareStatusBadge(value: any): React.ReactNode {
    const s = (value || '').toString().toLowerCase();
    let badgeClass = 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
    let animated = false;

    if (s === 'clean') badgeClass = 'bg-status-completed text-status-completed-text border-status-completed-border';
    else if (s === 'infected') badgeClass = 'bg-error-bg text-error border-error';
    else if (s === 'pending' || s === 'scanning') { badgeClass = 'bg-status-sent text-status-sent-text border-status-sent-border'; animated = true; }
    else if (s === 'error') badgeClass = 'bg-error-bg text-error border-error';

    const label = value ? value.toString().charAt(0).toUpperCase() + value.toString().slice(1) : '-';
    return <StatusBadge badgeClass={badgeClass} label={label} animated={animated} />;
}
