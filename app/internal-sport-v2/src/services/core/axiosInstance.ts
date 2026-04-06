import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { triggerSessionExpiredGlobal } from '@/components/providers/SessionTimeoutProvider';

const isLocal = false;

const axiosInstance: AxiosInstance = axios.create({
  baseURL: isLocal ? 'http://localhost:5000' : '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

const csrfTokens = new Map<string, string | null>();
const tokenFetchPromises = new Map<string, Promise<string | null>>();

function normalizeRequestPath(url?: string) {
  if (!url) return '/api/player';

  try {
    const pathname = url.startsWith('http')
      ? new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname
      : url;

    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}

function resolveCsrfRoot(url?: string) {
  const normalizedPath = normalizeRequestPath(url);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments[0] === 'api' && segments[1]) {
    return `/${segments[0]}/${segments[1]}`;
  }

  if (segments[0] === 'odata' && segments[1]) {
    return `/${segments[0]}/${segments[1]}`;
  }

  return '/api/player';
}

async function fetchCsrfToken(serviceRoot: string): Promise<string | null> {
  const inFlight = tokenFetchPromises.get(serviceRoot);
  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const response = await axios.get(`${serviceRoot}/$metadata`, {
        headers: {
          'X-CSRF-Token': 'Fetch',
        },
      });

      const token = response.headers['x-csrf-token'] || null;
      csrfTokens.set(serviceRoot, token);
      return token;
    } catch (error) {
      console.warn('CSRF token fetch failed (may indicate authorization issue):', (error as any)?.response?.status);
      csrfTokens.set(serviceRoot, null);
      return null;
    } finally {
      tokenFetchPromises.delete(serviceRoot);
    }
  })();

  tokenFetchPromises.set(serviceRoot, request);
  return request;
}

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Work Zone serves apps under a sub-path; keep backend calls app-relative.
    if (!isLocal && typeof config.url === 'string' && /^\/(api|odata)\//.test(config.url)) {
      config.url = config.url.slice(1);
    }

    const method = config.method?.toLowerCase();

    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      const serviceRoot = resolveCsrfRoot(config.url);

      if (!csrfTokens.has(serviceRoot) || !csrfTokens.get(serviceRoot)) {
        await fetchCsrfToken(serviceRoot);
      }

      const csrfToken = csrfTokens.get(serviceRoot);
      if (csrfToken && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirectingToLogin = false;

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      console.warn('[Session] Token expired - showing session expired dialog.');
      triggerSessionExpiredGlobal();
      return new Promise(() => { });
    }

    if (error.response?.status === 403 && !originalRequest._retry) {
      const method = originalRequest.method?.toLowerCase();
      const isWriteOp = method && ['post', 'put', 'patch', 'delete'].includes(method);

      if (isWriteOp) {
        originalRequest._retry = true;
        const serviceRoot = resolveCsrfRoot(originalRequest.url);

        csrfTokens.delete(serviceRoot);
        await fetchCsrfToken(serviceRoot);

        const csrfToken = csrfTokens.get(serviceRoot);
        if (csrfToken) {
          originalRequest.headers['X-CSRF-Token'] = csrfToken;
          return axiosInstance(originalRequest);
        }
      }
    }

    if (error.response?.status === 403) {
      error.isForbidden = true;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
