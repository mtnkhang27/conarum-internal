export const CAP_ROLE_USER = 'PredictionUser';
export const CAP_ROLE_ADMIN = 'PredictionAdmin';
export const ROLE_ALIAS_AUTHENTICATED_USER = 'authenticated-user';
export const ROLE_ALIAS_ADMIN = 'admin';
export const WORKZONE_ROLE_USER = 'User';
export const WORKZONE_ROLE_ADMIN = 'Admin';

export const DEFAULT_SANDBOX_USER_GROUP = process.env.IDP_DEFAULT_USER_GROUP?.trim() || 'CNMA_CONARUM_INTERNAL_USER';
export const DEFAULT_SANDBOX_ADMIN_GROUP = process.env.IDP_ADMIN_GROUP?.trim() || 'CNMA_CONARUM_INTERNAL_ADMIN';

export const PROVISIONABLE_APP_ROLES = [CAP_ROLE_USER, CAP_ROLE_ADMIN] as const;
export const SANDBOX_WORKZONE_ROLES = [WORKZONE_ROLE_USER, WORKZONE_ROLE_ADMIN] as const;

export type ProvisionableAppRole = (typeof PROVISIONABLE_APP_ROLES)[number];
export type SandboxWorkzoneRole = (typeof SANDBOX_WORKZONE_ROLES)[number];

const toUniqueOrdered = <T>(values: T[]): T[] => {
    const seen = new Set<T>();
    const result: T[] = [];

    for (const value of values) {
        if (seen.has(value)) continue;
        seen.add(value);
        result.push(value);
    }

    return result;
};

export const normalizeProvisionableAppRole = (value: unknown): ProvisionableAppRole | null => {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    if (
        normalized === CAP_ROLE_ADMIN.toLowerCase()
        || normalized === ROLE_ALIAS_ADMIN
        || normalized === DEFAULT_SANDBOX_ADMIN_GROUP.toLowerCase()
        || normalized === 'admin'
    ) {
        return CAP_ROLE_ADMIN;
    }

    if (
        normalized === CAP_ROLE_USER.toLowerCase()
        || normalized === ROLE_ALIAS_AUTHENTICATED_USER
        || normalized === DEFAULT_SANDBOX_USER_GROUP.toLowerCase()
        || normalized === 'user'
    ) {
        return CAP_ROLE_USER;
    }

    return null;
};

export const normalizeStrictProvisionableAppRole = (value: unknown): ProvisionableAppRole | null => {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    return PROVISIONABLE_APP_ROLES.find((role) => role.toLowerCase() === normalized) ?? null;
};

export const normalizeSandboxWorkzoneRole = (value: unknown): SandboxWorkzoneRole | null => {
    if (typeof value !== 'string') return null;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    if (normalized === WORKZONE_ROLE_ADMIN.toLowerCase()) {
        return WORKZONE_ROLE_ADMIN;
    }

    if (normalized === WORKZONE_ROLE_USER.toLowerCase()) {
        return WORKZONE_ROLE_USER;
    }

    return null;
};

export const getAssignedGroupsForWorkzoneRole = (workzoneRole: SandboxWorkzoneRole): string[] => {
    if (workzoneRole === WORKZONE_ROLE_ADMIN) {
        return [DEFAULT_SANDBOX_USER_GROUP, DEFAULT_SANDBOX_ADMIN_GROUP];
    }

    return [DEFAULT_SANDBOX_USER_GROUP];
};

export const getAssignedGroupsForAppRole = (appRole: ProvisionableAppRole): string[] => {
    if (appRole === CAP_ROLE_ADMIN) {
        return [DEFAULT_SANDBOX_USER_GROUP, DEFAULT_SANDBOX_ADMIN_GROUP];
    }

    return [DEFAULT_SANDBOX_USER_GROUP];
};

export const getAssignedAppRolesForAppRole = (appRole: ProvisionableAppRole): ProvisionableAppRole[] => {
    if (appRole === CAP_ROLE_ADMIN) {
        return [CAP_ROLE_USER, CAP_ROLE_ADMIN];
    }

    return [CAP_ROLE_USER];
};

export const expandStoredRolesFromAppRoles = (appRoles: ProvisionableAppRole[]): string[] => {
    const expanded: string[] = [ROLE_ALIAS_AUTHENTICATED_USER];

    if (appRoles.includes(CAP_ROLE_USER) || appRoles.includes(CAP_ROLE_ADMIN)) {
        expanded.push(CAP_ROLE_USER);
    }

    if (appRoles.includes(CAP_ROLE_ADMIN)) {
        expanded.push(CAP_ROLE_ADMIN, ROLE_ALIAS_ADMIN);
    }

    return toUniqueOrdered(expanded);
};
