type ScimListResponse<T> = {
    Resources?: T[];
};

type ScimUser = {
    id: string;
    userName?: string;
    emails?: Array<{ value?: string; primary?: boolean }>;
};

type ScimGroup = {
    id: string;
    displayName?: string;
};

type ProvisionUserInput = {
    email: string;
    givenName?: string | null;
    familyName?: string | null;
    displayName?: string | null;
    active?: boolean;
};

type ClientConfig = {
    baseUrl: string;
    usersPath: string;
    groupsPath: string;
    username: string;
    password: string;
    defaultTimeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 20000;

const trimToNull = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const ensureLeadingSlash = (value: string): string => {
    return value.startsWith('/') ? value : `/${value}`;
};

const escapeFilterString = (value: string): string => value.replace(/"/g, '\\"');

export class IdentityDirectoryClient {
    private readonly config: ClientConfig;

    constructor(config?: Partial<ClientConfig>) {
        const baseUrl = trimToNull(config?.baseUrl ?? process.env.IDP_SCIM_BASE_URL);
        const username = trimToNull(config?.username ?? process.env.IDP_SCIM_BASIC_USERNAME);
        const password = trimToNull(config?.password ?? process.env.IDP_SCIM_BASIC_PASSWORD);

        if (!baseUrl || !username || !password) {
            throw new Error(
                'Missing IDP SCIM configuration. Required env vars: IDP_SCIM_BASE_URL, IDP_SCIM_BASIC_USERNAME, IDP_SCIM_BASIC_PASSWORD.'
            );
        }

        this.config = {
            baseUrl: baseUrl.replace(/\/+$/, ''),
            usersPath: ensureLeadingSlash(trimToNull(config?.usersPath ?? process.env.IDP_SCIM_USERS_PATH) ?? '/Users'),
            groupsPath: ensureLeadingSlash(trimToNull(config?.groupsPath ?? process.env.IDP_SCIM_GROUPS_PATH) ?? '/Groups'),
            username,
            password,
            defaultTimeoutMs: Number(config?.defaultTimeoutMs ?? process.env.IDP_SCIM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
        };
    }

    async findUserByEmail(email: string): Promise<ScimUser | null> {
        const normalizedEmail = email.trim().toLowerCase();
        const filter = encodeURIComponent(`emails.value eq "${escapeFilterString(normalizedEmail)}"`);
        const byEmail = await this.request<ScimListResponse<ScimUser>>(
            `${this.config.usersPath}?filter=${filter}&startIndex=1&count=2`,
            { method: 'GET' }
        );

        const candidates = byEmail.Resources ?? [];
        if (candidates.length > 0) {
            return candidates[0] ?? null;
        }

        const byUsernameFilter = encodeURIComponent(`userName eq "${escapeFilterString(normalizedEmail)}"`);
        const byUsername = await this.request<ScimListResponse<ScimUser>>(
            `${this.config.usersPath}?filter=${byUsernameFilter}&startIndex=1&count=2`,
            { method: 'GET' }
        );
        return (byUsername.Resources ?? [])[0] ?? null;
    }

    async createUser(input: ProvisionUserInput): Promise<ScimUser> {
        const normalizedEmail = input.email.trim().toLowerCase();
        const givenName = trimToNull(input.givenName) ?? normalizedEmail.split('@')[0];
        const familyName = trimToNull(input.familyName) ?? 'User';
        const displayName = trimToNull(input.displayName) ?? `${givenName} ${familyName}`.trim();

        const payload = {
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

        return this.request<ScimUser>(this.config.usersPath, {
            method: 'POST',
            body: payload,
        });
    }

    async listGroups(): Promise<ScimGroup[]> {
        const response = await this.request<ScimListResponse<ScimGroup>>(
            `${this.config.groupsPath}?startIndex=1&count=1000`,
            { method: 'GET' }
        );
        return response.Resources ?? [];
    }

    async addUserToGroup(groupId: string, userId: string): Promise<void> {
        const payload = {
            schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
            Operations: [
                {
                    op: 'add',
                    path: 'members',
                    value: [{ value: userId }],
                },
            ],
        };

        await this.request(`${this.config.groupsPath}/${groupId}`, {
            method: 'PATCH',
            body: payload,
            acceptStatus: [200, 204, 409],
        });
    }

    private buildHeaders(): Record<string, string> {
        const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        return {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    private async request<T = unknown>(
        path: string,
        options: {
            method: 'GET' | 'POST' | 'PATCH';
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
                headers: this.buildHeaders(),
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
            if (!contentType.toLowerCase().includes('application/json')) {
                return {} as T;
            }

            return (await response.json()) as T;
        } finally {
            clearTimeout(timeout);
        }
    }
}

export type { ProvisionUserInput, ScimGroup, ScimUser };
