import { existsSync, readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

type ScimListResponse<T> = {
    Resources?: T[];
    resources?: T[];
};

type ScimUser = {
    id: string;
    userName?: string;
    displayName?: string;
    active?: boolean;
    verified?: boolean;
    origin?: string;
    userType?: string;
    schemas?: string[];
    name?: Record<string, unknown>;
    emails?: Array<{ value?: string; primary?: boolean }>;
    groups?: Array<{ value?: string; display?: string }>;
    [key: string]: unknown;
};

type ScimGroup = {
    id: string;
    displayName?: string;
    name?: string;
    schemas?: string[];
    members?: Array<{ value?: string }>;
    [key: string]: unknown;
};

type ProvisionUserInput = {
    email: string;
    givenName?: string | null;
    familyName?: string | null;
    displayName?: string | null;
    password?: string | null;
    groups?: string[] | null;
    active?: boolean;
    userType?: string | null;
};

type ClientConfig = {
    baseUrl: string;
    usersPath: string;
    groupsPath: string;
    username: string;
    password: string;
    memberOrigin: string | null;
    defaultUserType: string | null;
    defaultTimeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_SCIM_DESTINATION_NAME = 'EXTERNAL_IDP_TANENT_DEST_CFG';
const DEFAULT_SCIM_USER_TYPE = 'partner';
const DEFAULT_USER_SEARCH_COUNT = 25;

const trimToNull = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const normalizeValue = (value: unknown): string | null => {
    const trimmed = trimToNull(value);
    return trimmed ? trimmed.toLowerCase() : null;
};

const normalizeEmail = (value: unknown): string | null => {
    const normalized = normalizeValue(value);
    return normalized && normalized.includes('@') ? normalized : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const ensureLeadingSlash = (value: string): string => {
    return value.startsWith('/') ? value : `/${value}`;
};

const escapeFilterString = (value: string): string => value.replace(/"/g, '\\"');
const encodePathSegment = (value: string): string => encodeURIComponent(value);
const getListResources = <T>(response: ScimListResponse<T>): T[] => response.Resources ?? response.resources ?? [];

const getScimUserEmails = (user: ScimUser): string[] => {
    const emails = new Set<string>();
    const normalizedUserName = normalizeEmail(user.userName);
    if (normalizedUserName) {
        emails.add(normalizedUserName);
    }

    for (const emailEntry of user.emails ?? []) {
        const normalizedEmailValue = normalizeEmail(emailEntry?.value);
        if (normalizedEmailValue) {
            emails.add(normalizedEmailValue);
        }
    }

    return [...emails];
};

const matchesScimUserEmail = (user: ScimUser, normalizedEmail: string): boolean => {
    return getScimUserEmails(user).includes(normalizedEmail);
};

const getScimUserKey = (user: ScimUser): string => {
    return trimToNull(user.id) ?? trimToNull(user.userName) ?? getScimUserEmails(user)[0] ?? JSON.stringify(user);
};

const dedupeScimUsers = (users: ScimUser[]): ScimUser[] => {
    const seen = new Set<string>();
    const deduped: ScimUser[] = [];

    for (const user of users) {
        const key = getScimUserKey(user);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(user);
    }

    return deduped;
};

const matchesExpectedValue = (actual: unknown, expected: unknown): boolean => {
    const normalizedExpected = normalizeValue(expected);
    if (!normalizedExpected) return false;
    return normalizeValue(actual) === normalizedExpected;
};

export const selectManagedScimUserCandidate = (
    candidates: ScimUser[],
    config: Pick<ClientConfig, 'memberOrigin' | 'defaultUserType'>
): ScimUser | null => {
    if (candidates.length === 0) return null;

    const desiredOrigin = trimToNull(config.memberOrigin);
    if (desiredOrigin) {
        return candidates.find((candidate) => matchesExpectedValue(candidate.origin, desiredOrigin)) ?? null;
    }

    const desiredUserType = trimToNull(config.defaultUserType);
    if (desiredUserType) {
        return candidates.find((candidate) => matchesExpectedValue(candidate.userType, desiredUserType)) ?? null;
    }

    return candidates[0] ?? null;
};

export const describeExpectedManagedIdentity = (config: Pick<ClientConfig, 'memberOrigin' | 'defaultUserType'>): string => {
    const expectedOrigin = trimToNull(config.memberOrigin);
    const expectedUserType = trimToNull(config.defaultUserType);
    const parts: string[] = [];

    if (expectedOrigin) {
        parts.push(`origin='${expectedOrigin}'`);
    }

    if (expectedUserType) {
        parts.push(`userType='${expectedUserType}'`);
    }

    return parts.length > 0 ? parts.join(', ') : 'the configured application-managed identity';
};

export const describeScimUserIdentity = (user: Pick<ScimUser, 'id' | 'origin' | 'userType' | 'userName'>): string => {
    const parts = [`id='${user.id}'`];
    const userName = trimToNull(user.userName);
    const origin = trimToNull(user.origin);
    const userType = trimToNull(user.userType);

    if (userName) {
        parts.push(`userName='${userName}'`);
    }

    if (origin) {
        parts.push(`origin='${origin}'`);
    }

    if (userType) {
        parts.push(`userType='${userType}'`);
    }

    return parts.join(', ');
};

const normalizeScimBaseUrl = (value: string): string => {
    const trimmed = value.trim().replace(/\/+$/, '');
    if (/\/service\/scim$/i.test(trimmed) || /\/scim$/i.test(trimmed)) {
        return trimmed;
    }
    return `${trimmed}/service/scim`;
};

const readScimCredentialsFromDirectEnv = (config?: Partial<ClientConfig>) => {
    return {
        baseUrl: trimToNull(config?.baseUrl ?? process.env.IDP_SCIM_BASE_URL ?? process.env.IAS_URL ?? process.env.SCIM_URL),
        username: trimToNull(
            config?.username ??
                process.env.IDP_SCIM_BASIC_USERNAME ??
                process.env.IAS_CLIENT_ID ??
                process.env.SCIM_USER
        ),
        password: trimToNull(
            config?.password ??
                process.env.IDP_SCIM_BASIC_PASSWORD ??
                process.env.IAS_CLIENT_SECRET ??
                process.env.SCIM_PASSWORD
        ),
    };
};

const toResolvedScimCredentials = (
    credentials: { baseUrl: string | null; username: string | null; password: string | null } | null
) => {
    if (!credentials?.baseUrl || !credentials.username || !credentials.password) {
        return null;
    }

    return {
        baseUrl: normalizeScimBaseUrl(credentials.baseUrl),
        username: credentials.username,
        password: credentials.password,
    };
};

const extractScimCredentialsFromDestination = (
    candidate: unknown,
    destinationName: string,
    config?: Partial<ClientConfig>
) => {
    if (!isRecord(candidate)) return null;

    const name = trimToNull(candidate.name);
    if (name !== destinationName) return null;

    return toResolvedScimCredentials({
        baseUrl: trimToNull(config?.baseUrl ?? candidate.url),
        username: trimToNull(config?.username ?? candidate.username ?? candidate.clientId),
        password: trimToNull(config?.password ?? candidate.password ?? candidate.clientSecret),
    });
};

const readScimCredentialsFromDestinations = (destinationName: string, config?: Partial<ClientConfig>) => {
    const rawDestinations = trimToNull(process.env.destinations);
    if (!rawDestinations) return null;

    try {
        const parsed = JSON.parse(rawDestinations);
        if (!Array.isArray(parsed)) return null;

        for (const candidate of parsed) {
            const credentials = extractScimCredentialsFromDestination(candidate, destinationName, config);
            if (credentials) {
                return credentials;
            }
        }
    } catch {
        return null;
    }

    return null;
};

const readScimCredentialsFromDefaultEnv = (destinationName: string, config?: Partial<ClientConfig>) => {
    const defaultEnvPath = resolvePath(process.cwd(), 'default-env.json');
    if (!existsSync(defaultEnvPath)) return null;

    try {
        const parsed = JSON.parse(readFileSync(defaultEnvPath, 'utf8'));
        if (!isRecord(parsed) || !Array.isArray(parsed.destinations)) {
            return null;
        }

        for (const candidate of parsed.destinations) {
            const credentials = extractScimCredentialsFromDestination(candidate, destinationName, config);
            if (credentials) {
                return credentials;
            }
        }
    } catch {
        return null;
    }

    return null;
};

const resolveScimCredentials = (config?: Partial<ClientConfig>) => {
    const directCredentials = toResolvedScimCredentials(readScimCredentialsFromDirectEnv(config));
    if (directCredentials) {
        return directCredentials;
    }

    const destinationName =
        trimToNull(process.env.IDP_SCIM_DESTINATION_NAME ?? process.env.IAS_DESTINATION_NAME) ??
        DEFAULT_SCIM_DESTINATION_NAME;

    const destinationCredentials =
        readScimCredentialsFromDestinations(destinationName, config) ??
        readScimCredentialsFromDefaultEnv(destinationName, config);

    if (destinationCredentials) {
        return destinationCredentials;
    }

    return null;
};

const getScimErrorStatus = (error: unknown): number | null => {
    if (!(error instanceof Error)) return null;
    const match = error.message.match(/\((\d{3})\)/);
    return match ? Number(match[1]) : null;
};

const canRetryGroupMemberRequest = (error: unknown): boolean => {
    const status = getScimErrorStatus(error);
    return status !== null && [400, 404, 405, 415, 422, 501].includes(status);
};

const isLegacyScimUserId = (value: string): boolean => /^P\d+$/i.test(value.trim());

export class IdentityDirectoryClient {
    private readonly config: ClientConfig;

    constructor(config?: Partial<ClientConfig>) {
        const resolvedCredentials = resolveScimCredentials(config);

        if (!resolvedCredentials) {
            throw new Error(
                'Missing IDP SCIM configuration. Provide either IDP_SCIM_BASE_URL/IDP_SCIM_BASIC_USERNAME/IDP_SCIM_BASIC_PASSWORD, IAS_URL/IAS_CLIENT_ID/IAS_CLIENT_SECRET, SCIM_URL/SCIM_USER/SCIM_PASSWORD, or destination EXTERNAL_IDP_TANENT_DEST_CFG.'
            );
        }

        this.config = {
            baseUrl: resolvedCredentials.baseUrl,
            usersPath: ensureLeadingSlash(trimToNull(config?.usersPath ?? process.env.IDP_SCIM_USERS_PATH) ?? '/Users'),
            groupsPath: ensureLeadingSlash(trimToNull(config?.groupsPath ?? process.env.IDP_SCIM_GROUPS_PATH) ?? '/Groups'),
            username: resolvedCredentials.username,
            password: resolvedCredentials.password,
            memberOrigin: trimToNull(
                config?.memberOrigin ?? process.env.IDP_SCIM_MEMBER_ORIGIN ?? process.env.IDP_SCIM_TRUST_ORIGIN
            ),
            defaultUserType:
                trimToNull(config?.defaultUserType ?? process.env.IDP_SCIM_USER_TYPE) ?? DEFAULT_SCIM_USER_TYPE,
            defaultTimeoutMs: Number(config?.defaultTimeoutMs ?? process.env.IDP_SCIM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
        };
    }

    supportsInlinePasswordProvisioning(): boolean {
        return true;
    }

    async findUserByEmail(email: string): Promise<ScimUser | null> {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
            return null;
        }

        const candidates = await this.listUsersByEmail(normalizedEmail);
        return selectManagedScimUserCandidate(candidates, this.config);
    }

    async createUser(input: ProvisionUserInput): Promise<ScimUser> {
        const normalizedEmail = normalizeEmail(input.email);
        if (!normalizedEmail) {
            throw new Error('A valid email address is required to create a SCIM user.');
        }

        const givenName = trimToNull(input.givenName) ?? normalizedEmail.split('@')[0];
        const familyName = trimToNull(input.familyName) ?? 'User';
        const displayName = trimToNull(input.displayName) ?? `${givenName} ${familyName}`.trim();
        const password = trimToNull(input.password);
        const userType = trimToNull(input.userType) ?? this.config.defaultUserType;
        const groups = (input.groups ?? [])
            .map((group) => trimToNull(group))
            .filter((group): group is string => Boolean(group));

        const payload: Record<string, unknown> = {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            userName: normalizedEmail,
            displayName,
            active: input.active ?? true,
            name: {
                givenName,
                familyName,
            },
            emails: [
                {
                    value: normalizedEmail,
                    primary: true,
                },
            ],
        };

        if (this.config.memberOrigin) {
            payload.origin = this.config.memberOrigin;
        }

        if (userType) {
            payload.userType = userType;
        }

        if (groups.length > 0) {
            payload.groups = groups.map((group) => ({
                display: group,
                value: group,
            }));
        }

        if (password) {
            payload.password = password;
        }

        let createdUser: ScimUser | null = null;
        try {
            createdUser = await this.request<ScimUser>(this.config.usersPath, {
                method: 'POST',
                body: payload,
                acceptStatus: [200, 201, 204],
            });
        } catch (error: unknown) {
            if (this.isDuplicateUserConflict(error)) {
                const duplicateCandidates = await this.listUsersByEmail(normalizedEmail);
                const managedDuplicateUser = selectManagedScimUserCandidate(duplicateCandidates, this.config);
                if (managedDuplicateUser) {
                    return managedDuplicateUser;
                }

                const duplicateUser = duplicateCandidates[0] ?? null;
                if (duplicateUser) {
                    throw new Error(this.buildDuplicateUserConflictMessage(normalizedEmail, duplicateUser));
                }
            }

            throw error;
        }

        if (createdUser?.id) {
            return createdUser;
        }

        const lookupUser = await this.findUserByEmail(normalizedEmail);
        if (!lookupUser?.id) {
            const duplicateCandidates = await this.listUsersByEmail(normalizedEmail);
            const managedDuplicateUser = selectManagedScimUserCandidate(duplicateCandidates, this.config);
            if (managedDuplicateUser?.id) {
                return managedDuplicateUser;
            }

            const duplicateUser = duplicateCandidates[0] ?? null;
            if (duplicateUser) {
                throw new Error(this.buildDuplicateUserConflictMessage(normalizedEmail, duplicateUser));
            }

            throw new Error(`SCIM POST ${this.config.usersPath} succeeded but the created user could not be looked up again for ${normalizedEmail}.`);
        }

        return lookupUser;
    }

    describeUserIdentity(user: ScimUser): string {
        return describeScimUserIdentity(user);
    }

    async listGroups(): Promise<ScimGroup[]> {
        const response = await this.request<ScimListResponse<ScimGroup>>(
            `${this.config.groupsPath}?startIndex=1&count=1000`,
            { method: 'GET' }
        );
        return getListResources(response).map((group) => ({
            ...group,
            displayName: trimToNull(group.displayName) ?? trimToNull(group.name) ?? trimToNull(group.id) ?? undefined,
        }));
    }

    async addUserToGroup(groupId: string, userId: string, groupDisplayName?: string | null): Promise<void> {
        const isLegacyService = isLegacyScimUserId(userId) || /\/service\/scim\/?$/i.test(this.config.baseUrl);
        if (isLegacyService) {
            await this.addUserToGroupLegacy(groupId, userId, groupDisplayName);
            return;
        }

        const groupTargets = [...new Set([trimToNull(groupDisplayName), trimToNull(groupId)].filter(Boolean) as string[])];
        const membershipPayloads: Array<Record<string, unknown>> = [];
        if (this.config.memberOrigin) {
            membershipPayloads.push({
                origin: this.config.memberOrigin,
                type: 'USER',
                value: userId,
            });
        }
        membershipPayloads.push(
            { type: 'USER', value: userId },
            { value: userId }
        );

        let lastError: unknown = null;
        for (const groupTarget of groupTargets) {
            for (const payload of membershipPayloads) {
                try {
                    await this.request(`${this.config.groupsPath}/${encodePathSegment(groupTarget)}/members`, {
                        method: 'POST',
                        body: payload,
                        acceptStatus: [200, 201, 204, 409],
                    });
                    return;
                } catch (error: unknown) {
                    lastError = error;
                    if (!canRetryGroupMemberRequest(error)) {
                        throw error;
                    }
                }
            }
        }

        const userPatchPayload = {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
            Operations: [
                {
                    op: 'add',
                    path: 'groups',
                    value: [
                        {
                            value: groupId,
                            ...(trimToNull(groupDisplayName) ? { display: trimToNull(groupDisplayName) } : {}),
                        },
                    ],
                },
            ],
        };

        try {
            await this.request(`${this.config.usersPath}/${encodePathSegment(userId)}`, {
                method: 'PATCH',
                body: userPatchPayload,
                acceptStatus: [200, 204, 409],
            });
            return;
        } catch (error: unknown) {
            lastError = error;
            if (!canRetryGroupMemberRequest(error)) {
                throw error;
            }
        }

        const patchPayload = {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
            Operations: [
                {
                    op: 'add',
                    path: 'members',
                    value: [{ value: userId }],
                },
            ],
        };

        try {
            await this.request(`${this.config.groupsPath}/${encodePathSegment(groupId)}`, {
                method: 'PATCH',
                body: patchPayload,
                acceptStatus: [200, 204, 409],
            });
        } catch (error: unknown) {
            if (lastError instanceof Error) {
                throw lastError;
            }
            throw error;
        }
    }

    private async addUserToGroupLegacy(groupId: string, userId: string, groupDisplayName?: string | null): Promise<void> {
        const legacyGroupValue = trimToNull(groupDisplayName) ?? groupId;
        const desiredUserType = this.config.defaultUserType;

        let lastError: unknown = null;

        try {
            const user = await this.getUserById(userId);
            const existingGroups = Array.isArray(user.groups) ? user.groups : [];
            const currentUserType = trimToNull(user.userType);
            const hasGroup = existingGroups.some((group) => {
                const value = trimToNull(group?.value);
                const display = trimToNull(group?.display);
                return value === legacyGroupValue || value === groupId || display === legacyGroupValue;
            });
            const needsUserTypeUpdate = Boolean(desiredUserType && currentUserType !== desiredUserType);

            if (!hasGroup || needsUserTypeUpdate) {
                const updatedGroups = hasGroup
                    ? existingGroups
                    : [...existingGroups, { value: legacyGroupValue, display: legacyGroupValue }];
                await this.request(`${this.config.usersPath}/${encodePathSegment(userId)}`, {
                    method: 'PUT',
                    body: {
                        ...user,
                        id: userId,
                        ...(desiredUserType ? { userType: desiredUserType } : {}),
                        groups: updatedGroups,
                    },
                    acceptStatus: [200, 204, 409],
                });
            }

            return;
        } catch (error: unknown) {
            lastError = error;
            if (!canRetryGroupMemberRequest(error)) {
                throw error;
            }
        }

        try {
            const group = await this.getGroupById(groupId);
            const existingMembers = Array.isArray(group.members) ? group.members : [];
            const hasMember = existingMembers.some((member) => trimToNull(member?.value) === userId);

            if (!hasMember) {
                const updatedMembers = [...existingMembers, { value: userId }];
                await this.request(`${this.config.groupsPath}/${encodePathSegment(groupId)}`, {
                    method: 'PUT',
                    body: {
                        id: group.id ?? groupId,
                        displayName: trimToNull(group.displayName) ?? legacyGroupValue,
                        members: updatedMembers,
                    },
                    acceptStatus: [200, 204, 409],
                });
            }

            return;
        } catch (error: unknown) {
            if (lastError instanceof Error) {
                throw lastError;
            }
            throw error;
        }
    }

    private async getUserById(userId: string): Promise<ScimUser> {
        return this.request<ScimUser>(`${this.config.usersPath}/${encodePathSegment(userId)}`, { method: 'GET' });
    }

    private async getGroupById(groupId: string): Promise<ScimGroup> {
        return this.request<ScimGroup>(`${this.config.groupsPath}/${encodePathSegment(groupId)}`, { method: 'GET' });
    }

    private async listUsersByEmail(email: string): Promise<ScimUser[]> {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) {
            return [];
        }

        const users: ScimUser[] = [];
        const count = DEFAULT_USER_SEARCH_COUNT;
        const byUsernameFilter = encodeURIComponent(`userName eq "${escapeFilterString(normalizedEmail)}"`);
        const byUsername = await this.request<ScimListResponse<ScimUser>>(
            `${this.config.usersPath}?filter=${byUsernameFilter}&startIndex=1&count=${count}`,
            { method: 'GET' }
        );
        users.push(...getListResources(byUsername));

        try {
            const filter = encodeURIComponent(`emails.value eq "${escapeFilterString(normalizedEmail)}"`);
            const byEmail = await this.request<ScimListResponse<ScimUser>>(
                `${this.config.usersPath}?filter=${filter}&startIndex=1&count=${count}`,
                { method: 'GET' }
            );
            users.push(...getListResources(byEmail));
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : '';
            if (/invalid\s+filter|parsing\s+error/i.test(message)) {
                try {
                    const legacyFilter = encodeURIComponent(`emails eq "${escapeFilterString(normalizedEmail)}"`);
                    const byLegacyEmail = await this.request<ScimListResponse<ScimUser>>(
                        `${this.config.usersPath}?filter=${legacyFilter}&startIndex=1&count=${count}`,
                        { method: 'GET' }
                    );
                    users.push(...getListResources(byLegacyEmail));
                } catch {
                    return dedupeScimUsers(users).filter((candidate) => matchesScimUserEmail(candidate, normalizedEmail));
                }
            } else {
                throw error;
            }
        }

        return dedupeScimUsers(users).filter((candidate) => matchesScimUserEmail(candidate, normalizedEmail));
    }

    private isDuplicateUserConflict(error: unknown): boolean {
        const status = getScimErrorStatus(error);
        if (status === 409) {
            return true;
        }

        const message = error instanceof Error ? error.message : '';
        return /already\s+exists|account\s+exists|duplicate|uniqueness|must\s+be\s+unique/i.test(message);
    }

    private buildDuplicateUserConflictMessage(email: string, conflictingUser: ScimUser): string {
        return [
            `Cannot create sandbox user '${email}'.`,
            `Identity Authentication already has a different account with the same email/login (${describeScimUserIdentity(conflictingUser)}).`,
            `Expected the application-managed identity ${describeExpectedManagedIdentity(this.config)}.`,
            'Provisioning stopped to avoid assigning app access to the wrong identity.'
        ].join(' ');
    }

    private async buildHeaders(hasBody: boolean): Promise<Record<string, string>> {
        const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        const headers: Record<string, string> = {
            Authorization: `Basic ${credentials}`,
            Accept: 'application/scim+json, application/json',
        };

        if (hasBody) {
            headers['Content-Type'] = 'application/scim+json';
        }

        return headers;
    }

    private async request<T = unknown>(
        path: string,
        options: {
            method: 'GET' | 'POST' | 'PUT' | 'PATCH';
            body?: unknown;
            acceptStatus?: number[];
        }
    ): Promise<T> {
        const url = `${this.config.baseUrl}${path}`;
        const timeoutMs = Number.isFinite(this.config.defaultTimeoutMs)
            ? this.config.defaultTimeoutMs
            : DEFAULT_TIMEOUT_MS;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: options.method,
                headers: await this.buildHeaders(Boolean(options.body)),
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: controller.signal,
            });

            const accepted = options.acceptStatus ?? [200, 201, 204];
            if (!accepted.includes(response.status)) {
                const bodyText = await response.text();
                throw new Error(`SCIM ${options.method} ${path} failed (${response.status}): ${bodyText || 'No response body'}`);
            }

            if (response.status === 204) {
                return {} as T;
            }

            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.toLowerCase().includes('json')) {
                return {} as T;
            }

            return (await response.json()) as T;
        } finally {
            clearTimeout(timeout);
        }
    }
}

export type { ProvisionUserInput, ScimGroup, ScimUser };
