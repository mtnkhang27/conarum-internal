import cds, { Request } from '@sap/cds';
import fs from 'node:fs';
import path from 'node:path';
import {
    CAP_ROLE_ADMIN,
    CAP_ROLE_USER,
    DEFAULT_SANDBOX_ADMIN_GROUP,
    DEFAULT_SANDBOX_USER_GROUP,
    ROLE_ALIAS_ADMIN,
    ROLE_ALIAS_AUTHENTICATED_USER,
    expandStoredRolesFromAppRoles,
} from './AuthRoleConfig';

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

const APP_ROLES = [CAP_ROLE_USER, CAP_ROLE_ADMIN, ROLE_ALIAS_AUTHENTICATED_USER, ROLE_ALIAS_ADMIN];
const STATIC_ADMIN_EMAILS = new Set([
    'nam.vu@conarum.com',
    'trung.tranthanh@conarum.com',
    'khang.mai@conarum.com',
    // 'tam.nguyen@conarum.com',
]);
const LOCAL_LOGIN_FILE = path.resolve(process.cwd(), 'login.json');
const AUTH_TRACE_ENABLED = process.env.AUTH_TRACE === '1';
const USER_SYNC_COOLDOWN_MS = Number(process.env.USER_SYNC_COOLDOWN_MS ?? '30000');
const recentUserSync = new Map<string, number>();
const inFlightUserSync = new Map<string, Promise<void>>();

const toSyncKey = (context: Pick<ResolvedUserContext, 'userUUID' | 'email'>): string | null => {
    const raw = context.userUUID ?? context.email;
    const value = asTrimmedString(raw)?.toLowerCase();
    return value ?? null;
};

const asTrimmedString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const toLegacySyntheticEmail = (loginName: string | null): string | null => {
    const normalizedLogin = asTrimmedString(loginName);
    if (!normalizedLogin) return null;

    const localPart = normalizedLogin.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'user';
    return `${localPart}@local.user.invalid`.toLowerCase();
};

const toFirstString = (value: unknown): string | null => {
    if (Array.isArray(value)) {
        for (const item of value) {
            const nested = toFirstString(item);
            if (nested) return nested;
        }
        return null;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return asTrimmedString(record.value) ?? asTrimmedString(record.email) ?? asTrimmedString(record.address);
    }
    return asTrimmedString(value);
};

const getClaimPathValue = (claims: Claims, path: string): unknown => {
    const segments = path.split('.');
    let cursor: unknown = claims;
    let index = 0;

    while (index < segments.length) {
        if (!cursor || typeof cursor !== 'object') {
            return null;
        }

        const record = cursor as Record<string, unknown>;
        let matched = false;

        for (let end = segments.length; end > index; end--) {
            const candidateKey = segments.slice(index, end).join('.');
            if (Object.prototype.hasOwnProperty.call(record, candidateKey)) {
                cursor = record[candidateKey];
                index = end;
                matched = true;
                break;
            }
        }

        if (!matched) {
            return null;
        }
    }

    return cursor;
};

const getClaimValue = (claims: Claims, ...paths: string[]): string | null => {
    for (const path of paths) {
        const candidate = toFirstString(getClaimPathValue(claims, path));
        if (candidate) return candidate;
    }
    return null;
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

const normalizeGroupName = (value: string): string => value.trim().toUpperCase();

const uniqueSorted = (values: string[]): string[] => {
    return [...new Set(values.filter((value) => value.length > 0))].sort((a, b) => a.localeCompare(b));
};

const getClaimArray = (claims: Claims, ...paths: string[]): string[] => {
    const values: string[] = [];

    for (const path of paths) {
        values.push(...toStringArray(getClaimPathValue(claims, path)));
    }

    return uniqueSorted(values);
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

const isCloudRuntime = (): boolean => {
    return Boolean(
        process.env.VCAP_APPLICATION
        || process.env.VCAP_SERVICES
        || process.env.CF_INSTANCE_GUID
        || process.env.CF_INSTANCE_INDEX
    );
};

const rolesFromEmail = (email: string): string[] => {
    return uniqueSorted(expandStoredRolesFromAppRoles(
        STATIC_ADMIN_EMAILS.has(email) ? [CAP_ROLE_ADMIN] : [CAP_ROLE_USER]
    ));
};

const expandRoleAliases = (roles: string[]): string[] => {
    const expanded = [...roles];
    if (roles.includes(CAP_ROLE_USER)) {
        expanded.push(ROLE_ALIAS_AUTHENTICATED_USER);
    }
    if (roles.includes(CAP_ROLE_ADMIN)) {
        expanded.push(ROLE_ALIAS_ADMIN, CAP_ROLE_USER, ROLE_ALIAS_AUTHENTICATED_USER);
    }
    return expanded;
};

const rolesFromGroupMembership = (groups: string[]): string[] => {
    const normalized = new Set(groups.map(normalizeGroupName));
    if (normalized.has(DEFAULT_SANDBOX_ADMIN_GROUP.trim().toUpperCase())) {
        return expandStoredRolesFromAppRoles([CAP_ROLE_ADMIN]);
    }
    if (normalized.has(DEFAULT_SANDBOX_USER_GROUP.trim().toUpperCase())) {
        return expandStoredRolesFromAppRoles([CAP_ROLE_USER]);
    }
    return [];
};

const loadLocalLoginConfig = (): LocalLoginConfig | null => {
    if (!isDevelopmentRuntime()) return null;
    if (isCloudRuntime()) return null;
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
    if (!authInfo || typeof authInfo !== 'object') {
        return {};
    }

    try {
        const token =
            authInfo.token
            ?? (typeof authInfo.getTokenInfo === 'function' ? authInfo.getTokenInfo() : null)
            ?? (typeof authInfo.getToken === 'function' ? authInfo.getToken() : null);
        const payload = (
            (token && typeof token.getPayload === 'function' ? token.getPayload() : null)
            ?? (token && token.payload && typeof token.payload === 'object' ? token.payload : null)
            ?? (typeof authInfo.getPayload === 'function' ? authInfo.getPayload() : null)
        );
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

const getAttrArray = (req: Request, key: string): string[] => {
    const attrs = (req.user as any)?.attr;
    if (!attrs || typeof attrs !== 'object') {
        return [];
    }

    return toStringArray((attrs as Record<string, unknown>)[key]);
};

const collectGroupsFromClaims = (claims: Claims, req: Request): string[] => {
    const xsUserAttributes = claims['xs.user.attributes'];
    const xsAttrGroups = xsUserAttributes && typeof xsUserAttributes === 'object'
        ? toStringArray((xsUserAttributes as Record<string, unknown>).groups)
        : [];

    return uniqueSorted([
        ...toStringArray(claims.groups),
        ...toStringArray(claims.group),
        ...toStringArray(claims.user_groups),
        ...toStringArray(claims.userGroups),
        ...getClaimArray(claims, 'xs.system.attributes.xs.saml.groups'),
        ...xsAttrGroups,
        ...getAttrArray(req, 'groups'),
        ...getAttrArray(req, 'userGroups'),
        ...getAttrArray(req, 'user_groups'),
    ]);
};

const collectRoleCollectionsFromClaims = (claims: Claims, req: Request): string[] => {
    return uniqueSorted([
        ...getClaimArray(claims, 'xs.rolecollections', 'xs.system.attributes.xs.rolecollections'),
        ...getAttrArray(req, 'xs.rolecollections'),
    ]);
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

    roles.push(...toStringArray(userObj?.scopes));

    return uniqueSorted(roles.map(normalizeScopeToRole));
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
        const localRoles = rolesFromEmail(localLogin.email);
        if (AUTH_TRACE_ENABLED) {
            console.log('[UserContext TRACE] LOCAL LOGIN PATH', JSON.stringify({
                email: localLogin.email,
                displayName: localDisplayName,
                roles: localRoles,
                isStaticAdmin: STATIC_ADMIN_EMAILS.has(localLogin.email),
            }, null, 2));
        }
        return {
            userUUID: localLogin.email,
            loginName: localLogin.loginName,
            email: localLogin.email,
            displayName: localDisplayName,
            givenName: null,
            familyName: null,
            roles: localRoles,
            scopes: [],
            identityOrigin: 'local-login-json',
        };
    }

    const claims = getTokenClaims(req);
    const rawId = asTrimmedString((req.user as any)?.id);

    const loginName = pickFirst(
        rawId && rawId !== 'anonymous' ? rawId : null,
        getAttr(req, 'logonName'),
        getAttr(req, 'user_name'),
        getClaimValue(claims, 'user_name'),
        getClaimValue(claims, 'preferred_username'),
        getClaimValue(claims, 'sub')
    );

    const claimEmail = pickFirst(
        getClaimValue(claims, 'email'),
        getClaimValue(claims, 'mail'),
        getClaimValue(claims, 'upn'),
        getClaimValue(claims, 'emails'),
        getClaimValue(claims, 'ext_attr.email'),
        getClaimValue(claims, 'ext_attr.mail')
    );
    const preferredUsername = getClaimValue(claims, 'preferred_username');
    const userName = getClaimValue(claims, 'user_name');
    const email = pickFirst(
        getAttr(req, 'email'),
        getAttr(req, 'mail'),
        getAttr(req, 'user_email'),
        claimEmail,
        looksLikeEmail(loginName) ? loginName : null,
        looksLikeEmail(preferredUsername) ? preferredUsername : null,
        looksLikeEmail(userName) ? userName : null
    );
    const normalizedEmail = email ? email.toLowerCase() : null;

    const givenName = pickFirst(
        getAttr(req, 'given_name'),
        getAttr(req, 'givenName'),
        getClaimValue(claims, 'given_name'),
        getClaimValue(claims, 'givenName'),
        getClaimValue(claims, 'ext_attr.given_name')
    );
    const familyName = pickFirst(
        getAttr(req, 'family_name'),
        getAttr(req, 'familyName'),
        getClaimValue(claims, 'family_name'),
        getClaimValue(claims, 'familyName'),
        getClaimValue(claims, 'ext_attr.family_name')
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
        getAttr(req, 'scim_id'),
        getAttr(req, 'uid'),
        getClaimValue(claims, 'user_uuid'),
        getClaimValue(claims, 'userUUID'),
        getClaimValue(claims, 'scim_id'),
        getClaimValue(claims, 'uid'),
        getClaimValue(claims, 'oid'),
        getClaimValue(claims, 'sub'),
        getClaimValue(claims, 'user_id'),
        loginName,
        normalizedEmail
    );

    if (!loginName && !normalizedEmail && !userUUID) {
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

    const scopes = uniqueSorted([
        ...toStringArray(claims.scope),
        ...toStringArray(claims.scopes),
        ...toStringArray(claims.authorities),
        ...toStringArray((req.user as any)?.scopes),
    ]);

    const groups = collectGroupsFromClaims(claims, req);
    const roleCollections = collectRoleCollectionsFromClaims(claims, req);
    const groupDerivedRoles = rolesFromGroupMembership(groups);

    const roles = uniqueSorted(expandRoleAliases([
        ...collectRolesFromUser(req),
        ...toStringArray(getAttr(req, 'roles')).map(normalizeScopeToRole),
        ...scopes.map(normalizeScopeToRole),
        ...roleCollections.map(normalizeScopeToRole),
        ...groups,
        ...groupDerivedRoles,
        ...(normalizedEmail && STATIC_ADMIN_EMAILS.has(normalizedEmail) ? [CAP_ROLE_ADMIN, 'admin'] : []),
    ]));

    const finalScopes = uniqueSorted([...scopes, ...groups]);

    const identityOrigin = pickFirst(
        getClaimValue(claims, 'origin'),
        getClaimValue(claims, 'ias_iss'),
        getClaimValue(claims, 'identityzone'),
        getClaimValue(claims, 'zone_uuid'),
        getClaimValue(claims, 'zid'),
        getClaimValue(claims, 'iss')
    );

    const result: ResolvedUserContext = {
        userUUID,
        loginName,
        email: normalizedEmail,
        displayName,
        givenName,
        familyName,
        roles,
        scopes: finalScopes,
        identityOrigin,
    };

    // ── Role resolution tracing ──────────────────────────────
    const userRolesFromReq = collectRolesFromUser(req);
    const attrRoles = toStringArray(getAttr(req, 'roles')).map(normalizeScopeToRole);
    const scopeRoles = scopes.map(normalizeScopeToRole);
    const isStaticAdmin = normalizedEmail ? STATIC_ADMIN_EMAILS.has(normalizedEmail) : false;
    if (AUTH_TRACE_ENABLED) {
        console.log('[UserContext TRACE]', JSON.stringify({
            email: normalizedEmail,
            loginName,
            userUUID,
            identityOrigin,
            finalRoles: roles,
            finalScopes,
            groups,
            roleCollections,
            breakdown: {
                fromReqUser: userRolesFromReq,
                fromAttrRoles: attrRoles,
                fromScopeNormalized: scopeRoles,
                fromGroups: groups,
                fromRoleCollections: roleCollections,
                groupDerivedRoles,
                isStaticAdmin,
                isCloud: isCloudRuntime(),
                isDev: isDevelopmentRuntime(),
            },
            reqUserRaw: {
                id: (req.user as any)?.id,
                roles: (req.user as any)?.roles,
                scopes: (req.user as any)?.scopes,
            },
        }, null, 2));
    }

    return result;
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

    const syncKey = toSyncKey(context);
    if (syncKey) {
        const lastSyncedAt = recentUserSync.get(syncKey);
        if (lastSyncedAt && (Date.now() - lastSyncedAt) < USER_SYNC_COOLDOWN_MS) {
            return context;
        }

        const inFlight = inFlightUserSync.get(syncKey);
        if (inFlight) {
            await inFlight;
            return context;
        }
    }

    const performSync = async (): Promise<void> => {
        let player = null;
        if (context.userUUID) {
            player = await SELECT.one.from(Player).where({ userUUID: context.userUUID });
        }
        if (!player && context.email) {
            player = await SELECT.one.from(Player).where({ email: context.email });
        }
        if (!player) {
            const legacyEmail = toLegacySyntheticEmail(context.loginName);
            if (legacyEmail && legacyEmail !== context.email) {
                player = await SELECT.one.from(Player).where({ email: legacyEmail });
            }
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
            return;
        }

        if (!context.email) {
            // Cannot create Player without email, but still return resolved context.
            return;
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
    };

    if (syncKey) {
        const pendingSync = performSync()
            .then(() => {
                recentUserSync.set(syncKey, Date.now());
                if (recentUserSync.size > 500) {
                    const cutoff = Date.now() - USER_SYNC_COOLDOWN_MS * 4;
                    for (const [key, ts] of recentUserSync.entries()) {
                        if (ts < cutoff) {
                            recentUserSync.delete(key);
                        }
                    }
                }
            })
            .finally(() => {
                inFlightUserSync.delete(syncKey);
            });

        inFlightUserSync.set(syncKey, pendingSync);
        await pendingSync;
        return context;
    }

    await performSync();
    return context;
};
