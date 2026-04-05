import { useQuery } from '@tanstack/react-query';

interface UserInfo {
  id: string;
  roles: string[];
  givenName: string;
  familyName: string;
  email: string;
  allowedObjectTypes: string[];
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isAdmin?: boolean | null;
}

async function fetchUserInfo(): Promise<UserInfo> {
  const response = await fetch('/api/player/getMyProfile()');

  if (!response.ok) {
    throw new Error(`Failed to load user profile: ${response.status}`);
  }

  const raw = (await response.json().catch(() => ({}))) as Partial<UserInfo>;
  const givenName = raw.firstName || raw.givenName || '';
  const familyName = raw.lastName || raw.familyName || '';

  return {
    id: raw.id || raw.email || '',
    roles: Array.isArray(raw.roles) ? raw.roles.filter((role): role is string => typeof role === 'string') : [],
    givenName,
    familyName,
    email: raw.email || '',
    allowedObjectTypes: Array.isArray(raw.allowedObjectTypes) ? raw.allowedObjectTypes : [],
    displayName: raw.displayName || null,
    isAdmin: raw.isAdmin ?? null,
  };
}

function normalizeRoleName(role: string): string {
  const trimmed = role.trim();
  if (!trimmed) return '';

  // Support namespaced scopes like "xsapp.PredictionAdmin" and "xsapp/PredictionAdmin".
  const slashIdx = trimmed.lastIndexOf('/');
  const dotIdx = trimmed.lastIndexOf('.');
  const marker = Math.max(slashIdx, dotIdx);
  const raw = marker >= 0 ? trimmed.slice(marker + 1) : trimmed;

  return raw.toLowerCase();
}

export function useUserInfo() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['userInfo'],
    queryFn: fetchUserInfo,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const fallbackName = `${data?.givenName || ''} ${data?.familyName || ''}`.trim();
  const displayName = data?.displayName?.trim() || fallbackName || data?.email || 'User';
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';

  const roles = data?.roles || [];
  const normalizedRoles = new Set(
    roles
      .filter((role): role is string => typeof role === 'string')
      .map(normalizeRoleName)
      .filter(Boolean),
  );

  const isAdmin =
    data?.isAdmin === true ||
    normalizedRoles.has('admin') ||
    normalizedRoles.has('predictionadmin') ||
    normalizedRoles.has('cnma_conarum_internal_admin');

  return {
    user: data,
    isAdmin,
    isUser: !isAdmin,
    allowedObjectTypes: data?.allowedObjectTypes || [],
    displayName,
    initials,
    isLoading,
    error,
  };
}
