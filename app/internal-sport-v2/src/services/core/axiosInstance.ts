import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { triggerSessionExpiredGlobal } from '@/components/providers/SessionTimeoutProvider';

// Determine if we're running locally
// const isLocal = typeof window !== 'undefined' &&
//   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const isLocal = false;

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  // Use relative path for Vite proxy in development, or absolute path in production
  baseURL: isLocal ? 'http://localhost:5000' : '', // Relative path for WorkZone + approuter compatibility
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// CSRF Token cache
let csrfToken: string | null = null;
let tokenFetchPromise: Promise<string | null> | null = null;

/**
 * Fetch CSRF token from the server
 * Uses GET request with X-CSRF-Token: Fetch header
 */
const fetchCsrfToken = async (): Promise<string | null> => {
  // If already fetching, wait for it
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  tokenFetchPromise = (async () => {
    try {
      // Use GET to fetch token - OData endpoints don't always support HEAD
      const response = await axios.get('odata/v4/extraction/$metadata', {
        headers: {
          'X-CSRF-Token': 'Fetch',
        },
      });
      csrfToken = response.headers['x-csrf-token'];
      return csrfToken;
    } catch (error) {
      console.warn('CSRF token fetch failed (may indicate authorization issue):', (error as any)?.response?.status);
      // Don't throw — return null so GET requests can still proceed
      // and surface the 403 through the response interceptor
      csrfToken = null;
      return null;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
};

/**
 * Request interceptor - adds CSRF token to non-GET requests
 */
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase();

    // Only add CSRF token for write operations
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      // Fetch token if not cached
      if (!csrfToken) {
        await fetchCsrfToken();
      }

      if (csrfToken && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - handles CSRF token expiration (403) and session expiration (401)
 */
let isRedirectingToLogin = false;

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── 401 Unauthorized → session expired, show dialog ──
    if (error.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      console.warn('[Session] Token expired — showing session expired dialog.');
      // Show a proper "Session Expired" dialog instead of silently reloading
      triggerSessionExpiredGlobal();
      // Return a never-resolving promise so pending calls don't trigger UI errors
      return new Promise(() => { });
    }

    // ── 403 on write operation → likely CSRF token issue, retry once ──
    if (error.response?.status === 403 && !originalRequest._retry) {
      const method = originalRequest.method?.toLowerCase();
      const isWriteOp = method && ['post', 'put', 'patch', 'delete'].includes(method);

      if (isWriteOp) {
        originalRequest._retry = true;

        // Clear cached token and refetch
        csrfToken = null;
        await fetchCsrfToken();

        if (csrfToken) {
          originalRequest.headers['X-CSRF-Token'] = csrfToken;
          return axiosInstance(originalRequest);
        }
      }
    }

    // Tag 403 for UI components to detect authorization denial
    if (error.response?.status === 403) {
      error.isForbidden = true;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
