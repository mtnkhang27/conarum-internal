/**
 * Check if an error is a 403 Forbidden (authorization) error.
 * Works with the isForbidden flag set by the Axios response interceptor.
 */
export function isForbidden(error: unknown): boolean {
    return !!(error && typeof error === 'object' && (error as any).isForbidden === true);
}
