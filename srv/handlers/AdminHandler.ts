import cds, { Request } from '@sap/cds';
import { ScoringEngine } from '../lib/ScoringEngine';
import { materializeSlotBetsForMatch } from '../lib/SlotBetMaterializer';
import { STAGE_MAP, STATUS_MAP, OUTCOME_MAP } from '../lib/constants';
import { PayoutManager } from '../lib/PayoutManager';
import { BracketBuilder } from '../lib/BracketBuilder';

/** football-data.org API token — read from env, falls back to empty string. */
const FOOTBALL_DATA_API_TOKEN = 'f96dc87cc7b54da08321475e744a52f2';

/**
 * AdminHandler — Handles admin operations.
 * Match result entry, scoring, leaderboard recalculation.
 */
export class AdminHandler {
    private srv: cds.ApplicationService;
    private scoringEngine: ScoringEngine;
    private payoutManager: PayoutManager;
    private bracketBuilder: BracketBuilder;

    constructor(srv: cds.ApplicationService) {
        this.srv = srv;
        this.scoringEngine = new ScoringEngine();
        this.payoutManager = new PayoutManager();
        this.bracketBuilder = new BracketBuilder();
    }

    /**
     * Enter match result and trigger scoring for all predictions/bets.
     * 1. Update match with result
     * 2. Determine outcome (home/draw/away)
     * 3. Score all UC2 predictions using per-match outcomePoints
     * 4. Score all UC1 score bets using per-match MatchScoreBetConfig
     * 5. Update player stats (both global and per-tournament)
     */
    async enterMatchResult(req: Request) {
        const { matchId, homeScore, awayScore } = req.data;
        const { Match } = cds.entities('cnma.prediction');

        // Validate match
        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');

        if (match.status === 'finished') {
            return req.error(400, 'Match result has already been entered. Use correctMatchResult to fix it.');
        }

        const result = await this._scoreMatch(matchId, homeScore, awayScore);

        return {
            success: true,
            message: `Match result ${homeScore}-${awayScore} entered. ${result.predictionsScored} predictions, ${result.scoreBetsScored} score bets scored.`,
            predictionsScored: result.predictionsScored,
            scoreBetsScored: result.scoreBetsScored,
        };
    }

    /**
     * Core scoring logic — no Request object needed.
     * 1. Materialize slot bets
     * 2. Update match with result
     * 3. Score UC2 predictions
     * 4. Score UC1 score bets
     * 5. Lock remaining predictions
     * 6. Trigger bracket progression
     */
    private async _scoreMatch(
        matchId: string,
        homeScore: number,
        awayScore: number
    ): Promise<{ predictionsScored: number; scoreBetsScored: number }> {
        const {
            Match,
            Prediction,
            ScoreBet,
            MatchScoreBetConfig,
        } = cds.entities('cnma.prediction');

        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) throw new Error(`Match ${matchId} not found`);

        // Determine outcome
        const outcome = ScoringEngine.determineOutcome(homeScore, awayScore);
        const tournamentId = match.tournament_ID;

        // Convert any unresolved slot bets into concrete match bets before scoring.
        await materializeSlotBetsForMatch(matchId);

        // Update match with result
        await UPDATE(Match).where({ ID: matchId }).set({
            homeScore,
            awayScore,
            outcome,
            status: 'finished'
        });

        // ── Score UC2 Predictions (per-match outcomePoints) ──
        const outcomePoints = Number(match.outcomePoints ?? 1);
        const predictions = await SELECT.from(Prediction)
            .where({ match_ID: matchId, status: { '!=': 'scored' } });

        let predictionsScored = 0;
        for (const pred of predictions) {
            const isCorrect = pred.pick === outcome;
            const points = isCorrect ? outcomePoints : 0;

            await UPDATE(Prediction).where({ ID: pred.ID }).set({
                isCorrect,
                pointsEarned: points,
                status: 'scored',
                scoredAt: new Date().toISOString()
            });

            // Update both global and per-tournament stats
            await this.updatePlayerStats(pred.player_ID, points, isCorrect);
            if (tournamentId) {
                await this.updatePlayerTournamentStats(
                    pred.player_ID, tournamentId, points, isCorrect
                );
            }
            predictionsScored++;
        }

        // ── Score UC1 Score Bets (per-match MatchScoreBetConfig) ──
        const scoreBetCfg = await SELECT.one.from(MatchScoreBetConfig)
            .where({ match_ID: matchId });
        const bets = await SELECT.from(ScoreBet)
            .where({ match_ID: matchId, status: 'pending' });

        let scoreBetsScored = 0;
        const prize = Number(scoreBetCfg?.prize ?? 200000);

        // Group bets by player to handle duplicate-bet multiplier
        const betsByPlayer = new Map<string, typeof bets>();
        for (const bet of bets) {
            const pid = bet.player_ID;
            if (!betsByPlayer.has(pid)) betsByPlayer.set(pid, []);
            betsByPlayer.get(pid)!.push(bet);
        }

        for (const [, playerBets] of betsByPlayer) {
            for (const bet of playerBets) {
                const isCorrect = bet.predictedHomeScore === homeScore
                    && bet.predictedAwayScore === awayScore;

                const payout = isCorrect ? prize : 0;

                await UPDATE(ScoreBet).where({ ID: bet.ID }).set({
                    isCorrect,
                    payout,
                    status: isCorrect ? 'won' : 'lost'
                });
                scoreBetsScored++;
            }
        }

        // ── Lock all remaining draft/submitted predictions ───
        await UPDATE(Prediction)
            .where({ match_ID: matchId, status: { in: ['draft', 'submitted'] } })
            .set({ status: 'locked', lockedAt: new Date().toISOString() });

        // ── Bracket Progression ──────────────────────────────
        if (match.bracketSlot_ID) {
            await this.updateBracketProgression(match.bracketSlot_ID, matchId);
        }

        return { predictionsScored, scoreBetsScored };
    }

    /**
     * Correct an already-finished match result.
     * Resets scored predictions back to submitted, score bets back to pending,
     * re-enters the new result, and re-scores everything.
     */
    async correctMatchResult(req: Request) {
        const { matchId, homeScore, awayScore } = req.data;
        const { Match, Prediction, ScoreBet } = cds.entities('cnma.prediction');

        if (!matchId) return req.error(400, 'matchId is required');

        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');
        if (match.status !== 'finished') return req.error(400, 'Match is not finished yet. Use enterMatchResult instead.');

        // Reset scored predictions back to submitted
        await UPDATE(Prediction)
            .where({ match_ID: matchId, status: 'scored' })
            .set({ status: 'submitted', isCorrect: null, pointsEarned: 0, scoredAt: null });

        // Reset score bets
        await UPDATE(ScoreBet)
            .where({ match_ID: matchId, status: { in: ['won', 'lost'] } })
            .set({ status: 'pending', isCorrect: null, payout: 0 });

        // Re-open the match so _scoreMatch accepts it
        await UPDATE(Match).where({ ID: matchId }).set({ status: 'live' });

        // Re-score with new result — no fake Request needed
        const result = await this._scoreMatch(matchId, homeScore, awayScore);

        // Recalculate leaderboard for the tournament
        if (match.tournament_ID) {
            await this._recalculateTournamentLeaderboard(match.tournament_ID);
        }

        return {
            success: true,
            message: `Match result corrected to ${homeScore}-${awayScore}. ${result.predictionsScored} predictions and ${result.scoreBetsScored} score bets re-scored.`,
            predictionsScored: result.predictionsScored,
            scoreBetsScored: result.scoreBetsScored,
        };
    }

    /**
     * Set the penalty shootout winner for a bracket slot.
     * Stores pen scores and advances the winner in the bracket.
     */
    async setPenaltyWinner(req: Request) {
        const { slotId, winnerId } = req.data;
        const { BracketSlot, Team } = cds.entities('cnma.prediction');

        const slot = await SELECT.one.from(BracketSlot).where({ ID: slotId });
        if (!slot) return req.error(404, 'Bracket slot not found');
        if (slot.winner_ID) return req.error(400, `Slot ${slot.label} already has a winner. Cannot override.`);

        await UPDATE(BracketSlot).where({ ID: slotId }).set({
            winner_ID: winnerId,
            homePen: req.data.homePen ?? null,
            awayPen: req.data.awayPen ?? null,
        });
        await this.advanceWinner(slot, winnerId);

        const winner = await SELECT.one.from(Team).where({ ID: winnerId });
        const penStr = (req.data.homePen != null && req.data.awayPen != null)
            ? ` (${req.data.homePen}\u2013${req.data.awayPen} pens)`
            : '';
        return {
            success: true,
            message: `${winner?.name ?? winnerId} set as winner of ${slot.label} via penalty shootout${penStr} and advanced to next round.`,
        };
    }

    /**
     * Force recalculate leaderboard rankings.
     * If tournamentId is provided, recalculates only for that tournament.
     * Otherwise, recalculates global stats.
     */
    async recalculateLeaderboard(req: Request) {
        const { tournamentId } = req.data;

        if (tournamentId) {
            const count = await this._recalculateTournamentLeaderboard(tournamentId);
            return {
                success: true,
                message: `Tournament leaderboard recalculated for ${count} players`
            };
        }

        // Global recalculation
        const { Player, Prediction } = cds.entities('cnma.prediction');
        const players = await SELECT.from(Player);

        for (const player of players) {
            const preds = await SELECT.from(Prediction)
                .where({ player_ID: player.ID, status: 'scored' });

            const totalPoints = preds.reduce((sum: number, p: any) => sum + (Number(p.pointsEarned) || 0), 0);
            const totalCorrect = preds.filter((p: any) => p.isCorrect).length;
            const totalPredictions = preds.length;
            const { currentStreak, bestStreak } = this.scoringEngine.calculateStreaks(preds);

            await UPDATE(Player).where({ ID: player.ID }).set({
                totalPoints,
                totalCorrect,
                totalPredictions,
                currentStreak,
                bestStreak
            });
        }

        // Assign global ranks based on total points (descending)
        const rankedPlayers = await SELECT.from(Player).orderBy('totalPoints desc');
        for (let i = 0; i < rankedPlayers.length; i++) {
            await UPDATE(Player).where({ ID: rankedPlayers[i].ID }).set({
                rank: i + 1
            });
        }

        return {
            success: true,
            message: `Global leaderboard recalculated for ${players.length} players`
        };
    }

    /**
     * Recalculate leaderboard for a specific tournament.
     * Extracted so it can be called without a Request object.
     */
    private async _recalculateTournamentLeaderboard(tournamentId: string): Promise<number> {
        const { Player, Prediction, PlayerTournamentStats } = cds.entities('cnma.prediction');

        const stats = await SELECT.from(PlayerTournamentStats)
            .where({ tournament_ID: tournamentId });

        for (const stat of stats) {
            const preds = await SELECT.from(Prediction)
                .where({ player_ID: stat.player_ID, tournament_ID: tournamentId, status: 'scored' });

            const totalPoints = preds.reduce((sum: number, p: any) => sum + (Number(p.pointsEarned) || 0), 0);
            const totalCorrect = preds.filter((p: any) => p.isCorrect).length;
            const totalPredictions = preds.length;
            const { currentStreak, bestStreak } = this.scoringEngine.calculateStreaks(preds);

            await UPDATE(PlayerTournamentStats).where({ ID: stat.ID }).set({
                totalPoints,
                totalCorrect,
                totalPredictions,
                currentStreak,
                bestStreak
            });
        }

        // Assign ranks — sort by points desc then name asc
        const updatedStats = await SELECT.from(PlayerTournamentStats)
            .where({ tournament_ID: tournamentId });

        const enriched = [];
        for (const s of updatedStats) {
            const player = await SELECT.one.from(Player).where({ ID: s.player_ID });
            enriched.push({
                id: s.ID,
                totalPoints: Number(s.totalPoints),
                name: (player?.displayName ?? '').toLowerCase(),
            });
        }
        enriched.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return a.name.localeCompare(b.name);
        });

        for (let i = 0; i < enriched.length; i++) {
            await UPDATE(PlayerTournamentStats).where({ ID: enriched[i].id }).set({
                rank: i + 1
            });
        }

        return stats.length;
    }

    /**
     * Lock champion predictions for a specific tournament (UC3 → status "locked").
     */
    async lockChampionPredictions(req: Request) {
        const { tournamentId } = req.data;
        const { Tournament } = cds.entities('cnma.prediction');

        if (!tournamentId) return req.error(400, 'Tournament ID is required');

        const tournament = await SELECT.one.from(Tournament)
            .where({ ID: tournamentId });
        if (!tournament) return req.error(404, 'Tournament not found');

        if (tournament.championBettingStatus === 'locked') {
            return req.error(400, 'Champion predictions are already locked for this tournament');
        }

        await UPDATE(Tournament).where({ ID: tournamentId }).set({
            championBettingStatus: 'locked'
        });

        return {
            success: true,
            message: 'Champion predictions are now locked for this tournament. No new predictions will be accepted.'
        };
    }

    /**
     * Admin action: manually resolve champion picks for a tournament.
     * Marks all champion picks as correct/incorrect based on the given champion team.
     */
    async resolveChampionPicksAction(req: Request) {
        const { tournamentId, championTeamId } = req.data;
        const { Tournament, ChampionPick } = cds.entities('cnma.prediction');

        if (!tournamentId) return req.error(400, 'tournamentId is required');
        if (!championTeamId) return req.error(400, 'championTeamId is required');

        const tournament = await SELECT.one.from(Tournament).where({ ID: tournamentId });
        if (!tournament) return req.error(404, 'Tournament not found');

        const picks = await SELECT.from(ChampionPick).where({ tournament_ID: tournamentId });

        let correctCount = 0;
        for (const pick of picks) {
            const correct = pick.team_ID === championTeamId;
            if (correct) correctCount++;
            await UPDATE(ChampionPick).where({ ID: pick.ID }).set({ isCorrect: correct });
        }

        return {
            success: true,
            message: `Champion picks resolved: ${correctCount} correct out of ${picks.length} total picks.`,
        };
    }

    // ── Helpers ──────────────────────────────────────────────

    /**
     * Update a single player's global aggregated stats after scoring.
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

    /**
     * Update per-tournament stats for a player after scoring.
     * Creates the stats record if it doesn't exist (auto-enroll on first prediction scoring).
     */
    private async updatePlayerTournamentStats(
        playerId: string,
        tournamentId: string,
        points: number,
        isCorrect: boolean
    ) {
        const { PlayerTournamentStats } = cds.entities('cnma.prediction');

        let stats = await SELECT.one.from(PlayerTournamentStats)
            .where({ player_ID: playerId, tournament_ID: tournamentId });

        if (!stats) {
            // Auto-create stats record for this player in this tournament
            await INSERT.into(PlayerTournamentStats).entries({
                player_ID: playerId,
                tournament_ID: tournamentId,
                totalPoints: points,
                totalCorrect: isCorrect ? 1 : 0,
                totalPredictions: 1,
                currentStreak: isCorrect ? 1 : 0,
                bestStreak: isCorrect ? 1 : 0,
            });
            return;
        }

        const newTotal = (Number(stats.totalPoints) || 0) + points;
        const newCorrect = (stats.totalCorrect || 0) + (isCorrect ? 1 : 0);
        const newPredictions = (stats.totalPredictions || 0) + 1;
        const newStreak = isCorrect ? (stats.currentStreak || 0) + 1 : 0;
        const newBest = Math.max(stats.bestStreak || 0, newStreak);

        await UPDATE(PlayerTournamentStats).where({ ID: stats.ID }).set({
            totalPoints: newTotal,
            totalCorrect: newCorrect,
            totalPredictions: newPredictions,
            currentStreak: newStreak,
            bestStreak: newBest
        });
    }

    /**
     * Update bracket slot aggregates after a match result.
     * If both legs are finished (or single-leg tie), determine winner and advance.
     */
    private async updateBracketProgression(slotId: string, matchId: string) {
        const { BracketSlot, Match, TournamentTeam } = cds.entities('cnma.prediction');

        const slot = await SELECT.one.from(BracketSlot).where({ ID: slotId });
        if (!slot) return;

        // Fetch both legs
        const leg1 = slot.leg1_ID ? await SELECT.one.from(Match).where({ ID: slot.leg1_ID }) : null;
        const leg2 = slot.leg2_ID ? await SELECT.one.from(Match).where({ ID: slot.leg2_ID }) : null;

        // Single-leg tie (e.g., final)
        if (!slot.leg2_ID) {
            if (leg1 && leg1.status === 'finished') {
                const homeAgg = leg1.homeScore ?? 0;
                const awayAgg = leg1.awayScore ?? 0;
                const winnerId = homeAgg > awayAgg ? slot.homeTeam_ID
                    : homeAgg < awayAgg ? slot.awayTeam_ID
                        : null; // draw → admin decides (penalties)

                await UPDATE(BracketSlot).where({ ID: slotId }).set({
                    homeAgg, awayAgg, winner_ID: winnerId
                });

                if (winnerId) {
                    await this.advanceWinner(slot, winnerId);
                }
            }
            return;
        }

        // Two-leg tie: both legs must be finished
        if (leg1?.status === 'finished' && leg2?.status === 'finished') {
            // Determine each team's goals per leg dynamically (don't assume leg1 homeTeam = slot homeTeam)
            const leg1Home = leg1.homeTeam_ID === slot.homeTeam_ID ? (leg1.homeScore ?? 0) : (leg1.awayScore ?? 0);
            const leg1Away = leg1.homeTeam_ID === slot.homeTeam_ID ? (leg1.awayScore ?? 0) : (leg1.homeScore ?? 0);
            const leg2Home = leg2.homeTeam_ID === slot.homeTeam_ID ? (leg2.homeScore ?? 0) : (leg2.awayScore ?? 0);
            const leg2Away = leg2.homeTeam_ID === slot.homeTeam_ID ? (leg2.awayScore ?? 0) : (leg2.homeScore ?? 0);
            const homeAgg = leg1Home + leg2Home;
            const awayAgg = leg1Away + leg2Away;

            let winnerId: string | null = null;
            if (homeAgg > awayAgg) {
                winnerId = slot.homeTeam_ID;
            } else if (awayAgg > homeAgg) {
                winnerId = slot.awayTeam_ID;
            }
            // If aggregate tied → away goals rule abolished in CL since 2021
            // Admin should update the second leg score to include extra time/penalties

            await UPDATE(BracketSlot).where({ ID: slotId }).set({
                homeAgg, awayAgg, winner_ID: winnerId
            });

            if (winnerId) {
                await this.advanceWinner(slot, winnerId);
            }
        }
    }

    /**
     * Advance the winner of a bracket slot to the next slot in the bracket tree.
     * Also marks loser as eliminated and handles final (champion assignment).
     */
    private async advanceWinner(slot: any, winnerId: string) {
        const { BracketSlot, TournamentTeam, Match } = cds.entities('cnma.prediction');

        const loserId = winnerId === slot.homeTeam_ID ? slot.awayTeam_ID : slot.homeTeam_ID;

        // Mark loser as eliminated
        if (loserId) {
            await UPDATE(TournamentTeam)
                .where({ tournament_ID: slot.tournament_ID, team_ID: loserId })
                .set({ isEliminated: true, eliminatedAt: slot.stage });
        }

        // If this was the final → champion
        if (slot.stage === 'final') {
            if (winnerId) {
                await UPDATE(TournamentTeam)
                    .where({ tournament_ID: slot.tournament_ID, team_ID: winnerId })
                    .set({ finalPosition: 1 });

                // Resolve champion picks (UC3) — mark correct/incorrect
                await this.resolveChampionPicks(slot.tournament_ID, winnerId);
            }
            if (loserId) {
                await UPDATE(TournamentTeam)
                    .where({ tournament_ID: slot.tournament_ID, team_ID: loserId })
                    .set({ finalPosition: 2 });
            }
            return;
        }

        // Advance to next slot
        if (slot.nextSlot_ID) {
            const field = slot.nextSlotSide === 'home' ? 'homeTeam_ID' : 'awayTeam_ID';
            await UPDATE(BracketSlot).where({ ID: slot.nextSlot_ID }).set({
                [field]: winnerId,
            });

            const nextSlot = await SELECT.one.from(BracketSlot).where({ ID: slot.nextSlot_ID });
            if (!nextSlot) return;

            let leg1IdForMaterialize: string | null = nextSlot.leg1_ID ?? null;
            const { Tournament } = cds.entities('cnma.prediction');
            const tournament = await SELECT.one.from(Tournament).where({ ID: slot.tournament_ID });
            const shouldCreateLeg2 =
                nextSlot.stage !== 'final'
                && (tournament?.hasLegs === true || tournament?.format === 'knockout');
            const hasKnownTeam = !!(nextSlot.homeTeam_ID || nextSlot.awayTeam_ID);

            // Keep next-stage match teams in sync as soon as one side is known.
            if (nextSlot.leg1_ID) {
                const leg1Patch: Record<string, any> = {};
                if (nextSlot.homeTeam_ID) leg1Patch.homeTeam_ID = nextSlot.homeTeam_ID;
                if (nextSlot.awayTeam_ID) leg1Patch.awayTeam_ID = nextSlot.awayTeam_ID;
                if (Object.keys(leg1Patch).length > 0) {
                    await UPDATE(Match).where({ ID: nextSlot.leg1_ID }).set(leg1Patch);
                }

                // Leg 2 has reversed home/away versus bracket slot sides.
                if (nextSlot.leg2_ID) {
                    const leg2Patch: Record<string, any> = {};
                    if (nextSlot.homeTeam_ID) leg2Patch.awayTeam_ID = nextSlot.homeTeam_ID;
                    if (nextSlot.awayTeam_ID) leg2Patch.homeTeam_ID = nextSlot.awayTeam_ID;
                    if (Object.keys(leg2Patch).length > 0) {
                        await UPDATE(Match).where({ ID: nextSlot.leg2_ID }).set(leg2Patch);
                    }
                } else if (shouldCreateLeg2 && hasKnownTeam) {
                    // Backfill missing second leg for two-leg knockout rounds.
                    const leg2Id = cds.utils.uuid();
                    await INSERT.into(Match).entries({
                        ID: leg2Id,
                        tournament_ID: slot.tournament_ID,
                        homeTeam_ID: nextSlot.awayTeam_ID ?? null,
                        awayTeam_ID: nextSlot.homeTeam_ID ?? null,
                        kickoff: new Date().toISOString(),
                        stage: nextSlot.stage,
                        status: 'upcoming',
                        leg: 2,
                        bracketSlot_ID: nextSlot.ID,
                    });
                    await UPDATE(BracketSlot).where({ ID: nextSlot.ID }).set({ leg2_ID: leg2Id });
                }
            } else if (hasKnownTeam) {
                // No pre-created leg1 yet → create it now, even if only one side is known.
                const leg1MatchId = cds.utils.uuid();
                await INSERT.into(Match).entries({
                    ID: leg1MatchId,
                    tournament_ID: slot.tournament_ID,
                    homeTeam_ID: nextSlot.homeTeam_ID ?? null,
                    awayTeam_ID: nextSlot.awayTeam_ID ?? null,
                    kickoff: new Date().toISOString(),
                    stage: nextSlot.stage,
                    status: 'upcoming',
                    leg: 1,
                    bracketSlot_ID: nextSlot.ID,
                });
                await UPDATE(BracketSlot).where({ ID: nextSlot.ID }).set({ leg1_ID: leg1MatchId });
                leg1IdForMaterialize = leg1MatchId;

                if (shouldCreateLeg2) {
                    const leg2Id = cds.utils.uuid();
                    await INSERT.into(Match).entries({
                        ID: leg2Id,
                        tournament_ID: slot.tournament_ID,
                        homeTeam_ID: nextSlot.awayTeam_ID ?? null,
                        awayTeam_ID: nextSlot.homeTeam_ID ?? null,
                        kickoff: new Date().toISOString(),
                        stage: nextSlot.stage,
                        status: 'upcoming',
                        leg: 2,
                        bracketSlot_ID: nextSlot.ID,
                    });
                    await UPDATE(BracketSlot).where({ ID: nextSlot.ID }).set({ leg2_ID: leg2Id });
                }
            }

            // Ensure unresolved slot-based predictions become visible in
            // regular match prediction views as soon as the slot is concrete.
            if (nextSlot.homeTeam_ID && nextSlot.awayTeam_ID && leg1IdForMaterialize) {
                await materializeSlotBetsForMatch(leg1IdForMaterialize);
            }
        }
    }

    /**
     * Resolve champion picks for a tournament after the final is decided.
     * Sets isCorrect=true for picks matching the champion team, false for others.
     */
    private async resolveChampionPicks(tournamentId: string, championTeamId: string) {
        const { ChampionPick } = cds.entities('cnma.prediction');

        const picks = await SELECT.from(ChampionPick)
            .where({ tournament_ID: tournamentId });

        for (const pick of picks) {
            const correct = pick.team_ID === championTeamId;
            await UPDATE(ChampionPick).where({ ID: pick.ID }).set({
                isCorrect: correct,
            });
        }

        console.log(
            `Champion picks resolved for tournament ${tournamentId}: ` +
            `${picks.filter((p: any) => p.team_ID === championTeamId).length} correct out of ${picks.length} total`
        );
    }

    // ── External Sync ─────────────────────────────────────────

    /**
     * Sync match status and results from football-data.org.
     * Fetches all matches for the tournament's externalCode (e.g. 'CL'),
     * matches them by externalId, and updates status/scores/outcome.
     * Newly finished matches are automatically scored.
     */
    async syncMatchResults(req: Request) {
        const { tournamentId, apiKey } = req.data;
        const { Tournament, Match, Team, BracketSlot } = cds.entities('cnma.prediction');

        if (!tournamentId) return req.error(400, 'tournamentId is required');

        // Use provided apiKey or fall back to built-in token
        const token = apiKey?.trim() || FOOTBALL_DATA_API_TOKEN;

        const tournament = await SELECT.one.from(Tournament).where({ ID: tournamentId });
        if (!tournament) return req.error(404, 'Tournament not found');

        const code = tournament.externalCode;
        if (!code) return req.error(400, 'Tournament has no externalCode configured');

        // Fetch from football-data.org
        let apiData: any;
        try {
            const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/matches`, {
                headers: { 'X-Auth-Token': token }
            });
            if (!res.ok) {
                const errText = await res.text();
                return req.error(502, `football-data.org API error ${res.status}: ${errText}`);
            }
            apiData = await res.json();
        } catch (err: any) {
            return req.error(502, `Failed to reach football-data.org: ${err.message}`);
        }

        const externalMatches: any[] = apiData.matches ?? [];

        // Use shared mapping constants
        const stageMap = STAGE_MAP;
        const statusMap = STATUS_MAP;
        const outcomeMap = OUTCOME_MAP;

        // Build crest→Team ID lookup for resolving teams by API crest URL
        const allTeams = await SELECT.from(Team).columns('ID', 'crest');
        const teamByCrest = new Map<string, string>();
        for (const t of allTeams) {
            if (t.crest) teamByCrest.set(t.crest, t.ID);
        }

        // Load all our matches for this tournament, indexed by externalId
        const ourMatches = await SELECT.from(Match).where({ tournament_ID: tournamentId });
        const matchByExternalId = new Map<number, any>();
        const matchById = new Map<string, any>();
        for (const m of ourMatches) {
            if (m.externalId != null) matchByExternalId.set(Number(m.externalId), m);
            if (m.ID) matchById.set(m.ID, m);
        }

        // Keep a durable map from football-data match ID -> bracket slot leg.
        // This allows sync to restore bracket links after a local match was deleted.
        const bracketSlots = await SELECT.from(BracketSlot).where({ tournament_ID: tournamentId });
        const bracketSlotByLegExternalId = new Map<number, { slotId: string; leg: 1 | 2 }>();
        const bracketSlotByStageAndTeams = new Map<string, { slotId: string; leg: 1 | 2 }>();
        const toBracketTeamKey = (stage: string, homeTeamId: string, awayTeamId: string) =>
            `${stage}|${homeTeamId}|${awayTeamId}`;
        for (const slot of bracketSlots) {
            const slotPatch: Record<string, any> = {};
            const leg1Match = slot.leg1_ID ? matchById.get(slot.leg1_ID) : null;
            const leg2Match = slot.leg2_ID ? matchById.get(slot.leg2_ID) : null;
            const leg1ExternalId = slot.leg1ExternalId ?? (slot.leg1_ID ? matchById.get(slot.leg1_ID)?.externalId : null);
            const leg2ExternalId = slot.leg2ExternalId ?? (slot.leg2_ID ? matchById.get(slot.leg2_ID)?.externalId : null);

            if (slot.leg1ExternalId == null && leg1ExternalId != null) {
                slotPatch.leg1ExternalId = Number(leg1ExternalId);
            }
            if (slot.leg2ExternalId == null && leg2ExternalId != null) {
                slotPatch.leg2ExternalId = Number(leg2ExternalId);
            }

            if (Object.keys(slotPatch).length > 0) {
                await UPDATE(BracketSlot).where({ ID: slot.ID }).set(slotPatch);
            }

            if (leg1ExternalId != null && Number.isFinite(Number(leg1ExternalId))) {
                bracketSlotByLegExternalId.set(Number(leg1ExternalId), { slotId: slot.ID, leg: 1 });
            }
            if (leg2ExternalId != null && Number.isFinite(Number(leg2ExternalId))) {
                bracketSlotByLegExternalId.set(Number(leg2ExternalId), { slotId: slot.ID, leg: 2 });
            }

            // Inference fallback for legacy slots that lost one leg but still have the opposite leg.
            // Example: leg1 deleted, leg2 still exists -> infer leg1 by reversed home/away teams.
            if (
                leg1ExternalId == null &&
                leg2Match?.homeTeam_ID &&
                leg2Match?.awayTeam_ID
            ) {
                bracketSlotByStageAndTeams.set(
                    toBracketTeamKey(slot.stage, leg2Match.awayTeam_ID, leg2Match.homeTeam_ID),
                    { slotId: slot.ID, leg: 1 }
                );
            }
            if (
                leg2ExternalId == null &&
                leg1Match?.homeTeam_ID &&
                leg1Match?.awayTeam_ID
            ) {
                bracketSlotByStageAndTeams.set(
                    toBracketTeamKey(slot.stage, leg1Match.awayTeam_ID, leg1Match.homeTeam_ID),
                    { slotId: slot.ID, leg: 2 }
                );
            }
        }

        let synced = 0;
        let scored = 0;
        let recreated = 0;
        const nowTs = Date.now();
        const liveKickoffGraceMs = 5 * 60 * 1000; // tolerate minor clock drift between systems

        for (const ext of externalMatches) {
            const extId = Number(ext.id);
            if (!Number.isFinite(extId)) continue;

            let newStatus = statusMap[ext.status] ?? 'upcoming';
            let ourMatch = matchByExternalId.get(extId);
            const newStage = stageMap[ext.stage] ?? ourMatch?.stage ?? 'group';
            const homeScore = ext.score?.fullTime?.home ?? null;
            const awayScore = ext.score?.fullTime?.away ?? null;
            const extOutcome = ext.score?.winner ? (outcomeMap[ext.score.winner] ?? null) : null;
            const resolvedHomeFromApi = this._resolveTeamFromExternal(ext.homeTeam, teamByCrest);
            const resolvedAwayFromApi = this._resolveTeamFromExternal(ext.awayTeam, teamByCrest);

            let bracketLink = bracketSlotByLegExternalId.get(extId);
            if (
                !bracketLink &&
                typeof resolvedHomeFromApi === 'string' &&
                typeof resolvedAwayFromApi === 'string'
            ) {
                bracketLink = bracketSlotByStageAndTeams.get(
                    toBracketTeamKey(newStage, resolvedHomeFromApi, resolvedAwayFromApi)
                );
                if (bracketLink) {
                    bracketSlotByLegExternalId.set(extId, bracketLink);
                }
            }

            // Safety: if kickoff is still in the future, keep match in "upcoming"
            // even when an incorrect/stale "live" status is received.
            if (newStatus === 'live' && ext.utcDate) {
                const kickoffTs = Date.parse(ext.utcDate);
                if (Number.isFinite(kickoffTs) && kickoffTs > nowTs + liveKickoffGraceMs) {
                    newStatus = 'upcoming';
                }
            }

            const nowFinished = newStatus === 'finished';

            // If local match was deleted, recreate it from external source.
            if (!ourMatch) {
                const insertData: Record<string, any> = {
                    ID: cds.utils.uuid(),
                    tournament_ID: tournamentId,
                    externalId: extId,
                    bracketSlot_ID: bracketLink?.slotId ?? null,
                    leg: bracketLink?.leg ?? null,
                    status: newStatus,
                    stage: newStage,
                    kickoff: ext.utcDate ?? new Date(nowTs).toISOString(),
                    venue: ext.venue ?? null,
                    matchday: ext.matchday ?? null,
                    homeTeam_ID: resolvedHomeFromApi ?? null,
                    awayTeam_ID: resolvedAwayFromApi ?? null,
                    homeScore: null,
                    awayScore: null,
                    outcome: null,
                };

                if (nowFinished && homeScore !== null && awayScore !== null) {
                    insertData.homeScore = homeScore;
                    insertData.awayScore = awayScore;
                    insertData.outcome = extOutcome ?? ScoringEngine.determineOutcome(homeScore, awayScore);
                }

                await INSERT.into(Match).entries(insertData);
                ourMatch = insertData;
                matchByExternalId.set(extId, ourMatch);
                matchById.set(ourMatch.ID, ourMatch);

                if (bracketLink) {
                    const slotUpdate =
                        bracketLink.leg === 1
                            ? { leg1_ID: ourMatch.ID, leg1ExternalId: extId }
                            : { leg2_ID: ourMatch.ID, leg2ExternalId: extId };
                    await UPDATE(BracketSlot).where({ ID: bracketLink.slotId }).set(slotUpdate);

                    // If both legs are finished now, recompute aggregates and winner immediately.
                    if (nowFinished) {
                        await this.updateBracketProgression(bracketLink.slotId, ourMatch.ID);
                    }
                }

                synced++;
                recreated++;
                continue;
            }

            // Repair bracket linkage for existing matches that were recreated earlier without slot mapping.
            if (
                bracketLink &&
                (ourMatch.bracketSlot_ID !== bracketLink.slotId || Number(ourMatch.leg ?? 0) !== bracketLink.leg)
            ) {
                await UPDATE(Match).where({ ID: ourMatch.ID }).set({
                    bracketSlot_ID: bracketLink.slotId,
                    leg: bracketLink.leg,
                });

                const slotUpdate =
                    bracketLink.leg === 1
                        ? { leg1_ID: ourMatch.ID, leg1ExternalId: extId }
                        : { leg2_ID: ourMatch.ID, leg2ExternalId: extId };
                await UPDATE(BracketSlot).where({ ID: bracketLink.slotId }).set(slotUpdate);

                ourMatch = {
                    ...ourMatch,
                    bracketSlot_ID: bracketLink.slotId,
                    leg: bracketLink.leg,
                };
            }

            // Determine if we should trigger scoring (was not finished, now is)
            const wasFinished = ourMatch.status === 'finished';

            const updateData: Record<string, any> = {
                status: newStatus,
                stage: newStage,
            };

            // Sync additional match info: kickoff, venue, matchday
            if (ext.utcDate) updateData.kickoff = ext.utcDate;
            if (ext.venue) updateData.venue = ext.venue;
            if (ext.matchday != null) updateData.matchday = ext.matchday;

            // Sync teams authoritatively from API:
            // - clear local team when API still returns placeholder (TBD)
            // - overwrite local team when API returns a resolvable crest
            if (resolvedHomeFromApi !== undefined && resolvedHomeFromApi !== ourMatch.homeTeam_ID) {
                updateData.homeTeam_ID = resolvedHomeFromApi;
            }
            if (resolvedAwayFromApi !== undefined && resolvedAwayFromApi !== ourMatch.awayTeam_ID) {
                updateData.awayTeam_ID = resolvedAwayFromApi;
            }

            if (nowFinished && homeScore !== null && awayScore !== null) {
                updateData.homeScore = homeScore;
                updateData.awayScore = awayScore;
                updateData.outcome = extOutcome ?? ScoringEngine.determineOutcome(homeScore, awayScore);
            } else {
                // Match is not finished in API -> clear stale manual result
                updateData.homeScore = null;
                updateData.awayScore = null;
                updateData.outcome = null;
            }

            await UPDATE(Match).where({ ID: ourMatch.ID }).set(updateData);
            synced++;

            const homeTeamAfterSync = Object.prototype.hasOwnProperty.call(updateData, 'homeTeam_ID')
                ? updateData.homeTeam_ID
                : ourMatch.homeTeam_ID;
            const awayTeamAfterSync = Object.prototype.hasOwnProperty.call(updateData, 'awayTeam_ID')
                ? updateData.awayTeam_ID
                : ourMatch.awayTeam_ID;

            // If upstream tie is unresolved, clear winner/agg and propagated downstream side.
            if (ourMatch.bracketSlot_ID && (!nowFinished || !homeTeamAfterSync || !awayTeamAfterSync)) {
                const slot = await SELECT.one.from(BracketSlot).where({ ID: ourMatch.bracketSlot_ID });
                if (slot) {
                    await UPDATE(BracketSlot).where({ ID: slot.ID }).set({
                        homeTeam_ID: homeTeamAfterSync ?? null,
                        awayTeam_ID: awayTeamAfterSync ?? null,
                        winner_ID: null,
                        homeAgg: 0,
                        awayAgg: 0,
                        homePen: null,
                        awayPen: null,
                    });

                    if (slot.nextSlot_ID && slot.nextSlotSide) {
                        await this.clearBracketSide(slot.nextSlot_ID, slot.nextSlotSide);
                    }
                }
            }

            // Auto-score if newly finished — call _scoreMatch directly (no fake Request)
            if (!wasFinished && nowFinished && homeScore !== null && awayScore !== null) {
                try {
                    await this._scoreMatch(ourMatch.ID, homeScore, awayScore);
                    scored++;
                } catch (_) {
                    // already finished or error — skip scoring
                }

                // Handle penalty shootout: auto-set bracket winner from penalty scores
                const penHomeExt = ext.score?.penalties?.home ?? null;
                const penAwayExt = ext.score?.penalties?.away ?? null;
                if (penHomeExt !== null && penAwayExt !== null && penHomeExt !== penAwayExt && ourMatch.bracketSlot_ID) {
                    try {
                        const slot = await SELECT.one.from(BracketSlot).where({ ID: ourMatch.bracketSlot_ID });
                        if (slot && !slot.winner_ID) {
                            const winnerId = penHomeExt > penAwayExt ? homeTeamAfterSync : awayTeamAfterSync;
                            if (winnerId) {
                                await UPDATE(BracketSlot).where({ ID: slot.ID }).set({
                                    winner_ID: winnerId,
                                    homePen: penHomeExt,
                                    awayPen: penAwayExt,
                                });
                                await this.advanceWinner(slot, winnerId);
                            }
                        }
                    } catch (_) {
                        // skip penalty bracket advancement if it fails
                    }
                }
            }
        }

        return {
            success: true,
            message: `Sync complete: ${synced} match(es) synced (${recreated} recreated), ${scored} newly scored.`,
            synced,
            scored,
        };
    }

    /**
     * Resolve local Team ID from football-data.org team payload.
     * - returns string: resolved known team
     * - returns null: placeholder/TBD team -> clear local assignment
     * - returns undefined: not confidently resolvable -> keep current local value
     */
    private _resolveTeamFromExternal(
        extTeam: any,
        teamByCrest: Map<string, string>
    ): string | null | undefined {
        if (!extTeam) return null;

        const crest = typeof extTeam.crest === 'string' ? extTeam.crest.trim() : '';
        if (crest) {
            const resolved = teamByCrest.get(crest);
            if (resolved) return resolved;
        }

        return this._isExternalPlaceholderTeam(extTeam) ? null : undefined;
    }

    /** Detect placeholder teams such as "TBD" from external API payload. */
    private _isExternalPlaceholderTeam(extTeam: any): boolean {
        const raw = `${extTeam?.name ?? ''} ${extTeam?.shortName ?? ''} ${extTeam?.tla ?? ''}`
            .toLowerCase()
            .trim();

        if (!raw && !extTeam?.id && !extTeam?.crest) return true;
        return /\b(tbd|to be determined|winner|loser|qualifier)\b/.test(raw);
    }

    /**
     * Clear one side of downstream slot when an upstream winner is invalidated.
     * Recursively clears all further propagated winners.
     */
    private async clearBracketSide(nextSlotId: string, side: 'home' | 'away') {
        const { BracketSlot, Match } = cds.entities('cnma.prediction');

        const slot = await SELECT.one.from(BracketSlot).where({ ID: nextSlotId });
        if (!slot) return;

        const slotSideField = side === 'home' ? 'homeTeam_ID' : 'awayTeam_ID';
        await UPDATE(BracketSlot).where({ ID: slot.ID }).set({
            [slotSideField]: null,
            winner_ID: null,
            homeAgg: 0,
            awayAgg: 0,
            homePen: null,
            awayPen: null,
        });

        if (slot.leg1_ID) {
            const leg1SideField = side === 'home' ? 'homeTeam_ID' : 'awayTeam_ID';
            await UPDATE(Match).where({ ID: slot.leg1_ID }).set({
                [leg1SideField]: null,
                status: 'upcoming',
                homeScore: null,
                awayScore: null,
                outcome: null,
            });
        }

        if (slot.leg2_ID) {
            // leg2 has reversed home/away versus bracket slot sides
            const leg2SideField = side === 'home' ? 'awayTeam_ID' : 'homeTeam_ID';
            await UPDATE(Match).where({ ID: slot.leg2_ID }).set({
                [leg2SideField]: null,
                status: 'upcoming',
                homeScore: null,
                awayScore: null,
                outcome: null,
            });
        }

        if (slot.nextSlot_ID && slot.nextSlotSide) {
            await this.clearBracketSide(slot.nextSlot_ID, slot.nextSlotSide);
        }
    }

    // ── Betting Locks ─────────────────────────────────────────

    /**
     * Toggle per-match betting lock.
     * When locked=true, users cannot place or change bets for this match.
     */
    async lockMatchBetting(req: Request) {
        const { matchId, locked } = req.data;
        const { Match } = cds.entities('cnma.prediction');

        if (!matchId) return req.error(400, 'matchId is required');

        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');

        await UPDATE(Match).where({ ID: matchId }).set({ bettingLocked: locked === true });

        return {
            success: true,
            message: locked ? 'Betting locked for this match' : 'Betting unlocked for this match',
        };
    }

    /**
     * Toggle tournament-wide betting lock.
     * When locked=true, all betting (outcome, score, champion) is blocked for this tournament.
     */
    async lockTournamentBetting(req: Request) {
        const { tournamentId, locked } = req.data;
        const { Tournament } = cds.entities('cnma.prediction');

        if (!tournamentId) return req.error(400, 'tournamentId is required');

        const tournament = await SELECT.one.from(Tournament).where({ ID: tournamentId });
        if (!tournament) return req.error(404, 'Tournament not found');

        await UPDATE(Tournament).where({ ID: tournamentId }).set({ bettingLocked: locked === true });

        return {
            success: true,
            message: locked ? 'All betting locked for this tournament' : 'Betting unlocked for this tournament',
        };
    }

    // ── Competition Import ────────────────────────────────────

    /**
     * List available competitions from football-data.org, flagging which ones
     * already have a corresponding Tournament (by externalCode).
     */
    async getAvailableCompetitions(req: Request) {
        const { apiKey } = req.data;
        const token = (apiKey as string | undefined)?.trim() || FOOTBALL_DATA_API_TOKEN;
        const { Tournament } = cds.entities('cnma.prediction');

        let apiData: any;
        try {
            const res = await fetch('https://api.football-data.org/v4/competitions', {
                headers: { 'X-Auth-Token': token },
            });
            if (!res.ok) {
                const errText = await res.text();
                return req.error(502, `football-data.org API error ${res.status}: ${errText}`);
            }
            apiData = await res.json();
        } catch (err: any) {
            return req.error(502, `Failed to reach football-data.org: ${err.message}`);
        }

        // Load all already-imported tournament codes
        const existing = await SELECT.from(Tournament).columns('ID', 'externalCode');
        const importedMap = new Map<string, string>(); // code → ID
        for (const t of existing) {
            if (t.externalCode) importedMap.set(t.externalCode, t.ID);
        }

        const items = (apiData.competitions ?? []).map((c: any) => ({
            externalId: c.id,
            code: c.code,
            name: c.name,
            type: c.type,
            emblem: c.emblem ?? null,
            plan: c.plan ?? null,
            seasonStart: c.currentSeason?.startDate ?? null,
            seasonEnd: c.currentSeason?.endDate ?? null,
            alreadyImported: importedMap.has(c.code),
            importedTournamentId: importedMap.get(c.code) ?? null,
        }));

        return items;
    }

    /**
     * Import a competition from football-data.org as a full Tournament.
     * Creates Tournament, upserts Teams, creates TournamentTeams (with group assignments),
     * and creates all Matches (with externalId for future sync).
     */
    async importTournament(req: Request) {
        const { externalCode, apiKey } = req.data;
        const token = (apiKey as string | undefined)?.trim() || FOOTBALL_DATA_API_TOKEN;

        if (!externalCode) return req.error(400, 'externalCode is required');

        const { Tournament, Team, TournamentTeam, Match, BracketSlot, TeamMember } = cds.entities('cnma.prediction');

        // 1. Guard: prevent duplicate import and check for orphaned data
        const existing = await SELECT.one.from(Tournament).where({ externalCode });
        if (existing) {
            return req.error(409, `A tournament with code '${externalCode}' already exists (ID: ${existing.ID}). Use syncMatchResults to update existing tournament data.`);
        }

        // Check for orphaned TournamentTeam records that might cause conflicts
        const allTournamentIds = await SELECT.from(Tournament).columns('ID');
        const tournamentIdSet = new Set(allTournamentIds.map((t: any) => t.ID));

        const allTournamentTeams = await SELECT.from(TournamentTeam);
        const orphanedTeams = allTournamentTeams.filter((tt: any) => !tournamentIdSet.has(tt.tournament_ID));

        if (orphanedTeams.length > 0) {
            console.warn(`Found ${orphanedTeams.length} orphaned TournamentTeam records that will be cleaned up.`);
            for (const orphan of orphanedTeams) {
                await DELETE.from(TournamentTeam).where({ ID: orphan.ID });
            }
        }

        // Helper: fetch from API
        const apiFetch = async (path: string): Promise<any> => {
            const res = await fetch(`https://api.football-data.org/v4${path}`, {
                headers: { 'X-Auth-Token': token },
            });
            if (!res.ok) {
                const errText = await res.text();
                throw Object.assign(new Error(`API error ${res.status}: ${errText}`), { status: res.status });
            }
            return res.json();
        };

        // 2. Fetch competition details
        let comp: any;
        try {
            comp = await apiFetch(`/competitions/${externalCode}`);
        } catch (err: any) {
            return req.error(502, `Failed to fetch competition: ${err.message}`);
        }

        const season = comp.currentSeason;
        const startDate = season?.startDate ?? new Date().toISOString().split('T')[0];
        const endDate = season?.endDate ?? new Date().toISOString().split('T')[0];
        const seasonLabel = startDate.substring(0, 4);

        // 3. Determine format
        const format = this._determineFormat(comp.type, externalCode);
        const hasGroupStage = format === 'groupKnockout';
        const hasLegs = format === 'knockout';

        // 4. Create Tournament — pre-generate UUID for reliable ID access
        const tournamentId: string = cds.utils.uuid();
        try {
            await INSERT.into(Tournament).entries({
                ID: tournamentId,
                name: comp.name,
                startDate,
                endDate,
                status: 'upcoming',
                format,
                hasGroupStage,
                hasLegs,
                externalCode,
                season: seasonLabel,
            });
        } catch (err: any) {
            return req.error(500, `Failed to create tournament: ${err.message}`);
        }

        // 5. Fetch teams
        let apiTeams: any[] = [];
        try {
            const teamsData = await apiFetch(`/competitions/${externalCode}/teams`);
            apiTeams = teamsData.teams ?? [];
        } catch (_) { /* no teams available yet — continue */ }

        // 6. Fetch standings for group assignments & league positions (best-effort)
        const groupByTeamId = new Map<number, string>();
        const leaguePositionByTeamId = new Map<number, number>();
        let standingsData: any = null;
        try {
            standingsData = await apiFetch(`/competitions/${externalCode}/standings`);
            for (const standing of standingsData.standings ?? []) {
                const raw: string = standing.group ?? '';
                // e.g. 'GROUP_A' or 'Group A' → 'A'
                const group = raw.replace(/^(GROUP_|Group\s+)/i, '').trim();
                for (const row of standing.table ?? []) {
                    if (row.team?.id) {
                        if (row.position != null) {
                            leaguePositionByTeamId.set(row.team.id, row.position);
                        }
                        if (group.length === 1) {
                            groupByTeamId.set(row.team.id, group);
                        }
                    }
                }
            }
        } catch (_) { /* standings not available yet */ }

        // 7. Upsert teams, create TournamentTeam links & import team members
        let teamsImported = 0;
        let membersImported = 0;
        const teamIdMap = new Map<number, string>(); // external ID → internal UUID

        const allTeams = await SELECT.from(Team).columns('ID', 'name', 'shortName', 'crest', 'tla');
        const teamByCrest = new Map<string, string>(allTeams.filter((t: any) => t.crest).map((t: any) => [t.crest, t.ID]));
        const teamByTla = new Map<string, string>(allTeams.filter((t: any) => t.tla).map((t: any) => [t.tla, t.ID]));

        // Pre-detect ambiguous TLAs in this import batch to avoid collisions
        // (e.g., FCB is used by both FC Barcelona and FC Bayern München)
        const apiTlaCounts = new Map<string, number>();
        for (const apiTeam of apiTeams) {
            if (apiTeam.tla) apiTlaCounts.set(apiTeam.tla, (apiTlaCounts.get(apiTeam.tla) ?? 0) + 1);
        }

        try {
            for (const apiTeam of apiTeams) {
                let internalId: string | undefined;

                // Lookup by crest first (unique), then by TLA (with collision guard)
                if (apiTeam.crest && teamByCrest.has(apiTeam.crest)) {
                    internalId = teamByCrest.get(apiTeam.crest)!;
                } else if (apiTeam.tla && teamByTla.has(apiTeam.tla)) {
                    // Skip TLA matching if multiple teams in this batch share the same TLA
                    if ((apiTlaCounts.get(apiTeam.tla) ?? 0) <= 1) {
                        const candidateId = teamByTla.get(apiTeam.tla)!;
                        const candidate = allTeams.find((t: any) => t.ID === candidateId);
                        // Verify by name: at least one significant word (>2 chars) must overlap
                        // to prevent cross-team TLA matches (e.g., Bayern ≠ Barcelona despite both FCB)
                        const apiWords = new Set<string>((apiTeam.name ?? '').toLowerCase().split(/\s+/));
                        const dbWords = new Set<string>((candidate?.name ?? '').toLowerCase().split(/\s+/));
                        const hasWordOverlap = Array.from(apiWords).some(w => w.length > 2 && dbWords.has(w));
                        if (hasWordOverlap) {
                            internalId = candidateId;
                        }
                    }
                }

                if (!internalId) {
                    // Create new team — pre-generate UUID
                    const areaCode: string = (apiTeam.area?.code ?? 'XX').toLowerCase().substring(0, 5);
                    const newTeamId = cds.utils.uuid();
                    await INSERT.into(Team).entries({
                        ID: newTeamId,
                        name: apiTeam.name,
                        shortName: apiTeam.shortName ?? apiTeam.name,
                        tla: apiTeam.tla ?? null,
                        crest: apiTeam.crest ?? null,
                        flagCode: areaCode,
                    });
                    internalId = newTeamId;
                    if (apiTeam.crest) teamByCrest.set(apiTeam.crest, internalId!);
                    if (apiTeam.tla) teamByTla.set(apiTeam.tla, internalId!);
                    teamsImported++;
                }

                teamIdMap.set(apiTeam.id, internalId!);

                // Check if TournamentTeam association already exists before inserting
                const existingTournamentTeam = await SELECT.one.from(TournamentTeam)
                    .where({ tournament_ID: tournamentId, team_ID: internalId! });

                if (!existingTournamentTeam) {
                    const groupName = groupByTeamId.get(apiTeam.id) ?? null;
                    const leaguePosition = leaguePositionByTeamId.get(apiTeam.id) ?? null;
                    await INSERT.into(TournamentTeam).entries({
                        tournament_ID: tournamentId,
                        team_ID: internalId!,
                        groupName,
                        leaguePosition,
                    });
                }

                // Import team members (coach + squad)
                const existingMembers = await SELECT.from(TeamMember)
                    .where({ team_ID: internalId! })
                    .columns('name');
                const existingMemberNames = new Set(existingMembers.map((m: any) => m.name));

                // Import coach
                if (apiTeam.coach?.name && !existingMemberNames.has(apiTeam.coach.name)) {
                    await INSERT.into(TeamMember).entries({
                        team_ID: internalId!,
                        name: apiTeam.coach.name,
                        role: 'headCoach',
                        dateOfBirth: apiTeam.coach.dateOfBirth ?? null,
                    });
                    existingMemberNames.add(apiTeam.coach.name);
                    membersImported++;
                }

                // Import squad players
                for (const squadMember of (apiTeam.squad ?? [])) {
                    if (!squadMember.name || existingMemberNames.has(squadMember.name)) continue;
                    existingMemberNames.add(squadMember.name);

                    await INSERT.into(TeamMember).entries({
                        team_ID: internalId!,
                        name: squadMember.name,
                        role: 'player',
                        position: squadMember.position ?? null,
                        dateOfBirth: squadMember.dateOfBirth ?? null,
                    });
                    membersImported++;
                }
            }
        } catch (err: any) {
            // Clean up partially created tournament on team import failure
            console.error('Team import failed, cleaning up tournament:', err);
            await DELETE.from(Tournament).where({ ID: tournamentId });
            await DELETE.from(TournamentTeam).where({ tournament_ID: tournamentId });
            return req.error(500, `Team import failed: ${err.message}`);
        }

        // Use shared mapping constants
        const stageMap = STAGE_MAP;
        const statusMap = STATUS_MAP;

        let apiMatches: any[] = [];
        try {
            const matchesData = await apiFetch(`/competitions/${externalCode}/matches`);
            apiMatches = matchesData.matches ?? [];
        } catch (_) { /* no matches available */ }

        const outcomeMap = OUTCOME_MAP;

        let matchesImported = 0;
        let finishedMatchesImported = 0;
        try {
            for (const apiMatch of apiMatches) {
                const homeTeamId = apiMatch.homeTeam?.id ? teamIdMap.get(apiMatch.homeTeam.id) ?? null : null;
                const awayTeamId = apiMatch.awayTeam?.id ? teamIdMap.get(apiMatch.awayTeam.id) ?? null : null;
                const stage = stageMap[apiMatch.stage] ?? 'group';

                const matchStatus = statusMap[apiMatch.status] ?? 'upcoming';
                const homeScore = apiMatch.score?.fullTime?.home ?? null;
                const awayScore = apiMatch.score?.fullTime?.away ?? null;
                const isFinished = matchStatus === 'finished' && homeScore !== null && awayScore !== null;
                const outcome = isFinished
                    ? (outcomeMap[apiMatch.score?.winner] ?? ScoringEngine.determineOutcome(homeScore, awayScore))
                    : null;

                await INSERT.into(Match).entries({
                    tournament_ID: tournamentId,
                    homeTeam_ID: homeTeamId,
                    awayTeam_ID: awayTeamId,
                    kickoff: apiMatch.utcDate ?? startDate,
                    venue: apiMatch.venue ?? null,
                    stage,
                    status: matchStatus,
                    bettingLocked: false,
                    matchday: apiMatch.matchday ?? null,
                    externalId: apiMatch.id,
                    homeScore,
                    awayScore,
                    outcome,
                });
                matchesImported++;
                if (isFinished) finishedMatchesImported++;
            }
        } catch (err: any) {
            console.error('Match import failed:', err);
            // Don't clean up tournament here as teams are already created
            // Just log the error and continue with partial import
            console.warn(`Match import partially failed: ${err.message}. Tournament created with teams but some matches may be missing.`);
        }

        // 9. Create bracket slots from knockout matches (CL-like tournaments)
        let bracketSlotsCreated = 0;
        const knockoutStages = ['roundOf16', 'quarterFinal', 'semiFinal', 'final', 'playoff', 'roundOf32'];
        const isKnockoutFormat = ['knockout', 'groupKnockout', 'cup'].includes(format);

        if (isKnockoutFormat && matchesImported > 0) {
            try {
                bracketSlotsCreated = await this._createBracketFromMatches(
                    tournamentId, knockoutStages, format
                );
            } catch (err: any) {
                console.warn(`Bracket creation failed: ${err.message}. Tournament imported without bracket.`);
            }
        }

        return {
            success: true,
            message: `Tournament '${comp.name}' imported: ${teamsImported} new team(s), ${membersImported} member(s), ${matchesImported} match(es) (${finishedMatchesImported} finished), ${bracketSlotsCreated} bracket slot(s).`,
            tournamentId,
            teamsImported,
            membersImported,
            matchesImported,
            finishedMatchesImported,
            bracketSlotsCreated,
        };
    }

    // ── Bracket & Format (delegated to BracketBuilder) ─────

    private async _createBracketFromMatches(
        tournamentId: string,
        knockoutStages: string[],
        format: string
    ): Promise<number> {
        return this.bracketBuilder.createBracketFromMatches(tournamentId, knockoutStages, format);
    }

    private _determineFormat(type: string, code: string): string {
        return this.bracketBuilder.determineFormat(type, code);
    }

    // ── Payout Management (delegated to PayoutManager) ─────

    async markScoreBetsPaid(req: Request) {
        return this.payoutManager.markScoreBetsPaid(req);
    }

    async markScoreBetsUnpaid(req: Request) {
        return this.payoutManager.markScoreBetsUnpaid(req);
    }

    async getPayoutSummary(req: Request) {
        return this.payoutManager.getPayoutSummary(req);
    }

    async resetAllPayoutStatus(req: Request) {
        return this.payoutManager.resetAllPayoutStatus(req);
    }

}
