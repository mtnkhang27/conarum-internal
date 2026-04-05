import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { useTranslation } from 'react-i18next';
import type { DateRange } from '@/components/filterbar/types';
import { Button } from '@/components/ui/button';
import { Flame, RotateCcw } from 'lucide-react';

interface UserPredictionTableFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  hotFilter: 'all' | 'hot';
  onHotFilterChange: (value: 'all' | 'hot') => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
}

export function UserPredictionTableFilters({
  searchTerm,
  onSearchTermChange,
  dateRange,
  onDateRangeChange,
  hotFilter,
  onHotFilterChange,
  onApplyFilters,
  onResetFilters,
}: UserPredictionTableFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full min-w-0 md:w-[300px] xl:w-[360px]">
          <Input
            placeholder={t('predictionDashboard.searchByTeamName', 'Search by team name')}
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className="h-9 bg-background"
          />
        </div>

        <div className="w-full min-w-0 md:w-[240px]">
          <DateRangeFilter
            config={{
              key: 'prediction-date-range',
              label: 'Date range',
              type: 'dateRange',
              placeholder: 'Date range',
            }}
            value={dateRange}
            onChange={onDateRangeChange}
          />
        </div>

        <div className="w-full min-w-0 md:w-[220px]">
          <Select value={hotFilter} onValueChange={(value) => onHotFilterChange(value as 'all' | 'hot')}>
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder={t('predictionDashboard.hotMatchFilter', 'Filter hot match')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('predictionDashboard.allMatches', 'All matches')}</SelectItem>
              <SelectItem value="hot">
                <span className="inline-flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" />
                  {t('predictionDashboard.hotMatchOnly', 'Hot match only')}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onResetFilters}
            disabled={!onResetFilters}
            className="h-9 cursor-pointer"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {t('common.reset', 'Reset')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onApplyFilters}
            disabled={!onApplyFilters}
            className="h-9 cursor-pointer"
          >
            {t('common.go', 'Go')}
          </Button>
        </div>
      </div>
    </div>
  );
}
