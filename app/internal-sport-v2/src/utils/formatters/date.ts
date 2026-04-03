export function formatDate(
  value?: string,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) return '-';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(date);
}

/**
 * Formats a UTC date/time string to display in local timezone with both date and time
 * based on the current locale.
 * 
 * @param value - UTC date/time string (e.g., "2026-01-14T09:13:15Z" or ISO format)
 * @param locale - The locale to use for formatting (e.g., 'en', 'de', 'ja')
 * @param options - Optional Intl.DateTimeFormatOptions to customize the format
 * @returns Formatted date and time string in local timezone, or '-' if invalid
 */
export function formatDateTime(
  value?: string,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) return '-';

  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  };

  // Use browser locale for proper regional formatting (e.g. DD.MM.YYYY for de-DE)
  const resolvedLocale = locale || navigator.language || 'en';
  return new Intl.DateTimeFormat(resolvedLocale, options || defaultOptions).format(date);
}
