import cds, { Request } from '@sap/cds';
import { ResolvedUserContext, syncAuthenticatedUser } from '../lib/UserContext';

type PlayerRow = {
    ID: string;
    displayName?: string | null;
    email?: string | null;
    roles?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    phone?: string | null;
    country?: string | null;
    country_code?: string | null;
    city?: string | null;
    timezone?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    favoriteTeam_ID?: string | null;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const DATA_IMAGE_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

const asString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    return value;
};

const normalizeInput = (value: unknown, maxLen: number): string | undefined => {
    if (value === undefined) return undefined;
    const raw = typeof value === 'string' ? value : String(value ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return trimmed.slice(0, maxLen);
};

const estimatedBytesFromDataUrl = (dataUrl: string): number => {
    const idx = dataUrl.indexOf(',');
    if (idx < 0) return Number.MAX_SAFE_INTEGER;
    const base64 = dataUrl.slice(idx + 1).trim();
    if (!base64) return 0;
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.floor((base64.length * 3) / 4) - padding;
};

export class ProfileHandler {
    private srv: cds.ApplicationService;

    constructor(srv: cds.ApplicationService) {
        this.srv = srv;
    }

    async getMyProfile(req: Request) {
        const entities = cds.entities('cnma.prediction') as Record<string, any>;
        const { Team } = entities;
        const { player, context } = await this.getCurrentPlayer(req);
        if (!player) {
            req.error(404, 'Player profile not found for current user');
            return null;
        }
        return this.toUserProfile(player, Team, context);
    }

    async updateMyProfile(req: Request) {
        const entities = cds.entities('cnma.prediction') as Record<string, any>;
        const { Player, Team } = entities;
        const { player, context } = await this.getCurrentPlayer(req);
        if (!player) {
            req.error(404, 'Player profile not found for current user');
            return null;
        }

        const displayNameInput = normalizeInput(req.data?.displayName, 100);
        const firstNameInput = normalizeInput(req.data?.firstName, 100);
        const lastNameInput = normalizeInput(req.data?.lastName, 100);
        const phoneInput = normalizeInput(req.data?.phone, 50);
        const countryInput = normalizeInput(req.data?.country, 10);
        const cityInput = normalizeInput(req.data?.city, 120);
        const timezoneInput = normalizeInput(req.data?.timezone, 80);
        const bioInput = normalizeInput(req.data?.bio, 2000);
        const avatarInput = normalizeInput(req.data?.avatarUrl, Number.MAX_SAFE_INTEGER);
        const favoriteTeamIdInput = normalizeInput(req.data?.favoriteTeamId, 120);
        const favoriteTeamInput = normalizeInput(req.data?.favoriteTeam, 120);

        let favoriteTeamId: string | null = player.favoriteTeam_ID ?? null;
        if (favoriteTeamIdInput !== undefined) {
            favoriteTeamId = await this.resolveTeamIdById(req, Team, favoriteTeamIdInput);
        } else if (favoriteTeamInput !== undefined) {
            favoriteTeamId = await this.resolveTeamIdByName(req, Team, favoriteTeamInput);
        }

        let avatarUrl = player.avatarUrl ?? '';
        if (avatarInput !== undefined) {
            avatarUrl = this.validateAvatar(req, avatarInput);
        }

        const existingDisplayName = asString(player.displayName)?.trim();
        const fallbackDisplayName = context.displayName || context.email || context.loginName || 'User';
        const finalDisplayName = (
            (displayNameInput !== undefined ? displayNameInput : existingDisplayName) || fallbackDisplayName
        ).slice(0, 100);

        const updateData: Record<string, unknown> = {
            displayName: finalDisplayName,
            avatarUrl,
            phone: this.toNullable(phoneInput, player.phone),
            city: this.toNullable(cityInput, player.city),
            timezone: this.toNullable(timezoneInput, player.timezone),
            bio: this.toNullable(bioInput, player.bio),
            givenName: this.toNullable(firstNameInput, player.givenName),
            familyName: this.toNullable(lastNameInput, player.familyName),
            favoriteTeam_ID: favoriteTeamId,
            country_code: this.toNullable(countryInput ? countryInput.toUpperCase() : countryInput, player.country_code ?? player.country),
        };

        await UPDATE(Player).where({ ID: player.ID }).set(updateData);
        const updated = await SELECT.one.from(Player).where({ ID: player.ID });
        if (!updated) {
            req.error(500, 'Failed to reload updated profile');
            return null;
        }
        return this.toUserProfile(updated as PlayerRow, Team, context);
    }

    private toNullable(next: string | undefined, current: string | null | undefined): string | null {
        if (next === undefined) {
            return current ?? null;
        }
        return next || null;
    }

    private async getCurrentPlayer(req: Request): Promise<{ player: PlayerRow | null; context: ResolvedUserContext }> {
        const entities = cds.entities('cnma.prediction') as Record<string, any>;
        const { Player } = entities;
        const context = await syncAuthenticatedUser(req);

        let player: PlayerRow | null = null;
        if (context.userUUID) {
            player = await SELECT.one.from(Player).where({ userUUID: context.userUUID });
        }
        if (!player && context.email) {
            player = await SELECT.one.from(Player).where({ email: context.email });
        }
        return { player, context };
    }

    private validateAvatar(req: Request, avatarValue: string): string {
        const trimmed = avatarValue.trim();
        if (!trimmed) return '';

        if (DATA_IMAGE_REGEX.test(trimmed)) {
            const bytes = estimatedBytesFromDataUrl(trimmed);
            if (bytes > MAX_AVATAR_BYTES) {
                req.error(400, 'Avatar exceeds 2MB limit');
                throw new Error('Avatar exceeds 2MB limit');
            }
            return trimmed;
        }

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }

        req.error(400, 'Avatar must be an image data URL or an http(s) URL');
        throw new Error('Invalid avatar format');
    }

    private async resolveTeamIdById(req: Request, Team: any, rawId: string): Promise<string | null> {
        const id = rawId.trim();
        if (!id) return null;
        const team = await SELECT.one.from(Team).columns('ID').where({ ID: id });
        if (!team) {
            req.error(400, `Favorite team ID not found: ${id}`);
            throw new Error('Favorite team not found by ID');
        }
        return team.ID;
    }

    private async resolveTeamIdByName(req: Request, Team: any, rawName: string): Promise<string | null> {
        const teamName = rawName.trim();
        if (!teamName) return null;

        let team = await SELECT.one.from(Team).columns('ID', 'name').where({ name: teamName });
        if (!team) {
            const allTeams = await SELECT.from(Team).columns('ID', 'name');
            const normalized = teamName.toLowerCase();
            team = (allTeams as Array<{ ID: string; name?: string | null }>).find(
                (candidate) => typeof candidate.name === 'string' && candidate.name.toLowerCase() === normalized
            ) || null;
        }

        if (!team) {
            req.error(400, `Favorite team not found by name: ${teamName}`);
            throw new Error('Favorite team not found by name');
        }
        return team.ID;
    }

    private parseStoredRoles(raw: string | null | undefined): string[] {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        } catch {
            return [];
        }
    }

    private async toUserProfile(player: PlayerRow, Team: any, context: ResolvedUserContext) {
        let favoriteTeam = '';
        if (player.favoriteTeam_ID) {
            const team = await SELECT.one.from(Team).columns('name').where({ ID: player.favoriteTeam_ID });
            favoriteTeam = (team?.name as string) || '';
        }

        const roles = context.roles.length > 0 ? context.roles : this.parseStoredRoles(player.roles);
        const isAdmin = roles.includes('admin');

        return {
            avatarUrl: player.avatarUrl || '',
            displayName: player.displayName || '',
            firstName: player.givenName || '',
            lastName: player.familyName || '',
            email: player.email || '',
            roles,
            isAdmin,
            phone: player.phone || '',
            country: player.country || player.country_code || '',
            city: player.city || '',
            timezone: player.timezone || '',
            favoriteTeamId: player.favoriteTeam_ID || null,
            favoriteTeam,
            bio: player.bio || '',
        };
    }
}
