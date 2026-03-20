import cds from '@sap/cds';

/**
 * PayoutManager — Handles score bet payout operations.
 * Extracted from AdminHandler to reduce file size.
 */
export class PayoutManager {

    /**
     * Mark score bets as paid out (admin distributed CO to the players).
     */
    async markScoreBetsPaid(req: cds.Request) {
        const { betIds } = req.data;
        const { ScoreBet } = cds.entities('cnma.prediction');

        if (!betIds || betIds.length === 0) {
            return req.error(400, 'betIds is required and must not be empty');
        }

        let updated = 0;
        for (const betId of betIds) {
            const bet = await SELECT.one.from(ScoreBet).where({ ID: betId });
            if (bet && bet.status === 'won') {
                await UPDATE(ScoreBet).where({ ID: betId }).set({ isPaidOut: true });
                updated++;
            }
        }

        return {
            success: true,
            message: `${updated} score bet(s) marked as paid out.`,
        };
    }

    /**
     * Revert payout mark (in case of mistake).
     */
    async markScoreBetsUnpaid(req: cds.Request) {
        const { betIds } = req.data;
        const { ScoreBet } = cds.entities('cnma.prediction');

        if (!betIds || betIds.length === 0) {
            return req.error(400, 'betIds is required and must not be empty');
        }

        let updated = 0;
        for (const betId of betIds) {
            const bet = await SELECT.one.from(ScoreBet).where({ ID: betId });
            if (bet && bet.isPaidOut) {
                await UPDATE(ScoreBet).where({ ID: betId }).set({ isPaidOut: false });
                updated++;
            }
        }

        return {
            success: true,
            message: `${updated} score bet(s) reverted to unpaid.`,
        };
    }

    /**
     * Reset ALL won score bets' isPaidOut to false for a tournament.
     * Useful for legacy data where isPaidOut was null.
     */
    async resetAllPayoutStatus(req: cds.Request) {
        const { tournamentId } = req.data;
        const { ScoreBet, Match } = cds.entities('cnma.prediction');

        if (!tournamentId) return req.error(400, 'tournamentId is required');

        // Find all won score bets for matches in this tournament
        const wonBets = await SELECT.from(ScoreBet).where({ status: 'won' });

        let updated = 0;
        for (const bet of wonBets) {
            const match = await SELECT.one.from(Match)
                .where({ ID: bet.match_ID, tournament_ID: tournamentId });
            if (!match) continue;

            await UPDATE(ScoreBet).where({ ID: bet.ID }).set({ isPaidOut: false });
            updated++;
        }

        return {
            success: true,
            message: `${updated} score bet(s) reset to unpaid.`,
        };
    }

    /**
     * Get payout summary for a tournament — all won score bets with player & match details.
     */
    async getPayoutSummary(req: cds.Request) {
        const { tournamentId } = req.data;
        const { ScoreBet, Match, Player, Team } = cds.entities('cnma.prediction');

        if (!tournamentId) return req.error(400, 'tournamentId is required');

        const wonBets = await SELECT.from(ScoreBet)
            .where({ status: 'won' });

        const result: any[] = [];

        for (const bet of wonBets) {
            const match = await SELECT.one.from(Match)
                .where({ ID: bet.match_ID, tournament_ID: tournamentId });
            if (!match) continue;

            const player = await SELECT.one.from(Player).where({ ID: bet.player_ID });
            const homeTeam = match.homeTeam_ID
                ? await SELECT.one.from(Team).where({ ID: match.homeTeam_ID })
                : null;
            const awayTeam = match.awayTeam_ID
                ? await SELECT.one.from(Team).where({ ID: match.awayTeam_ID })
                : null;

            result.push({
                betId: bet.ID,
                playerId: bet.player_ID,
                playerDisplayName: player?.displayName ?? 'Unknown',
                playerEmail: player?.email ?? '',
                playerAvatarUrl: player?.avatarUrl ?? '',
                matchId: bet.match_ID,
                homeTeam: homeTeam?.name ?? 'TBD',
                awayTeam: awayTeam?.name ?? 'TBD',
                kickoff: match.kickoff,
                predictedHomeScore: bet.predictedHomeScore,
                predictedAwayScore: bet.predictedAwayScore,
                actualHomeScore: match.homeScore,
                actualAwayScore: match.awayScore,
                payout: Number(bet.payout),
                isPaidOut: bet.isPaidOut ?? false,
                submittedAt: bet.submittedAt,
            });
        }

        result.sort((a: any, b: any) => {
            if (a.isPaidOut !== b.isPaidOut) return a.isPaidOut ? 1 : -1;
            return new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
        });

        return result;
    }
}
