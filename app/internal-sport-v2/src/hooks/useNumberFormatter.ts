import { useTranslation } from 'react-i18next';
import {
    formatLocaleNumber,
    parseLocaleNumber,
    normalizeNumberForDB,
    getLocaleNumberSeparators,
} from '@/utils/formatters/number';

/**
 * React hook that wraps number formatting utilities with the current i18n locale.
 * Mirrors the pattern of useDateFormatter.
 */
export function useNumberFormatter() {
    const { i18n } = useTranslation();

    return {
        /** Format a DB number for locale display: 1234.56 → "1.234,56" (de) */
        formatNumber: (value: number | string | null | undefined, scale?: number) =>
            formatLocaleNumber(value, i18n.language, scale),

        /** Parse a locale-formatted string to a JS number: "1.234,56" → 1234.56 */
        parseNumber: (value: string) =>
            parseLocaleNumber(value, i18n.language),

        /** Normalize a locale string to DB format: "1.234,56" → "1234.56" */
        normalizeForDB: (value: string, scale?: number) =>
            normalizeNumberForDB(value, i18n.language, scale),

        /** Get the locale's decimal and thousand separators */
        separators: getLocaleNumberSeparators(i18n.language),

        /** Current locale string */
        locale: i18n.language,
    };
}
