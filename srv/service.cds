using {cnma.prediction as db} from '../db/schema';

// ────────────────────────────────────────────────────────────
//  Player Service — Authenticated Employees
// ────────────────────────────────────────────────────────────

@path    : '/api/player'
@requires: 'authenticated-user'
service PlayerService {

    // ── Read-Only Views ──────────────────────────────────────

    /** All teams for champion picker and display. */
    @readonly
    entity Teams                    as
        projection on db.Team
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    /** Active tournament info. */
    @readonly
    entity Tournaments              as
        projection on db.Tournament {
            *,
            matches : redirected to Matches
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Matches with team details — the core view for all prediction pages. */
    @readonly
    entity Matches                  as
        projection on db.Match {
            *,
            homeTeam   : redirected to Teams,
            awayTeam   : redirected to Teams,
            tournament : redirected to Tournaments
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Leaderboard — all players ranked by totalPoints descending. */
    @readonly
    entity Leaderboard              as
        projection on db.Player {
            ID,
            displayName,
            avatarUrl,
            country,
            favoriteTeam : redirected to Teams,
            totalPoints,
            totalCorrect,
            totalPredictions,
            currentStreak,
            bestStreak,
            rank
        }
        order by
            totalPoints desc;

    // ── User-Specific Views ──────────────────────────────────

    /** Current user's match outcome predictions. */
    entity MyPredictions            as
        projection on db.Prediction {
            *,
            match  : redirected to Matches,
            player : redirected to Leaderboard
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Current user's exact score bets. */
    entity MyScoreBets              as
        projection on db.ScoreBet {
            *,
            match  : redirected to Matches,
            player : redirected to Leaderboard
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Current user's champion prediction. */
    entity MyChampionPick           as
        projection on db.ChampionPick {
            *,
            team   : redirected to Teams,
            player : redirected to Leaderboard
        }
        excluding {
            createdBy,
            modifiedBy
        };

    // ── Read-Only Config (for UI display) ────────────────────

    @readonly
    entity ScorePredictionConfig    as
        projection on db.ScorePredictionConfig
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    @readonly
    entity MatchOutcomeConfig       as
        projection on db.MatchOutcomeConfig
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    @readonly
    entity ChampionPredictionConfig as
        projection on db.ChampionPredictionConfig
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    // ── Actions ──────────────────────────────────────────────

    /** Submit match outcome predictions (UC2). */
    type PredictionInput {
        matchId : UUID;
        pick    : String;
    }

    type ActionResult {
        success : Boolean;
        message : String;
    }

    type SubmitResult        : ActionResult {
        count : Integer;
    }

    action submitPredictions(predictions: many PredictionInput)                    returns SubmitResult;

    /** Place an exact score bet (UC1). */
    action submitScoreBet(matchId: UUID, homeScore: Integer, awayScore: Integer)   returns ActionResult;

    /** Pick tournament champion (UC3). */
    action pickChampion(teamId: UUID)                                              returns ActionResult;
}

// ────────────────────────────────────────────────────────────
//  Admin Service — Admin Users Only
// ────────────────────────────────────────────────────────────

@path    : '/api/admin'
@requires: 'admin'
service AdminService {

    // ── Full CRUD Entities ───────────────────────────────────

    entity Matches                  as projection on db.Match;
    entity Teams                    as projection on db.Team;
    entity Tournaments              as projection on db.Tournament;
    entity Players                  as projection on db.Player;

    // ── Config CRUD ──────────────────────────────────────────

    entity ScorePredictionConfig    as projection on db.ScorePredictionConfig;
    entity MatchOutcomeConfig       as projection on db.MatchOutcomeConfig;
    entity ChampionPredictionConfig as projection on db.ChampionPredictionConfig;

    // ── Read-Only Views (all users' data) ────────────────────

    @readonly
    entity AllPredictions           as
        projection on db.Prediction {
            *,
            player : redirected to Players,
            match  : redirected to Matches
        };

    @readonly
    entity AllScoreBets             as
        projection on db.ScoreBet {
            *,
            player : redirected to Players,
            match  : redirected to Matches
        };

    @readonly
    entity AllChampionPicks         as
        projection on db.ChampionPick {
            *,
            player : redirected to Players,
            team   : redirected to Teams
        };

    // ── Admin Actions ────────────────────────────────────────

    type ActionResult {
        success : Boolean;
        message : String;
    }

    type MatchResultResponse : ActionResult {
        predictionsScored : Integer;
        scoreBetsScored   : Integer;
    }

    /** Enter match result and trigger scoring. */
    action enterMatchResult(matchId: UUID, homeScore: Integer, awayScore: Integer) returns MatchResultResponse;

    /** Force recalculate leaderboard rankings. */
    action recalculateLeaderboard()                                                returns ActionResult;

    /** Lock champion predictions (UC3). */
    action lockChampionPredictions()                                               returns ActionResult;
}
