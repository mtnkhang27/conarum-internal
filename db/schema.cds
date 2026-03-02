namespace cnma.prediction;

using {
    cuid,
    managed,
    Country
} from '@sap/cds/common';

// ────────────────────────────────────────────────────────────
//  Custom Types
// ────────────────────────────────────────────────────────────

type MoneyAmount      : Decimal(15, 2);
type Points           : Decimal(8, 2);
type Percentage       : Decimal(5, 2);
type Weight           : Decimal(3, 1);

// ────────────────────────────────────────────────────────────
//  Enum Types
// ────────────────────────────────────────────────────────────

type MatchStatus      : String enum {
    upcoming;
    live;
    finished;
    cancelled;
}

type TournamentStatus : String enum {
    upcoming;
    active;
    completed;
    cancelled;
}

type MatchStage       : String enum {
    group;
    roundOf32;
    roundOf16;
    quarterFinal;
    semiFinal;
    thirdPlace;
    final;
    // League stages
    regular;       // regular season matchday
    playoff;
    relegation;
}

type PredictionPick   : String enum {
    home;
    draw;
    away;
}

type PredictionStatus : String enum {
    draft;
    submitted;
    locked;
    scored;
}

type BetStatus        : String enum {
    pending;
    won;
    lost;
}

type BettingStatus    : String enum {
    open;
    locked;
    closed;
}

type TieBreakRule     : String enum {
    headToHead;
    goalDifference;
    totalCorrect;
    earliestJoin;
}

type Confederation    : String enum {
    UEFA;
    CONMEBOL;
    CAF;
    AFC;
    CONCACAF;
    OFC;
}

type TeamMemberRole   : String enum {
    headCoach;
    assistantCoach;
    goalkeepingCoach;
    fitnessCoach;
    player;
    captain;
}

type TournamentFormat : String enum {
    knockout;      // World Cup, Champions League
    league;        // Premier League, La Liga
    groupKnockout; // World Cup (group stage + knockout)
    cup;           // FA Cup (straight knockout)
}

// ────────────────────────────────────────────────────────────
//  Core Entities
// ────────────────────────────────────────────────────────────

/**
 * Tournament master data (e.g., FIFA World Cup 2026, Premier League 2025/26).
 * Supports both knockout (World Cup, C1) and league (Premier League) formats.
 */
entity Tournament : cuid, managed {
    name           : String(100)     @mandatory;
    startDate      : Date            @mandatory;
    endDate        : Date            @mandatory;
    status         : TournamentStatus default 'upcoming';
    format         : TournamentFormat default 'knockout';
    description    : String(500);
    season         : String(20);       // e.g., '2025/26' for league formats
    country        : Country;          // e.g., for domestic leagues
    numberOfGroups : Integer;          // for groupKnockout format
    hasGroupStage  : Boolean default false;
    hasLegs        : Boolean default false; // two-leg ties (e.g., C1 knockout)
    matches        : Composition of many Match
                         on matches.tournament = $self;
    teams          : Composition of many TournamentTeam
                         on teams.tournament = $self;
    // Per-tournament prize config (outcome prediction leaderboard prizes)
    prizeConfig    : Composition of many TournamentPrizeConfig
                         on prizeConfig.tournament = $self;
    // Per-tournament champion prediction config
    championConfig : Composition of many TournamentChampionConfig
                         on championConfig.tournament = $self;
}

/**
 * Team master data — reusable across tournaments.
 * A real-world team (e.g., "Argentina", "Man City").
 * One player can belong to both a club (Man City) and a national team (Argentina).
 * Tournament-specific data (group, elimination) lives in TournamentTeam.
 */
entity Team : cuid, managed {
    name          : String(100) @mandatory;
    flagCode      : String(5)   @mandatory; // ISO 3166-1 alpha-2 (e.g., 'br', 'de')
    confederation : Confederation;
    fifaRanking   : Integer;
    members       : Composition of many TeamMember
                        on members.team = $self;
    tournaments   : Association to many TournamentTeam
                        on tournaments.team = $self;
}

/**
 * Join entity: a Team participating in a specific Tournament.
 * Holds tournament-specific info like group assignment and elimination status.
 */
entity TournamentTeam : cuid, managed {
    tournament   : Association to Tournament @mandatory;
    team         : Association to Team       @mandatory;
    groupName    : String(5);    // e.g., 'A', 'B' — for groupKnockout format
    isEliminated : Boolean default false;
}

annotate TournamentTeam with @assert.unique: {tournamentTeam: [tournament, team]};

/**
 * Team member: players, coaches, and staff.
 * Reusable across tournament types (league, knockout, groupKnockout).
 */
entity TeamMember : cuid, managed {
    team         : Association to Team @mandatory;
    name         : String(150)        @mandatory;
    role         : TeamMemberRole default 'player';
    jerseyNumber : Integer;
    position     : String(50);   // e.g., 'GK', 'CB', 'CM', 'ST'
    nationality  : Country;
    dateOfBirth  : Date;
    photoUrl     : String(500);
    isCaptain    : Boolean default false;
    isActive     : Boolean default true;
}

/**
 * Match schedule and results.
 * Belongs to a Tournament. References home and away Teams.
 */
entity Match : cuid, managed {
    tournament  : Association to Tournament @mandatory;
    homeTeam    : Association to Team       @mandatory;
    awayTeam    : Association to Team       @mandatory;
    kickoff     : DateTime                  @mandatory;
    venue       : String(200);
    stage       : MatchStage default 'group';
    status      : MatchStatus default 'upcoming';
    matchNumber : Integer;
    matchday    : Integer;  // for league format (e.g., matchday 1–38)
    leg         : Integer;  // for two-leg ties (1 or 2), null for single match
    // Admin toggle: allow score prediction for this match (default true)
    allowScorePrediction : Boolean default true;
    // Per-match outcome prediction config
    outcomeEnabled : Boolean default true;
    outcomePoints  : Points default 1;    // points earned for correct outcome prediction
    // Result (null until finished)
    homeScore   : Integer;
    awayScore   : Integer;
    // Derived from result
    outcome     : PredictionPick; // home | draw | away (set when result entered)
    // Navigation (Association, NOT Composition — predictions are auditable records)
    predictions : Association to many Prediction
                      on predictions.match = $self;
    scoreBets   : Association to many ScoreBet
                      on scoreBets.match = $self;
    // Per-match score bet configuration
    scoreBetConfig : Composition of many MatchScoreBetConfig
                         on scoreBetConfig.match = $self;
}

/**
 * Registered employee / participant.
 */
entity Player : cuid, managed {
    displayName      : String(100) @mandatory;
    email            : String(255) @mandatory;
    avatarUrl        : String(500);
    country          : Country;
    favoriteTeam     : Association to Team;
    // Aggregated stats across ALL tournaments (denormalized)
    totalPoints      : Points default 0;
    totalCorrect     : Integer default 0;
    totalPredictions : Integer default 0;
    currentStreak    : Integer default 0;
    bestStreak       : Integer default 0;
    rank             : Integer;
    // Back-associations
    predictions      : Association to many Prediction
                           on predictions.player = $self;
    scoreBets        : Association to many ScoreBet
                           on scoreBets.player = $self;
    championPicks    : Association to many ChampionPick
                           on championPicks.player = $self;
    tournamentStats  : Association to many PlayerTournamentStats
                           on tournamentStats.player = $self;
}

// Unique constraints
annotate Player with @assert.unique: {email: [email]};

/**
 * Per-tournament stats for a player.
 * Enables separate leaderboards per tournament.
 */
entity PlayerTournamentStats : cuid, managed {
    player           : Association to Player     @mandatory;
    tournament       : Association to Tournament @mandatory;
    totalPoints      : Points default 0;
    totalCorrect     : Integer default 0;
    totalPredictions : Integer default 0;
    currentStreak    : Integer default 0;
    bestStreak       : Integer default 0;
    rank             : Integer;
}

annotate PlayerTournamentStats with @assert.unique: {playerTournament: [player, tournament]};

// ────────────────────────────────────────────────────────────
//  Prediction Entities
// ────────────────────────────────────────────────────────────

/**
 * Match outcome prediction (Win / Draw / Lose).
 * Belongs to a Player and a Match.
 * Points: 1 if correct, 0 if wrong (no weight).
 */
entity Prediction : cuid, managed {
    player       : Association to Player     @mandatory;
    match        : Association to Match      @mandatory;
    tournament   : Association to Tournament; // denormalized from match for fast queries
    pick         : PredictionPick            @mandatory;
    status       : PredictionStatus default 'submitted';
    submittedAt  : DateTime;
    lockedAt     : DateTime;
    scoredAt     : DateTime;
    isCorrect    : Boolean;
    pointsEarned : Points default 0;         // 1 if correct, 0 if wrong
}

// One prediction per player per match
annotate Prediction with @assert.unique: {playerMatch: [
    player,
    match
]};

/**
 * Exact score prediction bet.
 * Belongs to a Player and a Match.
 */
entity ScoreBet : cuid, managed {
    player             : Association to Player @mandatory;
    match              : Association to Match  @mandatory;
    predictedHomeScore : Integer               @mandatory;
    predictedAwayScore : Integer               @mandatory;
    betAmount          : MoneyAmount default 50000;
    status             : BetStatus default 'pending';
    submittedAt        : DateTime;
    isCorrect          : Boolean;
    payout             : MoneyAmount default 0;
}

/**
 * Tournament champion prediction.
 * Belongs to a Player and a Team. Uses managed.modifiedAt for change tracking.
 */
entity ChampionPick : cuid, managed {
    player      : Association to Player @mandatory;
    team        : Association to Team   @mandatory;
    submittedAt : DateTime;
    isCorrect   : Boolean;
}

// One champion pick per player (configurable max handled in handler)
annotate ChampionPick with @assert.unique: {playerPick: [player]};

// ────────────────────────────────────────────────────────────
//  Per-Match Configuration Entities
// ────────────────────────────────────────────────────────────

/**
 * Per-match score betting config.
 * Each match can have its own score betting rules (UC1).
 * If no config exists for a match, score betting is disabled.
 */
entity MatchScoreBetConfig : cuid, managed {
    match               : Association to Match @mandatory;
    enabled             : Boolean default true;
    maxBets             : Integer default 3;
    basePrice           : MoneyAmount default 50000;
    baseReward          : MoneyAmount default 200000;
    allowDuplicates     : Boolean default true;
    duplicateMultiplier : Weight default 2.0;
    maxDuplicates       : Integer default 3;
    bonusMultiplier     : Weight default 1.5;
    platformFee         : Percentage default 5;
    lockBeforeMinutes   : Integer default 30;
    minBetAmount        : MoneyAmount default 10000;
    maxBetAmount        : MoneyAmount default 500000;
    autoLockOnKickoff   : Boolean default true;
}

annotate MatchScoreBetConfig with @assert.unique: {perMatch: [match]};

// ────────────────────────────────────────────────────────────
//  Per-Tournament Configuration Entities
// ────────────────────────────────────────────────────────────

/**
 * Per-tournament prize config for Match Outcome Prediction (UC2).
 * At the end of a tournament, the leaderboard winners receive these prizes.
 */
entity TournamentPrizeConfig : cuid, managed {
    tournament                : Association to Tournament @mandatory;
    firstPlacePrize           : String(200) default 'iPhone 15 Pro Max';
    firstPlaceValue           : MoneyAmount default 35000000;
    secondPlacePrize          : String(200) default 'Honda Vision 2024';
    secondPlaceValue          : MoneyAmount default 30000000;
    thirdPlacePrize           : String(200) default 'MacBook Air M3';
    thirdPlaceValue           : MoneyAmount default 25000000;
    consolationPrizes         : Integer default 10;
    consolationValue          : MoneyAmount default 500000;
    showLiveRanking           : Boolean default true;
    leaderboardUpdateInterval : Integer default 5;
}

annotate TournamentPrizeConfig with @assert.unique: {perTournament: [tournament]};

/**
 * Per-tournament champion prediction config (UC3).
 * Each tournament has its own champion prediction rules and prizes.
 */
entity TournamentChampionConfig : cuid, managed {
    tournament                : Association to Tournament @mandatory;
    enabled                   : Boolean default true;
    bettingStatus             : BettingStatus default 'open';
    // Timing
    openDate                  : Date;
    lockDate                  : Date;
    closeDate                 : Date;
    autoLockOnTournamentStart : Boolean default true;
    // Prizes
    grandPrize                : String(200) default 'iPhone 15 Pro Max 256GB';
    grandPrizeValue           : MoneyAmount default 35000000;
    secondPrize               : String(200) default 'iPad Pro 12.9"';
    secondPrizeValue          : MoneyAmount default 25000000;
    thirdPrize                : String(200) default 'AirPods Pro 2';
    thirdPrizeValue           : MoneyAmount default 7000000;
    // Multiple Winners
    splitPrizeIfTie           : Boolean default true;
    maxWinnersForSplit        : Integer default 5;
    cashAlternativeEnabled    : Boolean default true;
    cashAlternativeValue      : MoneyAmount default 30000000;
    // Prediction Rules
    maxPredictionsPerUser     : Integer default 1;
    allowChangePrediction     : Boolean default true;
    changeDeadline            : Date;
    requireReason             : Boolean default false;
    // Display Options
    showOthersPredictions     : Boolean default false;
    showPredictionStats       : Boolean default true;
    showOdds                  : Boolean default true;
    // Notifications
    notifyOnOpen              : Boolean default true;
    notifyBeforeLock          : Boolean default true;
    notifyHoursBeforeLock     : Integer default 24;
    notifyOnResult            : Boolean default true;
}

annotate TournamentChampionConfig with @assert.unique: {perTournament: [tournament]};

// ────────────────────────────────────────────────────────────
//  Legacy Global Configuration (kept for backward compat, deprecated)
// ────────────────────────────────────────────────────────────

/**
 * Score Prediction Config: Exact score betting rules.
 * Single-row configuration entity managed by admin.
 */
entity ScorePredictionConfig : cuid, managed {
    enabled             : Boolean default true;
    maxBetsPerMatch     : Integer default 3;
    basePrice           : MoneyAmount default 50000;
    baseReward          : MoneyAmount default 200000;
    allowDuplicateBets  : Boolean default true;
    duplicateMultiplier : Weight default 2.0;
    maxDuplicates       : Integer default 3;
    bonusMultiplier     : Weight default 1.5;
    platformFee         : Percentage default 5;
    lockBeforeMatch     : Integer default 30; // minutes
    minBetAmount        : MoneyAmount default 10000;
    maxBetAmount        : MoneyAmount default 500000;
    payoutDelay         : Integer default 24; // hours
    autoLockOnKickoff   : Boolean default true;
}

/**
 * Match Outcome Config: Win/Draw/Lose prediction rules (UC2).
 * Simplified: correct = 1 point, wrong = 0. No weight.
 */
entity MatchOutcomeConfig : cuid, managed {
    enabled                   : Boolean default true;
    // Point System — simplified: 1 for correct, 0 for wrong
    pointsForCorrect          : Points default 1;
    // Prizes
    firstPlacePrize           : String(200) default 'iPhone 15 Pro Max';
    firstPlaceValue           : MoneyAmount default 35000000;
    secondPlacePrize          : String(200) default 'Honda Vision 2024';
    secondPlaceValue          : MoneyAmount default 30000000;
    thirdPlacePrize           : String(200) default 'MacBook Air M3';
    thirdPlaceValue           : MoneyAmount default 25000000;
    consolationPrizes         : Integer default 10;
    consolationValue          : MoneyAmount default 500000;
    // Calculation
    autoCalculateAfterMatch   : Boolean default true;
    calculateDelay            : Integer default 2; // hours
    showLiveRanking           : Boolean default true;
    // Leaderboard
    leaderboardUpdateInterval : Integer default 5; // minutes
}

/**
 * Champion Prediction Config: Tournament champion prediction rules + prizes.
 * Single-row configuration entity managed by admin.
 */
entity ChampionPredictionConfig : cuid, managed {
    enabled                   : Boolean default true;
    bettingStatus             : BettingStatus default 'open';
    // Timing
    openDate                  : Date;
    lockDate                  : Date;
    closeDate                 : Date;
    autoLockOnTournamentStart : Boolean default true;
    // Prizes
    grandPrize                : String(200) default 'iPhone 15 Pro Max 256GB';
    grandPrizeValue           : MoneyAmount default 35000000;
    secondPrize               : String(200) default 'iPad Pro 12.9"';
    secondPrizeValue          : MoneyAmount default 25000000;
    thirdPrize                : String(200) default 'AirPods Pro 2';
    thirdPrizeValue           : MoneyAmount default 7000000;
    // Multiple Winners
    splitPrizeIfTie           : Boolean default true;
    maxWinnersForSplit        : Integer default 5;
    cashAlternativeEnabled    : Boolean default true;
    cashAlternativeValue      : MoneyAmount default 30000000;
    // Prediction Rules
    maxPredictionsPerUser     : Integer default 1;
    allowChangePrediction     : Boolean default true;
    changeDeadline            : Date;
    requireReason             : Boolean default false;
    // Display Options
    showOthersPredictions     : Boolean default false;
    showPredictionStats       : Boolean default true;
    showOdds                  : Boolean default true;
    // Notifications
    notifyOnOpen              : Boolean default true;
    notifyBeforeLock          : Boolean default true;
    notifyHoursBeforeLock     : Integer default 24;
    notifyOnResult            : Boolean default true;
}
