import cds, { Request } from "@sap/cds";
import { ScoringEngine } from "../lib/ScoringEngine";
import { materializeSlotBetsForMatch } from "../lib/SlotBetMaterializer";
import { PlayerResolver } from "../lib/PlayerResolver";

type TeamLookup = {
  ID?: string | null;
  name?: string | null;
  flagCode?: string | null;
  crest?: string | null;
  confederation?: string | null;
  fifaRanking?: number | null;
};

type PlayerLookup = {
  ID?: string | null;
  email?: string | null;
  bio?: string | null;
  country?: unknown;
  country_code?: string | null;
  favoriteTeam_ID?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  loginName?: string | null;
};

type MatchLookup = {
  ID?: string | null;
  homeTeam_ID?: string | null;
  awayTeam_ID?: string | null;
  externalId?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string | null;
  kickoff?: string | null;
};

type TournamentLookup = {
  ID?: string | null;
  name?: string | null;
};

type PlayerTournamentStatsLookup = {
  ID?: string | null;
  player_ID?: string | null;
  tournament_ID?: string | null;
  rank?: number | null;
  totalPoints?: number | null;
  totalCorrect?: number | null;
  totalPredictions?: number | null;
};

type CompletedMatchLookup = {
  ID?: string | null;
  tournament_ID?: string | null;
  kickoff?: string | null;
  stage?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeTeam_ID?: string | null;
  awayTeam_ID?: string | null;
};

type PredictionLookup = {
  ID?: string | null;
  player_ID?: string | null;
  match_ID?: string | null;
  tournament_ID?: string | null;
  pick?: string | null;
  status?: string | null;
  isCorrect?: boolean | null;
  pointsEarned?: number | null;
  submittedAt?: string | null;
};

type BracketSlotLookup = {
  ID?: string | null;
  tournament_ID?: string | null;
  stage?: string | null;
  position?: number | null;
  label?: string | null;
  homeTeam_ID?: string | null;
  awayTeam_ID?: string | null;
  leg1_ID?: string | null;
  leg2_ID?: string | null;
  leg1ExternalId?: number | null;
  leg2ExternalId?: number | null;
  homeAgg?: number | null;
  awayAgg?: number | null;
  homePen?: number | null;
  awayPen?: number | null;
  winner_ID?: string | null;
  nextSlot_ID?: string | null;
  nextSlotSide?: string | null;
};

const toIdMap = <T extends { ID?: string | null }>(rows: readonly T[]) =>
  new Map<string, T>(
    rows.flatMap((row) =>
      typeof row.ID === "string" && row.ID.length > 0
        ? [[row.ID, row] as const]
        : [],
    ),
  );

const toExternalIdMap = <T extends { externalId?: number | null }>(
  rows: readonly T[],
) =>
  new Map<number, T>(
    rows.flatMap((row) =>
      typeof row.externalId === "number"
        ? [[row.externalId, row] as const]
        : [],
    ),
  );

/**
 * PredictionHandler — Handles user prediction submissions.
 * Validates business rules before persisting predictions.
 */
export class PredictionHandler {
  private srv: cds.ApplicationService;
  private playerResolver: PlayerResolver;

  constructor(srv: cds.ApplicationService) {
    this.srv = srv;
    this.playerResolver = new PlayerResolver();
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
        const existingWhere = req.query.SELECT.where;
        const playerFilter = [{ ref: ["player_ID"] }, "=", { val: userId }];
        if (existingWhere && existingWhere.length > 0) {
          // Wrap existing conditions in parens and AND with player filter
          req.query.SELECT.where = [
            "(",
            ...existingWhere,
            ")",
            "and",
            ...playerFilter,
          ];
        } else {
          req.query.SELECT.where = playerFilter;
        }
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
   * Materialize CompletedMatchesView without requiring the generated HANA view
   * to be deployed. This keeps the API as a plain GET endpoint in hybrid/local runs.
   */
  async readCompletedMatchesView(req: Request) {
    const { Match, Team } = cds.entities("cnma.prediction");
    const query = SELECT.from(Match).columns(
      "ID",
      "tournament_ID",
      "kickoff",
      "stage",
      "homeScore",
      "awayScore",
      "homeTeam_ID",
      "awayTeam_ID",
    );

    this.copyReadClauses(req, query);
    this.andWhere(query, [{ ref: ["status"] }, "=", { val: "finished" }]);

    const matches = (await query) as CompletedMatchLookup[];
    const teamIds = [
      ...new Set(
        matches
          .flatMap((match) => [match.homeTeam_ID, match.awayTeam_ID])
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const teams =
      teamIds.length > 0
        ? ((await SELECT.from(Team).where({
            ID: { in: teamIds },
          })) as TeamLookup[])
        : [];
    const teamMap = toIdMap(teams);

    let totalCount = matches.length;
    if (req.query.SELECT?.count) {
      const countQuery = SELECT.from(Match).columns("ID");
      this.copyReadClauses(req, countQuery, {
        includeOrderBy: false,
        includeLimit: false,
      });
      this.andWhere(countQuery, [
        { ref: ["status"] },
        "=",
        { val: "finished" },
      ]);
      const countRows = await countQuery;
      totalCount = Array.isArray(countRows) ? countRows.length : 0;
    }

    const rows = matches.map((match) => {
      const home = match.homeTeam_ID
        ? teamMap.get(match.homeTeam_ID)
        : undefined;
      const away = match.awayTeam_ID
        ? teamMap.get(match.awayTeam_ID)
        : undefined;
      return {
        ID: match.ID ?? null,
        tournament_ID: match.tournament_ID ?? null,
        kickoff: match.kickoff ?? null,
        stage: match.stage ?? null,
        homeScore: match.homeScore ?? null,
        awayScore: match.awayScore ?? null,
        homeTeam_ID: match.homeTeam_ID ?? null,
        homeTeamName: home?.name ?? null,
        homeTeamFlag: home?.flagCode ?? null,
        homeTeamCrest: home?.crest ?? null,
        awayTeam_ID: match.awayTeam_ID ?? null,
        awayTeamName: away?.name ?? null,
        awayTeamFlag: away?.flagCode ?? null,
        awayTeamCrest: away?.crest ?? null,
        myPick: null,
      };
    });

    if (Array.isArray(rows) && req.query.SELECT?.count) {
      (rows as any).$count = totalCount;
    }

    return this.finalizeReadResult(rows, req);
  }

  /**
   * Materialize AvailableMatchesView — upcoming matches with pre-joined teams.
   * Same pattern as readCompletedMatchesView but for status='upcoming'.
   */
  async readAvailableMatchesView(req: Request) {
    const { Match, Team, MatchScoreBetConfig } =
      cds.entities("cnma.prediction");
    const query = SELECT.from(Match).columns(
      "ID",
      "tournament_ID",
      "kickoff",
      "stage",
      "status",
      "bettingLocked",
      "isHotMatch",
      "outcomePoints",
      "matchday",
      "bracketSlot_ID",
      "homeTeam_ID",
      "awayTeam_ID",
      "homeScore",
      "awayScore",
    );

    this.copyReadClauses(req, query);
    this.andWhere(query, [{ ref: ["status"] }, "=", { val: "upcoming" }]);

    const matches = (await query) as any[];

    // Batch-fetch teams
    const teamIds = [
      ...new Set(
        matches
          .flatMap((m) => [m.homeTeam_ID, m.awayTeam_ID])
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    ];
    const teams =
      teamIds.length > 0
        ? ((await SELECT.from(Team).where({
            ID: { in: teamIds },
          })) as TeamLookup[])
        : [];
    const teamMap = toIdMap(teams);

    // Batch-fetch score bet configs for these matches
    const matchIds = matches.map((m) => m.ID).filter(Boolean);
    const scoreBetConfigs =
      matchIds.length > 0
        ? await SELECT.from(MatchScoreBetConfig).where({
            match_ID: { in: matchIds },
          })
        : [];
    const configMap = new Map<string, any>();
    for (const cfg of scoreBetConfigs as any[]) {
      if (cfg.enabled) configMap.set(cfg.match_ID, cfg);
    }

    let totalCount = matches.length;
    if (req.query.SELECT?.count) {
      const countQuery = SELECT.from(Match).columns("ID");
      this.copyReadClauses(req, countQuery, {
        includeOrderBy: false,
        includeLimit: false,
      });
      this.andWhere(countQuery, [
        { ref: ["status"] },
        "=",
        { val: "upcoming" },
      ]);
      const countRows = await countQuery;
      totalCount = Array.isArray(countRows) ? countRows.length : 0;
    }

    const rows = matches.map((match) => {
      const home = match.homeTeam_ID
        ? teamMap.get(match.homeTeam_ID)
        : undefined;
      const away = match.awayTeam_ID
        ? teamMap.get(match.awayTeam_ID)
        : undefined;
      const enabledCfg = configMap.get(match.ID);
      return {
        ID: match.ID ?? null,
        tournament_ID: match.tournament_ID ?? null,
        kickoff: match.kickoff ?? null,
        stage: match.stage ?? null,
        status: match.status ?? null,
        bettingLocked: match.bettingLocked ?? false,
        isHotMatch: match.isHotMatch ?? false,
        outcomePoints: match.outcomePoints ?? 0,
        matchday: match.matchday ?? null,
        bracketSlot_ID: match.bracketSlot_ID ?? null,
        homeTeam_ID: match.homeTeam_ID ?? null,
        homeTeamName: home?.name ?? null,
        homeTeamFlag: home?.flagCode ?? null,
        homeTeamCrest: home?.crest ?? null,
        awayTeam_ID: match.awayTeam_ID ?? null,
        awayTeamName: away?.name ?? null,
        awayTeamFlag: away?.flagCode ?? null,
        awayTeamCrest: away?.crest ?? null,
        myPick: null,
        scoreBettingEnabled: !!enabledCfg,
        maxBets: enabledCfg?.maxBets ?? 3,
      };
    });

    if (Array.isArray(rows) && req.query.SELECT?.count) {
      (rows as any).$count = totalCount;
    }

    return this.finalizeReadResult(rows, req);
  }

  /**
   * Enrich AvailableMatchesView rows with the user's prediction picks
   * and score bets. Two batch queries, no N+1.
   */
  async enrichAvailableMatchesView(rows: any[] | any, req: Request) {
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    if (list.length === 0) return;

    const currentPlayerId = await this.getCurrentPlayerId(req);
    if (!currentPlayerId) return;

    const { Prediction, ScoreBet } = cds.entities("cnma.prediction");
    const matchIds = list.map((r: any) => r.ID).filter(Boolean);
    if (matchIds.length === 0) return;

    // Batch-fetch predictions
    const predictions = await SELECT.from(Prediction).where({
      player_ID: currentPlayerId,
      match_ID: { in: matchIds },
    });
    const pickMap = new Map<string, string>();
    for (const p of predictions) pickMap.set(p.match_ID, p.pick);

    // Batch-fetch score bets
    const scoreBets = await SELECT.from(ScoreBet).where({
      player_ID: currentPlayerId,
      match_ID: { in: matchIds },
    });
    const scoreMap = new Map<string, any[]>();
    for (const sb of scoreBets as any[]) {
      if (!scoreMap.has(sb.match_ID)) scoreMap.set(sb.match_ID, []);
      scoreMap.get(sb.match_ID)!.push({
        homeScore: sb.predictedHomeScore,
        awayScore: sb.predictedAwayScore,
      });
    }

    for (const row of list) {
      row.myPick = pickMap.get(row.ID) ?? null;
      row.myScores = scoreMap.get(row.ID) ?? [];
    }
  }

  /**
   * Materialize PredictionLeaderboard through base tables so hybrid/local
   * runs do not depend on redeploying generated HANA service views.
   */
  async readPredictionLeaderboard(req: Request) {
    const { PlayerTournamentStats, Player, Team } =
      cds.entities("cnma.prediction");
    const query = SELECT.from(PlayerTournamentStats).columns(
      "ID",
      "player_ID",
      "tournament_ID",
      "rank",
      "totalPoints",
      "totalCorrect",
      "totalPredictions",
    );

    this.copyReadClauses(req, query, {
      includeOrderBy: false,
      includeLimit: false,
    });

    const stats = (await query) as PlayerTournamentStatsLookup[];
    const playerIds = [
      ...new Set(
        stats
          .map((row) => row.player_ID)
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const players =
      playerIds.length > 0
        ? ((await SELECT.from(Player)
            .columns(
              "ID",
              "displayName",
              "avatarUrl",
              "email",
              "bio",
              "country_code",
              "favoriteTeam_ID",
            )
            .where({ ID: { in: playerIds } })) as PlayerLookup[])
        : [];
    const playerMap = toIdMap(players);

    const favoriteTeamIds = [
      ...new Set(
        players
          .map((player) => player.favoriteTeam_ID)
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const teams =
      favoriteTeamIds.length > 0
        ? ((await SELECT.from(Team).where({
            ID: { in: favoriteTeamIds },
          })) as TeamLookup[])
        : [];
    const teamMap = toIdMap(teams);

    const rows = stats.map((stat) => {
      const player = stat.player_ID ? playerMap.get(stat.player_ID) : undefined;
      const favoriteTeam = player?.favoriteTeam_ID
        ? teamMap.get(player.favoriteTeam_ID)
        : undefined;
      return {
        ID: stat.ID ?? null,
        tournament_ID: stat.tournament_ID ?? null,
        rank: stat.rank ?? 0,
        playerId: stat.player_ID ?? null,
        displayName: player?.displayName ?? "",
        avatarUrl: player?.avatarUrl ?? null,
        email: player?.email ?? null,
        favoriteTeam: favoriteTeam?.name ?? null,
        bio: player?.bio ?? null,
        country: player?.country_code ?? null,
        totalPoints: Number(stat.totalPoints) || 0,
        totalCorrect: Number(stat.totalCorrect) || 0,
        totalPredictions: Number(stat.totalPredictions) || 0,
        isMe: false,
      };
    });

    const sorted = this.applyInMemoryOrder(
      rows,
      req.query.SELECT?.orderBy ?? [
        { ref: ["totalPoints"], sort: "desc" },
        { ref: ["displayName"], sort: "asc" },
      ],
    );
    const limited = this.applyInMemoryLimit(sorted, req.query.SELECT?.limit);
    return this.finalizeReadResult(limited, req);
  }

  /**
   * Materialize RecentPredictionsView through underlying prediction/match/team tables.
   * before/after READ hooks still apply, so current-user filtering and score-bet enrichment stay unchanged.
   */
  async readRecentPredictionsView(req: Request) {
    const { Prediction, Match, Team, Tournament } =
      cds.entities("cnma.prediction");
    const query = SELECT.from(Prediction).columns(
      "ID",
      "player_ID",
      "match_ID",
      "tournament_ID",
      "pick",
      "status",
      "isCorrect",
      "pointsEarned",
      "submittedAt",
    );

    this.copyReadClauses(req, query);

    const predictions = (await query) as PredictionLookup[];
    let totalCount = predictions.length;
    if (req.query.SELECT?.count) {
      const countQuery = SELECT.from(Prediction).columns("ID");
      this.copyReadClauses(req, countQuery, {
        includeOrderBy: false,
        includeLimit: false,
      });
      const countRows = await countQuery;
      totalCount = Array.isArray(countRows) ? countRows.length : 0;
    }

    const matchIds = [
      ...new Set(
        predictions
          .map((row) => row.match_ID)
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const matches =
      matchIds.length > 0
        ? ((await SELECT.from(Match)
            .columns(
              "ID",
              "kickoff",
              "homeScore",
              "awayScore",
              "homeTeam_ID",
              "awayTeam_ID",
            )
            .where({ ID: { in: matchIds } })) as MatchLookup[])
        : [];
    const matchMap = toIdMap(matches);

    const teamIds = [
      ...new Set(
        matches
          .flatMap((match) => [match.homeTeam_ID, match.awayTeam_ID])
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const teams =
      teamIds.length > 0
        ? ((await SELECT.from(Team).where({
            ID: { in: teamIds },
          })) as TeamLookup[])
        : [];
    const teamMap = toIdMap(teams);

    const tournamentIds = [
      ...new Set(
        predictions
          .map((row) => row.tournament_ID)
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const tournaments =
      tournamentIds.length > 0
        ? ((await SELECT.from(Tournament)
            .columns("ID", "name")
            .where({ ID: { in: tournamentIds } })) as TournamentLookup[])
        : [];
    const tournamentMap = toIdMap(tournaments);

    const rows = predictions.map((prediction) => {
      const match = prediction.match_ID
        ? matchMap.get(prediction.match_ID)
        : undefined;
      const home = match?.homeTeam_ID
        ? teamMap.get(match.homeTeam_ID)
        : undefined;
      const away = match?.awayTeam_ID
        ? teamMap.get(match.awayTeam_ID)
        : undefined;
      const tournament = prediction.tournament_ID
        ? tournamentMap.get(prediction.tournament_ID)
        : undefined;

      return {
        ID: prediction.ID ?? null,
        player_ID: prediction.player_ID ?? null,
        match_ID: prediction.match_ID ?? null,
        tournament_ID: prediction.tournament_ID ?? null,
        pick: prediction.pick ?? null,
        status: prediction.status ?? null,
        isCorrect: prediction.isCorrect ?? null,
        pointsEarned: Number(prediction.pointsEarned) || 0,
        submittedAt: prediction.submittedAt ?? null,
        kickoff: match?.kickoff ?? null,
        homeScore: match?.homeScore ?? null,
        awayScore: match?.awayScore ?? null,
        homeTeam: home?.name ?? null,
        homeFlag: home?.flagCode ?? null,
        homeCrest: home?.crest ?? null,
        awayTeam: away?.name ?? null,
        awayFlag: away?.flagCode ?? null,
        awayCrest: away?.crest ?? null,
        tournamentName: tournament?.name ?? null,
      };
    });

    if (Array.isArray(rows) && req.query.SELECT?.count) {
      (rows as any).$count = totalCount;
    }

    return this.finalizeReadResult(rows, req);
  }

  /**
   * Materialize TournamentBracketView through base tables so the GET endpoint
   * keeps working before HDI schema is redeployed.
   */
  async readTournamentBracketView(req: Request) {
    const { BracketSlot, Team, Match } = cds.entities("cnma.prediction");
    const query = SELECT.from(BracketSlot).columns(
      "ID",
      "tournament_ID",
      "stage",
      "position",
      "label",
      "homeTeam_ID",
      "awayTeam_ID",
      "leg1_ID",
      "leg2_ID",
      "leg1ExternalId",
      "leg2ExternalId",
      "homeAgg",
      "awayAgg",
      "homePen",
      "awayPen",
      "winner_ID",
      "nextSlot_ID",
      "nextSlotSide",
    );

    this.copyReadClauses(req, query);

    const slots = (await query) as BracketSlotLookup[];
    const teamIds = [
      ...new Set(
        slots
          .flatMap((slot) => [
            slot.homeTeam_ID,
            slot.awayTeam_ID,
            slot.winner_ID,
          ])
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const teams =
      teamIds.length > 0
        ? ((await SELECT.from(Team).where({
            ID: { in: teamIds },
          })) as TeamLookup[])
        : [];
    const teamMap = toIdMap(teams);

    const matchIds = [
      ...new Set(
        slots
          .flatMap((slot) => [slot.leg1_ID, slot.leg2_ID])
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length > 0,
          ),
      ),
    ];
    const matches =
      matchIds.length > 0
        ? ((await SELECT.from(Match)
            .columns("ID", "homeScore", "awayScore", "status")
            .where({ ID: { in: matchIds } })) as MatchLookup[])
        : [];
    const matchMap = toIdMap(matches);

    const rows = slots.map((slot) => {
      const home = slot.homeTeam_ID ? teamMap.get(slot.homeTeam_ID) : undefined;
      const away = slot.awayTeam_ID ? teamMap.get(slot.awayTeam_ID) : undefined;
      const winner = slot.winner_ID ? teamMap.get(slot.winner_ID) : undefined;
      const leg1 = slot.leg1_ID ? matchMap.get(slot.leg1_ID) : undefined;
      const leg2 = slot.leg2_ID ? matchMap.get(slot.leg2_ID) : undefined;

      return {
        slotId: slot.ID ?? null,
        tournament_ID: slot.tournament_ID ?? null,
        stage: slot.stage ?? null,
        position: slot.position ?? 0,
        label: slot.label ?? null,
        homeTeamId: slot.homeTeam_ID ?? null,
        homeTeamName: home?.name ?? null,
        homeTeamFlag: home?.flagCode ?? null,
        homeTeamCrest: home?.crest ?? null,
        awayTeamId: slot.awayTeam_ID ?? null,
        awayTeamName: away?.name ?? null,
        awayTeamFlag: away?.flagCode ?? null,
        awayTeamCrest: away?.crest ?? null,
        leg1Id: slot.leg1_ID ?? null,
        leg1ExternalId: slot.leg1ExternalId ?? null,
        leg1HomeScore: leg1?.homeScore ?? null,
        leg1AwayScore: leg1?.awayScore ?? null,
        leg1Status: leg1?.status ?? null,
        leg2Id: slot.leg2_ID ?? null,
        leg2ExternalId: slot.leg2ExternalId ?? null,
        leg2HomeScore: leg2?.homeScore ?? null,
        leg2AwayScore: leg2?.awayScore ?? null,
        leg2Status: leg2?.status ?? null,
        homeAgg: slot.homeAgg ?? 0,
        awayAgg: slot.awayAgg ?? 0,
        homePen: slot.homePen ?? null,
        awayPen: slot.awayPen ?? null,
        winnerId: slot.winner_ID ?? null,
        winnerName: winner?.name ?? null,
        nextSlotId: slot.nextSlot_ID ?? null,
        nextSlotSide: slot.nextSlotSide ?? null,
      };
    });

    return this.finalizeReadResult(rows, req);
  }

  /**
   * Decorate leaderboard rows from PredictionLeaderboard view.
   * Keeps transport as pure OData GET while still marking the current user.
   */
  async decoratePredictionLeaderboard(rows: any[] | any, req: Request) {
    const currentPlayerId = await this.getCurrentPlayerId(req);
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];

    for (const row of list) {
      const rowPlayerId = this.playerResolver.asTrimmedString(row?.playerId);
      row.isMe = Boolean(
        currentPlayerId && rowPlayerId && rowPlayerId === currentPlayerId,
      );
    }
  }

  /**
   * Enrich CompletedMatchesView rows with the current user's prediction picks.
   * Called as an `after READ` handler — the CDS view returns Match+Team data,
   * then this handler does a single DB query for the user's predictions
   * and maps them onto the rows.
   */
  async enrichCompletedMatchesView(rows: any[] | any, req: Request) {
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    if (list.length === 0) return;

    const currentPlayerId = await this.getCurrentPlayerId(req);
    if (!currentPlayerId) return;

    const { Prediction } = cds.entities("cnma.prediction");
    const matchIds = list.map((r: any) => r.ID).filter(Boolean);
    if (matchIds.length === 0) return;

    const predictions = await SELECT.from(Prediction).where({
      player_ID: currentPlayerId,
      match_ID: { in: matchIds },
    });

    const pickMap = new Map<string, string>();
    for (const p of predictions) {
      pickMap.set(p.match_ID, p.pick);
    }

    for (const row of list) {
      row.myPick = pickMap.get(row.ID) ?? null;
    }
  }

  /**
   * Enrich RecentPredictionsView rows with score bet details.
   * The CDS view provides prediction + match + team data;
   * this handler adds the user's score bets for each match.
   */
  async enrichRecentPredictionsView(rows: any[] | any, req: Request) {
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    if (list.length === 0) return;

    const currentPlayerId = await this.getCurrentPlayerId(req);
    if (!currentPlayerId) return;

    const { ScoreBet } = cds.entities("cnma.prediction");
    const matchIds = [
      ...new Set(list.map((r: any) => r.match_ID).filter(Boolean)),
    ];
    if (matchIds.length === 0) return;

    const allScoreBets = await SELECT.from(ScoreBet).where({
      player_ID: currentPlayerId,
      match_ID: { in: matchIds },
    });

    const scoreBetMap = new Map<string, any[]>();
    for (const sb of allScoreBets as any[]) {
      if (!scoreBetMap.has(sb.match_ID)) scoreBetMap.set(sb.match_ID, []);
      scoreBetMap.get(sb.match_ID)!.push(sb);
    }

    for (const row of list) {
      const bets =
        (row.match_ID ? scoreBetMap.get(row.match_ID) : undefined) ?? [];
      row.scoreBets = bets.map((sb: any) => ({
        betId: sb.ID,
        predictedHomeScore: sb.predictedHomeScore,
        predictedAwayScore: sb.predictedAwayScore,
        status: sb.status,
        isCorrect: sb.isCorrect,
        payout: Number(sb.payout) || 0,
      }));
    }
  }

  /**
   * Enrich TournamentBracketView for slots where leg matches are not linked by ID yet
   * but can be resolved via external IDs.
   */
  async enrichTournamentBracketView(rows: any[] | any) {
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    if (list.length === 0) return;

    const externalIds = [
      ...new Set(
        list
          .flatMap((row: any) => [row?.leg1ExternalId, row?.leg2ExternalId])
          .filter((value: any) => typeof value === "number"),
      ),
    ] as number[];
    if (externalIds.length === 0) return;

    const tournamentIds = [
      ...new Set(
        list
          .map((row: any) =>
            this.playerResolver.asTrimmedString(row?.tournament_ID),
          )
          .filter((value: string | null): value is string => !!value),
      ),
    ];
    if (tournamentIds.length === 0) return;

    const { Match } = cds.entities("cnma.prediction");
    const matches = (await SELECT.from(Match).where({
      tournament_ID: { in: tournamentIds },
      externalId: { in: externalIds },
    })) as MatchLookup[];

    const byTournamentExternal = new Map<string, MatchLookup>();
    for (const match of matches) {
      const tournamentId = this.playerResolver.asTrimmedString(
        (match as any)?.tournament_ID,
      );
      if (!tournamentId || typeof match.externalId !== "number") continue;
      byTournamentExternal.set(`${tournamentId}:${match.externalId}`, match);
    }

    for (const row of list) {
      const tournamentId = this.playerResolver.asTrimmedString(
        row?.tournament_ID,
      );
      if (!tournamentId) continue;

      if (!row.leg1Id && typeof row.leg1ExternalId === "number") {
        const leg1 = byTournamentExternal.get(
          `${tournamentId}:${row.leg1ExternalId}`,
        );
        if (leg1) {
          row.leg1Id = leg1.ID ?? row.leg1Id ?? null;
          row.leg1HomeScore = leg1.homeScore ?? row.leg1HomeScore ?? null;
          row.leg1AwayScore = leg1.awayScore ?? row.leg1AwayScore ?? null;
          row.leg1Status = leg1.status ?? row.leg1Status ?? null;
        }
      }

      if (!row.leg2Id && typeof row.leg2ExternalId === "number") {
        const leg2 = byTournamentExternal.get(
          `${tournamentId}:${row.leg2ExternalId}`,
        );
        if (leg2) {
          row.leg2Id = leg2.ID ?? row.leg2Id ?? null;
          row.leg2HomeScore = leg2.homeScore ?? row.leg2HomeScore ?? null;
          row.leg2AwayScore = leg2.awayScore ?? row.leg2AwayScore ?? null;
          row.leg2Status = leg2.status ?? row.leg2Status ?? null;
        }
      }
    }
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

  private async getCurrentPlayerId(req: Request): Promise<string | null> {
    return this.playerResolver.getCurrentPlayerId(req);
  }

  private async getOrCreatePlayerId(req: Request): Promise<string> {
    return this.playerResolver.getOrCreatePlayerId(req);
  }

  private copyReadClauses(
    req: Request,
    query: any,
    options: { includeOrderBy?: boolean; includeLimit?: boolean } = {},
  ) {
    const includeOrderBy = options.includeOrderBy !== false;
    const includeLimit = options.includeLimit !== false;
    const select = req.query.SELECT;

    if (select?.where) {
      query.SELECT.where = select.where;
    }
    if (includeOrderBy && select?.orderBy) {
      query.SELECT.orderBy = select.orderBy;
    }
    if (includeLimit && select?.limit) {
      query.SELECT.limit = select.limit;
    }
  }

  private andWhere(query: any, extraWhere: any[]) {
    const existingWhere = query.SELECT.where;
    query.SELECT.where =
      existingWhere && existingWhere.length > 0
        ? ["(", ...existingWhere, ")", "and", ...extraWhere]
        : extraWhere;
  }

  private finalizeReadResult<T>(rows: T[], req: Request): T[] | T | null {
    if (req.query.SELECT?.one) {
      return rows[0] ?? null;
    }
    return rows;
  }

  private applyInMemoryOrder<T extends Record<string, any>>(
    rows: T[],
    orderBy?: any[],
  ): T[] {
    if (!orderBy || orderBy.length === 0) {
      return rows;
    }

    return [...rows].sort((left, right) => {
      for (const clause of orderBy) {
        const refPath = Array.isArray(clause?.ref) ? clause.ref : [];
        const property =
          typeof refPath[refPath.length - 1] === "string"
            ? refPath[refPath.length - 1]
            : null;
        if (!property) continue;

        const comparison = this.compareReadValues(
          left[property],
          right[property],
        );
        if (comparison !== 0) {
          return clause.sort === "desc" ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private applyInMemoryLimit<T>(rows: T[], limit: any): T[] {
    const rowLimit = this.readNumericLimit(limit?.rows);
    const offset = this.readNumericLimit(limit?.offset) ?? 0;
    if (rowLimit == null) {
      return rows.slice(offset);
    }
    return rows.slice(offset, offset + rowLimit);
  }

  private readNumericLimit(value: any): number | null {
    const raw = value?.val ?? value;
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private compareReadValues(left: unknown, right: unknown): number {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;

    if (typeof left === "number" && typeof right === "number") {
      return left - right;
    }

    return String(left).localeCompare(String(right));
  }
}
