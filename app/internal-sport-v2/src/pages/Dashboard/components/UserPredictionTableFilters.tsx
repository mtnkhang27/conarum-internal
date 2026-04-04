import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { useTranslation } from 'react-i18next';
import type { DateRange } from '@/components/filterbar/types';

interface UserPredictionTableFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (value: DateRange) => void;
  hotFilter: 'all' | 'hot';
  onHotFilterChange: (value: 'all' | 'hot') => void;
}

export function UserPredictionTableFilters({
  searchTerm,
  onSearchTermChange,
  dateRange,
  onDateRangeChange,
  hotFilter,
  onHotFilterChange,
}: UserPredictionTableFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_210px]">
      <div className="min-w-0">
        <Input
          placeholder={t('predictionDashboard.searchByTeamName', 'Search by team name')}
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className="bg-background"
        />
      </div>

      <div className="min-w-0">
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

      <div className="min-w-0">
        <Select value={hotFilter} onValueChange={(value) => onHotFilterChange(value as 'all' | 'hot')}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder={t('predictionDashboard.hotMatchFilter', 'Filter hot match')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('predictionDashboard.allMatches', 'All matches')}</SelectItem>
            <SelectItem value="hot">{t('predictionDashboard.hotMatchOnly', 'Hot match only')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
