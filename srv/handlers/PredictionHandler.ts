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
            // Must wrap userId in {val: ...} so CDS properly quotes the UUID string
            // in SQLite, otherwise dashes in UUID are interpreted as minus operators.
            if (req.query.SELECT) {
                const existingWhere = req.query.SELECT.where || [];
                req.query.SELECT.where = [...(Array.isArray(existingWhere) ? existingWhere : [existingWhere]), 'player_ID', '=', { val: userId }];
            }
        }
    }

    /**
     * Submit match outcome predictions (UC2: Win/Draw/Lose).
     * Validates: match exists, not kicked off, pick is valid.
     * Scoring: 1 point if correct, 0 if wrong, no weight.
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
                    tournament_ID: match.tournament_ID,
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
     * Uses per-match MatchScoreBetConfig.
     */
    async submitScoreBet(req: Request) {
        const { matchId, homeScore, awayScore } = req.data;
        const { ScoreBet, Match, MatchScoreBetConfig } = cds.entities('cnma.prediction');

        // Validate match
        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');
        if (match.status !== 'upcoming') return req.error(400, 'Match is no longer open for bets');

        // Get per-match config (score betting is only available if config exists and enabled)
        const config = await SELECT.one.from(MatchScoreBetConfig).where({ match_ID: matchId });
        if (config && !config.enabled) {
            return req.error(400, 'Score predictions are currently disabled for this match');
        }

        // Lock when match has kicked off
        const now = new Date();
        const kickoff = new Date(match.kickoff);
        if (now >= kickoff) {
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

        const maxBets = config?.maxBets ?? 3;
        if (existingBets.length >= maxBets) {
            return req.error(400, `Maximum ${maxBets} bets per match reached`);
        }

        // Insert bet
        await INSERT.into(ScoreBet).entries({
            player_ID: playerId,
            match_ID: matchId,
            predictedHomeScore: homeScore,
            predictedAwayScore: awayScore,
            status: 'pending',
            submittedAt: now.toISOString()
        });

        return { success: true, message: `Score bet ${homeScore}-${awayScore} placed successfully` };
    }

    /**
     * Combined: submit winner pick + score bets in one action.
     * Validates match, saves/updates prediction, replaces score bets.
     */
    async submitMatchPrediction(req: Request) {
        const { matchId, pick, scores } = req.data;
        const { Prediction, ScoreBet, Match, MatchScoreBetConfig } = cds.entities('cnma.prediction');

        // Validate match
        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');
        if (match.status !== 'upcoming') return req.error(400, 'Match is no longer open for predictions');

        const now = new Date();
        if (new Date(match.kickoff) <= now) {
            return req.error(400, 'Match has already kicked off');
        }

        const playerId = await this.getOrCreatePlayerId(req);

        // ── Save winner prediction ──
        if (pick && ['home', 'draw', 'away'].includes(pick)) {
            const existing = await SELECT.one.from(Prediction)
                .where({ player_ID: playerId, match_ID: matchId });

            if (existing) {
                if (existing.status === 'locked' || existing.status === 'scored') {
                    return req.error(400, 'Prediction is already locked');
                }
                await UPDATE(Prediction).where({ ID: existing.ID }).set({
                    pick,
                    submittedAt: now.toISOString()
                });
            } else {
                await INSERT.into(Prediction).entries({
                    player_ID: playerId,
                    match_ID: matchId,
                    tournament_ID: match.tournament_ID,
                    pick,
                    status: 'submitted',
                    submittedAt: now.toISOString()
                });
            }
        }

        // ── Save score bets ──
        if (scores && scores.length > 0) {
            // Check if match has score bet config enabled
            const config = await SELECT.one.from(MatchScoreBetConfig).where({ match_ID: matchId });
            if (!config || !config.enabled) {
                return req.error(400, 'Score predictions are not available for this match');
            }

            // Lock when match has kicked off
            if (now >= new Date(match.kickoff)) {
                return req.error(400, 'Betting window has closed for this match');
            }

            // Replace existing score bets for this player+match
            await DELETE.from(ScoreBet).where({ player_ID: playerId, match_ID: matchId });

            const validScores = scores.filter(
                (s: any) => s.homeScore >= 0 && s.awayScore >= 0 && s.homeScore <= 99 && s.awayScore <= 99
            );

            for (const s of validScores) {
                await INSERT.into(ScoreBet).entries({
                    player_ID: playerId,
                    match_ID: matchId,
                    predictedHomeScore: s.homeScore,
                    predictedAwayScore: s.awayScore,
                    status: 'pending',
                    submittedAt: now.toISOString()
                });
            }
        }

        return { success: true, message: 'Prediction saved successfully' };
    }

    /**
     * Cancel/clear a match prediction and associated score bets.
     * Removes the prediction and all score bets for the given match.
     */
    async cancelMatchPrediction(req: Request) {
        const { matchId } = req.data;
        const { Prediction, ScoreBet, Match } = cds.entities('cnma.prediction');

        // Validate match
        const match = await SELECT.one.from(Match).where({ ID: matchId });
        if (!match) return req.error(404, 'Match not found');
        if (match.status !== 'upcoming') return req.error(400, 'Match is no longer open for changes');

        const now = new Date();
        if (new Date(match.kickoff) <= now) {
            return req.error(400, 'Match has already kicked off');
        }

        const playerId = await this.getOrCreatePlayerId(req);

        // Check existing prediction
        const existing = await SELECT.one.from(Prediction)
            .where({ player_ID: playerId, match_ID: matchId });

        if (!existing) {
            return { success: true, message: 'No prediction to cancel' };
        }

        if (existing.status === 'locked' || existing.status === 'scored') {
            return req.error(400, 'Prediction is already locked and cannot be cancelled');
        }

        // Delete prediction and associated score bets
        await DELETE.from(Prediction).where({ player_ID: playerId, match_ID: matchId });
        await DELETE.from(ScoreBet).where({ player_ID: playerId, match_ID: matchId });

        return { success: true, message: 'Prediction cancelled successfully' };
    }

    /**
     * Pick tournament champion (UC3).
     * Validates: betting window open, within change deadline.
     */
    async pickChampion(req: Request) {
        const { teamId } = req.data;
        const { ChampionPick, Team, Tournament } = cds.entities('cnma.prediction');

        // Find active tournament with champion betting open
        const tournaments = await SELECT.from(Tournament)
            .where({ championBettingStatus: 'open' });

        if (!tournaments || tournaments.length === 0) {
            return req.error(400, 'No tournament with open champion predictions found');
        }

        // Validate team exists
        const team = await SELECT.one.from(Team).where({ ID: teamId });
        if (!team) return req.error(404, 'Team not found');

        const playerId = await this.getOrCreatePlayerId(req);
        const now = new Date();

        // Check change deadline
        const existing = await SELECT.one.from(ChampionPick)
            .where({ player_ID: playerId });

        if (existing) {
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

    // ── Read-Only Functions ──────────────────────────────────

    /**
     * Get latest match results for a tournament.
     */
    async getLatestResults(req: Request) {
        const { tournamentId } = req.data;
        const { Match } = cds.entities('cnma.prediction');

        const matches = await SELECT.from(Match)
            .where({ tournament_ID: tournamentId, status: 'finished' })
            .orderBy('kickoff desc')
            .limit(50);

        // Expand team names
        const { Team } = cds.entities('cnma.prediction');
        const results = [];
        for (const m of matches) {
            const home = await SELECT.one.from(Team).where({ ID: m.homeTeam_ID });
            const away = await SELECT.one.from(Team).where({ ID: m.awayTeam_ID });
            results.push({
                matchId: m.ID,
                homeTeam: home?.name ?? '',
                homeFlag: home?.flagCode ?? '',
                awayTeam: away?.name ?? '',
                awayFlag: away?.flagCode ?? '',
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                outcome: m.outcome,
                kickoff: m.kickoff,
                stage: m.stage,
                matchday: m.matchday,
            });
        }
        return results;
    }

    /**
     * Get upcoming matches for a tournament.
     */
    async getUpcomingMatches(req: Request) {
        const { tournamentId } = req.data;
        const { Match, Team } = cds.entities('cnma.prediction');

        const matches = await SELECT.from(Match)
            .where({ tournament_ID: tournamentId, status: 'upcoming' })
            .orderBy('kickoff asc')
            .limit(50);

        const results = [];
        for (const m of matches) {
            const home = await SELECT.one.from(Team).where({ ID: m.homeTeam_ID });
            const away = await SELECT.one.from(Team).where({ ID: m.awayTeam_ID });
            results.push({
                matchId: m.ID,
                homeTeam: home?.name ?? '',
                homeFlag: home?.flagCode ?? '',
                awayTeam: away?.name ?? '',
                awayFlag: away?.flagCode ?? '',
                kickoff: m.kickoff,
                stage: m.stage,
                matchday: m.matchday,
                venue: m.venue ?? '',
            });
        }
        return results;
    }

    /**
     * Get prediction leaderboard for a specific tournament (UC2).
     * Sort by totalPoints DESC, then displayName ASC (alphabetical tiebreak).
     */
    async getPredictionLeaderboard(req: Request) {
        const { tournamentId } = req.data;
        const { PlayerTournamentStats, Player } = cds.entities('cnma.prediction');

        const stats = await SELECT.from(PlayerTournamentStats)
            .where({ tournament_ID: tournamentId })
            .orderBy('totalPoints desc');

        // Enrich with player details and sort with name tiebreak
        const enriched = [];
        for (const s of stats) {
            const player = await SELECT.one.from(Player).where({ ID: s.player_ID });
            enriched.push({
                playerId: s.player_ID,
                displayName: player?.displayName ?? '',
                avatarUrl: player?.avatarUrl ?? '',
                totalPoints: Number(s.totalPoints),
                totalCorrect: s.totalCorrect,
                totalPredictions: s.totalPredictions,
                _name: (player?.displayName ?? '').toLowerCase(),
            });
        }

        // Sort: points desc, then name asc
        enriched.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return a._name.localeCompare(b._name);
        });

        return enriched.map((e, i) => ({
            rank: i + 1,
            playerId: e.playerId,
            displayName: e.displayName,
            avatarUrl: e.avatarUrl,
            totalPoints: e.totalPoints,
            totalCorrect: e.totalCorrect,
            totalPredictions: e.totalPredictions,
        }));
    }

    /**
     * Get league standings for a league-format tournament.
     * Calculates W/D/L/GF/GA/GD/Points from finished matches.
     */
    async getStandings(req: Request) {
        const { tournamentId } = req.data;
        const { Tournament, Match, TournamentTeam, Team } = cds.entities('cnma.prediction');

        // Verify tournament is league format
        const tournament = await SELECT.one.from(Tournament).where({ ID: tournamentId });
        if (!tournament) return req.error(404, 'Tournament not found');
        if (tournament.format !== 'league') {
            return req.error(400, 'Standings are only available for league-format tournaments');
        }

        // Get all teams in this tournament
        const tTeams = await SELECT.from(TournamentTeam).where({ tournament_ID: tournamentId });
        const teamIds = tTeams.map((t: any) => t.team_ID);

        // Get all finished matches
        const matches = await SELECT.from(Match)
            .where({ tournament_ID: tournamentId, status: 'finished' });

        // Build standings map
        const standingsMap: Record<string, any> = {};
        for (const tid of teamIds) {
            standingsMap[tid] = {
                teamId: tid,
                played: 0, won: 0, drawn: 0, lost: 0,
                goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
            };
        }

        for (const m of matches) {
            const homeId = m.homeTeam_ID;
            const awayId = m.awayTeam_ID;
            const hs = m.homeScore ?? 0;
            const as_ = m.awayScore ?? 0;

            if (standingsMap[homeId]) {
                standingsMap[homeId].played++;
                standingsMap[homeId].goalsFor += hs;
                standingsMap[homeId].goalsAgainst += as_;
                if (hs > as_) { standingsMap[homeId].won++; standingsMap[homeId].points += 3; }
                else if (hs === as_) { standingsMap[homeId].drawn++; standingsMap[homeId].points += 1; }
                else { standingsMap[homeId].lost++; }
            }
            if (standingsMap[awayId]) {
                standingsMap[awayId].played++;
                standingsMap[awayId].goalsFor += as_;
                standingsMap[awayId].goalsAgainst += hs;
                if (as_ > hs) { standingsMap[awayId].won++; standingsMap[awayId].points += 3; }
                else if (as_ === hs) { standingsMap[awayId].drawn++; standingsMap[awayId].points += 1; }
                else { standingsMap[awayId].lost++; }
            }
        }

        // Compute goal diff and sort
        const standings = Object.values(standingsMap);
        for (const s of standings) {
            s.goalDiff = s.goalsFor - s.goalsAgainst;
        }
        standings.sort((a: any, b: any) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
            return b.goalsFor - a.goalsFor;
        });

        // Enrich with team names
        const result = [];
        for (const s of standings) {
            const team = await SELECT.one.from(Team).where({ ID: s.teamId });
            result.push({
                teamId: s.teamId,
                teamName: team?.name ?? '',
                teamFlag: team?.flagCode ?? '',
                played: s.played,
                won: s.won,
                drawn: s.drawn,
                lost: s.lost,
                goalsFor: s.goalsFor,
                goalsAgainst: s.goalsAgainst,
                goalDiff: s.goalDiff,
                points: s.points,
            });
        }

        return result;
    }

    /**
     * Get the current user's recent predictions with match details.
     * Ordered by submittedAt DESC.
     */
    async getMyRecentPredictions(req: Request) {
        const { limit: rawLimit } = req.data;
        const limit = rawLimit && rawLimit > 0 ? Math.min(rawLimit, 50) : 20;
        const { Prediction, Match, Team, Tournament } = cds.entities('cnma.prediction');

        const playerId = await this.getCurrentPlayerId(req);
        if (!playerId) return [];

        const predictions = await SELECT.from(Prediction)
            .where({ player_ID: playerId })
            .orderBy('submittedAt desc')
            .limit(limit);

        const results = [];
        for (const p of predictions) {
            const match = await SELECT.one.from(Match).where({ ID: p.match_ID });
            if (!match) continue;
            const home = await SELECT.one.from(Team).where({ ID: match.homeTeam_ID });
            const away = await SELECT.one.from(Team).where({ ID: match.awayTeam_ID });
            const tournament = p.tournament_ID
                ? await SELECT.one.from(Tournament).where({ ID: p.tournament_ID })
                : null;

            results.push({
                predictionId: p.ID,
                matchId: match.ID,
                homeTeam: home?.name ?? '',
                homeFlag: home?.flagCode ?? '',
                awayTeam: away?.name ?? '',
                awayFlag: away?.flagCode ?? '',
                tournamentName: tournament?.name ?? '',
                pick: p.pick,
                status: p.status,
                isCorrect: p.isCorrect,
                pointsEarned: Number(p.pointsEarned) || 0,
                submittedAt: p.submittedAt,
                kickoff: match.kickoff,
                homeScore: match.homeScore,
                awayScore: match.awayScore,
            });
        }
        return results;
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
