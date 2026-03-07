import cds, { Request } from '@sap/cds';
import fs from 'node:fs';
import path from 'node:path';

type Claims = Record<string, unknown>;
type LocalLoginConfig = {
    email: string;
    loginName: string;
    displayName: string | null;
};

export type ResolvedUserContext = {
    userUUID: string | null;
    loginName: string | null;
    email: string | null;
    displayName: string | null;
    givenName: string | null;
    familyName: string | null;
    roles: string[];
    scopes: string[];
    identityOrigin: string | null;
};

const CAP_ROLE_USER = 'PredictionUser';
const CAP_ROLE_ADMIN = 'PredictionAdmin';
const APP_ROLES = [CAP_ROLE_USER, CAP_ROLE_ADMIN, 'authenticated-user', 'admin'];
const STATIC_ADMIN_EMAILS = new Set([
    'nam.vu@conarum.com',
    'trung.tranthanh@conarum.com',
    'khang.mai@conarum.com',
    'thien.tu@conarum.com',
    'tam.nguyen@conarum.com',
]);
const LOCAL_LOGIN_FILE = path.resolve(process.cwd(), 'login.json');

const asTrimmedString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const pickFirst = (...values: Array<string | null>): string | null => {
    for (const value of values) {
        if (value) return value;
    }
    return null;
};

const looksLikeEmail = (value: string | null): boolean => {
    if (!value) return false;
    return value.includes('@');
};

const toStringArray = (value: unknown): string[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value
            .map((item) => asTrimmedString(item))
            .filter((item): item is string => Boolean(item));
    }

    if (typeof value === 'string') {
        return value
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    return [];
};

const uniqueSorted = (values: string[]): string[] => {
    return [...new Set(values.filter((value) => value.length > 0))].sort((a, b) => a.localeCompare(b));
};

const isDevelopmentRuntime = (): boolean => {
    const profiles = new Set<string>((cds.env.profiles ?? []).map((profile) => String(profile)));
    if (profiles.has('development')) return true;
    const envProfiles = (process.env.CDS_ENV ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return envProfiles.includes('development') || process.env.NODE_ENV === 'development';
};

const rolesFromEmail = (email: string): string[] => {
    return uniqueSorted([
        CAP_ROLE_USER,
        'authenticated-user',
        ...(STATIC_ADMIN_EMAILS.has(email) ? [CAP_ROLE_ADMIN, 'admin'] : []),
    ]);
};

const expandRoleAliases = (roles: string[]): string[] => {
    const expanded = [...roles];
    if (roles.includes(CAP_ROLE_USER)) {
        expanded.push('authenticated-user');
    }
    if (roles.includes(CAP_ROLE_ADMIN)) {
        expanded.push('admin', CAP_ROLE_USER, 'authenticated-user');
    }
    return expanded;
};

const loadLocalLoginConfig = (): LocalLoginConfig | null => {
    if (!isDevelopmentRuntime()) return null;
    if (!fs.existsSync(LOCAL_LOGIN_FILE)) return null;

    try {
        const parsed = JSON.parse(fs.readFileSync(LOCAL_LOGIN_FILE, 'utf8')) as Record<string, unknown>;
        const email = asTrimmedString(parsed.email)?.toLowerCase();
        if (!email) return null;
        const loginName = asTrimmedString(parsed.loginName) ?? email;
        const displayName = asTrimmedString(parsed.displayName);
        return { email, loginName, displayName };
    } catch {
        return null;
    }
};

const getTokenClaims = (req: Request): Claims => {
    const authInfo = (req.user as any)?.authInfo;
    if (!authInfo || typeof authInfo.getPayload !== 'function') {
        return {};
    }

    try {
        const payload = authInfo.getPayload();
        if (payload && typeof payload === 'object') {
            return payload as Claims;
        }
    } catch {
        // Ignore payload parsing errors and continue with available req.user data.
    }
    return {};
};

const getAttr = (req: Request, key: string): string | null => {
    const attrs = (req.user as any)?.attr;
    if (!attrs || typeof attrs !== 'object') {
        return null;
    }
    const raw = (attrs as Record<string, unknown>)[key];
    if (Array.isArray(raw)) {
        return asTrimmedString(raw[0]);
    }
    return asTrimmedString(raw);
};

const collectRolesFromUser = (req: Request): string[] => {
    const roles: string[] = [];
    const userObj = req.user as any;

    if (typeof userObj?.is === 'function') {
        for (const roleName of APP_ROLES) {
            if (userObj.is(roleName)) {
                roles.push(roleName);
            }
        }
    }

    const rawRoles = userObj?.roles;
    if (Array.isArray(rawRoles)) {
        roles.push(...toStringArray(rawRoles));
    } else if (rawRoles && typeof rawRoles === 'object') {
        for (const [name, active] of Object.entries(rawRoles as Record<string, unknown>)) {
            if (active) {
                const normalized = asTrimmedString(name);
                if (normalized) roles.push(normalized);
            }
        }
    }

    return roles;
};

const normalizeScopeToRole = (scope: string): string => {
    const normalized = scope.trim();
    const lastSlashIndex = normalized.lastIndexOf('/');
    const lastDotIndex = normalized.lastIndexOf('.');
    const markerIndex = Math.max(lastSlashIndex, lastDotIndex);
    if (markerIndex < 0) {
        return normalized;
    }
    return normalized.slice(markerIndex + 1);
};

export const resolveUserContext = (req: Request): ResolvedUserContext => {
    const localLogin = loadLocalLoginConfig();
    if (localLogin) {
        const localDisplayName = localLogin.displayName ?? localLogin.loginName;
        return {
            userUUID: localLogin.email,
            loginName: localLogin.loginName,
            email: localLogin.email,
            displayName: localDisplayName,
            givenName: null,
            familyName: null,
            roles: rolesFromEmail(localLogin.email),
            scopes: [],
            identityOrigin: 'local-login-json',
        };
    }

    const rawId = asTrimmedString((req.user as any)?.id);
    if (!rawId || rawId === 'anonymous') {
        return {
            userUUID: null,
            loginName: null,
            email: null,
            displayName: null,
            givenName: null,
            familyName: null,
            roles: [],
            scopes: [],
            identityOrigin: null,
        };
    }

    const claims = getTokenClaims(req);

    const loginName = pickFirst(
        rawId,
        asTrimmedString(claims.user_name),
        asTrimmedString(claims.preferred_username),
        asTrimmedString(claims.sub)
    );

    const claimEmail = pickFirst(asTrimmedString(claims.email), asTrimmedString(claims.mail));
    const preferredUsername = asTrimmedString(claims.preferred_username);
    const userName = asTrimmedString(claims.user_name);
    const email = pickFirst(
        getAttr(req, 'email'),
        getAttr(req, 'mail'),
        claimEmail,
        looksLikeEmail(loginName) ? loginName : null,
        looksLikeEmail(preferredUsername) ? preferredUsername : null,
        looksLikeEmail(userName) ? userName : null
    );
    const normalizedEmail = email ? email.toLowerCase() : null;

    const givenName = pickFirst(
        getAttr(req, 'given_name'),
        getAttr(req, 'givenName'),
        asTrimmedString(claims.given_name),
        asTrimmedString(claims.givenName)
    );
    const familyName = pickFirst(
        getAttr(req, 'family_name'),
        getAttr(req, 'familyName'),
        asTrimmedString(claims.family_name),
        asTrimmedString(claims.familyName)
    );

    const fallbackDisplayName = [givenName, familyName].filter((value): value is string => Boolean(value)).join(' ');
    const displayName = pickFirst(
        getAttr(req, 'name'),
        getAttr(req, 'displayName'),
        asTrimmedString(claims.name),
        asTrimmedString(claims.display_name),
        fallbackDisplayName || null,
        normalizedEmail,
        loginName
    );

    const userUUID = pickFirst(
        getAttr(req, 'user_uuid'),
        getAttr(req, 'userUUID'),
        asTrimmedString(claims.user_uuid),
        asTrimmedString(claims.userUUID),
        asTrimmedString(claims.sub),
        asTrimmedString(claims.user_id),
        loginName,
        normalizedEmail
    );

    const scopes = uniqueSorted([
        ...toStringArray(claims.scope),
        ...toStringArray(claims.scopes),
    ]);

    const roles = uniqueSorted(expandRoleAliases([
        ...collectRolesFromUser(req),
        ...toStringArray(getAttr(req, 'roles')),
        ...scopes.map(normalizeScopeToRole),
        ...(normalizedEmail && STATIC_ADMIN_EMAILS.has(normalizedEmail) ? [CAP_ROLE_ADMIN, 'admin'] : []),
    ]));

    const identityOrigin = pickFirst(
        asTrimmedString(claims.origin),
        asTrimmedString(claims.identityzone),
        asTrimmedString(claims.zid)
    );

    return {
        userUUID,
        loginName,
        email: normalizedEmail,
        displayName,
        givenName,
        familyName,
        roles,
        scopes,
        identityOrigin,
    };
};

export const syncAuthenticatedUser = async (req: Request): Promise<ResolvedUserContext> => {
    const context = resolveUserContext(req);
    if (!context.userUUID && !context.email) {
        return context;
    }

    const entities = cds.entities('cnma.prediction') as Record<string, any>;
    const Player = entities.Player;
    if (!Player) {
        return context;
    }

    let player = null;
    if (context.userUUID) {
        player = await SELECT.one.from(Player).where({ userUUID: context.userUUID });
    }
    if (!player && context.email) {
        player = await SELECT.one.from(Player).where({ email: context.email });
    }

    if (player) {
        const existingDisplayName = asTrimmedString(player.displayName);
        const existingGivenName = asTrimmedString(player.givenName);
        const existingFamilyName = asTrimmedString(player.familyName);

        const updateEntry: Record<string, unknown> = {
            userUUID: context.userUUID ?? player.userUUID ?? null,
            loginName: context.loginName ?? player.loginName ?? null,
            email: context.email ?? player.email ?? null,
            roles: JSON.stringify(context.roles),
            scopes: JSON.stringify(context.scopes),
            identityOrigin: context.identityOrigin ?? player.identityOrigin ?? null,
            lastLoginAt: new Date().toISOString(),
        };

        if (!existingDisplayName && context.displayName) {
            updateEntry.displayName = context.displayName;
        }
        if (!existingGivenName && context.givenName) {
            updateEntry.givenName = context.givenName;
        }
        if (!existingFamilyName && context.familyName) {
            updateEntry.familyName = context.familyName;
        }

        await UPDATE(Player).where({ ID: player.ID }).set(updateEntry);
        return context;
    }

    if (!context.email) {
        // Cannot create Player without email, but still return resolved context.
        return context;
    }

    const now = new Date().toISOString();
    const playerEntry = {
        userUUID: context.userUUID ?? null,
        loginName: context.loginName,
        email: context.email ?? null,
        displayName: context.displayName ?? context.email ?? context.loginName ?? 'Unknown',
        givenName: context.givenName,
        familyName: context.familyName,
        roles: JSON.stringify(context.roles),
        scopes: JSON.stringify(context.scopes),
        identityOrigin: context.identityOrigin,
        lastLoginAt: now,
    };

    try {
        await INSERT.into(Player).entries(playerEntry);
    } catch {
        // Handle concurrent first-login requests.
        const existing = await SELECT.one.from(Player).where({ email: context.email });
        try {
            if (existing) {
                await UPDATE(Player).where({ ID: existing.ID }).set(playerEntry);
            }
        } catch {
            // Last-write-wins is acceptable for login metadata.
        }
    }

    return context;
};
