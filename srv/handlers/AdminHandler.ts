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
     * 3. Score all UC2 predictions using per-match outcomePoints
     * 4. Score all UC1 score bets using per-match MatchScoreBetConfig
     * 5. Update player stats (both global and per-tournament)
     */
    async enterMatchResult(req: Request) {
        const { matchId, homeScore, awayScore } = req.data;
        const {
            Match,
            Prediction,
            ScoreBet,
            Player,
            MatchScoreBetConfig,
            PlayerTournamentStats
        } = cds.entities('cnma.prediction');

        // Validate match
        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');

        if (match.status === 'finished') {
            return req.error(400, 'Match result has already been entered. Edit the match to correct it.');
        }

        // Determine outcome
        const outcome = ScoringEngine.determineOutcome(homeScore, awayScore);
        const tournamentId = match.tournament_ID;

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

                // Each correct bet wins 1×prize.
                // If player placed N identical bets and all are correct, each pays 1×prize (total N×prize).
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
        // If this match belongs to a bracket slot, update aggregates & advance winner
        if (match.bracketSlot_ID) {
            await this.updateBracketProgression(match.bracketSlot_ID, matchId);
        }

        return {
            success: true,
            message: `Match result ${homeScore}-${awayScore} entered. ${predictionsScored} predictions, ${scoreBetsScored} score bets scored.`,
            predictionsScored,
            scoreBetsScored
        };
    }

    /**
     * Force recalculate leaderboard rankings.
     * If tournamentId is provided, recalculates only for that tournament.
     * Otherwise, recalculates global stats.
     */
    async recalculateLeaderboard(req: Request) {
        const { tournamentId } = req.data;
        const { Player, Prediction, PlayerTournamentStats } = cds.entities('cnma.prediction');

        if (tournamentId) {
            // Per-tournament recalculation
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

            // Enrich with player names for tiebreak
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

            return {
                success: true,
                message: `Tournament leaderboard recalculated for ${stats.length} players`
            };
        }

        // Global recalculation
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
            // In CL two-leg: leg1 homeTeam = slot.homeTeam, leg2 homeTeam = slot.awayTeam
            const homeAgg = (leg1.homeScore ?? 0) + (leg2.awayScore ?? 0);
            const awayAgg = (leg1.awayScore ?? 0) + (leg2.homeScore ?? 0);

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

            // Check if both teams in next slot are now known
            const nextSlot = await SELECT.one.from(BracketSlot).where({ ID: slot.nextSlot_ID });

            if (nextSlot.homeTeam_ID && nextSlot.awayTeam_ID) {
                // If pre-created matches exist (leg1_ID is set), UPDATE them with the teams
                if (nextSlot.leg1_ID) {
                    await UPDATE(Match).where({ ID: nextSlot.leg1_ID }).set({
                        homeTeam_ID: nextSlot.homeTeam_ID,
                        awayTeam_ID: nextSlot.awayTeam_ID,
                    });

                    // Also update leg2 if it exists (reversed home/away for second leg)
                    if (nextSlot.leg2_ID) {
                        await UPDATE(Match).where({ ID: nextSlot.leg2_ID }).set({
                            homeTeam_ID: nextSlot.awayTeam_ID,
                            awayTeam_ID: nextSlot.homeTeam_ID,
                        });
                    }
                } else {
                    // No pre-created matches → create them (original behavior)
                    const matchId = cds.utils.uuid();
                    await INSERT.into(Match).entries({
                        ID: matchId,
                        tournament_ID: slot.tournament_ID,
                        homeTeam_ID: nextSlot.homeTeam_ID,
                        awayTeam_ID: nextSlot.awayTeam_ID,
                        kickoff: new Date().toISOString(),
                        stage: nextSlot.stage,
                        status: 'upcoming',
                        leg: 1,
                        bracketSlot_ID: nextSlot.ID,
                    });
                    await UPDATE(BracketSlot).where({ ID: nextSlot.ID }).set({ leg1_ID: matchId });

                    const { Tournament } = cds.entities('cnma.prediction');
                    const tournament = await SELECT.one.from(Tournament).where({ ID: slot.tournament_ID });
                    if (tournament?.hasLegs && nextSlot.stage !== 'final') {
                        const leg2Id = cds.utils.uuid();
                        await INSERT.into(Match).entries({
                            ID: leg2Id,
                            tournament_ID: slot.tournament_ID,
                            homeTeam_ID: nextSlot.awayTeam_ID,
                            awayTeam_ID: nextSlot.homeTeam_ID,
                            kickoff: new Date().toISOString(),
                            stage: nextSlot.stage,
                            status: 'upcoming',
                            leg: 2,
                            bracketSlot_ID: nextSlot.ID,
                        });
                        await UPDATE(BracketSlot).where({ ID: nextSlot.ID }).set({ leg2_ID: leg2Id });
                    }
                }
            }
        }
    }
}
