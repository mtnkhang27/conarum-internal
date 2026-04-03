"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "./utils";
import { InputContainer } from "./input-container";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";

// Month names for the month picker
const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
];

// Day names
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DatePickerProps {
  id?: string;
  value?: string | Date; // Allow Date object or ISO string (YYYY-MM-DD)
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'destructive' | 'readonly';
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  formatString?: string;
  /** Optional locale-aware display formatter. When provided, overrides formatString for display. */
  displayFormatter?: (value: string | Date) => string;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  readOnly = false,
  variant,
  className,
  minDate,
  maxDate,
  formatString = "PPP",
  displayFormatter,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'days' | 'months' | 'years'>('days');
  const [viewDate, setViewDate] = React.useState(() => new Date());

  // Parse value (string or Date) into a valid Date object or undefined
  const date = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) return isValid(value) ? value : undefined;

    try {
      // Attempt strict parsing for YYYY-MM-DD to avoid timezone shifts
      const parsed = parse(value, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return parsed;
      }

      // Fallback for full ISO dates or other formats
      const fallback = new Date(value);
      return isValid(fallback) ? fallback : undefined;
    } catch {
      return undefined;
    }
  }, [value]);

  // Update viewDate when selected date changes
  React.useEffect(() => {
    if (date) {
      setViewDate(date);
    }
  }, [date]);

  const handleSelect = (selectedDate: Date) => {
    setOpen(false);
    setViewMode('days');
    if (onChange) {
      // Always return YYYY-MM-DD string to maintain compatibility
      onChange(format(selectedDate, "yyyy-MM-dd"));
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
  const isCurrentMonth = (checkDate: Date) => {
    return checkDate.getMonth() === viewDate.getMonth() && checkDate.getFullYear() === viewDate.getFullYear();
  };

  // Check if date is selected
  const isSelected = (checkDate: Date) => {
    if (!date) return false;
    return checkDate.toDateString() === date.toDateString();
  };

  // Check if date is today
  const isToday = (checkDate: Date) => {
    const today = new Date();
    return checkDate.toDateString() === today.toDateString();
  };

  // Check if date should be disabled
  const isDateDisabled = (checkDate: Date) => {
    if (minDate && checkDate < minDate) return true;
    if (maxDate && checkDate > maxDate) return true;
    return false;
  };

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setViewMode('days');
      }
    }}>
      <PopoverTrigger asChild>
        <InputContainer
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          variant={variant}
          isOpen={open}
          className={cn(
            "!h-8 w-full flex items-center justify-between",
            !date && "text-muted-foreground",
            className
          )}
          onClick={() => !disabled && !readOnly && setOpen(true)}
        >
          <span
            className="text-sm font-normal flex-1 text-left truncate min-w-0"
            title={date ? (displayFormatter ? displayFormatter(date) : format(date, formatString)) : undefined}
          >
            {date ? (displayFormatter ? displayFormatter(date) : format(date, formatString)) : placeholder}
          </span>
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0" />
        </InputContainer>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-border" align="start">
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="link"
                    className="text-sm font-medium text-primary hover:underline p-0 h-auto"
                    onClick={() => setViewMode('months')}
                  >
                    {MONTHS[viewDate.getMonth()]}
                  </Button>
                  <Button
                    variant="link"
                    className="text-sm font-medium text-primary hover:underline p-0 h-auto"
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
                    {week.map((dayDate, dayIndex) => {
                      if (!dayDate) return <div key={dayIndex} className="w-9 h-9" />;

                      const inCurrentMonth = isCurrentMonth(dayDate);
                      const selected = isSelected(dayDate);
                      const today = isToday(dayDate);
                      const dateDisabled = isDateDisabled(dayDate);

                      return (
                        <Button
                          key={dayIndex}
                          variant="ghost"
                          disabled={dateDisabled}
                          className={cn(
                            "h-8 w-9 text-center text-sm p-0 font-normal rounded-md",
                            !inCurrentMonth && "text-muted-foreground opacity-50",
                            today && !selected && "bg-accent text-accent-foreground",
                            selected && "bg-primary text-primary-foreground",
                            "hover:bg-accent hover:text-accent-foreground"
                          )}
                          onClick={() => handleSelect(dayDate)}
                        >
                          {dayDate.getDate()}
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
                <Button
                  variant="link"
                  className="text-sm font-medium text-primary hover:underline p-0 h-auto"
                  onClick={() => setViewMode('years')}
                >
                  {viewDate.getFullYear()}
                </Button>
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
                  const isCurrentViewMonth = index === viewDate.getMonth();

                  return (
                    <Button
                      key={month}
                      variant="ghost"
                      className={cn(
                        "px-3 py-2 text-sm rounded-md transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isCurrentViewMonth && "border border-primary"
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
                <span className="text-sm font-medium text-primary">
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
