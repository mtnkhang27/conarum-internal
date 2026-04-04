const CREST_CDN_REGEX = /^https?:\/\/crests\.football-data\.org\//i;
const CREST_PROXY_ENDPOINT = '/api/crest-proxy';

export function mapExternalAssetUrls<T>(value: T): T {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (CREST_CDN_REGEX.test(trimmed)) {
      return `${CREST_PROXY_ENDPOINT}?url=${encodeURIComponent(trimmed)}` as T;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => mapExternalAssetUrls(item)) as T;
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const mapped: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(source)) {
      mapped[key] = mapExternalAssetUrls(nested);
    }

    return mapped as T;
  }

  return value;
}
