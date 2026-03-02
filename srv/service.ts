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
        this.on('pickChampion', this.predictionHandler.pickChampion.bind(this.predictionHandler));

        // ── Functions (read-only queries) ────────────────────
        this.on('getLatestResults', this.predictionHandler.getLatestResults.bind(this.predictionHandler));
        this.on('getUpcomingMatches', this.predictionHandler.getUpcomingMatches.bind(this.predictionHandler));
        this.on('getPredictionLeaderboard', this.predictionHandler.getPredictionLeaderboard.bind(this.predictionHandler));
        this.on('getStandings', this.predictionHandler.getStandings.bind(this.predictionHandler));

        // ── Auto-filter MyPredictions / MyScoreBets / MyChampionPick to current user ──
        this.before('READ', 'MyPredictions', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MyScoreBets', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
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
        this.on('recalculateLeaderboard', this.adminHandler.recalculateLeaderboard.bind(this.adminHandler));
        this.on('lockChampionPredictions', this.adminHandler.lockChampionPredictions.bind(this.adminHandler));

        return super.init();
    }
}

module.exports = { PlayerService, AdminService };
