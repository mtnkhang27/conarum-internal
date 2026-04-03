import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { useDateFormatter } from '@/hooks/useDateFormat';
import { cn } from './utils';
import type { FilterComponentProps, DateRangeFilterConfig, DateRange } from '../filterbar/types';

// Month names for the month picker
const MONTHS = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
];

// Day names
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Date Range Filter (SAP UI5 Style)
 * Single month calendar with month/year navigation dropdown
 * Supports direct text input for dates
 */
export function DateRangeFilter({
    config,
    value,
    onChange,
}: FilterComponentProps<DateRangeFilterConfig>) {
    const { t } = useTranslation();
    const { formatDate } = useDateFormatter();
    const inputRef = useRef<HTMLInputElement>(null);

    // Calendar state
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days');
    const [viewDate, setViewDate] = useState(() => new Date());
    const [inputValue, setInputValue] = useState('');

    // Selection state for range
    const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined);

    // Ensure value is a DateRange object
    const dateRange: DateRange = value || { from: undefined, to: undefined };

    // Sync input value with actual date range
    useEffect(() => {
        setInputValue(formatDateRangeDisplay(dateRange));
    }, [dateRange.from, dateRange.to]);

    const formatDateRangeDisplay = (range: DateRange): string => {
        if (!range.from) return '';
        if (!range.to) return formatDate(range.from.toISOString());
        return `${formatDate(range.from.toISOString())} - ${formatDate(range.to.toISOString())}`;
    };

    const placeholder = config.placeholder
        ? t(config.placeholder, config.placeholder)
        : `${t('common.eg', 'e.g.')} ${formatDate(new Date(2026, 11, 22).toISOString())} - ${formatDate(new Date(2026, 11, 23).toISOString())}`;

    // Parse date string input
    const parseInputDate = (input: string): { from?: Date; to?: Date } | null => {
        const parts = input.split('-').map(s => s.trim());
        try {
            if (parts.length === 1 && parts[0]) {
                const date = new Date(parts[0]);
                if (!isNaN(date.getTime())) {
                    return { from: date, to: undefined };
                }
            } else if (parts.length >= 2) {
                const from = new Date(parts[0]);
                const to = new Date(parts.slice(1).join('-'));
                if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                    return { from, to };
                }
            }
        } catch {
            return null;
        }
        return null;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        // If input is empty, clear the date range
        if (!inputValue.trim()) {
            onChange({ from: undefined, to: undefined });
            return;
        }

        const parsed = parseInputDate(inputValue);
        if (parsed) {
            onChange(parsed);
        } else {
            // Reset to current value if invalid (but not empty)
            setInputValue(formatDateRangeDisplay(dateRange));
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleInputBlur();
        }
    };

    // Calendar navigation
    const goToNextMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToPrevMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextYear = () => {
        setViewDate(prev => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
    };

    const goToPrevYear = () => {
        setViewDate(prev => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
    };

    // Navigate year decades (for year picker)
    const goToNextDecade = () => {
        setViewDate(prev => new Date(prev.getFullYear() + 20, prev.getMonth(), 1));
    };

    const goToPrevDecade = () => {
        setViewDate(prev => new Date(prev.getFullYear() - 20, prev.getMonth(), 1));
    };

    // Handle year selection
    const handleYearClick = (year: number) => {
        setViewDate(prev => new Date(year, prev.getMonth(), 1));
        setViewMode('months');
    };

    // Generate years for the year picker (20 years)
    const generateYears = () => {
        const currentYear = viewDate.getFullYear();
        const startYear = Math.floor(currentYear / 20) * 20;
        const years: number[] = [];
        for (let i = 0; i < 20; i++) {
            years.push(startYear + i);
        }
        return years;
    };

    // Get year range for header display
    const getYearRange = () => {
        const currentYear = viewDate.getFullYear();
        const startYear = Math.floor(currentYear / 20) * 20;
        return `${startYear} - ${startYear + 19}`;
    };

    // Handle day selection for range
    const handleDayClick = (date: Date) => {
        if (!rangeStart) {
            // First click - set start
            setRangeStart(date);
            onChange({ from: date, to: undefined });
        } else {
            // Second click - set end
            if (date < rangeStart) {
                onChange({ from: date, to: rangeStart });
            } else {
                onChange({ from: rangeStart, to: date });
            }
            setRangeStart(undefined);
        }
    };

    // Handle month selection
    const handleMonthClick = (monthIndex: number) => {
        setViewDate(prev => new Date(prev.getFullYear(), monthIndex, 1));
        setViewMode('days');
    };

    // Generate calendar days for current month
    const generateCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const weeks: (Date | null)[][] = [];
        let currentWeek: (Date | null)[] = [];

        // Add empty cells for days before start of month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthDay = new Date(year, month, 0 - (startingDayOfWeek - i - 1));
            currentWeek.push(prevMonthDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            currentWeek.push(new Date(year, month, day));
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // Fill remaining cells with next month days
        if (currentWeek.length > 0) {
            let nextDay = 1;
            while (currentWeek.length < 7) {
                currentWeek.push(new Date(year, month + 1, nextDay++));
            }
            weeks.push(currentWeek);
        }

        return weeks;
    };

    // Check if a date is in current view month
    const isCurrentMonth = (date: Date) => {
        return date.getMonth() === viewDate.getMonth() && date.getFullYear() === viewDate.getFullYear();
    };

    // Check if date is selected (part of range)
    const isSelected = (date: Date) => {
        if (!dateRange.from) return false;
        if (!dateRange.to) {
            return date.toDateString() === dateRange.from.toDateString();
        }
        return date >= dateRange.from && date <= dateRange.to;
    };

    // Check if date is range start or end
    const isRangeEnd = (date: Date) => {
        if (dateRange.to && date.toDateString() === dateRange.to.toDateString()) return true;
        if (dateRange.from && !dateRange.to && date.toDateString() === dateRange.from.toDateString()) return true;
        return false;
    };

    const isRangeStart = (date: Date) => {
        return dateRange.from && date.toDateString() === dateRange.from.toDateString();
    };

    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Check if month is in selected range
    const isMonthInRange = (monthIndex: number) => {
        if (!dateRange.from) return false;
        const year = viewDate.getFullYear();
        const monthStart = new Date(year, monthIndex, 1);
        const monthEnd = new Date(year, monthIndex + 1, 0);

        if (!dateRange.to) {
            return dateRange.from.getMonth() === monthIndex && dateRange.from.getFullYear() === year;
        }

        return monthEnd >= dateRange.from && monthStart <= dateRange.to;
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {/* SAP UI5 style input with calendar icon on RIGHT */}
                <div className={cn(
                    "h-8 w-full flex items-center border-2 rounded-md bg-card cursor-pointer transition-all",
                    isOpen
                        ? "border-2 border-[var(--color-brand)]"
                        : "border-[var(--input-border)] hover:border-[var(--color-brand)] hover:bg-[var(--accent)]"
                )}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        placeholder={placeholder}
                        className="flex-1 h-full px-3 text-sm bg-transparent outline-none border-none placeholder:text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3">
                    {viewMode === 'days' ? (
                        <>
                            {/* Month/Year Header with Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToPrevMonth}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center flex-1 gap-1 px-1">
                                    <Button
                                        variant="ghost"
                                        className="text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary py-1.5 h-auto transition-colors flex-1"
                                        onClick={() => setViewMode('months')}
                                    >
                                        {MONTHS[viewDate.getMonth()]}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary py-1.5 h-auto transition-colors flex-1"
                                        onClick={() => setViewMode('years')}
                                    >
                                        {viewDate.getFullYear()}
                                    </Button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToNextMonth}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Day names header */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {DAYS.map(day => (
                                    <div key={day} className="text-center text-xs text-muted-foreground font-normal w-9">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar days */}
                            <div className="space-y-1">
                                {generateCalendarDays().map((week, weekIndex) => (
                                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                                        {week.map((date, dayIndex) => {
                                            if (!date) return <div key={dayIndex} className="w-9 h-9" />;

                                            const inCurrentMonth = isCurrentMonth(date);
                                            const selected = isSelected(date);
                                            const today = isToday(date);
                                            const rangeStart = isRangeStart(date);
                                            const rangeEnd = isRangeEnd(date);

                                            return (
                                                <Button
                                                    key={dayIndex}
                                                    variant="ghost"
                                                    className={cn(
                                                        "h-9 w-9 text-center text-sm p-0 font-normal rounded-md",
                                                        !inCurrentMonth && "text-muted-foreground opacity-50",
                                                        today && !selected && "bg-accent text-accent-foreground",
                                                        selected && !rangeStart && !rangeEnd && "bg-accent",
                                                        (rangeStart || rangeEnd) && "bg-primary text-primary-foreground",
                                                        "hover:bg-accent hover:text-accent-foreground"
                                                    )}
                                                    onClick={() => handleDayClick(date)}
                                                >
                                                    {date.getDate()}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : viewMode === 'months' ? (
                        <>
                            {/* Year Header with Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToPrevYear}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium text-primary">
                                    {viewDate.getFullYear()}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToNextYear}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Month grid */}
                            <div className="grid grid-cols-3 gap-2">
                                {MONTHS.map((month, index) => {
                                    const inRange = isMonthInRange(index);
                                    const isCurrentViewMonth = index === viewDate.getMonth();

                                    return (
                                        <Button
                                            key={month}
                                            variant="ghost"
                                            className={cn(
                                                "px-3 py-2 text-sm rounded-md transition-colors",
                                                inRange && "bg-primary text-primary-foreground",
                                                !inRange && "hover:bg-accent hover:text-accent-foreground",
                                                isCurrentViewMonth && !inRange && "border border-primary"
                                            )}
                                            onClick={() => handleMonthClick(index)}
                                        >
                                            {month}
                                        </Button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* Year picker view */
                        <>
                            {/* Year Range Header with Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToPrevDecade}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium text-primary underline">
                                    {getYearRange()}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={goToNextDecade}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Year grid - 5 rows x 4 columns */}
                            <div className="grid grid-cols-4 gap-2">
                                {generateYears().map((year) => {
                                    const isCurrentYear = year === new Date().getFullYear();
                                    const isSelectedYear = year === viewDate.getFullYear();

                                    return (
                                        <Button
                                            key={year}
                                            variant="ghost"
                                            className={cn(
                                                "px-2 py-2 text-sm rounded-md transition-colors",
                                                isSelectedYear && "border border-primary",
                                                isCurrentYear && !isSelectedYear && "bg-accent",
                                                "hover:bg-accent hover:text-accent-foreground text-primary"
                                            )}
                                            onClick={() => handleYearClick(year)}
                                        >
                                            {year}
                                        </Button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
