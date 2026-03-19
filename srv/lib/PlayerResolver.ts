import cds, { Request } from '@sap/cds';
import { syncAuthenticatedUser } from './UserContext';

/** Default fallback values when user identity cannot be determined. */
const FALLBACK_USER_EMAIL = (process.env.DEFAULT_PLAYER_EMAIL || 'local.player@conarum.invalid').toLowerCase();
const FALLBACK_USER_NAME = process.env.DEFAULT_PLAYER_NAME || 'Local Player';

/**
 * PlayerResolver — Resolves/creates Player records from authentication context.
 * Extracted from PredictionHandler to reduce file size.
 *
 * Handles:
 * - UUID and email-based player lookup
 * - Legacy synthetic email migration
 * - Auto-creation of missing player records
 * - Display name resolution with fallback chain
 */
export class PlayerResolver {

    /** Get current user's Player ID (returns null if not found). */
    async getCurrentPlayerId(req: Request): Promise<string | null> {
        const player = await this.resolve(req, false);
        return player?.ID ?? null;
    }

    /** Get or auto-create Player record for the current user. */
    async getOrCreatePlayerId(req: Request): Promise<string> {
        const player = await this.resolve(req, true);
        if (!player?.ID) {
            throw new Error('Unable to resolve current player');
        }
        return player.ID;
    }

    /**
     * Resolve the current Player record from authentication context.
     * Optionally creates a new Player record if none exists.
     */
    async resolve(req: Request, createIfMissing: boolean): Promise<any | null> {
        const { Player } = cds.entities('cnma.prediction');
        const context = await syncAuthenticatedUser(req);

        let primaryPlayer: any | null = null;
        if (context.userUUID) {
            primaryPlayer = await SELECT.one.from(Player).where({ userUUID: context.userUUID });
        }
        if (!primaryPlayer && context.email) {
            primaryPlayer = await SELECT.one.from(Player).where({ email: context.email });
        }

        const legacyEmail = this.toLegacySyntheticEmail(context.loginName);
        let legacyPlayer: any | null = null;
        if (legacyEmail && legacyEmail !== context.email) {
            legacyPlayer = await SELECT.one.from(Player).where({ email: legacyEmail });
        }

        let player: any | null = primaryPlayer || legacyPlayer;

        if (primaryPlayer && legacyPlayer && primaryPlayer.ID !== legacyPlayer.ID) {
            const [primaryHasData, legacyHasData] = await Promise.all([
                this.hasPredictionData(primaryPlayer.ID),
                this.hasPredictionData(legacyPlayer.ID),
            ]);
            player = legacyHasData && !primaryHasData ? legacyPlayer : primaryPlayer;

            const secondaryPlayer = player.ID === primaryPlayer.ID ? legacyPlayer : primaryPlayer;
            const playerDisplayName = this.asTrimmedString(player.displayName);
            const secondaryDisplayName = this.asTrimmedString(secondaryPlayer.displayName);
            const looksLikePlaceholderName = playerDisplayName
                ? (
                    (this.asTrimmedString(player.email) && playerDisplayName.toLowerCase() === this.asTrimmedString(player.email)!.toLowerCase())
                    || (context.loginName ? playerDisplayName.toLowerCase() === context.loginName.toLowerCase() : false)
                    || playerDisplayName.toLowerCase() === FALLBACK_USER_NAME.toLowerCase()
                )
                : false;

            if (secondaryDisplayName && (!playerDisplayName || looksLikePlaceholderName)) {
                await UPDATE(Player).where({ ID: player.ID }).set({ displayName: secondaryDisplayName });
                player.displayName = secondaryDisplayName;
            }
        }

        if (!player && createIfMissing) {
            const fallbackUser = this.resolveCurrentUser(req);
            const email = (context.email ?? fallbackUser.email).slice(0, 255);
            const displayName = (context.displayName ?? fallbackUser.displayName ?? email).slice(0, 100);

            player = await SELECT.one.from(Player).where({ email });
            if (!player) {
                const newPlayerEntry: Record<string, unknown> = {
                    email,
                    displayName,
                    userUUID: context.userUUID ?? null,
                    loginName: context.loginName ?? null,
                    givenName: context.givenName ?? null,
                    familyName: context.familyName ?? null,
                };

                try {
                    await INSERT.into(Player).entries(newPlayerEntry);
                } catch {
                    // Ignore race conditions and unique conflicts; resolve below.
                }

                if (context.userUUID) {
                    player = await SELECT.one.from(Player).where({ userUUID: context.userUUID });
                }
                if (!player) {
                    player = await SELECT.one.from(Player).where({ email });
                }
            }
        }

        if (!player) {
            return null;
        }

        const patch: Record<string, unknown> = {};
        const resolvedDisplayName = this.resolveDisplayName(player);
        if (resolvedDisplayName !== player.displayName) {
            patch.displayName = resolvedDisplayName.slice(0, 100);
        }
        if (context.loginName && context.loginName !== player.loginName) {
            patch.loginName = context.loginName;
        }

        if (context.userUUID && context.userUUID !== player.userUUID) {
            const ownerByUUID = await SELECT.one.from(Player).columns('ID').where({ userUUID: context.userUUID });
            if (!ownerByUUID || ownerByUUID.ID === player.ID) {
                patch.userUUID = context.userUUID;
            }
        }

        if (context.email && context.email !== player.email) {
            const ownerByEmail = await SELECT.one.from(Player).columns('ID').where({ email: context.email });
            if (!ownerByEmail || ownerByEmail.ID === player.ID) {
                patch.email = context.email;
            }
        }

        if (Object.keys(patch).length > 0) {
            await UPDATE(Player).where({ ID: player.ID }).set(patch);
            player = { ...player, ...patch };
        }

        return player;
    }

    // ── Helpers ──────────────────────────────────────────────

    asTrimmedString(value: unknown): string | null {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    toLegacySyntheticEmail(loginName: string | null): string | null {
        const normalizedLogin = this.asTrimmedString(loginName);
        if (!normalizedLogin) return null;

        const localPart = normalizedLogin.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'user';
        return `${localPart}@local.user.invalid`.toLowerCase();
    }

    resolveDisplayName(player: any): string {
        const fullName = [this.asTrimmedString(player?.givenName), this.asTrimmedString(player?.familyName)]
            .filter((value): value is string => Boolean(value))
            .join(' ');
        if (fullName) return fullName;

        const explicit = this.asTrimmedString(player?.displayName);
        if (explicit) return explicit;

        return this.asTrimmedString(player?.email)
            ?? this.asTrimmedString(player?.loginName)
            ?? 'Unknown';
    }

    private async hasPredictionData(playerId: string): Promise<boolean> {
        const { Prediction, SlotPrediction, PlayerTournamentStats } = cds.entities('cnma.prediction');
        const [prediction, slotPrediction, stats] = await Promise.all([
            SELECT.one.from(Prediction).columns('ID').where({ player_ID: playerId }),
            SELECT.one.from(SlotPrediction).columns('ID').where({ player_ID: playerId }),
            SELECT.one.from(PlayerTournamentStats).columns('ID').where({ player_ID: playerId }),
        ]);
        return Boolean(prediction || slotPrediction || stats);
    }

    /**
     * Resolve current user identity with safe fallbacks.
     * Temporary behavior: if email claim is missing, synthesize one from user id.
     */
    private resolveCurrentUser(req: Request): { email: string; displayName: string } {
        const userObj = req.user as any;
        const rawId = typeof userObj?.id === 'string' ? userObj.id.trim() : '';
        const rawName = typeof userObj?.attr?.name === 'string' ? userObj.attr.name.trim() : '';
        const rawEmailAttr = typeof userObj?.attr?.email === 'string' ? userObj.attr.email.trim() : '';

        const fromAttr = rawEmailAttr.includes('@') ? rawEmailAttr.toLowerCase() : '';
        const fromId = rawId.includes('@') ? rawId.toLowerCase() : '';
        const syntheticFromId = rawId
            ? `${rawId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'user'}@local.user.invalid`
            : '';

        const email = (fromAttr || fromId || syntheticFromId || FALLBACK_USER_EMAIL).slice(0, 255);
        const displayName = (rawName || rawId || FALLBACK_USER_NAME).slice(0, 100);

        return { email, displayName };
    }
}
