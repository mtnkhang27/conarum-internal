import cds from '@sap/cds';
import { PredictionHandler } from './handlers/PredictionHandler';
import { AdminHandler } from './handlers/AdminHandler';

/**
 * PlayerService — Authenticated employee-facing OData service.
 * Handles prediction submissions for UC1 (Score), UC2 (Outcome), UC3 (Champion).
 */
export class PlayerService extends cds.ApplicationService {
    private predictionHandler!: PredictionHandler;

    async init() {
        this.predictionHandler = new PredictionHandler(this);

        // ── Actions ──────────────────────────────────────────
        this.on('submitPredictions', this.predictionHandler.submitPredictions.bind(this.predictionHandler));
        this.on('submitScoreBet', this.predictionHandler.submitScoreBet.bind(this.predictionHandler));
        this.on('submitMatchPrediction', this.predictionHandler.submitMatchPrediction.bind(this.predictionHandler));
        this.on('cancelMatchPrediction', this.predictionHandler.cancelMatchPrediction.bind(this.predictionHandler));
        this.on('submitSlotPrediction', this.predictionHandler.submitSlotPrediction.bind(this.predictionHandler));
        this.on('cancelSlotPrediction', this.predictionHandler.cancelSlotPrediction.bind(this.predictionHandler));
        this.on('pickChampion', this.predictionHandler.pickChampion.bind(this.predictionHandler));

        // ── Functions (read-only queries) ────────────────────
        this.on('getLatestResults', this.predictionHandler.getLatestResults.bind(this.predictionHandler));
        this.on('getUpcomingMatches', this.predictionHandler.getUpcomingMatches.bind(this.predictionHandler));
        this.on('getPredictionLeaderboard', this.predictionHandler.getPredictionLeaderboard.bind(this.predictionHandler));
        this.on('getStandings', this.predictionHandler.getStandings.bind(this.predictionHandler));
        this.on('getMyRecentPredictions', this.predictionHandler.getMyRecentPredictions.bind(this.predictionHandler));
        this.on('getTournamentBracket', this.predictionHandler.getTournamentBracket.bind(this.predictionHandler));
        this.on('getChampionPickCounts', this.predictionHandler.getChampionPickCounts.bind(this.predictionHandler));

        // ── Auto-filter MyPredictions / MyScoreBets / MyChampionPick to current user ──
        this.before('READ', 'MyPredictions', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MyScoreBets', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MySlotPredictions', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MySlotScoreBets', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MyChampionPick', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));

        return super.init();
    }
}

/**
 * AdminService — Admin-only OData service.
 * Handles match result entry, leaderboard recalculation, and config management.
 */
export class AdminService extends cds.ApplicationService {
    private adminHandler!: AdminHandler;

    async init() {
        this.adminHandler = new AdminHandler(this);

        // ── Actions ──────────────────────────────────────────
        this.on('enterMatchResult', this.adminHandler.enterMatchResult.bind(this.adminHandler));
        this.on('correctMatchResult', this.adminHandler.correctMatchResult.bind(this.adminHandler));
        this.on('setPenaltyWinner', this.adminHandler.setPenaltyWinner.bind(this.adminHandler));
        this.on('recalculateLeaderboard', this.adminHandler.recalculateLeaderboard.bind(this.adminHandler));
        this.on('lockChampionPredictions', this.adminHandler.lockChampionPredictions.bind(this.adminHandler));
        this.on('resolveChampionPicks', this.adminHandler.resolveChampionPicksAction.bind(this.adminHandler));
        this.on('syncMatchResults', this.adminHandler.syncMatchResults.bind(this.adminHandler));
        this.on('lockMatchBetting', this.adminHandler.lockMatchBetting.bind(this.adminHandler));
        this.on('lockTournamentBetting', this.adminHandler.lockTournamentBetting.bind(this.adminHandler));
        this.on('getAvailableCompetitions', this.adminHandler.getAvailableCompetitions.bind(this.adminHandler));
        this.on('importTournament', this.adminHandler.importTournament.bind(this.adminHandler));

        // ── Guard: block match creation/update for completed/cancelled tournaments ──
        this.before(['CREATE', 'UPDATE'], 'Matches', async (req: any) => {
            const { Tournament, Match } = cds.entities('cnma.prediction');
            let tournamentId = req.data?.tournament_ID;

            // For UPDATE (PATCH): tournament_ID may not be in the payload — resolve from DB
            if (!tournamentId && req.params?.[0]) {
                const matchId = (req.params[0] as any).ID ?? req.params[0];
                const existing = await SELECT.one.from(Match).columns('tournament_ID').where({ ID: matchId });
                tournamentId = existing?.tournament_ID;
            }

            if (!tournamentId) return;
            const tournament = await SELECT.one.from(Tournament).where({ ID: tournamentId });
            if (tournament && (tournament.status === 'completed' || tournament.status === 'cancelled')) {
                return req.error(400, `Cannot create or modify matches for a ${tournament.status} tournament`);
            }
        });

        return super.init();
    }
}

module.exports = { PlayerService, AdminService };
