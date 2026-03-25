import cds from '@sap/cds';
import { resolveUserContext } from './UserContext';

type AwardType = 'scoreBet' | 'championPick' | 'leaderboard';

type AdminIdentity = {
    name: string;
    email: string;
};

type AwardRecord = {
    ID: string;
    tournament_ID: string;
    player_ID: string;
    awardType: AwardType;
    sourceKey: string;
    status: 'awarded' | 'reverted';
    scoreBet_ID?: string | null;
    championPick_ID?: string | null;
    leaderboardStat_ID?: string | null;
    match_ID?: string | null;
    rewardAmount?: number | null;
    rewardDescription?: string | null;
    evidenceNote?: string | null;
    evidenceUrl?: string | null;
    awardedAt?: string | null;
    awardedByName?: string | null;
    awardedByEmail?: string | null;
    revertedAt?: string | null;
    revertedByName?: string | null;
    revertedByEmail?: string | null;
    revertReason?: string | null;
};

type PayoutItemRow = {
    sourceKey: string;
    awardId: string | null;
    awardType: AwardType;
    awardTypeLabel: string;
    awardStatus: 'pending' | 'awarded' | 'reverted';
    isAwarded: boolean;
    tournamentId: string;
    playerId: string;
    playerDisplayName: string;
    playerEmail: string;
    playerAvatarUrl: string;
    matchId: string | null;
    homeTeam: string;
    awayTeam: string;
    kickoff: string | null;
    scoreBetId: string | null;
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
    actualHomeScore: number | null;
    actualAwayScore: number | null;
    championPickId: string | null;
    championTeamId: string | null;
    championTeamName: string;
    leaderboardStatId: string | null;
    leaderboardRank: number | null;
    leaderboardPoints: number;
    rewardAmount: number;
    rewardDescription: string;
    evidenceNote: string;
    evidenceUrl: string;
    awardedAt: string | null;
    awardedByName: string;
    awardedByEmail: string;
    revertedAt: string | null;
    revertedByName: string;
    revertedByEmail: string;
    revertReason: string;
    submittedAt: string | null;
};

const AWARD_TYPE_LABEL: Record<AwardType, string> = {
    scoreBet: 'Exact Score',
    championPick: 'Champion Pick',
    leaderboard: 'Leaderboard',
};

const AWARD_TYPE_ORDER: Record<AwardType, number> = {
    scoreBet: 0,
    championPick: 1,
    leaderboard: 2,
};

const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const toDateTime = (): string => new Date().toISOString();

const buildSourceKey = (awardType: AwardType, sourceId: string): string => `${awardType}:${sourceId}`;

export class PayoutManager {
    private get entities() {
        return cds.entities('cnma.prediction') as Record<string, any>;
    }

    private getAdminIdentity(req: cds.Request): AdminIdentity {
        const context = resolveUserContext(req as any);
        return {
            name: context.displayName ?? context.loginName ?? context.email ?? 'Admin',
            email: context.email ?? context.loginName ?? '',
        };
    }

    private async fetchExistingAwards(tournamentId: string): Promise<Map<string, AwardRecord>> {
        const { PayoutAward } = this.entities;
        const rows = await SELECT.from(PayoutAward).where({ tournament_ID: tournamentId });
        return new Map((rows as AwardRecord[]).map((row) => [row.sourceKey, row]));
    }

    private resolveAwardStatus(
        award: AwardRecord | undefined,
        legacyPaidOut = false,
    ): { awardStatus: 'pending' | 'awarded' | 'reverted'; isAwarded: boolean } {
        if (award?.status === 'awarded') {
            return { awardStatus: 'awarded', isAwarded: true };
        }
        if (award?.status === 'reverted') {
            return { awardStatus: 'reverted', isAwarded: false };
        }
        if (legacyPaidOut) {
            return { awardStatus: 'awarded', isAwarded: true };
        }
        return { awardStatus: 'pending', isAwarded: false };
    }

    private buildAuditPayload(
        req: cds.Request,
        data: {
            sourceKey: string;
            awardType: AwardType;
            tournamentId: string;
            playerId: string;
            matchId?: string | null;
            scoreBetId?: string | null;
            championPickId?: string | null;
            leaderboardStatId?: string | null;
            rewardAmount?: number | null;
            rewardDescription?: string | null;
            evidenceNote?: string | null;
            evidenceUrl?: string | null;
        },
    ) {
        const admin = this.getAdminIdentity(req);
        return {
            tournament_ID: data.tournamentId,
            player_ID: data.playerId,
            awardType: data.awardType,
            sourceKey: data.sourceKey,
            status: 'awarded',
            match_ID: data.matchId ?? null,
            scoreBet_ID: data.scoreBetId ?? null,
            championPick_ID: data.championPickId ?? null,
            leaderboardStat_ID: data.leaderboardStatId ?? null,
            rewardAmount: toNumber(data.rewardAmount, 0),
            rewardDescription: toText(data.rewardDescription),
            evidenceNote: toText(data.evidenceNote),
            evidenceUrl: toText(data.evidenceUrl),
            awardedAt: toDateTime(),
            awardedByName: admin.name,
            awardedByEmail: admin.email,
            revertedAt: null,
            revertedByName: null,
            revertedByEmail: null,
            revertReason: null,
        };
    }

    private async saveAwardRecord(
        req: cds.Request,
        data: {
            sourceKey: string;
            awardType: AwardType;
            tournamentId: string;
            playerId: string;
            matchId?: string | null;
            scoreBetId?: string | null;
            championPickId?: string | null;
            leaderboardStatId?: string | null;
            rewardAmount?: number | null;
            rewardDescription?: string | null;
            evidenceNote?: string | null;
            evidenceUrl?: string | null;
        },
    ) {
        const { PayoutAward, ScoreBet } = this.entities;
        const payload = this.buildAuditPayload(req, data);
        const existing = await SELECT.one.from(PayoutAward).where({ sourceKey: data.sourceKey });

        if (existing?.ID) {
            await UPDATE(PayoutAward).where({ ID: existing.ID }).set(payload);
        } else {
            await INSERT.into(PayoutAward).entries(payload);
        }

        if (data.scoreBetId) {
            await UPDATE(ScoreBet).where({ ID: data.scoreBetId }).set({ isPaidOut: true });
        }
    }

    private async revertAwardRecord(req: cds.Request, awardId: string, revertReason?: string | null) {
        const { PayoutAward, ScoreBet } = this.entities;
        const admin = this.getAdminIdentity(req);
        const award = await SELECT.one.from(PayoutAward).where({ ID: awardId });
        if (!award) {
            return req.error(404, 'Payout award record not found');
        }

        await UPDATE(PayoutAward).where({ ID: awardId }).set({
            status: 'reverted',
            revertedAt: toDateTime(),
            revertedByName: admin.name,
            revertedByEmail: admin.email,
            revertReason: toText(revertReason),
        });

        if (award.scoreBet_ID) {
            await UPDATE(ScoreBet).where({ ID: award.scoreBet_ID }).set({ isPaidOut: false });
        }

        return award;
    }

    private buildBaseRow(data: Partial<PayoutItemRow> & Pick<PayoutItemRow, 'sourceKey' | 'awardType' | 'tournamentId' | 'playerId'>): PayoutItemRow {
        return {
            sourceKey: data.sourceKey,
            awardId: data.awardId ?? null,
            awardType: data.awardType,
            awardTypeLabel: data.awardTypeLabel ?? AWARD_TYPE_LABEL[data.awardType],
            awardStatus: data.awardStatus ?? 'pending',
            isAwarded: data.isAwarded ?? false,
            tournamentId: data.tournamentId,
            playerId: data.playerId,
            playerDisplayName: data.playerDisplayName ?? 'Unknown',
            playerEmail: data.playerEmail ?? '',
            playerAvatarUrl: data.playerAvatarUrl ?? '',
            matchId: data.matchId ?? null,
            homeTeam: data.homeTeam ?? '',
            awayTeam: data.awayTeam ?? '',
            kickoff: data.kickoff ?? null,
            scoreBetId: data.scoreBetId ?? null,
            predictedHomeScore: data.predictedHomeScore ?? null,
            predictedAwayScore: data.predictedAwayScore ?? null,
            actualHomeScore: data.actualHomeScore ?? null,
            actualAwayScore: data.actualAwayScore ?? null,
            championPickId: data.championPickId ?? null,
            championTeamId: data.championTeamId ?? null,
            championTeamName: data.championTeamName ?? '',
            leaderboardStatId: data.leaderboardStatId ?? null,
            leaderboardRank: data.leaderboardRank ?? null,
            leaderboardPoints: data.leaderboardPoints ?? 0,
            rewardAmount: data.rewardAmount ?? 0,
            rewardDescription: data.rewardDescription ?? '',
            evidenceNote: data.evidenceNote ?? '',
            evidenceUrl: data.evidenceUrl ?? '',
            awardedAt: data.awardedAt ?? null,
            awardedByName: data.awardedByName ?? '',
            awardedByEmail: data.awardedByEmail ?? '',
            revertedAt: data.revertedAt ?? null,
            revertedByName: data.revertedByName ?? '',
            revertedByEmail: data.revertedByEmail ?? '',
            revertReason: data.revertReason ?? '',
            submittedAt: data.submittedAt ?? null,
        };
    }

    async markScoreBetsPaid(req: cds.Request) {
        const { betIds } = req.data as { betIds?: string[] };
        const { ScoreBet, Match } = this.entities;

        if (!betIds || betIds.length === 0) {
            return req.error(400, 'betIds is required and must not be empty');
        }

        let updated = 0;
        for (const betId of betIds) {
            const bet = await SELECT.one.from(ScoreBet).where({ ID: betId });
            if (!bet || bet.status !== 'won') continue;

            const match = await SELECT.one.from(Match).where({ ID: bet.match_ID });
            if (!match?.tournament_ID) continue;

            await this.saveAwardRecord(req, {
                sourceKey: buildSourceKey('scoreBet', bet.ID),
                awardType: 'scoreBet',
                tournamentId: match.tournament_ID,
                playerId: bet.player_ID,
                matchId: bet.match_ID,
                scoreBetId: bet.ID,
                rewardAmount: toNumber(bet.payout, 0),
                rewardDescription: 'Exact score payout',
            });
            updated += 1;
        }

        return {
            success: true,
            message: `${updated} score bet(s) marked as paid out.`,
        };
    }

    async markScoreBetsUnpaid(req: cds.Request) {
        const { betIds } = req.data as { betIds?: string[] };
        const { ScoreBet, PayoutAward } = this.entities;

        if (!betIds || betIds.length === 0) {
            return req.error(400, 'betIds is required and must not be empty');
        }

        let updated = 0;
        for (const betId of betIds) {
            const sourceKey = buildSourceKey('scoreBet', betId);
            const award = await SELECT.one.from(PayoutAward).where({ sourceKey });
            if (award?.ID) {
                await this.revertAwardRecord(req, award.ID, 'Legacy score bet payout reverted');
                updated += 1;
                continue;
            }

            const bet = await SELECT.one.from(ScoreBet).where({ ID: betId });
            if (bet?.isPaidOut) {
                await UPDATE(ScoreBet).where({ ID: betId }).set({ isPaidOut: false });
                updated += 1;
            }
        }

        return {
            success: true,
            message: `${updated} score bet(s) reverted to unpaid.`,
        };
    }

    async upsertPayoutAward(req: cds.Request) {
        const {
            sourceKey,
            awardType,
            tournamentId,
            playerId,
            matchId,
            scoreBetId,
            championPickId,
            leaderboardStatId,
            rewardAmount,
            rewardDescription,
            evidenceNote,
            evidenceUrl,
        } = req.data as Record<string, any>;

        if (!sourceKey) return req.error(400, 'sourceKey is required');
        if (!awardType) return req.error(400, 'awardType is required');
        if (!tournamentId) return req.error(400, 'tournamentId is required');
        if (!playerId) return req.error(400, 'playerId is required');
        if (!['scoreBet', 'championPick', 'leaderboard'].includes(String(awardType))) {
            return req.error(400, 'awardType is invalid');
        }

        await this.saveAwardRecord(req, {
            sourceKey: String(sourceKey),
            awardType: awardType as AwardType,
            tournamentId: String(tournamentId),
            playerId: String(playerId),
            matchId: matchId ? String(matchId) : null,
            scoreBetId: scoreBetId ? String(scoreBetId) : null,
            championPickId: championPickId ? String(championPickId) : null,
            leaderboardStatId: leaderboardStatId ? String(leaderboardStatId) : null,
            rewardAmount: rewardAmount != null ? toNumber(rewardAmount, 0) : 0,
            rewardDescription: rewardDescription ?? '',
            evidenceNote: evidenceNote ?? '',
            evidenceUrl: evidenceUrl ?? '',
        });

        return {
            success: true,
            message: 'Payout award saved successfully.',
        };
    }

    async revertPayoutAward(req: cds.Request) {
        const { awardId, revertReason } = req.data as { awardId?: string; revertReason?: string };
        if (!awardId) return req.error(400, 'awardId is required');

        await this.revertAwardRecord(req, awardId, revertReason ?? '');
        return {
            success: true,
            message: 'Payout award reverted successfully.',
        };
    }

    async resetAllPayoutStatus(req: cds.Request) {
        const { tournamentId } = req.data as { tournamentId?: string };
        const { ScoreBet, Match, PayoutAward } = this.entities;

        if (!tournamentId) return req.error(400, 'tournamentId is required');

        const matches = await SELECT.from(Match).columns('ID').where({ tournament_ID: tournamentId });
        const matchIds = matches.map((match: any) => match.ID);

        let resetScoreBets = 0;
        if (matchIds.length > 0) {
            const paidScoreBets = await SELECT.from(ScoreBet)
                .columns('ID')
                .where({ match_ID: { in: matchIds }, isPaidOut: true });

            for (const bet of paidScoreBets as any[]) {
                await UPDATE(ScoreBet).where({ ID: bet.ID }).set({ isPaidOut: false });
                resetScoreBets += 1;
            }
        }

        const awards = await SELECT.from(PayoutAward)
            .columns('ID', 'status')
            .where({ tournament_ID: tournamentId });

        let resetAwards = 0;
        for (const award of awards as any[]) {
            if (award.status === 'reverted') continue;
            await this.revertAwardRecord(req, award.ID, 'Bulk payout reset');
            resetAwards += 1;
        }

        return {
            success: true,
            message: `${resetAwards} award record(s) and ${resetScoreBets} score bet payout flag(s) reset.`,
        };
    }

    async getPayoutSummary(req: cds.Request) {
        const { tournamentId } = req.data as { tournamentId?: string };
        const {
            ScoreBet,
            Match,
            Player,
            Team,
            ChampionPick,
            PlayerTournamentStats,
            Tournament,
        } = this.entities;

        if (!tournamentId) return req.error(400, 'tournamentId is required');

        const tournament = await SELECT.one.from(Tournament)
            .columns('ID', 'outcomePrize', 'championPrizePool')
            .where({ ID: tournamentId });
        if (!tournament) return [];

        const matches = await SELECT.from(Match)
            .columns('ID', 'homeTeam_ID', 'awayTeam_ID', 'kickoff', 'homeScore', 'awayScore', 'tournament_ID')
            .where({ tournament_ID: tournamentId });
        const matchById = new Map((matches as any[]).map((match) => [match.ID, match]));
        const matchIds = (matches as any[]).map((match) => match.ID);

        const scoreBets = matchIds.length === 0
            ? []
            : await SELECT.from(ScoreBet)
                .columns('ID', 'player_ID', 'match_ID', 'predictedHomeScore', 'predictedAwayScore', 'payout', 'isPaidOut', 'submittedAt', 'status')
                .where({ status: 'won', match_ID: { in: matchIds } });

        const championPicks = await SELECT.from(ChampionPick)
            .columns('ID', 'player_ID', 'team_ID', 'submittedAt', 'isCorrect')
            .where({ tournament_ID: tournamentId, isCorrect: true });

        const leaderboardStats = (await SELECT.from(PlayerTournamentStats)
            .columns('ID', 'player_ID', 'rank', 'totalPoints', 'totalPredictions', 'modifiedAt', 'createdAt')
            .where({ tournament_ID: tournamentId })) as any[];

        const visibleLeaderboardStats = leaderboardStats.filter((row) => row.rank !== null && row.rank !== undefined && toNumber(row.totalPredictions, 0) > 0);

        const playerIds = new Set<string>();
        const teamIds = new Set<string>();

        for (const match of matches as any[]) {
            if (match.homeTeam_ID) teamIds.add(match.homeTeam_ID);
            if (match.awayTeam_ID) teamIds.add(match.awayTeam_ID);
        }
        for (const bet of scoreBets as any[]) {
            if (bet.player_ID) playerIds.add(bet.player_ID);
        }
        for (const pick of championPicks as any[]) {
            if (pick.player_ID) playerIds.add(pick.player_ID);
            if (pick.team_ID) teamIds.add(pick.team_ID);
        }
        for (const stat of visibleLeaderboardStats) {
            if (stat.player_ID) playerIds.add(stat.player_ID);
        }

        const players = playerIds.size === 0
            ? []
            : await SELECT.from(Player)
                .columns('ID', 'displayName', 'email', 'avatarUrl')
                .where({ ID: { in: [...playerIds] } });
        const teams = teamIds.size === 0
            ? []
            : await SELECT.from(Team)
                .columns('ID', 'name')
                .where({ ID: { in: [...teamIds] } });

        const playerById = new Map((players as any[]).map((player) => [player.ID, player]));
        const teamById = new Map((teams as any[]).map((team) => [team.ID, team]));
        const existingAwards = await this.fetchExistingAwards(tournamentId);
        const result: PayoutItemRow[] = [];

        for (const bet of scoreBets as any[]) {
            const sourceKey = buildSourceKey('scoreBet', bet.ID);
            const award = existingAwards.get(sourceKey);
            const status = this.resolveAwardStatus(award, Boolean(bet.isPaidOut));
            const match = matchById.get(bet.match_ID);
            const player = playerById.get(bet.player_ID);
            const homeTeam = match?.homeTeam_ID ? teamById.get(match.homeTeam_ID) : null;
            const awayTeam = match?.awayTeam_ID ? teamById.get(match.awayTeam_ID) : null;

            result.push(this.buildBaseRow({
                sourceKey,
                awardId: award?.ID ?? null,
                awardType: 'scoreBet',
                awardTypeLabel: AWARD_TYPE_LABEL.scoreBet,
                awardStatus: status.awardStatus,
                isAwarded: status.isAwarded,
                tournamentId,
                playerId: bet.player_ID,
                playerDisplayName: player?.displayName ?? 'Unknown',
                playerEmail: player?.email ?? '',
                playerAvatarUrl: player?.avatarUrl ?? '',
                matchId: bet.match_ID ?? null,
                homeTeam: homeTeam?.name ?? 'TBD',
                awayTeam: awayTeam?.name ?? 'TBD',
                kickoff: match?.kickoff ?? null,
                scoreBetId: bet.ID,
                predictedHomeScore: bet.predictedHomeScore ?? null,
                predictedAwayScore: bet.predictedAwayScore ?? null,
                actualHomeScore: match?.homeScore ?? null,
                actualAwayScore: match?.awayScore ?? null,
                rewardAmount: award?.rewardAmount != null ? toNumber(award.rewardAmount, 0) : toNumber(bet.payout, 0),
                rewardDescription: toText(award?.rewardDescription) || 'Exact score payout',
                evidenceNote: toText(award?.evidenceNote),
                evidenceUrl: toText(award?.evidenceUrl),
                awardedAt: award?.awardedAt ?? null,
                awardedByName: toText(award?.awardedByName),
                awardedByEmail: toText(award?.awardedByEmail),
                revertedAt: award?.revertedAt ?? null,
                revertedByName: toText(award?.revertedByName),
                revertedByEmail: toText(award?.revertedByEmail),
                revertReason: toText(award?.revertReason),
                submittedAt: bet.submittedAt ?? null,
            }));
        }

        for (const pick of championPicks as any[]) {
            const sourceKey = buildSourceKey('championPick', pick.ID);
            const award = existingAwards.get(sourceKey);
            const status = this.resolveAwardStatus(award);
            const player = playerById.get(pick.player_ID);
            const team = pick.team_ID ? teamById.get(pick.team_ID) : null;

            result.push(this.buildBaseRow({
                sourceKey,
                awardId: award?.ID ?? null,
                awardType: 'championPick',
                awardTypeLabel: AWARD_TYPE_LABEL.championPick,
                awardStatus: status.awardStatus,
                isAwarded: status.isAwarded,
                tournamentId,
                playerId: pick.player_ID,
                playerDisplayName: player?.displayName ?? 'Unknown',
                playerEmail: player?.email ?? '',
                playerAvatarUrl: player?.avatarUrl ?? '',
                championPickId: pick.ID,
                championTeamId: pick.team_ID ?? null,
                championTeamName: team?.name ?? 'TBD',
                rewardAmount: award?.rewardAmount != null ? toNumber(award.rewardAmount, 0) : 0,
                rewardDescription: toText(award?.rewardDescription) || toText(tournament.championPrizePool) || 'Champion prediction prize',
                evidenceNote: toText(award?.evidenceNote),
                evidenceUrl: toText(award?.evidenceUrl),
                awardedAt: award?.awardedAt ?? null,
                awardedByName: toText(award?.awardedByName),
                awardedByEmail: toText(award?.awardedByEmail),
                revertedAt: award?.revertedAt ?? null,
                revertedByName: toText(award?.revertedByName),
                revertedByEmail: toText(award?.revertedByEmail),
                revertReason: toText(award?.revertReason),
                submittedAt: pick.submittedAt ?? null,
            }));
        }

        for (const stat of visibleLeaderboardStats) {
            const sourceKey = buildSourceKey('leaderboard', stat.ID);
            const award = existingAwards.get(sourceKey);
            const status = this.resolveAwardStatus(award);
            const player = playerById.get(stat.player_ID);

            result.push(this.buildBaseRow({
                sourceKey,
                awardId: award?.ID ?? null,
                awardType: 'leaderboard',
                awardTypeLabel: AWARD_TYPE_LABEL.leaderboard,
                awardStatus: status.awardStatus,
                isAwarded: status.isAwarded,
                tournamentId,
                playerId: stat.player_ID,
                playerDisplayName: player?.displayName ?? 'Unknown',
                playerEmail: player?.email ?? '',
                playerAvatarUrl: player?.avatarUrl ?? '',
                leaderboardStatId: stat.ID,
                leaderboardRank: stat.rank ?? null,
                leaderboardPoints: toNumber(stat.totalPoints, 0),
                rewardAmount: award?.rewardAmount != null ? toNumber(award.rewardAmount, 0) : 0,
                rewardDescription: toText(award?.rewardDescription) || toText(tournament.outcomePrize) || 'Leaderboard prize',
                evidenceNote: toText(award?.evidenceNote),
                evidenceUrl: toText(award?.evidenceUrl),
                awardedAt: award?.awardedAt ?? null,
                awardedByName: toText(award?.awardedByName),
                awardedByEmail: toText(award?.awardedByEmail),
                revertedAt: award?.revertedAt ?? null,
                revertedByName: toText(award?.revertedByName),
                revertedByEmail: toText(award?.revertedByEmail),
                revertReason: toText(award?.revertReason),
                submittedAt: stat.modifiedAt ?? stat.createdAt ?? null,
            }));
        }

        result.sort((a, b) => {
            if (a.isAwarded !== b.isAwarded) return a.isAwarded ? 1 : -1;
            if (a.awardStatus !== b.awardStatus) {
                const aRank = a.awardStatus === 'pending' ? 0 : a.awardStatus === 'awarded' ? 1 : 2;
                const bRank = b.awardStatus === 'pending' ? 0 : b.awardStatus === 'awarded' ? 1 : 2;
                if (aRank !== bRank) return aRank - bRank;
            }
            if (AWARD_TYPE_ORDER[a.awardType] !== AWARD_TYPE_ORDER[b.awardType]) {
                return AWARD_TYPE_ORDER[a.awardType] - AWARD_TYPE_ORDER[b.awardType];
            }
            if (a.awardType === 'leaderboard' && b.awardType === 'leaderboard') {
                return toNumber(a.leaderboardRank, 9999) - toNumber(b.leaderboardRank, 9999);
            }
            const aKickoff = a.kickoff ? new Date(a.kickoff).getTime() : Number.MAX_SAFE_INTEGER;
            const bKickoff = b.kickoff ? new Date(b.kickoff).getTime() : Number.MAX_SAFE_INTEGER;
            if (aKickoff !== bKickoff) return aKickoff - bKickoff;
            return a.playerDisplayName.localeCompare(b.playerDisplayName);
        });

        return result;
    }
}
