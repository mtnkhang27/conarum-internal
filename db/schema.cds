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
    roundOf16;
    quarterFinal;
    semiFinal;
    thirdPlace;
    final;
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

// ────────────────────────────────────────────────────────────
//  Core Entities
// ────────────────────────────────────────────────────────────

/**
 * Tournament master data (e.g., FIFA World Cup 2026).
 */
entity Tournament : cuid, managed {
    name        : String(100) @mandatory;
    startDate   : Date        @mandatory;
    endDate     : Date        @mandatory;
    status      : TournamentStatus default 'upcoming';
    description : String(500);
    matches     : Composition of many Match
                      on matches.tournament = $self;
}

/**
 * Team roster with flag codes and confederation.
 */
entity Team : cuid, managed {
    name          : String(100) @mandatory;
    flagCode      : String(5)   @mandatory; // ISO 3166-1 alpha-2 (e.g., 'br', 'de')
    confederation : Confederation;
    fifaRanking   : Integer;
    groupName     : String(5); // e.g., 'A', 'B'
    isEliminated  : Boolean default false;
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
    weight      : Weight default 1.0;
    matchNumber : Integer;
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
    // Aggregated stats (denormalized for leaderboard performance)
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
}

// Unique constraints
annotate Player with @assert.unique: {email: [email]};

// ────────────────────────────────────────────────────────────
//  Prediction Entities
// ────────────────────────────────────────────────────────────

/**
 * Match outcome prediction (Win / Draw / Lose).
 * Belongs to a Player and a Match.
 */
entity Prediction : cuid, managed {
    player       : Association to Player @mandatory;
    match        : Association to Match  @mandatory;
    pick         : PredictionPick        @mandatory;
    status       : PredictionStatus default 'submitted';
    submittedAt  : DateTime;
    lockedAt     : DateTime;
    scoredAt     : DateTime;
    isCorrect    : Boolean;
    pointsEarned : Points default 0;
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
//  Configuration Entities (single-row admin config)
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
 * Match Outcome Config: Win/Draw/Lose prediction rules + prizes.
 * Single-row configuration entity managed by admin.
 */
entity MatchOutcomeConfig : cuid, managed {
    enabled                   : Boolean default true;
    // Point System
    pointsForWin              : Points default 3;
    pointsForDraw             : Points default 1;
    pointsForLose             : Points default 0;
    // Match Weight Defaults
    regularMatchWeight        : Weight default 1.0;
    importantMatchWeight      : Weight default 2.0;
    semifinalWeight           : Weight default 3.0;
    finalMatchWeight          : Weight default 5.0;
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
    tieBreakRule              : TieBreakRule default 'headToHead';
    showLiveRanking           : Boolean default true;
    // Bonuses
    perfectWeekBonus          : Points default 5;
    consecutiveWinsBonus      : Points default 2;
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
