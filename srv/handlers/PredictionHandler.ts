import cds, { Request } from '@sap/cds';
import { ScoringEngine } from '../lib/ScoringEngine';

/**
 * PredictionHandler — Handles user prediction submissions.
 * Validates business rules before persisting predictions.
 */
export class PredictionHandler {
    private srv: cds.ApplicationService;

    constructor(srv: cds.ApplicationService) {
        this.srv = srv;
    }

    /**
     * Auto-filter user-specific views (MyPredictions, MyScoreBets, MyChampionPick)
     * so each user only sees their own data.
     */
    async filterByCurrentUser(req: Request) {
        const userId = await this.getCurrentPlayerId(req);
        if (userId) {
            // Inject filter: player_ID = current user's player ID
            req.query.where({ player_ID: userId });
        }
    }

    /**
     * Submit match outcome predictions (UC2: Win/Draw/Lose).
     * Validates: match exists, not kicked off, pick is valid.
     */
    async submitPredictions(req: Request) {
        const { predictions } = req.data;
        const { Prediction, Match } = cds.entities('cnma.prediction');

        if (!predictions || predictions.length === 0) {
            return req.error(400, 'No predictions provided');
        }

        const playerId = await this.getOrCreatePlayerId(req);
        const now = new Date();
        let savedCount = 0;

        for (const pred of predictions) {
            // Validate match exists and is still open
            const match = await SELECT.one.from(Match).where({ ID: pred.matchId });
            if (!match) {
                req.error(404, `Match ${pred.matchId} not found`);
                continue;
            }

            if (match.status !== 'upcoming') {
                req.error(400, `Match ${pred.matchId} is no longer open for predictions`);
                continue;
            }

            if (new Date(match.kickoff) <= now) {
                req.error(400, `Match ${pred.matchId} has already kicked off`);
                continue;
            }

            // Validate pick value
            if (!['home', 'draw', 'away'].includes(pred.pick)) {
                req.error(400, `Invalid pick "${pred.pick}". Must be: home, draw, away`);
                continue;
            }

            // Upsert: update if exists, insert if new
            const existing = await SELECT.one.from(Prediction)
                .where({ player_ID: playerId, match_ID: pred.matchId });

            if (existing) {
                if (existing.status === 'locked' || existing.status === 'scored') {
                    req.error(400, `Prediction for match ${pred.matchId} is already locked`);
                    continue;
                }
                await UPDATE(Prediction).where({ ID: existing.ID }).set({
                    pick: pred.pick,
                    submittedAt: now.toISOString()
                });
            } else {
                await INSERT.into(Prediction).entries({
                    player_ID: playerId,
                    match_ID: pred.matchId,
                    pick: pred.pick,
                    status: 'submitted',
                    submittedAt: now.toISOString()
                });
            }
            savedCount++;
        }

        return { success: savedCount > 0, message: `${savedCount} prediction(s) saved`, count: savedCount };
    }

    /**
     * Place an exact score bet (UC1).
     * Validates: match exists, not kicked off, max bets not exceeded.
     */
    async submitScoreBet(req: Request) {
        const { matchId, homeScore, awayScore } = req.data;
        const { ScoreBet, Match, ScorePredictionConfig } = cds.entities('cnma.prediction');

        // Get config
        const config = await SELECT.one.from(ScorePredictionConfig);
        if (config && !config.enabled) {
            return req.error(400, 'Score predictions are currently disabled');
        }

        // Validate match
        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');
        if (match.status !== 'upcoming') return req.error(400, 'Match is no longer open for bets');

        const now = new Date();
        const kickoff = new Date(match.kickoff);
        const lockMinutes = config?.lockBeforeMatch ?? 30;
        const lockTime = new Date(kickoff.getTime() - lockMinutes * 60 * 1000);

        if (now >= lockTime) {
            return req.error(400, 'Betting window has closed for this match');
        }

        // Validate scores (non-negative)
        if (homeScore < 0 || awayScore < 0 || homeScore > 99 || awayScore > 99) {
            return req.error(400, 'Score must be between 0 and 99');
        }

        const playerId = await this.getOrCreatePlayerId(req);

        // Check max bets per match
        const existingBets = await SELECT.from(ScoreBet)
            .where({ player_ID: playerId, match_ID: matchId });

        const maxBets = config?.maxBetsPerMatch ?? 3;
        if (existingBets.length >= maxBets) {
            return req.error(400, `Maximum ${maxBets} bets per match reached`);
        }

        // Check duplicate bet limits
        if (config && !config.allowDuplicateBets) {
            const duplicate = existingBets.find(
                (b: any) => b.predictedHomeScore === homeScore && b.predictedAwayScore === awayScore
            );
            if (duplicate) {
                return req.error(400, 'Duplicate score bets are not allowed');
            }
        } else if (config?.maxDuplicates) {
            const duplicateCount = existingBets.filter(
                (b: any) => b.predictedHomeScore === homeScore && b.predictedAwayScore === awayScore
            ).length;
            if (duplicateCount >= config.maxDuplicates) {
                return req.error(400, `Maximum ${config.maxDuplicates} duplicate bets on same score`);
            }
        }

        // Insert bet
        await INSERT.into(ScoreBet).entries({
            player_ID: playerId,
            match_ID: matchId,
            predictedHomeScore: homeScore,
            predictedAwayScore: awayScore,
            betAmount: config?.basePrice ?? 50000,
            status: 'pending',
            submittedAt: now.toISOString()
        });

        return { success: true, message: `Score bet ${homeScore}-${awayScore} placed successfully` };
    }

    /**
     * Pick tournament champion (UC3).
     * Validates: betting window open, within change deadline.
     */
    async pickChampion(req: Request) {
        const { teamId } = req.data;
        const { ChampionPick, Team, ChampionPredictionConfig } = cds.entities('cnma.prediction');

        // Get config
        const config = await SELECT.one.from(ChampionPredictionConfig);
        if (config && !config.enabled) {
            return req.error(400, 'Champion predictions are currently disabled');
        }
        if (config && config.bettingStatus !== 'open') {
            return req.error(400, `Champion predictions are ${config.bettingStatus}`);
        }

        // Validate team exists
        const team = await SELECT.one.from(Team).where({ ID: teamId });
        if (!team) return req.error(404, 'Team not found');
        if (team.isEliminated) return req.error(400, 'Cannot pick an eliminated team');

        const playerId = await this.getOrCreatePlayerId(req);
        const now = new Date();

        // Check change deadline
        const existing = await SELECT.one.from(ChampionPick)
            .where({ player_ID: playerId });

        if (existing) {
            if (config?.allowChangePrediction === false) {
                return req.error(400, 'Changing champion prediction is not allowed');
            }
            if (config?.changeDeadline && now > new Date(config.changeDeadline)) {
                return req.error(400, 'Change deadline has passed');
            }
            // Update existing pick
            await UPDATE(ChampionPick).where({ ID: existing.ID }).set({
                team_ID: teamId
            });
            return { success: true, message: `Champion pick updated to ${team.name}` };
        }

        // New pick
        await INSERT.into(ChampionPick).entries({
            player_ID: playerId,
            team_ID: teamId,
            submittedAt: now.toISOString()
        });

        return { success: true, message: `${team.name} selected as your champion prediction` };
    }

    // ── Helpers ──────────────────────────────────────────────

    /**
     * Get current user's Player ID from the user context.
     */
    private async getCurrentPlayerId(req: Request): Promise<string | null> {
        const { Player } = cds.entities('cnma.prediction');
        const userEmail = req.user?.id;
        if (!userEmail) return null;

        const player = await SELECT.one.from(Player).where({ email: userEmail });
        return player?.ID ?? null;
    }

    /**
     * Get or auto-create Player record for the current user.
     */
    private async getOrCreatePlayerId(req: Request): Promise<string> {
        const { Player } = cds.entities('cnma.prediction');
        const userEmail = req.user?.id;
        const userName = req.user?.attr?.name || userEmail || 'Unknown';

        if (!userEmail) {
            req.error(401, 'User not authenticated');
            throw new Error('User not authenticated');
        }

        let player = await SELECT.one.from(Player).where({ email: userEmail });
        if (!player) {
            const result = await INSERT.into(Player).entries({
                email: userEmail,
                displayName: userName
            });
            player = await SELECT.one.from(Player).where({ email: userEmail });
        }

        return player.ID;
    }
}
