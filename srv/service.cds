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
        projection on db.Team {
            *,
            members    : redirected to TeamMembers,
            tournaments : redirected to TournamentTeams
        }
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    /** Team members (players, coaches) — read only for players. */
    @readonly
    entity TeamMembers              as
        projection on db.TeamMember {
            *,
            team : redirected to Teams
        }
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
            matches : redirected to Matches,
            teams   : redirected to TournamentTeams
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Tournament-Team join — teams in a specific tournament. */
    @readonly
    entity TournamentTeams          as
        projection on db.TournamentTeam {
            *,
            tournament : redirected to Tournaments,
            team       : redirected to Teams
        }
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    /** Per-match score bet config (read-only for players — needed for $expand on Matches). */
    @readonly
    entity MatchScoreBetConfigs     as projection on db.MatchScoreBetConfig { * }
        excluding { createdAt, createdBy, modifiedAt, modifiedBy };

    /** Matches with team details — the core view for all prediction pages. */
    @readonly
    entity Matches                  as
        projection on db.Match {
            *,
            homeTeam       : redirected to Teams,
            awayTeam       : redirected to Teams,
            tournament     : redirected to Tournaments,
            scoreBetConfig : redirected to MatchScoreBetConfigs
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Global leaderboard — all players ranked by totalPoints descending. */
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

    /** Per-tournament leaderboard stats. */
    @readonly
    entity TournamentLeaderboard    as
        projection on db.PlayerTournamentStats {
            *,
            player     : redirected to Leaderboard,
            tournament : redirected to Tournaments
        };

    // ── User-Specific Views ──────────────────────────────────

    /** Current user's match outcome predictions. */
    entity MyPredictions            as
        projection on db.Prediction {
            *,
            match      : redirected to Matches,
            player     : redirected to Leaderboard,
            tournament : redirected to Tournaments
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

    /** Combined: submit winner pick + score bets for a match. */
    type ScoreInput {
        homeScore : Integer;
        awayScore : Integer;
    }

    action submitMatchPrediction(matchId: UUID, pick: String, scores: many ScoreInput) returns ActionResult;

    /** Cancel/clear match prediction and score bets. */
    action cancelMatchPrediction(matchId: UUID)                                        returns ActionResult;

    /** Pick tournament champion (UC3). */
    action pickChampion(teamId: UUID)                                              returns ActionResult;

    // ── Functions (Read-Only Queries) ────────────────────────

    /** Latest match results for a tournament. */
    type MatchResultItem {
        matchId   : UUID;
        homeTeam  : String;
        homeFlag  : String;
        awayTeam  : String;
        awayFlag  : String;
        homeScore : Integer;
        awayScore : Integer;
        outcome   : String;
        kickoff   : DateTime;
        stage     : String;
        matchday  : Integer;
    }

    function getLatestResults(tournamentId: UUID) returns many MatchResultItem;

    /** Upcoming matches for a tournament. */
    type UpcomingMatchItem {
        matchId  : UUID;
        homeTeam : String;
        homeFlag : String;
        awayTeam : String;
        awayFlag : String;
        kickoff  : DateTime;
        stage    : String;
        matchday : Integer;
        venue    : String;
    }

    function getUpcomingMatches(tournamentId: UUID) returns many UpcomingMatchItem;

    /** Prediction leaderboard for a tournament (UC2). */
    type LeaderboardItem {
        rank         : Integer;
        playerId     : UUID;
        displayName  : String;
        avatarUrl    : String;
        totalPoints  : Decimal;
        totalCorrect : Integer;
        totalPredictions : Integer;
    }

    function getPredictionLeaderboard(tournamentId: UUID) returns many LeaderboardItem;

    /** Recent predictions for the current user. */
    type RecentPredictionItem {
        predictionId   : UUID;
        matchId        : UUID;
        homeTeam       : String;
        homeFlag       : String;
        awayTeam       : String;
        awayFlag       : String;
        tournamentName : String;
        pick           : String;
        status         : String;
        isCorrect      : Boolean;
        pointsEarned   : Decimal;
        submittedAt    : DateTime;
        kickoff        : DateTime;
        homeScore      : Integer;
        awayScore      : Integer;
    }

    function getMyRecentPredictions(limit: Integer) returns many RecentPredictionItem;

    /** League standings for a league-format tournament. */
    type StandingItem {
        teamId       : UUID;
        teamName     : String;
        teamFlag     : String;
        played       : Integer;
        won          : Integer;
        drawn        : Integer;
        lost         : Integer;
        goalsFor     : Integer;
        goalsAgainst : Integer;
        goalDiff     : Integer;
        points       : Integer;
    }

    function getStandings(tournamentId: UUID)   returns many StandingItem;
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
    entity TeamMembers              as projection on db.TeamMember;
    entity Tournaments              as projection on db.Tournament;
    entity TournamentTeams          as projection on db.TournamentTeam;
    entity Players                  as projection on db.Player;
    entity PlayerTournamentStats    as projection on db.PlayerTournamentStats;

    // ── Per-Match Config CRUD ────────────────────────────────

    entity MatchScoreBetConfig      as projection on db.MatchScoreBetConfig;


    // ── Read-Only Views (all users' data) ────────────────────

    @readonly
    entity AllPredictions           as
        projection on db.Prediction {
            *,
            player     : redirected to Players,
            match      : redirected to Matches,
            tournament : redirected to Tournaments
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

    /** Force recalculate leaderboard rankings (all or by tournament). */
    action recalculateLeaderboard(tournamentId: UUID)                               returns ActionResult;

    /** Lock champion predictions for a specific tournament (UC3). */
    action lockChampionPredictions(tournamentId: UUID)                              returns ActionResult;
}
