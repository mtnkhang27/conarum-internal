"use client";

import * as React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { InputContainer } from "./input-container";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
};

const formatDisplayDate = (date: Date, formatString: string) => {
  if (formatString === "yyyy-MM-dd") return formatIsoDate(date);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

export interface DatePickerProps {
  id?: string;
  value?: string | Date;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: "default" | "info" | "success" | "warning" | "destructive" | "readonly";
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  formatString?: string;
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
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days");
  const [viewDate, setViewDate] = React.useState(() => new Date());

  const date = React.useMemo(() => {
    if (!value) return undefined;
    if (value instanceof Date) return isValidDate(value) ? value : undefined;

    const strict = parseIsoDate(value);
    if (strict) return strict;

    const fallback = new Date(value);
    return isValidDate(fallback) ? fallback : undefined;
  }, [value]);

  React.useEffect(() => {
    if (date) {
      setViewDate(date);
    }
  }, [date]);

  const handleSelect = (selectedDate: Date) => {
    setOpen(false);
    setViewMode("days");
    onChange?.(formatIsoDate(selectedDate));
  };

  const goToNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToPrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextYear = () => {
    setViewDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
  };

  const goToPrevYear = () => {
    setViewDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
  };

  const goToNextDecade = () => {
    setViewDate((prev) => new Date(prev.getFullYear() + 20, prev.getMonth(), 1));
  };

  const goToPrevDecade = () => {
    setViewDate((prev) => new Date(prev.getFullYear() - 20, prev.getMonth(), 1));
  };

  const handleYearClick = (year: number) => {
    setViewDate((prev) => new Date(year, prev.getMonth(), 1));
    setViewMode("months");
  };

  const generateYears = () => {
    const currentYear = viewDate.getFullYear();
    const startYear = Math.floor(currentYear / 20) * 20;
    const years: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      years.push(startYear + i);
    }
    return years;
  };

  const getYearRange = () => {
    const currentYear = viewDate.getFullYear();
    const startYear = Math.floor(currentYear / 20) * 20;
    return `${startYear} - ${startYear + 19}`;
  };

  const handleMonthClick = (monthIndex: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), monthIndex, 1));
    setViewMode("days");
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

    for (let i = 0; i < startingDayOfWeek; i += 1) {
      const prevMonthDay = new Date(year, month, 0 - (startingDayOfWeek - i - 1));
      currentWeek.push(prevMonthDay);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
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
        nextDay += 1;
      }
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const isCurrentMonth = (checkDate: Date) =>
    checkDate.getMonth() === viewDate.getMonth() && checkDate.getFullYear() === viewDate.getFullYear();

  const isSelected = (checkDate: Date) => {
    if (!date) return false;
    return normalizeDay(checkDate).getTime() === normalizeDay(date).getTime();
  };

  const isToday = (checkDate: Date) => normalizeDay(checkDate).getTime() === normalizeDay(new Date()).getTime();

  const isDateDisabled = (checkDate: Date) => {
    const day = normalizeDay(checkDate).getTime();
    if (minDate && day < normalizeDay(minDate).getTime()) return true;
    if (maxDate && day > normalizeDay(maxDate).getTime()) return true;
    return false;
  };

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setViewMode("days");
        }
      }}
    >
      <PopoverTrigger asChild>
        <InputContainer
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          variant={variant}
          isOpen={open}
          className={cn(
            "!h-9 w-full flex items-center justify-between",
            !date && "text-muted-foreground",
            className,
          )}
          onClick={() => !disabled && !readOnly && setOpen(true)}
        >
          <span className="text-sm font-normal flex-1 text-left">
            {date ? formatDisplayDate(date, formatString) : placeholder}
          </span>
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0" />
        </InputContainer>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-border" align="start">
        <div className="p-3">
          {viewMode === "days" ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToPrevMonth}
                  type="button"
                >
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToNextMonth}
                  type="button"
                >
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
                      const selected = isSelected(dayDate);
                      const today = isToday(dayDate);
                      const dateDisabled = isDateDisabled(dayDate);

                      return (
                        <Button
                          key={dayIndex}
                          variant="ghost"
                          disabled={dateDisabled}
                          className={cn(
                            "h-9 w-9 text-center text-sm p-0 font-normal rounded-md",
                            !inCurrentMonth && "text-muted-foreground opacity-50",
                            today && !selected && "bg-accent text-accent-foreground",
                            selected && "bg-primary text-primary-foreground",
                            "hover:bg-accent hover:text-accent-foreground",
                          )}
                          onClick={() => handleSelect(dayDate)}
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToPrevYear}
                  type="button"
                >
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToNextYear}
                  type="button"
                >
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToPrevDecade}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-primary">{getYearRange()}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={goToNextDecade}
                  type="button"
                >
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
