// src/hooks/useDateFormatter.ts
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@/utils/formatters/date';

export function useDateFormatter() {
  const { i18n } = useTranslation();

  return {
    formatDate: (value?: string | Date, options?: Intl.DateTimeFormatOptions) => {
      const dateString = value instanceof Date ? value.toISOString() : value;
      return formatDate(dateString, i18n.language, options);
    },
    /**
     * Formats a UTC date/time string to display in local timezone with both date and time
     * based on the current language/locale.
     */
    formatDateTime: (value?: string | Date, options?: Intl.DateTimeFormatOptions) => {
      const dateString = value instanceof Date ? value.toISOString() : value;
      return formatDateTime(dateString, i18n.language, options);
    },
  };
}

