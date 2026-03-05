import cds, { Request } from '@sap/cds';
import { ScoringEngine } from '../lib/ScoringEngine';

/** Default football-data.org API token — used when no apiKey is provided. */
const FOOTBALL_DATA_API_TOKEN = 'f96dc87cc7b54da08321475e744a52f2';

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
            return req.error(400, 'Match result has already been entered. Use correctMatchResult to fix it.');
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

        // Re-open the match so enterMatchResult accepts it
        await UPDATE(Match).where({ ID: matchId }).set({ status: 'live' });

        // Re-enter with new scores (this scores predictions, bets, triggers bracket)
        const fakeReq = {
            data: { matchId, homeScore, awayScore },
            error: (code: number, msg: string) => { throw new Error(msg); }
        } as unknown as Request;

        const result: any = await this.enterMatchResult(fakeReq);

        // Recalculate leaderboard for the tournament
        if (match.tournament_ID) {
            const fakeRecalcReq = {
                data: { tournamentId: match.tournament_ID },
                error: (code: number, msg: string) => { throw new Error(msg); }
            } as unknown as Request;
            await this.recalculateLeaderboard(fakeRecalcReq);
        }

        return {
            success: true,
            message: `Match result corrected to ${homeScore}-${awayScore}. ${result?.predictionsScored ?? 0} predictions and ${result?.scoreBetsScored ?? 0} score bets re-scored.`,
            predictionsScored: result?.predictionsScored ?? 0,
            scoreBetsScored: result?.scoreBetsScored ?? 0,
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

        // Stage mapping from football-data.org to schema
        const stageMap: Record<string, string> = {
            LEAGUE_STAGE: 'regular',
            GROUP_STAGE: 'group',
            LAST_32: 'roundOf32',
            LAST_16: 'roundOf16',
            QUARTER_FINALS: 'quarterFinal',
            SEMI_FINALS: 'semiFinal',
            THIRD_PLACE: 'thirdPlace',
            FINAL: 'final',
            PLAY_OFF_ROUND: 'playoff',
            REGULAR: 'regular',
            PLAYOFF: 'playoff',
            RELEGATION: 'relegation',
        };

        // Status mapping
        const statusMap: Record<string, string> = {
            SCHEDULED: 'upcoming',
            TIMED: 'upcoming',
            IN_PLAY: 'live',
            PAUSED: 'live',
            HALFTIME: 'live',
            EXTRA_TIME: 'live',
            PENALTY_SHOOTOUT: 'live',
            FINISHED: 'finished',
            AWARDED: 'finished',
            INTERRUPTED: 'live',
            SUSPENDED: 'cancelled',
            POSTPONED: 'cancelled',
            CANCELLED: 'cancelled',
        };

        // Outcome mapping
        const outcomeMap: Record<string, string> = {
            HOME_TEAM: 'home',
            AWAY_TEAM: 'away',
            DRAW: 'draw',
        };

        // Build crest→Team ID lookup for resolving teams by API crest URL
        const allTeams = await SELECT.from(Team).columns('ID', 'crest');
        const teamByCrest = new Map<string, string>();
        for (const t of allTeams) {
            if (t.crest) teamByCrest.set(t.crest, t.ID);
        }

        // Load all our matches for this tournament, indexed by externalId
        const ourMatches = await SELECT.from(Match).where({ tournament_ID: tournamentId });
        const matchByExternalId = new Map<number, any>();
        for (const m of ourMatches) {
            if (m.externalId != null) matchByExternalId.set(Number(m.externalId), m);
        }

        let synced = 0;
        let scored = 0;

        for (const ext of externalMatches) {
            const ourMatch = matchByExternalId.get(ext.id);
            if (!ourMatch) continue; // no match linked to this external ID — skip

            const newStatus = statusMap[ext.status] ?? 'upcoming';
            const newStage = stageMap[ext.stage] ?? ourMatch.stage;
            const homeScore = ext.score?.fullTime?.home ?? null;
            const awayScore = ext.score?.fullTime?.away ?? null;
            const extOutcome = ext.score?.winner ? (outcomeMap[ext.score.winner] ?? null) : null;

            // Determine if we should trigger scoring (was not finished, now is)
            const wasFinished = ourMatch.status === 'finished';
            const nowFinished = newStatus === 'finished';

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
            const resolvedHome = this._resolveTeamFromExternal(ext.homeTeam, teamByCrest);
            const resolvedAway = this._resolveTeamFromExternal(ext.awayTeam, teamByCrest);
            if (resolvedHome !== undefined && resolvedHome !== ourMatch.homeTeam_ID) {
                updateData.homeTeam_ID = resolvedHome;
            }
            if (resolvedAway !== undefined && resolvedAway !== ourMatch.awayTeam_ID) {
                updateData.awayTeam_ID = resolvedAway;
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

            // Auto-score if newly finished
            if (!wasFinished && nowFinished && homeScore !== null && awayScore !== null) {
                try {
                    const fakeReq = {
                        data: {
                            matchId: ourMatch.ID,
                            homeScore: homeScore,
                            awayScore: awayScore,
                        },
                        error: (code: number, msg: string) => { throw new Error(msg); }
                    } as unknown as Request;

                    await this.enterMatchResult(fakeReq);
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
            message: `Sync complete: ${synced} match(es) updated, ${scored} newly scored.`,
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
        const teamByTla   = new Map<string, string>(allTeams.filter((t: any) => t.tla).map((t: any) => [t.tla,   t.ID]));

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
                    if (apiTeam.crest)  teamByCrest.set(apiTeam.crest, internalId!);
                    if (apiTeam.tla)    teamByTla.set(apiTeam.tla, internalId!);
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

        // 8. Fetch & create matches
        const stageMap: Record<string, string> = {
            LEAGUE_STAGE: 'regular',
            GROUP_STAGE:  'group',
            LAST_16:       'roundOf16',
            LAST_32:       'roundOf32',
            QUARTER_FINALS: 'quarterFinal',
            SEMI_FINALS:    'semiFinal',
            THIRD_PLACE:   'thirdPlace',
            FINAL:         'final',
            PLAY_OFF_ROUND:'playoff',
            REGULAR:       'regular',
            PLAYOFF:       'playoff',
            RELEGATION:    'relegation',
        };
        const statusMap: Record<string, string> = {
            SCHEDULED:         'upcoming',
            TIMED:             'upcoming',
            IN_PLAY:           'live',
            PAUSED:            'live',
            HALFTIME:          'live',
            EXTRA_TIME:        'live',
            PENALTY_SHOOTOUT:  'live',
            FINISHED:          'finished',
            AWARDED:           'finished',
            INTERRUPTED:       'live',
            SUSPENDED:         'cancelled',
            POSTPONED:         'cancelled',
            CANCELLED:         'cancelled',
        };

        let apiMatches: any[] = [];
        try {
            const matchesData = await apiFetch(`/competitions/${externalCode}/matches`);
            apiMatches = matchesData.matches ?? [];
        } catch (_) { /* no matches available */ }

        // Outcome mapping for finished matches
        const outcomeMap: Record<string, string> = {
            HOME_TEAM: 'home',
            AWAY_TEAM: 'away',
            DRAW: 'draw',
        };

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
                    homeTeam_ID:   homeTeamId,
                    awayTeam_ID:   awayTeamId,
                    kickoff:       apiMatch.utcDate ?? startDate,
                    venue:         apiMatch.venue ?? null,
                    stage,
                    status:        matchStatus,
                    matchday:      apiMatch.matchday ?? null,
                    externalId:    apiMatch.id,
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

    /**
     * Create bracket slots from knockout-stage matches already imported for this tournament.
     * Groups two-leg matches into ties, creates BracketSlot entries, and links the bracket tree.
     *
     * Bracket ordering uses externalId (from football-data.org) to preserve the actual
     * bracket structure. Team-based cross-referencing is then used when next-stage matches
     * have known team assignments to correctly link the bracket tree. Sequential pairing
     * (by externalId order) is used as a fallback for stages where teams are still TBD.
     */
    private async _createBracketFromMatches(
        tournamentId: string,
        knockoutStages: string[],
        format: string
    ): Promise<number> {
        const { Match, BracketSlot } = cds.entities('cnma.prediction');

        // Fetch all matches for this tournament
        const allMatches = await SELECT.from(Match).where({ tournament_ID: tournamentId });

        // Filter knockout matches
        const knockoutMatches = allMatches.filter((m: any) => knockoutStages.includes(m.stage));
        if (knockoutMatches.length === 0) return 0;

        // Group by stage
        const matchesByStage = new Map<string, any[]>();
        for (const m of knockoutMatches) {
            if (!matchesByStage.has(m.stage)) matchesByStage.set(m.stage, []);
            matchesByStage.get(m.stage)!.push(m);
        }

        const expectedTiesPerStage: Record<string, number> = {
            roundOf32: 16,
            roundOf16: 8,
            quarterFinal: 4,
            semiFinal: 2,
            final: 1,
        };

        type Tie = { leg1: any; leg2: any | null; homeTeamId: string | null; awayTeamId: string | null };
        const sortTiesByExternalOrder = (ties: Tie[]): Tie[] =>
            ties.sort((a, b) => {
                const aId = Math.min(a.leg1.externalId ?? Infinity, a.leg2?.externalId ?? Infinity);
                const bId = Math.min(b.leg1.externalId ?? Infinity, b.leg2?.externalId ?? Infinity);
                return aId - bId;
            });

        /**
         * Pair matches into bracket ties.
         * Preferred strategy is team-based (home/away swapped across legs).
         * For TBD two-leg stages, infer pairings by matchday or ordered split.
         */
        const createTiesFromMatches = (matches: any[], stage: string): Tie[] => {
            const orderedMatches = [...matches].sort((a: any, b: any) => (a.externalId ?? 0) - (b.externalId ?? 0));

            const pairByKnownTeams = (): Tie[] => {
                const ties: Tie[] = [];
                const used = new Set<string>();

                for (let i = 0; i < orderedMatches.length; i++) {
                    if (used.has(orderedMatches[i].ID)) continue;
                    const m1 = orderedMatches[i];
                    let paired = false;

                    for (let j = i + 1; j < orderedMatches.length; j++) {
                        if (used.has(orderedMatches[j].ID)) continue;
                        const m2 = orderedMatches[j];

                        if (
                            m1.homeTeam_ID && m1.awayTeam_ID &&
                            m1.homeTeam_ID === m2.awayTeam_ID &&
                            m1.awayTeam_ID === m2.homeTeam_ID
                        ) {
                            used.add(m1.ID);
                            used.add(m2.ID);
                            const [leg1, leg2] = new Date(m1.kickoff).getTime() <= new Date(m2.kickoff).getTime()
                                ? [m1, m2]
                                : [m2, m1];
                            ties.push({
                                leg1,
                                leg2,
                                homeTeamId: leg1.homeTeam_ID,
                                awayTeamId: leg1.awayTeam_ID,
                            });
                            paired = true;
                            break;
                        }
                    }

                    if (!paired) {
                        used.add(m1.ID);
                        ties.push({
                            leg1: m1,
                            leg2: null,
                            homeTeamId: m1.homeTeam_ID ?? null,
                            awayTeamId: m1.awayTeam_ID ?? null,
                        });
                    }
                }

                return sortTiesByExternalOrder(ties);
            };

            const expectedTies = expectedTiesPerStage[stage] ?? 0;
            const isLikelyTwoLegStage =
                stage !== 'final' &&
                expectedTies > 0 &&
                orderedMatches.length === expectedTies * 2;

            const teamPaired = pairByKnownTeams();
            if (!isLikelyTwoLegStage || teamPaired.length === expectedTies) {
                return teamPaired;
            }

            const byMatchday = new Map<number, any[]>();
            for (const m of orderedMatches) {
                if (m.matchday != null) {
                    if (!byMatchday.has(m.matchday)) byMatchday.set(m.matchday, []);
                    byMatchday.get(m.matchday)!.push(m);
                }
            }

            let leg1Candidates: any[] = [];
            let leg2Candidates: any[] = [];
            const matchdayKeys = Array.from(byMatchday.keys()).sort((a, b) => a - b);
            if (
                matchdayKeys.length === 2 &&
                (byMatchday.get(matchdayKeys[0])?.length ?? 0) === expectedTies &&
                (byMatchday.get(matchdayKeys[1])?.length ?? 0) === expectedTies
            ) {
                leg1Candidates = [...(byMatchday.get(matchdayKeys[0]) ?? [])]
                    .sort((a: any, b: any) => (a.externalId ?? 0) - (b.externalId ?? 0));
                leg2Candidates = [...(byMatchday.get(matchdayKeys[1]) ?? [])]
                    .sort((a: any, b: any) => (a.externalId ?? 0) - (b.externalId ?? 0));
            } else {
                const half = Math.floor(orderedMatches.length / 2);
                leg1Candidates = orderedMatches.slice(0, half);
                leg2Candidates = orderedMatches.slice(half);
            }

            const inferred: Tie[] = [];
            for (let i = 0; i < expectedTies; i++) {
                const legA = leg1Candidates[i];
                const legB = leg2Candidates[i];
                if (!legA || !legB) break;

                const [leg1, leg2] = new Date(legA.kickoff).getTime() <= new Date(legB.kickoff).getTime()
                    ? [legA, legB]
                    : [legB, legA];

                inferred.push({
                    leg1,
                    leg2,
                    homeTeamId: leg1.homeTeam_ID ?? leg2.awayTeam_ID ?? null,
                    awayTeamId: leg1.awayTeam_ID ?? leg2.homeTeam_ID ?? null,
                });
            }

            return inferred.length === expectedTies
                ? sortTiesByExternalOrder(inferred)
                : teamPaired;
        };

        // Define stages in bracket order
        const stageOrder = ['roundOf32', 'roundOf16', 'quarterFinal', 'semiFinal', 'final']
            .filter(s => knockoutStages.includes(s));
        const stageLabels: Record<string, string> = {
            roundOf32: 'R32',
            roundOf16: 'R16',
            quarterFinal: 'QF',
            semiFinal: 'SF',
            final: 'Final',
            playoff: 'PO',
        };

        // Create bracket slots for each stage, keeping track of ties per stage for cross-referencing
        const bracketSlotsByStage = new Map<string, string[]>(); // stage → slot IDs
        const tiesByStage = new Map<string, { leg1: any; leg2: any | null; homeTeamId: string | null; awayTeamId: string | null }[]>();
        let totalCreated = 0;

        for (const stage of stageOrder) {
            const stageMatches = matchesByStage.get(stage) ?? [];
            const ties = stageMatches.length > 0 ? createTiesFromMatches(stageMatches, stage) : [];

            // Use actual tie count or expected count, whichever is larger
            // (create placeholder slots for stages where matches don't exist yet)
            const numTies = ties.length > 0 ? ties.length : (expectedTiesPerStage[stage] ?? 0);

            // Only create placeholder slots for stages that logically follow existing ones
            // e.g., if we have R16 matches, also create QF/SF/Final placeholders
            const hasEarlierStage = stageOrder.some(
                (s, idx) => idx < stageOrder.indexOf(stage) && (matchesByStage.get(s)?.length ?? 0) > 0
            );
            if (ties.length === 0 && !hasEarlierStage && stage !== 'final') continue;

            tiesByStage.set(stage, ties);
            const slotIds: string[] = [];

            for (let pos = 1; pos <= numTies; pos++) {
                const tie = ties[pos - 1] ?? null;
                const slotId = cds.utils.uuid();

                const slotData: Record<string, any> = {
                    ID: slotId,
                    tournament_ID: tournamentId,
                    stage,
                    position: pos,
                    label: stage === 'final' ? 'Final' : `${stageLabels[stage] ?? stage}-${pos}`,
                };

                if (tie) {
                    slotData.homeTeam_ID = tie.homeTeamId ?? null;
                    slotData.awayTeam_ID = tie.awayTeamId ?? null;
                    slotData.leg1_ID = tie.leg1.ID;
                    if (tie.leg2) slotData.leg2_ID = tie.leg2.ID;

                    // Compute aggregate scores for finished legs
                    // In two-leg: homeAgg = leg1.homeScore + leg2.awayScore
                    //             awayAgg = leg1.awayScore + leg2.homeScore
                    let homeAgg = 0;
                    let awayAgg = 0;
                    let hasScore = false;

                    if (tie.leg1.status === 'finished' && tie.leg1.homeScore != null) {
                        homeAgg += tie.leg1.homeScore ?? 0;
                        awayAgg += tie.leg1.awayScore ?? 0;
                        hasScore = true;
                    }
                    if (tie.leg2?.status === 'finished' && tie.leg2.homeScore != null) {
                        // leg2 home is tie's away team, leg2 away is tie's home team
                        awayAgg += tie.leg2.homeScore ?? 0;
                        homeAgg += tie.leg2.awayScore ?? 0;
                        hasScore = true;
                    }

                    if (hasScore) {
                        slotData.homeAgg = homeAgg;
                        slotData.awayAgg = awayAgg;
                    }

                    // Determine winner if both legs finished (or single-leg tie)
                    const bothFinished = tie.leg2
                        ? (tie.leg1.status === 'finished' && tie.leg2.status === 'finished')
                        : (tie.leg1.status === 'finished');
                    if (bothFinished && hasScore) {
                        if (homeAgg > awayAgg) {
                            slotData.winner_ID = tie.homeTeamId;
                        } else if (awayAgg > homeAgg) {
                            slotData.winner_ID = tie.awayTeamId;
                        }
                        // Tied aggregate → admin decides (penalties)
                    }
                }

                await INSERT.into(BracketSlot).entries(slotData);
                slotIds.push(slotId);
                totalCreated++;

                // Link matches back to their bracket slot
                if (tie) {
                    await UPDATE(Match).where({ ID: tie.leg1.ID }).set({ bracketSlot_ID: slotId, leg: 1 });
                    if (tie.leg2) {
                        await UPDATE(Match).where({ ID: tie.leg2.ID }).set({ bracketSlot_ID: slotId, leg: 2 });
                    }
                }
            }

            bracketSlotsByStage.set(stage, slotIds);
        }

        // Link bracket tree: use team-based cross-referencing when next-stage ties
        // have known teams, fall back to sequential pairing (now correct due to externalId ordering).
        // This ensures the bracket matches the actual draw (e.g., PSG/Chelsea → QF-1 with
        // Galatasaray/Liverpool, not with Atalanta/Bayern).
        for (let si = 0; si < stageOrder.length - 1; si++) {
            const currentStage = stageOrder[si];
            const nextStage = stageOrder[si + 1];
            const currentSlots = bracketSlotsByStage.get(currentStage) ?? [];
            const nextSlots = bracketSlotsByStage.get(nextStage) ?? [];
            const currentTies = tiesByStage.get(currentStage) ?? [];
            const nextTies = tiesByStage.get(nextStage) ?? [];

            // Try team-based matching: for each next-stage tie that has known teams,
            // find the current-stage tie whose teams match and link them correctly.
            const linkedSlots = new Map<string, { nextSlotId: string; side: string }>();

            for (let ni = 0; ni < nextSlots.length && ni < nextTies.length; ni++) {
                const nextTie = nextTies[ni];
                const nextSlotId = nextSlots[ni];

                // Collect teams known in this next-stage tie
                const nextHomeTeam = nextTie.homeTeamId ?? nextTie.leg1.homeTeam_ID ?? null;
                const nextAwayTeam = nextTie.awayTeamId ?? nextTie.leg1.awayTeam_ID ?? null;

                // Find current-stage slots whose teams match the next-stage home/away
                for (let ci = 0; ci < currentSlots.length && ci < currentTies.length; ci++) {
                    if (linkedSlots.has(currentSlots[ci])) continue;
                    const currentTie = currentTies[ci];
                    const currentTeams = new Set<string>();
                    if (currentTie.homeTeamId) currentTeams.add(currentTie.homeTeamId);
                    if (currentTie.awayTeamId) currentTeams.add(currentTie.awayTeamId);

                    if (nextHomeTeam && currentTeams.has(nextHomeTeam)) {
                        linkedSlots.set(currentSlots[ci], { nextSlotId, side: 'home' });
                    } else if (nextAwayTeam && currentTeams.has(nextAwayTeam)) {
                        linkedSlots.set(currentSlots[ci], { nextSlotId, side: 'away' });
                    }
                }
            }

            // Apply team-based links, then sequential fallback for unmatched slots
            for (let i = 0; i < currentSlots.length; i++) {
                const link = linkedSlots.get(currentSlots[i]);
                if (link) {
                    await UPDATE(BracketSlot).where({ ID: currentSlots[i] }).set({
                        nextSlot_ID: link.nextSlotId,
                        nextSlotSide: link.side,
                    });
                } else if (Math.floor(i / 2) < nextSlots.length) {
                    // Sequential fallback (based on externalId order, which follows the bracket)
                    const nextSlotId = nextSlots[Math.floor(i / 2)];
                    const side: string = (i % 2 === 0) ? 'home' : 'away';
                    await UPDATE(BracketSlot).where({ ID: currentSlots[i] }).set({
                        nextSlot_ID: nextSlotId,
                        nextSlotSide: side,
                    });
                }
            }
        }

        return totalCreated;
    }

    /** Determine tournament format from football-data.org competition type and code. */
    private _determineFormat(type: string, code: string): string {
        const leagueCodes = ['PL', 'FL1', 'BL1', 'SA', 'DED', 'PPL', 'PD', 'BSA', 'ELC', 'PPL'];
        if (leagueCodes.includes(code) || type === 'LEAGUE') return 'league';
        const groupKnockoutCodes = ['WC', 'EC', 'CLI', 'WCQ', 'ECQ', 'AFCON', 'COPA'];
        if (groupKnockoutCodes.includes(code)) return 'groupKnockout';
        // CL / EL / ECL use league phase + knockout → 'knockout'
        if (['CL', 'EL', 'ECL', 'UCOL'].includes(code)) return 'knockout';
        // Default for remaining CUP types
        return 'cup';
    }
}

