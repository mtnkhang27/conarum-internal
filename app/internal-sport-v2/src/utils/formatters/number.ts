/**
 * Locale-aware number formatting and DB normalization utilities.
 *
 * Display: numbers are formatted per the user's locale (e.g. "1.234,56" in de-DE).
 * DB:      numbers are stored without thousand separators, with '.' as decimal ("1234.56").
 */

/** Returns the decimal and thousand separator characters for a given locale. */
export function getLocaleNumberSeparators(locale: string): { decimal: string; thousand: string } {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89);
    let decimal = '.';
    let thousand = '';

    for (const part of parts) {
        if (part.type === 'decimal') decimal = part.value;
        if (part.type === 'group') thousand = part.value;
    }

    return { decimal, thousand };
}

/**
 * Parse a locale-formatted number string into a JS number.
 * Handles any thousand/decimal separator combination.
 *
 * "1.234,56" (de) → 1234.56
 * "1,234.56" (en) → 1234.56
 * "1 234,56" (fr) → 1234.56
 */
export function parseLocaleNumber(value: string, locale: string): number | null {
    if (value == null || String(value).trim() === '') return null;

    const str = String(value).trim();
    const { decimal, thousand } = getLocaleNumberSeparators(locale);

    // Remove thousand separators (could be '.', ',', ' ', or non-breaking space '\u00A0')
    let normalized = str;
    if (thousand) {
        normalized = normalized.split(thousand).join('');
    }
    // Also remove non-breaking spaces and regular spaces that might be thousand separators
    normalized = normalized.replace(/[\s\u00A0]/g, '');

    // Replace locale decimal separator with '.'
    if (decimal !== '.') {
        normalized = normalized.replace(decimal, '.');
    }

    const num = Number(normalized);
    return isNaN(num) ? null : num;
}

/**
 * Check whether a string looks like a DB-format number (e.g. "5500.00", "-1234.5").
 * DB format uses only digits, an optional leading minus, and an optional single '.' decimal.
 * It never contains commas, spaces, or multiple dots.
 *
 * When a locale is provided and its thousands separator is '.', strings like "40.100"
 * are ambiguous (could be 40.1 in DB format or 40100 in German locale). In that case,
 * we treat groups of exactly 3 digits after a dot as a thousands-separated locale string,
 * NOT as a DB-format decimal.
 */
function isDBFormat(str: string, locale?: string, scale?: number): boolean {
    if (!/^-?\d+(\.\d+)?$/.test(str)) return false;

    // If the string has no dot, it's an integer — always safe as DB format
    if (!str.includes('.')) return true;

    // If we know the locale and its thousands separator is '.', check for ambiguity
    if (locale) {
        const { thousand } = getLocaleNumberSeparators(locale);
        if (thousand === '.') {
            // A dot followed by exactly 3 digits looks like a German thousands group
            // e.g. "40.100" → likely 40,100 not 40.1
            //       "40.10"  → clearly DB format 40.10
            //       "1.234.567" → already fails the single-dot regex above
            const dotIndex = str.indexOf('.');
            const decimals = str.slice(dotIndex + 1);
            if (decimals.length === 3) {
                // BUT: if the schema tells us scale=3, then "530.000" IS DB format
                // (530 with 3 decimal places), NOT 530,000.
                if (scale !== undefined && scale === 3) return true;
                return false; // Ambiguous → treat as locale
            }
        }
    }

    return true;
}

/**
 * Format a number (or DB-format string) for locale display.
 *
 * 1234.56 → "1.234,56" (de, scale=2)
 * 1234.56 → "1,234.56" (en, scale=2)
 */
export function formatLocaleNumber(
    value: number | string | null | undefined,
    locale: string,
    scale?: number
): string {
    if (value == null || String(value).trim() === '') return '';

    let num: number | null;

    if (typeof value === 'number') {
        num = value;
    } else {
        const str = String(value).trim();
        // If the string is in DB format (e.g. "5500.00"), parse it directly
        // to avoid parseLocaleNumber misinterpreting '.' as a thousands separator
        // in locales like de-DE where '.' is the group separator.
        if (isDBFormat(str, locale, scale)) {
            num = Number(str);
        } else {
            num = parseLocaleNumber(str, locale);
        }
    }

    if (num === null || isNaN(num)) return String(value);

    const options: Intl.NumberFormatOptions = {};
    if (scale !== undefined && scale >= 0) {
        options.minimumFractionDigits = scale;
        options.maximumFractionDigits = scale;
    } else {
        // Preserve existing decimal places (up to 20)
        options.maximumFractionDigits = 20;
    }

    return new Intl.NumberFormat(locale, options).format(num);
}

/**
 * Normalize a locale-formatted number string to DB format.
 * When `scale` is provided, always output exactly that many decimal places.
 *
 * "1.234,56" (de)         → "1234.56"
 * "1,234.56" (en)         → "1234.56"
 * "123"      (en, scale=2) → "123.00"
 * "123"      (en, scale=3) → "123.000"
 * ""                       → ""
 */
export function normalizeNumberForDB(value: string, locale: string, scale?: number): string {
    if (value == null || String(value).trim() === '') return '';

    const str = String(value).trim();

    let num: number | null;

    // If the string is already in DB format (e.g. "5500.00"), parse it
    // directly to avoid parseLocaleNumber misinterpreting '.' as a
    // thousands separator in locales like de-DE.
    if (isDBFormat(str, locale, scale)) {
        num = Number(str);
    } else {
        num = parseLocaleNumber(str, locale);
    }

    if (num === null) return String(value); // Return as-is if not parseable

    // If scale is defined, always output with exactly that many decimal places
    if (scale !== undefined && scale >= 0) {
        return num.toFixed(scale);
    }

    return num.toString();
}
