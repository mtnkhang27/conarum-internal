import cds from '@sap/cds';
import { PredictionHandler } from './handlers/PredictionHandler';
import { AdminHandler } from './handlers/AdminHandler';
import { resolveUserContext, syncAuthenticatedUser } from './lib/UserContext';
import { ProfileHandler } from './handlers/ProfileHandler';

const AUTH_TRACE_ENABLED = process.env.AUTH_TRACE === '1';

/**
 * PlayerService - Authenticated employee-facing OData service.
 * Handles prediction submissions for UC1 (Score), UC2 (Outcome), UC3 (Champion).
 */
export class PlayerService extends cds.ApplicationService {
    private predictionHandler!: PredictionHandler;
    private profileHandler!: ProfileHandler;

    async init() {
        this.predictionHandler = new PredictionHandler(this);
        this.profileHandler = new ProfileHandler(this);

        this.before('*', (req) => {
            // Never block every request on profile sync.
            void syncAuthenticatedUser(req).catch((err: any) => {
                if (AUTH_TRACE_ENABLED) {
                    console.warn('[PlayerService] background user sync failed:', err?.message ?? err);
                }
            });
        });

        this.before('READ', 'ChampionPickerView', async (req) => {
            // ChampionPickerView resolves the current user's pick from Player metadata,
            // so make sure that metadata is synchronized before the CDS view executes.
            await syncAuthenticatedUser(req).catch((err: any) => {
                if (AUTH_TRACE_ENABLED) {
                    console.warn('[PlayerService] champion picker user sync failed:', err?.message ?? err);
                }
            });
        });

        // Actions
        this.on('submitPredictions', this.predictionHandler.submitPredictions.bind(this.predictionHandler));
        this.on('submitScoreBet', this.predictionHandler.submitScoreBet.bind(this.predictionHandler));
        this.on('submitMatchPrediction', this.predictionHandler.submitMatchPrediction.bind(this.predictionHandler));
        this.on('cancelMatchPrediction', this.predictionHandler.cancelMatchPrediction.bind(this.predictionHandler));
        this.on('submitSlotPrediction', this.predictionHandler.submitSlotPrediction.bind(this.predictionHandler));
        this.on('cancelSlotPrediction', this.predictionHandler.cancelSlotPrediction.bind(this.predictionHandler));
        this.on('pickChampion', this.predictionHandler.pickChampion.bind(this.predictionHandler));
        this.on('getMyProfile', this.profileHandler.getMyProfile.bind(this.profileHandler));
        this.on('updateMyProfile', this.profileHandler.updateMyProfile.bind(this.profileHandler));

        // Functions and read-only queries
        this.on('getLatestResults', this.predictionHandler.getLatestResults.bind(this.predictionHandler));
        this.on('getUpcomingMatches', this.predictionHandler.getUpcomingMatches.bind(this.predictionHandler));
        this.on('getStandings', this.predictionHandler.getStandings.bind(this.predictionHandler));
        this.on('getChampionPickCounts', this.predictionHandler.getChampionPickCounts.bind(this.predictionHandler));
        this.on('READ', 'CompletedMatchesView', this.predictionHandler.readCompletedMatchesView.bind(this.predictionHandler));
        this.on('READ', 'AvailableMatchesView', this.predictionHandler.readAvailableMatchesView.bind(this.predictionHandler));
        this.on('READ', 'PredictionLeaderboard', this.predictionHandler.readPredictionLeaderboard.bind(this.predictionHandler));
        this.on('READ', 'RecentPredictionsView', this.predictionHandler.readRecentPredictionsView.bind(this.predictionHandler));
        this.on('READ', 'TournamentBracketView', this.predictionHandler.readTournamentBracketView.bind(this.predictionHandler));
        this.after('READ', 'PredictionLeaderboard', this.predictionHandler.decoratePredictionLeaderboard.bind(this.predictionHandler));

        // Auto-filter user-scoped entities
        this.before('READ', 'MyPredictions', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MyScoreBets', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MySlotPredictions', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MySlotScoreBets', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.before('READ', 'MyChampionPick', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));

        // Enrich hybrid/runtime-backed views
        this.after('READ', 'CompletedMatchesView', this.predictionHandler.enrichCompletedMatchesView.bind(this.predictionHandler));
        this.after('READ', 'AvailableMatchesView', this.predictionHandler.enrichAvailableMatchesView.bind(this.predictionHandler));
        this.before('READ', 'RecentPredictionsView', this.predictionHandler.filterByCurrentUser.bind(this.predictionHandler));
        this.after('READ', 'RecentPredictionsView', this.predictionHandler.enrichRecentPredictionsView.bind(this.predictionHandler));
        this.after('READ', 'TournamentBracketView', this.predictionHandler.enrichTournamentBracketView.bind(this.predictionHandler));

        return super.init();
    }
}

/**
 * AdminService - Admin-only OData service.
 * Handles match result entry, leaderboard recalculation, and config management.
 */
export class AdminService extends cds.ApplicationService {
    private adminHandler!: AdminHandler;

    async init() {
        this.adminHandler = new AdminHandler(this);
        this.before('*', async (req) => {
            const context = resolveUserContext(req);
            const isAdmin = context.roles.includes('PredictionAdmin') || context.roles.includes('admin');
            if (AUTH_TRACE_ENABLED) {
                console.log('[AdminService TRACE]', JSON.stringify({
                    email: context.email,
                    roles: context.roles,
                    isAdmin,
                    identityOrigin: context.identityOrigin,
                }));
            }
            if (!isAdmin) {
                return req.reject(403, 'Admin access is restricted to authorized accounts');
            }
            void syncAuthenticatedUser(req).catch((err: any) => {
                if (AUTH_TRACE_ENABLED) {
                    console.warn('[AdminService] background user sync failed:', err?.message ?? err);
                }
            });
        });

        // Actions
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
        this.on('markScoreBetsPaid', this.adminHandler.markScoreBetsPaid.bind(this.adminHandler));
        this.on('markScoreBetsUnpaid', this.adminHandler.markScoreBetsUnpaid.bind(this.adminHandler));
        this.on('resetAllPayoutStatus', this.adminHandler.resetAllPayoutStatus.bind(this.adminHandler));
        this.on('getPayoutSummary', this.adminHandler.getPayoutSummary.bind(this.adminHandler));

        // Guard: block match creation/update for completed/cancelled tournaments
        this.before(['CREATE', 'UPDATE'], 'Matches', async (req: any) => {
            const { Tournament, Match } = cds.entities('cnma.prediction');
            let tournamentId = req.data?.tournament_ID;

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

        // Preserve bracket linkage metadata when a knockout match is deleted manually.
        this.before('DELETE', 'Matches', async (req: any) => {
            const { Match, BracketSlot } = cds.entities('cnma.prediction');
            const param0 = req.params?.[0];
            const matchId = (param0 as any)?.ID ?? req.data?.ID ?? param0;
            if (!matchId) return;

            const match = await SELECT.one.from(Match).where({ ID: matchId });
            if (!match?.bracketSlot_ID) return;

            const slot = await SELECT.one.from(BracketSlot).where({ ID: match.bracketSlot_ID });
            if (!slot) return;

            const patch: Record<string, any> = {};
            const legNumber = Number(match.leg ?? 0);
            const isLeg1 = slot.leg1_ID === match.ID || legNumber === 1;
            const isLeg2 = slot.leg2_ID === match.ID || legNumber === 2;

            if (isLeg1) {
                patch.leg1_ID = null;
                if (match.externalId != null) patch.leg1ExternalId = Number(match.externalId);
            }
            if (isLeg2) {
                patch.leg2_ID = null;
                if (match.externalId != null) patch.leg2ExternalId = Number(match.externalId);
            }

            if (Object.keys(patch).length > 0) {
                await UPDATE(BracketSlot).where({ ID: slot.ID }).set(patch);
            }
        });

        return super.init();
    }
}

module.exports = { PlayerService, AdminService };
