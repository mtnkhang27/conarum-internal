import type { UserProfile } from "@/types";

export type CountryOption = {
    code: string;
    label: string;
};

export const EMPTY_PROFILE: UserProfile = {
    avatarUrl: "",
    displayName: "",
    firstName: "",
    lastName: "",
    email: "",
    roles: [],
    isAdmin: false,
    phone: "",
    country: "",
    city: "",
    timezone: "",
    favoriteTeamId: null,
    favoriteTeam: "",
    bio: "",
};

const COUNTRY_CODES = [
    "AE", "AR", "AT", "AU", "BE", "BG", "BH", "BO", "BR", "BN", "CA", "CH", "CL", "CN", "CO", "CR", "CU", "CZ",
    "DE", "DK", "DO", "DZ", "EC", "EE", "EG", "ES", "FI", "FR", "GB", "GH", "GR", "GT", "HK", "HN", "HR", "HU",
    "ID", "IE", "IL", "IN", "IT", "JO", "JP", "KE", "KH", "KR", "KW", "LA", "LB", "LK", "LT", "LU", "LV", "MA",
    "MM", "MX", "MY", "NG", "NI", "NL", "NO", "NP", "NZ", "OM", "PA", "PE", "PH", "PK", "PL", "PT", "PY", "QA",
    "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "SV", "TH", "TN", "TR", "TW", "UA", "US", "UY", "VE", "VN",
    "ZA",
] as const;

const createRegionDisplayNames = (locale: string): Intl.DisplayNames | null => {
    try {
        return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
        return null;
    }
};

const REGION_NAMES_VI = createRegionDisplayNames("vi");
const REGION_NAMES_EN = createRegionDisplayNames("en");

export const COUNTRY_OPTIONS: CountryOption[] = COUNTRY_CODES
    .map((code) => ({
        code,
        label: REGION_NAMES_VI?.of(code) || REGION_NAMES_EN?.of(code) || code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country.label]));

const normalizeCountryKey = (value: string): string => {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
};

const COUNTRY_ALIAS_TO_CODE = (() => {
    const aliases = new Map<string, string>();
    for (const country of COUNTRY_OPTIONS) {
        aliases.set(normalizeCountryKey(country.code), country.code);
        aliases.set(normalizeCountryKey(country.label), country.code);
        const englishName = REGION_NAMES_EN?.of(country.code);
        if (englishName) {
            aliases.set(normalizeCountryKey(englishName), country.code);
        }
    }
    return aliases;
})();

export const toCountryCode = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const normalizedCode = trimmed.toUpperCase();
    if (COUNTRY_LABEL_BY_CODE.has(normalizedCode)) {
        return normalizedCode;
    }

    return COUNTRY_ALIAS_TO_CODE.get(normalizeCountryKey(trimmed)) || normalizedCode;
};

export const toCountryLabel = (value: string): string => {
    if (!value) return "";
    return COUNTRY_LABEL_BY_CODE.get(toCountryCode(value)) || value;
};

export const composeDisplayName = (firstName: string, lastName: string, fallback = ""): string => {
    const parts = [firstName, lastName]
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    if (parts.length > 0) return parts.join(" ").slice(0, 100);
    return fallback.trim().slice(0, 100);
};
