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

    /**
     * Current authenticated player resolved from synced Player metadata.
     * Shared by player-scoped helper views so we avoid runtime filter injection.
     */
    @readonly
    @cds.api.ignore
    entity CurrentPlayerView        as
        select from db.Player {
            key ID
        } where loginName = $user.id
            or email = $user.id
            or userUUID = $user.id;

    /**
     * Current user's match winner predictions keyed by match.
     * Used by completed/available/recent sport views.
     */
    @readonly
    @cds.api.ignore
    entity CurrentUserMatchPredictionsView as
        select from db.Prediction as prediction
            inner join CurrentPlayerView as currentPlayer
                on currentPlayer.ID = prediction.player.ID {
            key prediction.match.ID as matchId,
                prediction.pick     as pick
        };

    /**
     * Current user's exact-score bets keyed by match.
     * Exposed only via $expand associations on sport page views.
     */
    @readonly
    @cds.api.ignore
    entity CurrentUserMatchScoreBetsView as
        select from db.ScoreBet as bet
            inner join CurrentPlayerView as currentPlayer
                on currentPlayer.ID = bet.player.ID {
            key bet.match.ID           as matchId,
            key bet.ID                 as betId,
                bet.predictedHomeScore as predictedHomeScore,
                bet.predictedAwayScore as predictedAwayScore,
                bet.status             as status,
                bet.isCorrect          as isCorrect
        };

    /** Current user's correct exact-score bet counts per match. */
    @readonly
    @cds.api.ignore
    entity CurrentUserCorrectScoreBetCountsView as
        select from db.ScoreBet as bet
            inner join CurrentPlayerView as currentPlayer
                on currentPlayer.ID = bet.player.ID {
            key bet.match.ID as matchId,
                count(1)     as correctScoreBetCount : Integer
        } where bet.isCorrect = true
        group by
            bet.match.ID;

    /**
     * Tournament matches keyed by external provider ID.
     * Lets TournamentBracketView resolve leg data without a TS after-read patch.
     */
    @readonly
    @cds.api.ignore
    @cds.redirection.target: false
    entity TournamentMatchesByExternalIdView as
        select from db.Match {
            key tournament.ID as tournament_ID,
            key externalId    as externalId,
                ID            as matchId,
                homeScore     as homeScore,
                awayScore     as awayScore,
                status        as status
        } where externalId is not null;

    /**
     * Player leaderboard (UC2) as a read-only view.
     * Intended for plain OData GET with $filter/$orderby.
     */
    @readonly
    entity PredictionLeaderboard    as
        select from db.PlayerTournamentStats as stats
            left join db.Player as player
                on player.ID = stats.player.ID
            left join db.Team as favTeam
                on favTeam.ID = player.favoriteTeam.ID
            left join CurrentPlayerView as currentPlayer
                on currentPlayer.ID = stats.player.ID {
            key stats.ID              as ID,
                stats.tournament.ID   as tournament_ID,
                stats.rank            as rank,
                stats.player.ID       as playerId,
                player.displayName    as displayName,
                player.avatarUrl      as avatarUrl,
                player.email          as email,
                favTeam.name          as favoriteTeam,
                player.bio            as bio,
                player.country        as country,
                stats.totalPoints     as totalPoints,
                stats.totalCorrect    as totalCorrect,
                stats.totalPredictions as totalPredictions,
                case
                    when currentPlayer.ID is not null then true
                    else false
                end                   as isMe : Boolean
        };

    /**
     * Completed matches with team info pre-joined.
     * Single OData GET replaces Matches + Teams $expand.
     * `myPick` is resolved directly in CDS for the current authenticated player.
     * Supports $filter, $skip, $top, $count for server-side pagination.
     */
    @readonly
    entity CompletedMatchesView     as
        select from db.Match as m
            left join db.Team as home
                on home.ID = m.homeTeam.ID
            left join db.Team as away
                on away.ID = m.awayTeam.ID
            left join CurrentUserMatchPredictionsView as myPrediction
                on myPrediction.matchId = m.ID {
            key m.ID               as ID,
                m.tournament.ID    as tournament_ID,
                m.kickoff          as kickoff,
                m.stage            as stage,
                m.homeScore        as homeScore,
                m.awayScore        as awayScore,
                home.ID            as homeTeam_ID,
                home.name          as homeTeamName,
                home.flagCode      as homeTeamFlag,
                home.crest         as homeTeamCrest,
                away.ID            as awayTeam_ID,
                away.name          as awayTeamName,
                away.flagCode      as awayTeamFlag,
                away.crest         as awayTeamCrest,
                myPrediction.pick  as myPick
        } where m.status = 'finished';

    /**
     * Available (upcoming) matches with team info pre-joined.
     * Single OData GET replaces the complex getAvailable() client-side orchestration.
     * Score bet rows are exposed via `myScores` expand instead of a TS after-read patch.
     * Supports $filter, $skip, $top, $count for server-side pagination.
     */
    @readonly
    entity AvailableMatchesView     as
        select from db.Match as m
            left join db.Team as home
                on home.ID = m.homeTeam.ID
            left join db.Team as away
                on away.ID = m.awayTeam.ID
            left join db.MatchScoreBetConfig as scoreBetConfig
                on scoreBetConfig.match.ID = m.ID
            left join CurrentUserMatchPredictionsView as myPrediction
                on myPrediction.matchId = m.ID {
            key m.ID               as ID,
                m.tournament.ID    as tournament_ID,
                m.kickoff          as kickoff,
                m.stage            as stage,
                m.status           as status,
                m.bettingLocked    as bettingLocked,
                m.isHotMatch       as isHotMatch,
                m.outcomePoints    as outcomePoints,
                m.matchday         as matchday,
                m.bracketSlot.ID   as bracketSlot_ID,
                home.ID            as homeTeam_ID,
                home.name          as homeTeamName,
                home.flagCode      as homeTeamFlag,
                home.crest         as homeTeamCrest,
                away.ID            as awayTeam_ID,
                away.name          as awayTeamName,
                away.flagCode      as awayTeamFlag,
                away.crest         as awayTeamCrest,
                myPrediction.pick  as myPick,
                coalesce(scoreBetConfig.enabled, false) as scoreBettingEnabled : Boolean,
                coalesce(scoreBetConfig.maxBets, 3)     as maxBets : Integer,
                myScores           : Association to many CurrentUserMatchScoreBetsView
                    on myScores.matchId = $self.ID
        } where m.status = 'upcoming';

    /**
     * Aggregated champion-pick counts per tournament/team.
     * Helper view for ChampionPickerView.
     */
    @readonly
    @cds.api.ignore
    entity ChampionPickCountsView   as
        select from db.ChampionPick {
            key tournament.ID as tournament_ID,
            key team.ID       as teamId,
                count(1)      as pickCount : Integer
        }
        group by tournament.ID, team.ID;

    /**
     * Current user's champion pick by tournament/team.
     * Helper view for ChampionPickerView.
     * Relies on Player.loginName/email being synced to the authenticated user.
     */
    @readonly
    @cds.api.ignore
    entity MyChampionPickByUserView as
        select from db.ChampionPick as pick
            inner join CurrentPlayerView as currentPlayer
                on currentPlayer.ID = pick.player.ID {
            key pick.tournament.ID as tournament_ID,
            key pick.team.ID       as teamId
        };

    /**
     * Champion picker rows for a tournament.
     * Single OData GET replaces TournamentTeams + MyChampionPick + getChampionPickCounts
     * on the player-facing champion page.
     */
    @readonly
    entity ChampionPickerView       as
        select from db.TournamentTeam as tt
            left join db.Team as team
                on team.ID = tt.team.ID
            left join db.Tournament as tournament
                on tournament.ID = tt.tournament.ID
            left join ChampionPickCountsView as counts
                on counts.tournament_ID = tt.tournament.ID
                and counts.teamId = tt.team.ID
            left join MyChampionPickByUserView as myPick
                on myPick.tournament_ID = tt.tournament.ID
                and myPick.teamId = tt.team.ID {
            key tt.ID              as ID,
                tt.tournament.ID   as tournament_ID,
                tournament.status  as tournamentStatus,
                tournament.championBettingStatus as championBettingStatus,
                team.ID            as teamId,
                team.name          as teamName,
                team.flagCode      as teamFlag,
                team.crest         as teamCrest,
                team.confederation as confederation,
                team.fifaRanking   as fifaRanking,
                myPick.teamId      as selectedTeamId,
                counts.pickCount   as pickCount
        } where tt.isEliminated = false;

    /**
     * Recent predictions with match + team + tournament data pre-joined.
     * Replaces the getMyRecentPredictions() function.
     * The current user is resolved in CDS and score bets come via $expand.
     * Supports $orderby, $skip, $top, $count for server-side pagination.
     */
    @readonly
    entity RecentPredictionsView    as
        select from db.Prediction as prediction
            inner join CurrentPlayerView as currentPlayer
                on currentPlayer.ID = prediction.player.ID
            left join db.Match as match
                on match.ID = prediction.match.ID
            left join db.Team as home
                on home.ID = match.homeTeam.ID
            left join db.Team as away
                on away.ID = match.awayTeam.ID
            left join db.Tournament as tournament
                on tournament.ID = prediction.tournament.ID
            left join db.MatchScoreBetConfig as scoreBetConfig
                on scoreBetConfig.match.ID = match.ID
            left join CurrentUserCorrectScoreBetCountsView as correctScoreBets
                on correctScoreBets.matchId = match.ID {
            key prediction.ID      as predictionId,
                prediction.match.ID as matchId,
                prediction.tournament.ID as tournament_ID,
                prediction.pick    as pick,
                prediction.status  as status,
                prediction.isCorrect as isCorrect,
                prediction.pointsEarned as pointsEarned,
                coalesce(correctScoreBets.correctScoreBetCount, 0) as correctScoreBetCount : Integer,
                case
                    when scoreBetConfig.prize is null then 0
                    else coalesce(correctScoreBets.correctScoreBetCount, 0) * scoreBetConfig.prize
                end               as scoreBetEarnedAmount : Decimal(15, 2),
                prediction.submittedAt as submittedAt,
                match.kickoff      as kickoff,
                match.homeScore    as homeScore,
                match.awayScore    as awayScore,
                home.name          as homeTeam,
                home.flagCode      as homeFlag,
                home.crest         as homeCrest,
                away.name          as awayTeam,
                away.flagCode      as awayFlag,
                away.crest         as awayCrest,
                tournament.name    as tournamentName,
                scoreBets          : Association to many CurrentUserMatchScoreBetsView
                    on scoreBets.matchId = $self.matchId
        };

    /**
     * Knockout bracket data as read-only view.
     * Replaces the getTournamentBracket() function.
     * For slots linked only by external IDs, fallback joins resolve leg scores/status in CDS.
     */
    @readonly
    entity TournamentBracketView    as
        select from db.BracketSlot as slot
            left join db.Team as home
                on home.ID = slot.homeTeam.ID
            left join db.Team as away
                on away.ID = slot.awayTeam.ID
            left join db.Team as winner
                on winner.ID = slot.winner.ID
            left join db.Match as leg1
                on leg1.ID = slot.leg1.ID
            left join TournamentMatchesByExternalIdView as leg1ByExternal
                on leg1ByExternal.tournament_ID = slot.tournament.ID
                and leg1ByExternal.externalId = slot.leg1ExternalId
            left join db.Match as leg2
                on leg2.ID = slot.leg2.ID
            left join TournamentMatchesByExternalIdView as leg2ByExternal
                on leg2ByExternal.tournament_ID = slot.tournament.ID
                and leg2ByExternal.externalId = slot.leg2ExternalId {
            key slot.ID            as slotId,
                slot.tournament.ID as tournament_ID,
                slot.stage         as stage,
                slot.position      as position,
                slot.label         as label,
                slot.homeTeam.ID   as homeTeamId,
                home.name          as homeTeamName,
                home.flagCode      as homeTeamFlag,
                home.crest         as homeTeamCrest,
                slot.awayTeam.ID   as awayTeamId,
                away.name          as awayTeamName,
                away.flagCode      as awayTeamFlag,
                away.crest         as awayTeamCrest,
                coalesce(leg1.ID, leg1ByExternal.matchId) as leg1Id : UUID,
                slot.leg1ExternalId as leg1ExternalId,
                coalesce(leg1.homeScore, leg1ByExternal.homeScore) as leg1HomeScore : Integer,
                coalesce(leg1.awayScore, leg1ByExternal.awayScore) as leg1AwayScore : Integer,
                coalesce(leg1.status, leg1ByExternal.status) as leg1Status : String,
                coalesce(leg2.ID, leg2ByExternal.matchId) as leg2Id : UUID,
                slot.leg2ExternalId as leg2ExternalId,
                coalesce(leg2.homeScore, leg2ByExternal.homeScore) as leg2HomeScore : Integer,
                coalesce(leg2.awayScore, leg2ByExternal.awayScore) as leg2AwayScore : Integer,
                coalesce(leg2.status, leg2ByExternal.status) as leg2Status : String,
                slot.homeAgg       as homeAgg,
                slot.awayAgg       as awayAgg,
                slot.homePen       as homePen,
                slot.awayPen       as awayPen,
                slot.winner.ID     as winnerId,
                winner.name        as winnerName,
                slot.nextSlot.ID   as nextSlotId,
                slot.nextSlotSide  as nextSlotSide
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
        }
        where player.loginName = $user.id
            or player.email = $user.id
            or player.userUUID = $user.id;

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
        }
        where player.loginName = $user.id
            or player.email = $user.id
            or player.userUUID = $user.id;

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
        }
        where player.loginName = $user.id
            or player.email = $user.id
            or player.userUUID = $user.id;

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
        }
        where player.loginName = $user.id
            or player.email = $user.id
            or player.userUUID = $user.id;

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
        }
        where player.loginName = $user.id
            or player.email = $user.id
            or player.userUUID = $user.id;

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
        roles          : array of String;
        isAdmin        : Boolean;
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


    // ── Pre-Joined Read-Only Views ──────────────────────────
    // Same pattern as PlayerService views — push JOINs to database,
    // eliminate client-side $expand overhead.

    /**
     * Match list with team names/crests and tournament name pre-joined.
     * Replaces: /Matches?$expand=homeTeam,awayTeam,tournament&$orderby=kickoff asc
     */
    @readonly
    entity AdminMatchListView       as
        select from db.Match as m
            left join db.Team as home
                on home.ID = m.homeTeam.ID
            left join db.Team as away
                on away.ID = m.awayTeam.ID
            left join db.Tournament as tournament
                on tournament.ID = m.tournament.ID {
            key m.ID               as ID,
                m.createdAt        as createdAt,
                m.modifiedAt       as modifiedAt,
                m.tournament.ID    as tournament_ID,
                tournament.name    as tournamentName,
                m.homeTeam.ID      as homeTeam_ID,
                home.name          as homeTeamName,
                home.flagCode      as homeTeamFlag,
                home.crest         as homeTeamCrest,
                home.shortName     as homeTeamShort,
                m.awayTeam.ID      as awayTeam_ID,
                away.name          as awayTeamName,
                away.flagCode      as awayTeamFlag,
                away.crest         as awayTeamCrest,
                away.shortName     as awayTeamShort,
                m.kickoff          as kickoff,
                m.venue            as venue,
                m.stage            as stage,
                m.status           as status,
                m.matchNumber      as matchNumber,
                m.matchday         as matchday,
                m.outcomePoints    as outcomePoints,
                m.homeScore        as homeScore,
                m.awayScore        as awayScore,
                m.outcome          as outcome,
                m.externalId       as externalId,
                m.bettingLocked    as bettingLocked,
                m.isHotMatch       as isHotMatch,
                m.bracketSlot.ID   as bracketSlot_ID,
                m.leg              as leg
        };

    /**
     * Predictions for a match with player info pre-joined.
     * Replaces: /AllPredictions?$filter=match_ID eq '...'&$expand=player
     */
    @readonly
    entity AdminMatchPredictionsView as
        select from db.Prediction as prediction
            left join db.Player as player
                on player.ID = prediction.player.ID {
            key prediction.ID          as ID,
                prediction.player.ID   as player_ID,
                prediction.match.ID    as match_ID,
                prediction.tournament.ID as tournament_ID,
                prediction.pick        as pick,
                prediction.isCorrect   as isCorrect,
                prediction.pointsEarned as pointsEarned,
                prediction.status      as status,
                prediction.submittedAt as submittedAt,
                player.displayName     as playerName,
                player.avatarUrl       as playerAvatar,
                player.email           as playerEmail
        };

    /**
     * Score bets for a match with player info pre-joined.
     * Replaces: /AllScoreBets?$filter=match_ID eq '...'&$expand=player
     */
    @readonly
    entity AdminMatchScoreBetsView  as
        select from db.ScoreBet as bet
            left join db.Player as player
                on player.ID = bet.player.ID {
            key bet.ID                 as ID,
                bet.player.ID          as player_ID,
                bet.match.ID           as match_ID,
                bet.predictedHomeScore as predictedHomeScore,
                bet.predictedAwayScore as predictedAwayScore,
                bet.status             as status,
                bet.isCorrect          as isCorrect,
                bet.submittedAt        as submittedAt,
                player.displayName     as playerName,
                player.avatarUrl       as playerAvatar,
                player.email           as playerEmail
        };

    /**
     * Champion picks for a tournament with player and team info pre-joined.
     * Replaces: /AllChampionPicks?$filter=tournament_ID eq '...'&$expand=player,team
     */
    @readonly
    entity AdminChampionPicksView   as
        select from db.ChampionPick as pick
            left join db.Player as player
                on player.ID = pick.player.ID
            left join db.Team as team
                on team.ID = pick.team.ID {
            key pick.ID                as ID,
                pick.player.ID         as player_ID,
                pick.team.ID           as team_ID,
                pick.tournament.ID     as tournament_ID,
                pick.submittedAt       as submittedAt,
                pick.isCorrect         as isCorrect,
                player.displayName     as playerName,
                player.avatarUrl       as playerAvatar,
                player.email           as playerEmail,
                team.name              as teamName,
                team.crest             as teamCrest,
                team.flagCode          as teamFlag
        };

    /**
     * Tournament stats with player info pre-joined.
     * Replaces: /PlayerTournamentStats?$filter=tournament_ID eq '...'&$expand=player
     */
    @readonly
    entity AdminTournamentStatsView as
        select from db.PlayerTournamentStats as stats
            left join db.Player as player
                on player.ID = stats.player.ID {
            key stats.ID               as ID,
                stats.player.ID        as player_ID,
                stats.tournament.ID    as tournament_ID,
                stats.totalPoints      as totalPoints,
                stats.totalCorrect     as totalCorrect,
                stats.totalPredictions as totalPredictions,
                stats.currentStreak    as currentStreak,
                stats.bestStreak       as bestStreak,
                stats.rank             as rank,
                player.displayName     as playerName,
                player.avatarUrl       as playerAvatar,
                player.email           as playerEmail
        };

    /**
     * Tournament teams with team info pre-joined.
     * Replaces: /TournamentTeams?$filter=tournament_ID eq '...'&$expand=team
     */
    @readonly
    entity AdminTournamentTeamsView as
        select from db.TournamentTeam as tt
            left join db.Team as team
                on team.ID = tt.team.ID {
            key tt.ID                  as ID,
                tt.tournament.ID       as tournament_ID,
                tt.team.ID             as team_ID,
                tt.groupName           as groupName,
                tt.isEliminated        as isEliminated,
                tt.finalPosition       as finalPosition,
                team.name              as teamName,
                team.crest             as teamCrest,
                team.flagCode          as teamFlag,
                team.shortName         as teamShort,
                team.confederation     as confederation,
                team.fifaRanking       as fifaRanking
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

    /** Remove all non-player data and reset player stats so the app can be reseeded from scratch. */
    action clearAllDataExceptPlayers()                                              returns ActionResult;

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

    // ── Sandbox User Provisioning ───────────────────────────

    type SandboxUserProvisionInput {
        email       : String(255);
        userName    : String(255);
        givenName   : String(100);
        familyName  : String(100);
        displayName : String(100);
        workzoneRole : String(20);
        workzoneRoles : array of String;
        appRole     : String(40);
        appRoles    : array of String;
        password    : String(255);
        makeAdmin   : Boolean;
        grantPredictionAdmin : Boolean;
        identityOrigin : String(120);
        userType    : String(80);
    }

    type SandboxUserProvisionResult {
        email            : String(255);
        success          : Boolean;
        status           : String(20);
        message          : String(500);
        idpUserId        : String(120);
        assignedGroups   : array of String;
        assignedAppRoles : array of String;
        passwordApplied  : Boolean;
        passwordSource   : String(20);
    }

    action provisionSandboxUsers(users: many SandboxUserProvisionInput) returns many SandboxUserProvisionResult;
}
