import cds, { Request } from '@sap/cds';
import { ScoringEngine } from '../lib/ScoringEngine';

/**
 * AdminHandler — Handles admin operations.
 * Match result entry, scoring, leaderboard recalculation.
 */
export class AdminHandler {
    private srv: cds.ApplicationService;
    private scoringEngine: ScoringEngine;

    constructor(srv: cds.ApplicationService) {
        this.srv = srv;
        this.scoringEngine = new ScoringEngine();
    }

    /**
     * Enter match result and trigger scoring for all predictions/bets.
     * 1. Update match with result
     * 2. Determine outcome (home/draw/away)
     * 3. Score all UC2 predictions
     * 4. Score all UC1 score bets
     * 5. Update player stats
     */
    async enterMatchResult(req: Request) {
        const { matchId, homeScore, awayScore } = req.data;
        const {
            Match,
            Prediction,
            ScoreBet,
            Player,
            MatchOutcomeConfig,
            ScorePredictionConfig
        } = cds.entities('cnma.prediction');

        // Validate match
        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');

        if (match.status === 'finished') {
            return req.error(400, 'Match result has already been entered. Edit the match to correct it.');
        }

        // Determine outcome
        const outcome = ScoringEngine.determineOutcome(homeScore, awayScore);

        // Update match with result
        await UPDATE(Match).where({ ID: matchId }).set({
            homeScore,
            awayScore,
            outcome,
            status: 'finished'
        });

        // ── Score UC2 Predictions ────────────────────────────
        const moConfig = await SELECT.one.from(MatchOutcomeConfig);
        const predictions = await SELECT.from(Prediction)
            .where({ match_ID: matchId, status: { '!=': 'scored' } });

        let predictionsScored = 0;
        for (const pred of predictions) {
            const points = this.scoringEngine.scorePrediction(
                pred.pick,
                outcome,
                match.weight ?? 1,
                moConfig
            );

            await UPDATE(Prediction).where({ ID: pred.ID }).set({
                isCorrect: pred.pick === outcome,
                pointsEarned: points,
                status: 'scored',
                scoredAt: new Date().toISOString()
            });

            // Update player stats
            await this.updatePlayerStats(pred.player_ID, points, pred.pick === outcome);
            predictionsScored++;
        }

        // ── Score UC1 Score Bets ─────────────────────────────
        const spConfig = await SELECT.one.from(ScorePredictionConfig);
        const bets = await SELECT.from(ScoreBet)
            .where({ match_ID: matchId, status: 'pending' });

        let scoreBetsScored = 0;
        for (const bet of bets) {
            const isCorrect = bet.predictedHomeScore === homeScore
                && bet.predictedAwayScore === awayScore;

            let payout = 0;
            if (isCorrect) {
                payout = this.scoringEngine.calculateScoreBetPayout(bet, bets, spConfig);
            }

            await UPDATE(ScoreBet).where({ ID: bet.ID }).set({
                isCorrect,
                payout,
                status: isCorrect ? 'won' : 'lost'
            });
            scoreBetsScored++;
        }

        // ── Lock all remaining draft/submitted predictions ───
        await UPDATE(Prediction)
            .where({ match_ID: matchId, status: { in: ['draft', 'submitted'] } })
            .set({ status: 'locked', lockedAt: new Date().toISOString() });

        return {
            success: true,
            message: `Match result ${homeScore}-${awayScore} entered. ${predictionsScored} predictions, ${scoreBetsScored} score bets scored.`,
            predictionsScored,
            scoreBetsScored
        };
    }

    /**
     * Force recalculate leaderboard rankings.
     * Aggregates all scored predictions per player and updates rank.
     */
    async recalculateLeaderboard(req: Request) {
        const { Player, Prediction } = cds.entities('cnma.prediction');

        // Get all players
        const players = await SELECT.from(Player);

        // Calculate totals for each player
        for (const player of players) {
            const preds = await SELECT.from(Prediction)
                .where({ player_ID: player.ID, status: 'scored' });

            const totalPoints = preds.reduce((sum: number, p: any) => sum + (Number(p.pointsEarned) || 0), 0);
            const totalCorrect = preds.filter((p: any) => p.isCorrect).length;
            const totalPredictions = preds.length;

            // Calculate streaks
            const { currentStreak, bestStreak } = this.scoringEngine.calculateStreaks(preds);

            await UPDATE(Player).where({ ID: player.ID }).set({
                totalPoints,
                totalCorrect,
                totalPredictions,
                currentStreak,
                bestStreak
            });
        }

        // Assign ranks based on total points (descending)
        const rankedPlayers = await SELECT.from(Player).orderBy('totalPoints desc');
        for (let i = 0; i < rankedPlayers.length; i++) {
            await UPDATE(Player).where({ ID: rankedPlayers[i].ID }).set({
                rank: i + 1
            });
        }

        return {
            success: true,
            message: `Leaderboard recalculated for ${players.length} players`
        };
    }

    /**
     * Lock champion predictions (UC3 → status "locked").
     */
    async lockChampionPredictions(req: Request) {
        const { ChampionPredictionConfig } = cds.entities('cnma.prediction');

        const config = await SELECT.one.from(ChampionPredictionConfig);
        if (!config) return req.error(404, 'Champion prediction config not found');

        if (config.bettingStatus === 'locked') {
            return req.error(400, 'Champion predictions are already locked');
        }

        await UPDATE(ChampionPredictionConfig).where({ ID: config.ID }).set({
            bettingStatus: 'locked'
        });

        return {
            success: true,
            message: 'Champion predictions are now locked. No new predictions will be accepted.'
        };
    }

    // ── Helpers ──────────────────────────────────────────────

    /**
     * Update a single player's aggregated stats after scoring.
     */
    private async updatePlayerStats(playerId: string, points: number, isCorrect: boolean) {
        const { Player } = cds.entities('cnma.prediction');

        const player = await SELECT.one.from(Player).where({ ID: playerId });
        if (!player) return;

        const newTotal = (Number(player.totalPoints) || 0) + points;
        const newCorrect = (player.totalCorrect || 0) + (isCorrect ? 1 : 0);
        const newPredictions = (player.totalPredictions || 0) + 1;
        const newStreak = isCorrect ? (player.currentStreak || 0) + 1 : 0;
        const newBest = Math.max(player.bestStreak || 0, newStreak);

        await UPDATE(Player).where({ ID: playerId }).set({
            totalPoints: newTotal,
            totalCorrect: newCorrect,
            totalPredictions: newPredictions,
            currentStreak: newStreak,
            bestStreak: newBest
        });
    }
}
