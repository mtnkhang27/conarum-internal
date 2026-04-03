import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
export const EnumEvaluationStatus = {
  New: '10',
  Inprogess: '20',
  Released: '30',
  Sent: '35',
  Obsoleted: '40',
  Completed: '50',
} as const;
export type EvaluationStatus = '10' | '20' | '30' | '35' | '40' | '50';
export type EvaluationStatusDescription = 'New' | 'Inprogess' | 'Released' | 'Sent' | 'Obsoleted' | 'Completed';

// Status code to description mapping
export const STATUS_MAP: Record<EvaluationStatus, EvaluationStatusDescription> = {
  '10': 'New',
  '20': 'Inprogess',
  '30': 'Released',
  '35': 'Sent',
  '40': 'Obsoleted',
  '50': 'Completed',
};

interface StatusBadgeProps {
  status: EvaluationStatus;
  statusDescription?: string;
}

export function StatusBadge({ status, statusDescription }: StatusBadgeProps) {
  const { t } = useTranslation();

  const getStatusVariant = (status: EvaluationStatus) => {
    // Using semantic theme variables from theme.css
    // Pattern: bg-status-* text-status-*-text border-status-*-border
    switch (status) {
      case '10': // New
        return 'bg-status-new text-status-new-text border-status-new-border';
      case '20': // In Progress
        return 'bg-status-progress text-status-progress-text border-status-progress-border';
      case '30': // Released
        return 'bg-status-released text-status-released-text border-status-released-border';
      case '35': // Sent
        return 'bg-status-sent text-status-sent-text border-status-sent-border';
      case '50': // Completed
        return 'bg-status-completed text-status-completed-text border-status-completed-border';
      case '40': // Obsoleted
        return 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
      default:
        return 'bg-status-obsoleted text-status-obsoleted-text border-status-obsoleted-border';
    }
  };

  // Use provided statusDescription, fallback to STATUS_MAP, then to status code
  const displayText = statusDescription || STATUS_MAP[status] || status;

  return (
    <Badge className={`${getStatusVariant(status)} border font-medium text-sm`} variant="outline">
      {t(`status.${displayText}`, displayText)}
    </Badge>
  );
}