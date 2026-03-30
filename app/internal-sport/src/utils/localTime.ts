type DateInput = Date | string | number;

function normalizeDateString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  return trimmed;
}

export function toValidDate(value?: DateInput | null): Date | null {
  if (value == null || value === "") return null;
  const normalizedValue =
    typeof value === "string" ? normalizeDateString(value) : value;
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}

export function formatLocalDate(
  value: DateInput,
  locale: string | string[] = "en-US",
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
) {
  const date = toValidDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatLocalTime(
  value: DateInput,
  locale?: string | string[],
  options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  },
) {
  const date = toValidDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatLocalDateTime(
  value: DateInput,
  {
    locale = "en-US",
    dateOptions = { month: "short", day: "numeric", year: "numeric" },
    timeOptions = { hour: "numeric", minute: "2-digit", hour12: false },
    separator = " ",
  }: {
    locale?: string | string[];
    dateOptions?: Intl.DateTimeFormatOptions;
    timeOptions?: Intl.DateTimeFormatOptions;
    separator?: string;
  } = {},
) {
  const dateText = formatLocalDate(value, locale, dateOptions);
  if (!dateText) return "";

  // Midnight-UTC is a placeholder — show date only + "TBD" for time
  if (isMidnightUtcPlaceholder(value)) {
    return `${dateText}${separator}TBD`;
  }

  const timeText = formatLocalTime(value, locale, timeOptions);
  if (!timeText) return dateText;
  return `${dateText}${separator}${timeText}`;
}

export function getLocalDateKey(value: DateInput) {
  const date = toValidDate(value);
  if (!date) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getLocalTodayDateKey(referenceDate: Date = new Date()) {
  return getLocalDateKey(referenceDate);
}

export function addDaysToDateKey(dateKey: string, amount: number) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return "";

  const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  next.setUTCDate(next.getUTCDate() + amount);

  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function getLocalDayRangeIso(dateKey: string) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) {
    return {
      startIso: "",
      endExclusiveIso: "",
    };
  }

  const start = new Date(parsed.year, parsed.month - 1, parsed.day, 0, 0, 0, 0);
  const endExclusive = new Date(parsed.year, parsed.month - 1, parsed.day + 1, 0, 0, 0, 0);

  return {
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}

export function formatLocalDateTimeInputValue(value?: DateInput | null) {
  const date = value == null ? null : toValidDate(value);
  if (!date) return "";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeInputToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isTodayInLocal(value: DateInput, referenceDate: Date = new Date()) {
  const dateKey = getLocalDateKey(value);
  const todayKey = getLocalTodayDateKey(referenceDate);
  return !!dateKey && dateKey === todayKey;
}

export function isTomorrowInLocal(value: DateInput, referenceDate: Date = new Date()) {
  const dateKey = getLocalDateKey(value);
  const todayKey = getLocalTodayDateKey(referenceDate);
  if (!dateKey || !todayKey) return false;
  return dateKey === addDaysToDateKey(todayKey, 1);
}

/**
 * Detect whether an ISO date string is a midnight-UTC placeholder.
 * football-data.org uses "T00:00:00Z" when the real kickoff time has not
 * been decided yet. We must NOT convert this to local time (e.g. 07:00 in
 * UTC+7) because it would be misleading.
 */
export function isMidnightUtcPlaceholder(value: DateInput): boolean {
  if (typeof value !== "string") return false;
  return /T00:00:00(\.0{1,3})?Z$/i.test(value.trim());
}

export function formatLocalRelativeKickoff(value: DateInput) {
  const date = toValidDate(value);
  if (!date) return "";

  // Midnight-UTC is a placeholder — show date only + "TBD" for time
  if (isMidnightUtcPlaceholder(value)) {
    const dateText = formatLocalDate(value, "en-US", {
      month: "short",
      day: "numeric",
    });
    return dateText ? `${dateText} / TBD` : "TBD";
  }

  if (date.getTime() < Date.now()) return "Started";

  const timeText = formatLocalTime(date, undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

  if (isTodayInLocal(date)) return `Today / ${timeText}`;
  if (isTomorrowInLocal(date)) return `Tomorrow / ${timeText}`;

  return `${formatLocalDate(date, "en-US", {
    month: "short",
    day: "numeric",
  })} / ${timeText}`;
}
