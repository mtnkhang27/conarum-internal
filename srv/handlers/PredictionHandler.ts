import cds, { Request } from "@sap/cds";
import { materializeSlotBetsForMatch } from "../lib/SlotBetMaterializer";
import { PlayerResolver } from "../lib/PlayerResolver";

/**
 * PredictionHandler — Handles user prediction submissions.
 * Validates business rules before persisting predictions.
 */
export class PredictionHandler {
  private playerResolver: PlayerResolver;

  constructor() {
    this.playerResolver = new PlayerResolver();
  }

  /**
   * Submit match outcome predictions (UC2: Win/Draw/Lose).
   * Validates: match exists, not kicked off, pick is valid.
   * Scoring: 1 point if correct, 0 if wrong, no weight.
   */
  async submitPredictions(req: Request) {
    const { predictions } = req.data;
    const { Prediction, Match } = cds.entities("cnma.prediction");

    if (!predictions || predictions.length === 0) {
      return req.error(400, "No predictions provided");
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

      if (match.status !== "upcoming") {
        req.error(
          400,
          `Match ${pred.matchId} is no longer open for predictions`,
        );
        continue;
      }

      if (match.bettingLocked) {
        req.error(400, `Betting for match ${pred.matchId} is locked by admin`);
        continue;
      }

      // Only allow betting when tournament is active
      if (match.tournament_ID) {
        const { Tournament } = cds.entities("cnma.prediction");
        const tournament = await SELECT.one
          .from(Tournament)
          .where({ ID: match.tournament_ID });
        if (tournament && tournament.bettingLocked) {
          req.error(400, "Betting for this tournament is locked by admin");
          continue;
        }
        if (tournament && tournament.status !== "active") {
          req.error(
            400,
            tournament.status === "upcoming"
              ? "Tournament has not started yet — predictions open once the tournament is active"
              : "Tournament has ended — predictions are no longer accepted",
          );
          continue;
        }
      }

      if (new Date(match.kickoff) <= now) {
        req.error(400, `Match ${pred.matchId} has already kicked off`);
        continue;
      }

      // Validate pick value
      if (!["home", "draw", "away"].includes(pred.pick)) {
        req.error(
          400,
          `Invalid pick "${pred.pick}". Must be: home, draw, away`,
        );
        continue;
      }

      // Upsert: update if exists, insert if new
      const existing = await SELECT.one
        .from(Prediction)
        .where({ player_ID: playerId, match_ID: pred.matchId });

      if (existing) {
        if (existing.status === "locked" || existing.status === "scored") {
          req.error(
            400,
            `Prediction for match ${pred.matchId} is already locked`,
          );
          continue;
        }
        await UPDATE(Prediction).where({ ID: existing.ID }).set({
          pick: pred.pick,
          submittedAt: now.toISOString(),
        });
      } else {
        await INSERT.into(Prediction).entries({
          player_ID: playerId,
          match_ID: pred.matchId,
          tournament_ID: match.tournament_ID,
          pick: pred.pick,
          status: "submitted",
          submittedAt: now.toISOString(),
        });
      }
      savedCount++;
    }

    return {
      success: savedCount > 0,
      message: `${savedCount} prediction(s) saved`,
      count: savedCount,
    };
  }

  /**
   * Place an exact score bet (UC1).
   * Validates: match exists, not kicked off, max bets not exceeded.
   * Uses per-match MatchScoreBetConfig.
   */
  async submitScoreBet(req: Request) {
    const { matchId, homeScore, awayScore } = req.data;
    const { ScoreBet, Match, MatchScoreBetConfig } =
      cds.entities("cnma.prediction");

    // Validate match
    const match = await SELECT.one.from(Match).where({ ID: matchId });
    if (!match) return req.error(404, "Match not found");
    if (match.status !== "upcoming")
      return req.error(400, "Match is no longer open for bets");
    if (match.bettingLocked)
      return req.error(400, "Betting for this match is locked by admin");

    // Only allow betting when tournament is active
    if (match.tournament_ID) {
      const { Tournament } = cds.entities("cnma.prediction");
      const tournament = await SELECT.one
        .from(Tournament)
        .where({ ID: match.tournament_ID });
      if (tournament && tournament.bettingLocked) {
        return req.error(400, "Betting for this tournament is locked by admin");
      }
      if (tournament && tournament.status !== "active") {
        return req.error(
          400,
          tournament.status === "upcoming"
            ? "Tournament has not started yet — score bets open once the tournament is active"
            : "Tournament has ended — score bets are no longer accepted",
        );
      }
    }

    // Get per-match config (score betting is only available if config exists and enabled)
    const config = await SELECT.one
      .from(MatchScoreBetConfig)
      .where({ match_ID: matchId });
    if (config && !config.enabled) {
      return req.error(
        400,
        "Score predictions are currently disabled for this match",
      );
    }

    // Lock when match has kicked off
    const now = new Date();
    const kickoff = new Date(match.kickoff);
    if (now >= kickoff) {
      return req.error(400, "Betting window has closed for this match");
    }

    // Validate scores (non-negative)
    if (homeScore < 0 || awayScore < 0 || homeScore > 99 || awayScore > 99) {
      return req.error(400, "Score must be between 0 and 99");
    }

    const playerId = await this.getOrCreatePlayerId(req);

    // Check max bets per match
    const existingBets = await SELECT.from(ScoreBet).where({
      player_ID: playerId,
      match_ID: matchId,
    });

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
      status: "pending",
      submittedAt: now.toISOString(),
    });

    return {
      success: true,
      message: `Score bet ${homeScore}-${awayScore} placed successfully`,
    };
  }

  /**
   * Combined: submit winner pick + score bets in one action.
   * Validates match, saves/updates prediction, replaces score bets.
   */
  async submitMatchPrediction(req: Request) {
    const { matchId, pick, scores } = req.data;
    const { Prediction, ScoreBet, Match, MatchScoreBetConfig } =
      cds.entities("cnma.prediction");

    // Validate match
    const match = await SELECT.one.from(Match).where({ ID: matchId });
    if (!match) return req.error(404, "Match not found");
    if (match.status !== "upcoming")
      return req.error(400, "Match is no longer open for predictions");
    if (match.bettingLocked)
      return req.error(400, "Betting for this match is locked by admin");

    const now = new Date();
    if (new Date(match.kickoff) <= now) {
      return req.error(400, "Match has already kicked off");
    }

    // If this match came from an unresolved bracket slot, auto-materialize
    // previously saved slot bets first so user data stays consistent.
    await materializeSlotBetsForMatch(matchId);

    // Only allow betting when tournament is active
    if (match.tournament_ID) {
      const { Tournament } = cds.entities("cnma.prediction");
      const tournament = await SELECT.one
        .from(Tournament)
        .where({ ID: match.tournament_ID });
      if (tournament && tournament.bettingLocked) {
        return req.error(400, "Betting for this tournament is locked by admin");
      }
      if (tournament && tournament.status !== "active") {
        return req.error(
          400,
          tournament.status === "upcoming"
            ? "Tournament has not started yet — predictions open once the tournament is active"
            : "Tournament has ended — predictions are no longer accepted",
        );
      }
    }

    const playerId = await this.getOrCreatePlayerId(req);

    // ── Save winner prediction ──
    if (pick && ["home", "draw", "away"].includes(pick)) {
      const existing = await SELECT.one
        .from(Prediction)
        .where({ player_ID: playerId, match_ID: matchId });

      if (existing) {
        if (existing.status === "locked" || existing.status === "scored") {
          return req.error(400, "Prediction is already locked");
        }
        await UPDATE(Prediction).where({ ID: existing.ID }).set({
          pick,
          submittedAt: now.toISOString(),
        });
      } else {
        await INSERT.into(Prediction).entries({
          player_ID: playerId,
          match_ID: matchId,
          tournament_ID: match.tournament_ID,
          pick,
          status: "submitted",
          submittedAt: now.toISOString(),
        });
      }
    }

    // ── Save score bets ──
    if (scores && scores.length > 0) {
      // Check if match has score bet config enabled
      const config = await SELECT.one
        .from(MatchScoreBetConfig)
        .where({ match_ID: matchId });
      if (!config || !config.enabled) {
        return req.error(
          400,
          "Score predictions are not available for this match",
        );
      }

      // Lock when match has kicked off
      if (now >= new Date(match.kickoff)) {
        return req.error(400, "Betting window has closed for this match");
      }

      // Replace existing score bets for this player+match
      await DELETE.from(ScoreBet).where({
        player_ID: playerId,
        match_ID: matchId,
      });

      const validScores = scores.filter(
        (s: any) =>
          s.homeScore >= 0 &&
          s.awayScore >= 0 &&
          s.homeScore <= 99 &&
          s.awayScore <= 99,
      );

      for (const s of validScores) {
        await INSERT.into(ScoreBet).entries({
          player_ID: playerId,
          match_ID: matchId,
          predictedHomeScore: s.homeScore,
          predictedAwayScore: s.awayScore,
          status: "pending",
          submittedAt: now.toISOString(),
        });
      }
    }

    return { success: true, message: "Prediction saved successfully" };
  }

  /**
   * Submit prediction for an unresolved bracket slot.
   * Keeps the player flow identical: pick outcome + score(s) in one action.
   */
  async submitSlotPrediction(req: Request) {
    const { slotId, pick, scores } = req.data;
    const { BracketSlot, Match, Tournament, SlotPrediction, SlotScoreBet } =
      cds.entities("cnma.prediction");

    if (!slotId) return req.error(400, "slotId is required");

    const slot = await SELECT.one.from(BracketSlot).where({ ID: slotId });
    if (!slot) return req.error(404, "Bracket slot not found");
    if (slot.winner_ID) return req.error(400, "This slot is already resolved");

    const tournament = slot.tournament_ID
      ? await SELECT.one.from(Tournament).where({ ID: slot.tournament_ID })
      : null;
    if (!tournament)
      return req.error(404, "Tournament not found for this slot");
    if (tournament.bettingLocked) {
      return req.error(400, "Betting for this tournament is locked by admin");
    }
    if (tournament.status !== "active") {
      return req.error(
        400,
        tournament.status === "upcoming"
          ? "Tournament has not started yet - predictions open once the tournament is active"
          : "Tournament has ended - predictions are no longer accepted",
      );
    }

    // If concrete match already exists, transparently use match flow so
    // admin rules (lock/config/kickoff) are applied consistently.
    if (slot.leg1_ID) {
      const linkedMatch = await SELECT.one
        .from(Match)
        .where({ ID: slot.leg1_ID });
      if (linkedMatch) {
        // Preserve the original CDS Request object (with prototype methods
        // like req.error) — spreading it into a plain object would lose them.
        const originalData = req.data;
        try {
          req.data = { matchId: linkedMatch.ID, pick, scores };
          return await this.submitMatchPrediction(req);
        } finally {
          req.data = originalData;
        }
      }
    }

    if (Array.isArray(scores) && scores.length > 0) {
      return req.error(
        400,
        "Score predictions are not available for this slot until a concrete match exists and admin enables score betting",
      );
    }

    if (!["home", "draw", "away"].includes(pick)) {
      return req.error(
        400,
        `Invalid pick "${pick}". Must be: home, draw, away`,
      );
    }

    const playerId = await this.getOrCreatePlayerId(req);
    const nowIso = new Date().toISOString();

    const existing = await SELECT.one.from(SlotPrediction).where({
      player_ID: playerId,
      slot_ID: slotId,
    });

    if (existing) {
      if (existing.status === "locked" || existing.status === "scored") {
        return req.error(400, "Slot prediction is already locked");
      }
      await UPDATE(SlotPrediction).where({ ID: existing.ID }).set({
        pick,
        submittedAt: nowIso,
        status: "submitted",
      });
    } else {
      await INSERT.into(SlotPrediction).entries({
        player_ID: playerId,
        slot_ID: slotId,
        tournament_ID: tournament.ID,
        pick,
        status: "submitted",
        submittedAt: nowIso,
      });
    }

    await DELETE.from(SlotScoreBet).where({
      player_ID: playerId,
      slot_ID: slotId,
    });

    const validScores = Array.isArray(scores)
      ? scores.filter(
          (s: any) =>
            s.homeScore >= 0 &&
            s.awayScore >= 0 &&
            s.homeScore <= 99 &&
            s.awayScore <= 99,
        )
      : [];
    const limitedScores = validScores.slice(0, 3);

    for (const s of limitedScores) {
      await INSERT.into(SlotScoreBet).entries({
        player_ID: playerId,
        slot_ID: slotId,
        tournament_ID: tournament.ID,
        predictedHomeScore: s.homeScore,
        predictedAwayScore: s.awayScore,
        status: "pending",
        submittedAt: nowIso,
      });
    }

    return { success: true, message: "Prediction saved successfully" };
  }

  /**
   * Cancel/clear slot prediction and associated slot score bets.
   */
  async cancelSlotPrediction(req: Request) {
    const { slotId } = req.data;
    const { BracketSlot, Match, Tournament, SlotPrediction, SlotScoreBet } =
      cds.entities("cnma.prediction");

    if (!slotId) return req.error(400, "slotId is required");

    const slot = await SELECT.one.from(BracketSlot).where({ ID: slotId });
    if (!slot) return req.error(404, "Bracket slot not found");

    const tournament = slot.tournament_ID
      ? await SELECT.one.from(Tournament).where({ ID: slot.tournament_ID })
      : null;
    if (tournament?.bettingLocked) {
      return req.error(400, "Betting for this tournament is locked by admin");
    }

    // If concrete match already exists, use match cancellation flow so
    // admin rules (lock/kickoff) are applied consistently.
    if (slot.leg1_ID) {
      const linkedMatch = await SELECT.one
        .from(Match)
        .where({ ID: slot.leg1_ID });
      if (linkedMatch) {
        const originalData = req.data;
        try {
          req.data = { matchId: linkedMatch.ID };
          return await this.cancelMatchPrediction(req);
        } finally {
          req.data = originalData;
        }
      }
    }

    const playerId = await this.getOrCreatePlayerId(req);

    await DELETE.from(SlotPrediction).where({
      player_ID: playerId,
      slot_ID: slotId,
    });
    await DELETE.from(SlotScoreBet).where({
      player_ID: playerId,
      slot_ID: slotId,
    });

    return { success: true, message: "Prediction cancelled successfully" };
  }

  /**
   * Cancel/clear a match prediction and associated score bets.
   * Removes the prediction and all score bets for the given match.
   */
  async cancelMatchPrediction(req: Request) {
    const { matchId } = req.data;
    const { Prediction, ScoreBet, Match } = cds.entities("cnma.prediction");

    // Validate match
    const match = await SELECT.one.from(Match).where({ ID: matchId });
    if (!match) return req.error(404, "Match not found");
    if (match.status !== "upcoming")
      return req.error(400, "Match is no longer open for changes");
    if (match.bettingLocked)
      return req.error(400, "Betting for this match is locked by admin");

    const now = new Date();
    if (new Date(match.kickoff) <= now) {
      return req.error(400, "Match has already kicked off");
    }

    // Ensure any legacy slot-based bets for this bracket slot are converted
    // before cancellation logic so a single cancel clears everything.
    await materializeSlotBetsForMatch(matchId);

    const playerId = await this.getOrCreatePlayerId(req);

    // Check existing prediction
    const existing = await SELECT.one
      .from(Prediction)
      .where({ player_ID: playerId, match_ID: matchId });

    if (!existing) {
      return { success: true, message: "No prediction to cancel" };
    }

    if (existing.status === "locked" || existing.status === "scored") {
      return req.error(
        400,
        "Prediction is already locked and cannot be cancelled",
      );
    }

    // Delete prediction and associated score bets
    await DELETE.from(Prediction).where({
      player_ID: playerId,
      match_ID: matchId,
    });
    await DELETE.from(ScoreBet).where({
      player_ID: playerId,
      match_ID: matchId,
    });

    return { success: true, message: "Prediction cancelled successfully" };
  }

  /**
   * Pick tournament champion (UC3).
   * Validates: specific tournament exists, betting window open.
   * One pick per player per tournament.
   */
  async pickChampion(req: Request) {
    const { teamId, tournamentId } = req.data;
    const { ChampionPick, Team, Tournament } = cds.entities("cnma.prediction");

    if (!tournamentId) {
      return req.error(400, "tournamentId is required");
    }

    // Validate tournament and check champion betting status
    const tournament = await SELECT.one
      .from(Tournament)
      .where({ ID: tournamentId });
    if (!tournament) {
      return req.error(404, "Tournament not found");
    }

    if (tournament.championBettingStatus !== "open") {
      return req.error(
        400,
        `Champion predictions are ${tournament.championBettingStatus} for this tournament`,
      );
    }

    if (tournament.bettingLocked) {
      return req.error(400, "Betting for this tournament is locked by admin");
    }

    if (tournament.status !== "active") {
      return req.error(
        400,
        tournament.status === "upcoming"
          ? "Tournament has not started yet — champion picks open once the tournament is active"
          : "Tournament has ended — champion predictions are closed",
      );
    }

    // Validate team exists
    const team = await SELECT.one.from(Team).where({ ID: teamId });
    if (!team) return req.error(404, "Team not found");

    const playerId = await this.getOrCreatePlayerId(req);
    const now = new Date();

    // Check for existing pick for this specific tournament
    const existing = await SELECT.one
      .from(ChampionPick)
      .where({ player_ID: playerId, tournament_ID: tournamentId });

    if (existing) {
      // Update existing pick for this tournament
      await UPDATE(ChampionPick).where({ ID: existing.ID }).set({
        team_ID: teamId,
        submittedAt: now.toISOString(),
      });
      return {
        success: true,
        message: `Champion pick updated to ${team.name}`,
      };
    }

    // New pick for this tournament
    await INSERT.into(ChampionPick).entries({
      player_ID: playerId,
      team_ID: teamId,
      tournament_ID: tournamentId,
      submittedAt: now.toISOString(),
    });

    return {
      success: true,
      message: `${team.name} selected as your champion prediction`,
    };
  }

  // ── Read-Only Functions ──────────────────────────────────

  /**
   * Get latest match results for a tournament.
   */
  async getLatestResults(req: Request) {
    const { tournamentId } = req.data;
    const { Match, Team } = cds.entities("cnma.prediction");

    const matches = await SELECT.from(Match)
      .where({ tournament_ID: tournamentId, status: "finished" })
      .orderBy("kickoff desc")
      .limit(50);

    // Batch-fetch all teams referenced by these matches
    const teamIds = [
      ...new Set(
        matches
          .flatMap((m: any) => [m.homeTeam_ID, m.awayTeam_ID])
          .filter(Boolean),
      ),
    ];
    const teams =
      teamIds.length > 0
        ? await SELECT.from(Team).where({ ID: { in: teamIds } })
        : [];
    const teamMap: Map<string, any> = new Map(
      teams.map((t: any) => [t.ID as string, t]),
    );

    return matches.map((m: any) => {
      const home = teamMap.get(m.homeTeam_ID);
      const away = teamMap.get(m.awayTeam_ID);
      return {
        matchId: m.ID,
        homeTeam: home?.name ?? "",
        homeFlag: home?.flagCode ?? "",
        homeCrest: home?.crest ?? "",
        awayTeam: away?.name ?? "",
        awayFlag: away?.flagCode ?? "",
        awayCrest: away?.crest ?? "",
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        outcome: m.outcome,
        kickoff: m.kickoff,
        stage: m.stage,
        matchday: m.matchday,
      };
    });
  }

  /**
   * Get upcoming matches for a tournament.
   */
  async getUpcomingMatches(req: Request) {
    const { tournamentId } = req.data;
    const { Match, Team } = cds.entities("cnma.prediction");

    const matches = await SELECT.from(Match)
      .where({ tournament_ID: tournamentId, status: "upcoming" })
      .orderBy("kickoff asc")
      .limit(50);

    // Batch-fetch all teams
    const teamIds = [
      ...new Set(
        matches
          .flatMap((m: any) => [m.homeTeam_ID, m.awayTeam_ID])
          .filter(Boolean),
      ),
    ];
    const teams =
      teamIds.length > 0
        ? await SELECT.from(Team).where({ ID: { in: teamIds } })
        : [];
    const teamMap: Map<string, any> = new Map(
      teams.map((t: any) => [t.ID as string, t]),
    );

    return matches.map((m: any) => {
      const home = teamMap.get(m.homeTeam_ID);
      const away = teamMap.get(m.awayTeam_ID);
      return {
        matchId: m.ID,
        homeTeam: home?.name ?? "",
        homeFlag: home?.flagCode ?? "",
        homeCrest: home?.crest ?? "",
        awayTeam: away?.name ?? "",
        awayFlag: away?.flagCode ?? "",
        awayCrest: away?.crest ?? "",
        kickoff: m.kickoff,
        stage: m.stage,
        matchday: m.matchday,
        venue: m.venue ?? "",
      };
    });
  }

  /**
   * Get league standings for a league-format tournament.
   * Calculates W/D/L/GF/GA/GD/Points from finished matches.
   */
  async getStandings(req: Request) {
    const { tournamentId } = req.data;
    const { Tournament, Match, TournamentTeam, Team } =
      cds.entities("cnma.prediction");

    // Verify tournament is league format
    const tournament = await SELECT.one
      .from(Tournament)
      .where({ ID: tournamentId });
    if (!tournament) return req.error(404, "Tournament not found");
    if (tournament.format !== "league") {
      return req.error(
        400,
        "Standings are only available for league-format tournaments",
      );
    }

    // Get all teams in this tournament
    const tTeams = await SELECT.from(TournamentTeam).where({
      tournament_ID: tournamentId,
    });
    const teamIds = tTeams.map((t: any) => t.team_ID);

    // Get all finished matches
    const matches = await SELECT.from(Match).where({
      tournament_ID: tournamentId,
      status: "finished",
    });

    // Build standings map
    const standingsMap: Record<string, any> = {};
    for (const tid of teamIds) {
      standingsMap[tid] = {
        teamId: tid,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
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
        if (hs > as_) {
          standingsMap[homeId].won++;
          standingsMap[homeId].points += 3;
        } else if (hs === as_) {
          standingsMap[homeId].drawn++;
          standingsMap[homeId].points += 1;
        } else {
          standingsMap[homeId].lost++;
        }
      }
      if (standingsMap[awayId]) {
        standingsMap[awayId].played++;
        standingsMap[awayId].goalsFor += as_;
        standingsMap[awayId].goalsAgainst += hs;
        if (as_ > hs) {
          standingsMap[awayId].won++;
          standingsMap[awayId].points += 3;
        } else if (as_ === hs) {
          standingsMap[awayId].drawn++;
          standingsMap[awayId].points += 1;
        } else {
          standingsMap[awayId].lost++;
        }
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

    // Enrich with team names (batch-fetch)
    const enrichTeamIds = [
      ...new Set(
        Object.values(standingsMap)
          .map((s: any) => s.teamId)
          .filter(Boolean),
      ),
    ];
    const teams =
      enrichTeamIds.length > 0
        ? await SELECT.from(Team).where({ ID: { in: enrichTeamIds } })
        : [];
    const teamMap: Map<string, any> = new Map(
      teams.map((t: any) => [t.ID as string, t]),
    );

    const result = standings.map((s: any) => {
      const team = teamMap.get(s.teamId);
      return {
        teamId: s.teamId,
        teamName: team?.name ?? "",
        teamFlag: team?.flagCode ?? "",
        teamCrest: team?.crest ?? "",
        played: s.played,
        won: s.won,
        drawn: s.drawn,
        lost: s.lost,
        goalsFor: s.goalsFor,
        goalsAgainst: s.goalsAgainst,
        goalDiff: s.goalDiff,
        points: s.points,
      };
    });

    return result;
  }

  /**
   * Get champion pick counts by team for a tournament.
   * Returns how many players picked each team, with team info.
   */
  async getChampionPickCounts(req: Request) {
    const { tournamentId } = req.data;
    const { ChampionPick, Team } = cds.entities("cnma.prediction");

    const picks = await SELECT.from(ChampionPick).where({
      tournament_ID: tournamentId,
    });

    const countMap = new Map<string, number>();
    for (const pick of picks) {
      const teamId = pick.team_ID;
      countMap.set(teamId, (countMap.get(teamId) ?? 0) + 1);
    }

    // Batch-fetch all teams
    const teamIds = [...countMap.keys()];
    const teams =
      teamIds.length > 0
        ? await SELECT.from(Team).where({ ID: { in: teamIds } })
        : [];
    const teamMap: Map<string, any> = new Map(
      teams.map((t: any) => [t.ID as string, t]),
    );

    const results = teamIds.map((teamId) => {
      const team = teamMap.get(teamId);
      return {
        teamId,
        teamName: team?.name ?? "",
        teamCrest: team?.crest ?? "",
        count: countMap.get(teamId) ?? 0,
      };
    });

    return results.sort((a, b) => b.count - a.count);
  }

  // ── Player Resolution (delegated to PlayerResolver) ─────

  private async getOrCreatePlayerId(req: Request): Promise<string> {
    return this.playerResolver.getOrCreatePlayerId(req);
  }
}


