const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Local dummy auth mode:
 * - enabled in Vite dev
 * - or when running on localhost/loopback
 */
export function isLocalDevAuthBypass(): boolean {
    if (import.meta.env.DEV) return true;
    if (typeof window === "undefined") return false;
    return LOCAL_HOSTNAMES.has(window.location.hostname);
}

