/**
 * ConfidenceBadge Component
 * Displays AI confidence score with color-coded styling
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfidenceBadgeProps {
  score: number; // 0-1 range
  thresholds?: {
    high: number;
    medium: number;
    low: number;
  };
  showIcon?: boolean;
  className?: string;
}

const DEFAULT_THRESHOLDS = {
  high: 0.8,
  medium: 0.5,
  low: 0,
};

export function ConfidenceBadge({
  score,
  thresholds = DEFAULT_THRESHOLDS,
  showIcon = true,
  className,
}: ConfidenceBadgeProps) {
  const { t } = useTranslation();
  // Determine confidence level
  const getConfidenceLevel = () => {
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.medium) return 'medium';
    return 'low';
  };

  const level = getConfidenceLevel();
  const percentage = Math.round(score * 100);

  // Theme-based color mapping
  const levelClasses = {
    high: 'bg-status-positive text-status-positive-text',
    medium: 'bg-status-warning text-status-warning-text',
    low: 'bg-status-negative text-status-negative-text',
  };

  const tooltipText = {
    high: t('confidence.highTooltip'),
    medium: t('confidence.mediumTooltip'),
    low: t('confidence.lowTooltip'),
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="default" className={cn(levelClasses[level], 'gap-1.5 cursor-help', className)}>
            {showIcon && <Brain className="h-3 w-3" />}
            <span className="font-mono text-xs">{percentage}%</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{tooltipText[level]}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('confidence.score')}: {percentage}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
