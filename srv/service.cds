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
            teams   : redirected to TournamentTeams,
            bracket : redirected to BracketSlots
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

    /** Knockout bracket slots — for rendering the bracket tree. */
    @readonly
    entity BracketSlots             as
        projection on db.BracketSlot {
            *,
            tournament : redirected to Tournaments,
            homeTeam   : redirected to Teams,
            awayTeam   : redirected to Teams,
            winner     : redirected to Teams,
            leg1       : redirected to Matches,
            leg2       : redirected to Matches
        }
        excluding {
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy
        };

    /** Matches with team details — the core view for all prediction pages. */
    @readonly
    entity Matches                  as
        projection on db.Match {
            *,
            homeTeam       : redirected to Teams,
            awayTeam       : redirected to Teams,
            tournament     : redirected to Tournaments,
            scoreBetConfig : redirected to MatchScoreBetConfigs,
            bracketSlot    : redirected to BracketSlots
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

    /** Current user's slot outcome predictions (for unresolved knockout slots). */
    entity MySlotPredictions        as
        projection on db.SlotPrediction {
            *,
            slot       : redirected to BracketSlots,
            player     : redirected to Leaderboard,
            tournament : redirected to Tournaments
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Current user's slot score bets (for unresolved knockout slots). */
    entity MySlotScoreBets          as
        projection on db.SlotScoreBet {
            *,
            slot       : redirected to BracketSlots,
            player     : redirected to Leaderboard,
            tournament : redirected to Tournaments
        }
        excluding {
            createdBy,
            modifiedBy
        };

    /** Current user's champion prediction. */
    entity MyChampionPick           as
        projection on db.ChampionPick {
            *,
            team       : redirected to Teams,
            player     : redirected to Leaderboard,
            tournament : redirected to Tournaments
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

    /** Submit prediction for an unresolved bracket slot (teams/match not fixed yet). */
    action submitSlotPrediction(slotId: UUID, pick: String, scores: many ScoreInput)  returns ActionResult;

    /** Cancel/clear prediction for an unresolved bracket slot. */
    action cancelSlotPrediction(slotId: UUID)                                           returns ActionResult;

    /** Pick tournament champion (UC3). */
    action pickChampion(teamId: UUID, tournamentId: UUID)                          returns ActionResult;

    /** Current authenticated user's editable profile. */
    type UserProfile {
        avatarUrl      : LargeString;
        displayName    : String(100);
        firstName      : String(100);
        lastName       : String(100);
        email          : String(255);
        phone          : String(50);
        country        : String(10);
        city           : String(120);
        timezone       : String(80);
        favoriteTeamId : UUID;
        favoriteTeam   : String(120);
        bio            : String(2000);
    }

    function getMyProfile() returns UserProfile;

    action updateMyProfile(
        avatarUrl      : LargeString,
        displayName    : String(100),
        firstName      : String(100),
        lastName       : String(100),
        phone          : String(50),
        country        : String(10),
        city           : String(120),
        timezone       : String(80),
        favoriteTeamId : UUID,
        favoriteTeam   : String(120),
        bio            : String(2000)
    ) returns UserProfile;

    // ── Functions (Read-Only Queries) ────────────────────────

    /** Latest match results for a tournament. */
    type MatchResultItem {
        matchId   : UUID;
        homeTeam  : String;
        homeFlag  : String;
        homeCrest : String;
        awayTeam  : String;
        awayFlag  : String;
        awayCrest : String;
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
        homeCrest : String;
        awayTeam : String;
        awayFlag : String;
        awayCrest : String;
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
        isMe         : Boolean;
    }

    function getPredictionLeaderboard(tournamentId: UUID) returns many LeaderboardItem;

    /** Score bet detail within a recent prediction. */
    type ScoreBetDetail {
        betId              : UUID;
        predictedHomeScore : Integer;
        predictedAwayScore : Integer;
        status             : String;
        isCorrect          : Boolean;
        payout             : Decimal;
    }

    /** Recent predictions for the current user. */
    type RecentPredictionItem {
        predictionId   : UUID;
        matchId        : UUID;
        homeTeam       : String;
        homeFlag       : String;
        homeCrest      : String;
        awayTeam       : String;
        awayFlag       : String;
        awayCrest      : String;
        tournamentName : String;
        pick           : String;
        status         : String;
        isCorrect      : Boolean;
        pointsEarned   : Decimal;
        submittedAt    : DateTime;
        kickoff        : DateTime;
        homeScore      : Integer;
        awayScore      : Integer;
        scoreBets      : array of ScoreBetDetail;
    }

    function getMyRecentPredictions(limit: Integer) returns many RecentPredictionItem;

    /** League standings for a league-format tournament. */
    type StandingItem {
        teamId       : UUID;
        teamName     : String;
        teamFlag     : String;
        teamCrest    : String;
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

    /** Knockout bracket for a tournament. */
    type BracketSlotItem {
        slotId       : UUID;
        stage        : String;
        position     : Integer;
        label        : String;
        homeTeamId   : UUID;
        homeTeamName : String;
        homeTeamFlag : String;
        homeTeamCrest: String;
        awayTeamId   : UUID;
        awayTeamName : String;
        awayTeamFlag : String;
        awayTeamCrest: String;
        leg1Id       : UUID;
        leg1HomeScore: Integer;
        leg1AwayScore: Integer;
        leg1Status   : String;
        leg2Id       : UUID;
        leg2HomeScore: Integer;
        leg2AwayScore: Integer;
        leg2Status   : String;
        homeAgg      : Integer;
        awayAgg      : Integer;
        homePen      : Integer;
        awayPen      : Integer;
        winnerId     : UUID;
        winnerName   : String;
        nextSlotId   : UUID;
        nextSlotSide : String;
    }

    function getTournamentBracket(tournamentId: UUID) returns many BracketSlotItem;

    /** Champion pick counts by team for a tournament. */
    type ChampionPickCountItem {
        teamId    : UUID;
        teamName  : String;
        teamCrest : String;
        count     : Integer;
    }

    function getChampionPickCounts(tournamentId: UUID) returns many ChampionPickCountItem;
}

// ────────────────────────────────────────────────────────────
//  Admin Service — Admin Users Only
// ────────────────────────────────────────────────────────────

@path    : '/api/admin'
@requires: 'authenticated-user'
service AdminService {

    // ── Full CRUD Entities ───────────────────────────────────

    entity Matches                  as projection on db.Match;
    entity Teams                    as projection on db.Team;
    entity TeamMembers              as projection on db.TeamMember;
    entity Tournaments              as projection on db.Tournament;
    entity TournamentTeams          as projection on db.TournamentTeam;
    entity Players                  as projection on db.Player;
    entity PlayerTournamentStats    as projection on db.PlayerTournamentStats;

    // ── Bracket CRUD ────────────────────────────────────────

    entity BracketSlots             as projection on db.BracketSlot;

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
            player     : redirected to Players,
            team       : redirected to Teams,
            tournament : redirected to Tournaments
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

    /** Correct an already-finished match result. Re-scores predictions/bets and recalculates leaderboard. */
    action correctMatchResult(matchId: UUID, homeScore: Integer, awayScore: Integer) returns MatchResultResponse;

    /** Set the penalty shootout winner for a bracket slot. Stores pen scores and advances winner. */
    action setPenaltyWinner(slotId: UUID, winnerId: UUID, homePen: Integer, awayPen: Integer) returns ActionResult;

    /** Force recalculate leaderboard rankings (all or by tournament). */
    action recalculateLeaderboard(tournamentId: UUID)                               returns ActionResult;

    /** Lock champion predictions for a specific tournament (UC3). */
    action lockChampionPredictions(tournamentId: UUID)                              returns ActionResult;

    /** Resolve champion picks after final is decided — marks correct/incorrect picks. */
    action resolveChampionPicks(tournamentId: UUID, championTeamId: UUID)           returns ActionResult;

    // ── Sync & Betting Lock ──────────────────────────────────

    type SyncMatchResult : ActionResult {
        synced   : Integer; // number of matches updated
        scored   : Integer; // number of matches newly scored
    }

    /**
     * Sync match results from football-data.org for a tournament.
     * Uses the tournament's externalCode (e.g. 'CL') to fetch from the API.
     * Matches are identified by their externalId field.
     * Newly finished matches are automatically scored.
     */
    action syncMatchResults(tournamentId: UUID, apiKey: String default '')           returns SyncMatchResult;

    /**
     * Toggle per-match betting lock.
     * When locked=true, users cannot place or change outcome/score bets for this match.
     */
    action lockMatchBetting(matchId: UUID, locked: Boolean)                         returns ActionResult;

    /**
     * Toggle tournament-wide betting lock.
     * When locked=true, all betting (outcome, score, champion) for this tournament is blocked.
     */
    action lockTournamentBetting(tournamentId: UUID, locked: Boolean)               returns ActionResult;

    // ── Competition Import ────────────────────────────────────

    /**
     * List available competitions from football-data.org.
     * Returns each competition flagged with `alreadyImported` if a tournament with that externalCode exists.
     */
    type CompetitionItem {
        externalId           : Integer;
        code                 : String(20);
        name                 : String(100);
        type                 : String(20);
        emblem               : String(500);
        plan                 : String(20);
        seasonStart          : String(20);
        seasonEnd            : String(20);
        alreadyImported      : Boolean;
        importedTournamentId : UUID;
    }

    function getAvailableCompetitions(apiKey: String default '')    returns many CompetitionItem;

    /**
     * Import a competition from football-data.org as a Tournament.
     * Creates the Tournament, upserts Teams, creates TournamentTeams (with group assignments),
     * and creates all Matches with externalId for future sync.
     */
    type ImportTournamentResult : ActionResult {
        tournamentId    : UUID;
        teamsImported   : Integer;
        matchesImported : Integer;
    }

    action importTournament(externalCode: String, apiKey: String default '')        returns ImportTournamentResult;
}
