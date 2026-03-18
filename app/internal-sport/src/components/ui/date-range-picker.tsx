"use client";

import * as React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { InputContainer } from "./input-container";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isValidDate = (value: Date) => !Number.isNaN(value.getTime());

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const parsed = new Date(year, month - 1, day);
  if (!isValidDate(parsed)) return undefined;
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return undefined;
  }
  return parsed;
};

const normalizeDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDisplay = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);

export interface DateRangePickerProps {
  /** ISO string "YYYY-MM-DD" for start */
  startValue?: string;
  /** ISO string "YYYY-MM-DD" for end */
  endValue?: string;
  /** Called when the range changes */
  onChangeRange?: (range: { start: string; end: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  startValue,
  endValue,
  onChangeRange,
  placeholder = "Select date range",
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days");
  const [viewDate, setViewDate] = React.useState(() => new Date());

  const startDate = React.useMemo(() => (startValue ? parseIsoDate(startValue) : undefined), [startValue]);
  const endDate = React.useMemo(() => (endValue ? parseIsoDate(endValue) : undefined), [endValue]);

  React.useEffect(() => {
    if (startDate) {
      setViewDate(startDate);
    }
  }, [startDate]);

  // Click a day: pick start, then end, then reset to new start
  const handleDayClick = (day: Date) => {
    const dayIso = formatIsoDate(day);

    // No start yet → set start
    if (!startDate) {
      onChangeRange?.({ start: dayIso, end: "" });
      return;
    }

    // Start exists, no end → set end (auto-swap if needed)
    if (startDate && !endDate) {
      if (day < startDate) {
        onChangeRange?.({ start: dayIso, end: formatIsoDate(startDate) });
      } else {
        onChangeRange?.({ start: formatIsoDate(startDate), end: dayIso });
      }
      return;
    }

    // Both exist → reset to new start
    onChangeRange?.({ start: dayIso, end: "" });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeRange?.({ start: "", end: "" });
  };

  const goToPrevMonth = () => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToPrevYear = () => setViewDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
  const goToNextYear = () => setViewDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
  const goToPrevDecade = () => setViewDate((prev) => new Date(prev.getFullYear() - 20, prev.getMonth(), 1));
  const goToNextDecade = () => setViewDate((prev) => new Date(prev.getFullYear() + 20, prev.getMonth(), 1));

  const handleYearClick = (year: number) => {
    setViewDate((prev) => new Date(year, prev.getMonth(), 1));
    setViewMode("months");
  };

  const handleMonthClick = (monthIndex: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), monthIndex, 1));
    setViewMode("days");
  };

  const generateYears = () => {
    const currentYear = viewDate.getFullYear();
    const start = Math.floor(currentYear / 20) * 20;
    return Array.from({ length: 20 }, (_, i) => start + i);
  };

  const getYearRange = () => {
    const currentYear = viewDate.getFullYear();
    const start = Math.floor(currentYear / 20) * 20;
    return `${start} - ${start + 19}`;
  };

  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const weeks: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDay = new Date(year, month, 0 - (startingDayOfWeek - i - 1));
      currentWeek.push(prevMonthDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      let nextDay = 1;
      while (currentWeek.length < 7) {
        currentWeek.push(new Date(year, month + 1, nextDay));
        nextDay++;
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const isCurrentMonth = (d: Date) =>
    d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();

  const isToday = (d: Date) => normalizeDay(d).getTime() === normalizeDay(new Date()).getTime();

  const isRangeStart = (d: Date) =>
    !!startDate && normalizeDay(d).getTime() === normalizeDay(startDate).getTime();

  const isRangeEnd = (d: Date) =>
    !!endDate && normalizeDay(d).getTime() === normalizeDay(endDate).getTime();

  const isInRange = (d: Date) => {
    if (!startDate || !endDate) return false;
    const t = normalizeDay(d).getTime();
    return t > normalizeDay(startDate).getTime() && t < normalizeDay(endDate).getTime();
  };

  // Display value
  const displayValue = React.useMemo(() => {
    if (startDate && endDate) {
      return `${formatDisplay(startDate)} → ${formatDisplay(endDate)}`;
    }
    if (startDate) {
      return `${formatDisplay(startDate)} → …`;
    }
    return "";
  }, [startDate, endDate]);

  const hasValue = !!startValue || !!endValue;

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) setViewMode("days");
      }}
    >
      <PopoverTrigger asChild>
        <InputContainer
          disabled={disabled}
          isOpen={open}
          className={cn(
            "!h-9 w-full flex items-center justify-between gap-2",
            !hasValue && "text-muted-foreground",
            className,
          )}
          onClick={() => !disabled && setOpen(true)}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          <span className="text-xs font-normal flex-1 text-left truncate">
            {displayValue || placeholder}
          </span>
          {hasValue && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
              aria-label="Clear date range"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </InputContainer>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-border" align="start">
        <div className="p-3">
          {viewMode === "days" ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPrevMonth} type="button">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="link"
                    className="text-sm font-medium text-primary hover:underline p-0 h-auto"
                    onClick={() => setViewMode("months")}
                    type="button"
                  >
                    {MONTHS[viewDate.getMonth()]}
                  </Button>
                  <Button
                    variant="link"
                    className="text-sm font-medium text-primary hover:underline p-0 h-auto"
                    onClick={() => setViewMode("years")}
                    type="button"
                  >
                    {viewDate.getFullYear()}
                  </Button>
                </div>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextMonth} type="button">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-normal w-9">
                    {day}
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                {generateCalendarDays().map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-cols-7 gap-1">
                    {week.map((dayDate, dayIndex) => {
                      if (!dayDate) return <div key={dayIndex} className="w-9 h-9" />;

                      const inCurrentMonth = isCurrentMonth(dayDate);
                      const today = isToday(dayDate);
                      const rangeStart = isRangeStart(dayDate);
                      const rangeEnd = isRangeEnd(dayDate);
                      const inRange = isInRange(dayDate);

                      return (
                        <Button
                          key={dayIndex}
                          variant="ghost"
                          className={cn(
                            "h-9 w-9 text-center text-sm p-0 font-normal rounded-md",
                            !inCurrentMonth && "text-muted-foreground opacity-50",
                            today && !rangeStart && !rangeEnd && "bg-accent text-accent-foreground",
                            (rangeStart || rangeEnd) && "bg-primary text-primary-foreground",
                            inRange && "bg-primary/20 text-primary",
                            "hover:bg-accent hover:text-accent-foreground",
                          )}
                          onClick={() => handleDayClick(dayDate)}
                          type="button"
                        >
                          {dayDate.getDate()}
                        </Button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          ) : viewMode === "months" ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPrevYear} type="button">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="link"
                  className="text-sm font-medium text-primary hover:underline p-0 h-auto"
                  onClick={() => setViewMode("years")}
                  type="button"
                >
                  {viewDate.getFullYear()}
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextYear} type="button">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

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
                        isCurrentViewMonth && "border border-primary",
                      )}
                      onClick={() => handleMonthClick(index)}
                      type="button"
                    >
                      {month}
                    </Button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToPrevDecade} type="button">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-primary">{getYearRange()}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={goToNextDecade} type="button">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

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
                        "hover:bg-accent hover:text-accent-foreground text-primary",
                      )}
                      onClick={() => handleYearClick(year)}
                      type="button"
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
