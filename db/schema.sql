-- ====================================================================
-- Generated SQLite Schema from CDS Schema (cnma.prediction namespace)
-- Generated on: 2026-02-28
-- ====================================================================

-- ────────────────────────────────────────────────────────────
-- Drop Tables (for clean recreation)
-- ────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS cnma_prediction_ChampionPredictionConfig;
DROP TABLE IF EXISTS cnma_prediction_MatchOutcomeConfig;
DROP TABLE IF EXISTS cnma_prediction_ScorePredictionConfig;
DROP TABLE IF EXISTS cnma_prediction_ChampionPick;
DROP TABLE IF EXISTS cnma_prediction_ScoreBet;
DROP TABLE IF EXISTS cnma_prediction_Prediction;
DROP TABLE IF EXISTS cnma_prediction_Match;
DROP TABLE IF EXISTS cnma_prediction_Player;
DROP TABLE IF EXISTS cnma_prediction_Team;
DROP TABLE IF EXISTS cnma_prediction_Tournament;

-- ────────────────────────────────────────────────────────────
-- Core Tables
-- ────────────────────────────────────────────────────────────

-- Tournament master data
CREATE TABLE cnma_prediction_Tournament (
    ID                TEXT PRIMARY KEY,
    createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy         TEXT,
    modifiedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy        TEXT,
    name              TEXT NOT NULL,
    startDate         DATE NOT NULL,
    endDate           DATE NOT NULL,
    status            TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    description       TEXT
);

-- Team roster with flag codes and confederation
CREATE TABLE cnma_prediction_Team (
    ID                TEXT PRIMARY KEY,
    createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy         TEXT,
    modifiedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy        TEXT,
    name              TEXT NOT NULL,
    flagCode          TEXT NOT NULL,
    confederation     TEXT CHECK (confederation IN ('UEFA', 'CONMEBOL', 'CAF', 'AFC', 'CONCACAF', 'OFC')),
    fifaRanking       INTEGER,
    groupName         TEXT,
    isEliminated      BOOLEAN DEFAULT FALSE
);

-- Registered employee / participant
CREATE TABLE cnma_prediction_Player (
    ID                TEXT PRIMARY KEY,
    createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy         TEXT,
    modifiedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy        TEXT,
    displayName       TEXT NOT NULL,
    email             TEXT NOT NULL UNIQUE,
    avatarUrl         TEXT,
    country_code      TEXT,
    favoriteTeam_ID   TEXT,
    totalPoints       DECIMAL(8,2) DEFAULT 0,
    totalCorrect      INTEGER DEFAULT 0,
    totalPredictions  INTEGER DEFAULT 0,
    currentStreak     INTEGER DEFAULT 0,
    bestStreak        INTEGER DEFAULT 0,
    rank              INTEGER,
    
    FOREIGN KEY (favoriteTeam_ID) REFERENCES cnma_prediction_Team(ID)
);

-- Match schedule and results
CREATE TABLE cnma_prediction_Match (
    ID                TEXT PRIMARY KEY,
    createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy         TEXT,
    modifiedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy        TEXT,
    tournament_ID     TEXT NOT NULL,
    homeTeam_ID       TEXT NOT NULL,
    awayTeam_ID       TEXT NOT NULL,
    kickoff           DATETIME NOT NULL,
    venue             TEXT,
    stage             TEXT DEFAULT 'group' CHECK (stage IN ('group', 'roundOf16', 'quarterFinal', 'semiFinal', 'thirdPlace', 'final')),
    status            TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'cancelled')),
    weight            DECIMAL(3,1) DEFAULT 1.0,
    matchNumber       INTEGER,
    homeScore         INTEGER,
    awayScore         INTEGER,
    outcome           TEXT CHECK (outcome IN ('home', 'draw', 'away')),
    
    FOREIGN KEY (tournament_ID) REFERENCES cnma_prediction_Tournament(ID),
    FOREIGN KEY (homeTeam_ID) REFERENCES cnma_prediction_Team(ID),
    FOREIGN KEY (awayTeam_ID) REFERENCES cnma_prediction_Team(ID)
);

-- ────────────────────────────────────────────────────────────
-- Prediction Tables
-- ────────────────────────────────────────────────────────────

-- Match outcome prediction (Win / Draw / Lose)
CREATE TABLE cnma_prediction_Prediction (
    ID                TEXT PRIMARY KEY,
    createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy         TEXT,
    modifiedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy        TEXT,
    player_ID         TEXT NOT NULL,
    match_ID          TEXT NOT NULL,
    pick              TEXT NOT NULL CHECK (pick IN ('home', 'draw', 'away')),
    status            TEXT DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'locked', 'scored')),
    submittedAt       DATETIME,
    lockedAt          DATETIME,
    scoredAt          DATETIME,
    isCorrect         BOOLEAN,
    pointsEarned      DECIMAL(8,2) DEFAULT 0,
    
    FOREIGN KEY (player_ID) REFERENCES cnma_prediction_Player(ID),
    FOREIGN KEY (match_ID) REFERENCES cnma_prediction_Match(ID),
    UNIQUE (player_ID, match_ID)
);

-- Exact score prediction bet
CREATE TABLE cnma_prediction_ScoreBet (
    ID                TEXT PRIMARY KEY,
    createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy         TEXT,
    modifiedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy        TEXT,
    player_ID         TEXT NOT NULL,
    match_ID          TEXT NOT NULL,
    predictedHomeScore INTEGER NOT NULL,
    predictedAwayScore INTEGER NOT NULL,
    betAmount         DECIMAL(15,2) DEFAULT 50000,
    status            TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
    submittedAt       DATETIME,
    isCorrect         BOOLEAN,
    payout            DECIMAL(15,2) DEFAULT 0,
    
    FOREIGN KEY (player_ID) REFERENCES cnma_prediction_Player(ID),
    FOREIGN KEY (match_ID) REFERENCES cnma_prediction_Match(ID)
);

-- Tournament champion prediction
CREATE TABLE cnma_prediction_ChampionPick (
    ID                TEXT PRIMARY KEY,
    createdAt         DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy         TEXT,
    modifiedAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy        TEXT,
    player_ID         TEXT NOT NULL,
    team_ID           TEXT NOT NULL,
    submittedAt       DATETIME,
    isCorrect         BOOLEAN,
    
    FOREIGN KEY (player_ID) REFERENCES cnma_prediction_Player(ID),
    FOREIGN KEY (team_ID) REFERENCES cnma_prediction_Team(ID),
    UNIQUE (player_ID)
);

-- ────────────────────────────────────────────────────────────
-- Configuration Tables (single-row admin config)
-- ────────────────────────────────────────────────────────────

-- Score Prediction Config: Exact score betting rules
CREATE TABLE cnma_prediction_ScorePredictionConfig (
    ID                     TEXT PRIMARY KEY,
    createdAt              DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy              TEXT,
    modifiedAt             DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy             TEXT,
    enabled                BOOLEAN DEFAULT TRUE,
    maxBetsPerMatch        INTEGER DEFAULT 3,
    basePrice              DECIMAL(15,2) DEFAULT 50000,
    baseReward             DECIMAL(15,2) DEFAULT 200000,
    allowDuplicateBets     BOOLEAN DEFAULT TRUE,
    duplicateMultiplier    DECIMAL(3,1) DEFAULT 2.0,
    maxDuplicates          INTEGER DEFAULT 3,
    bonusMultiplier        DECIMAL(3,1) DEFAULT 1.5,
    platformFee            DECIMAL(5,2) DEFAULT 5,
    lockBeforeMatch        INTEGER DEFAULT 30,
    minBetAmount           DECIMAL(15,2) DEFAULT 10000,
    maxBetAmount           DECIMAL(15,2) DEFAULT 500000,
    payoutDelay            INTEGER DEFAULT 24,
    autoLockOnKickoff      BOOLEAN DEFAULT TRUE
);

-- Match Outcome Config: Win/Draw/Lose prediction rules + prizes
CREATE TABLE cnma_prediction_MatchOutcomeConfig (
    ID                           TEXT PRIMARY KEY,
    createdAt                    DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy                    TEXT,
    modifiedAt                   DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy                   TEXT,
    enabled                      BOOLEAN DEFAULT TRUE,
    pointsForWin                 DECIMAL(8,2) DEFAULT 3,
    pointsForDraw                DECIMAL(8,2) DEFAULT 1,
    pointsForLose                DECIMAL(8,2) DEFAULT 0,
    regularMatchWeight           DECIMAL(3,1) DEFAULT 1.0,
    importantMatchWeight         DECIMAL(3,1) DEFAULT 2.0,
    semifinalWeight              DECIMAL(3,1) DEFAULT 3.0,
    finalMatchWeight             DECIMAL(3,1) DEFAULT 5.0,
    firstPlacePrize              TEXT DEFAULT 'iPhone 15 Pro Max',
    firstPlaceValue              DECIMAL(15,2) DEFAULT 35000000,
    secondPlacePrize             TEXT DEFAULT 'Honda Vision 2024',
    secondPlaceValue             DECIMAL(15,2) DEFAULT 30000000,
    thirdPlacePrize              TEXT DEFAULT 'MacBook Air M3',
    thirdPlaceValue              DECIMAL(15,2) DEFAULT 25000000,
    consolationPrizes            INTEGER DEFAULT 10,
    consolationValue             DECIMAL(15,2) DEFAULT 500000,
    autoCalculateAfterMatch      BOOLEAN DEFAULT TRUE,
    calculateDelay               INTEGER DEFAULT 2,
    tieBreakRule                 TEXT DEFAULT 'headToHead' CHECK (tieBreakRule IN ('headToHead', 'goalDifference', 'totalCorrect', 'earliestJoin')),
    showLiveRanking              BOOLEAN DEFAULT TRUE,
    perfectWeekBonus             DECIMAL(8,2) DEFAULT 5,
    consecutiveWinsBonus         DECIMAL(8,2) DEFAULT 2,
    leaderboardUpdateInterval    INTEGER DEFAULT 5
);

-- Champion Prediction Config: Tournament champion prediction rules + prizes
CREATE TABLE cnma_prediction_ChampionPredictionConfig (
    ID                        TEXT PRIMARY KEY,
    createdAt                 DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdBy                 TEXT,
    modifiedAt                DATETIME DEFAULT CURRENT_TIMESTAMP,
    modifiedBy                TEXT,
    enabled                   BOOLEAN DEFAULT TRUE,
    bettingStatus             TEXT DEFAULT 'open' CHECK (bettingStatus IN ('open', 'locked', 'closed')),
    openDate                  DATE,
    lockDate                  DATE,
    closeDate                 DATE,
    autoLockOnTournamentStart BOOLEAN DEFAULT TRUE,
    grandPrize                TEXT DEFAULT 'iPhone 15 Pro Max 256GB',
    grandPrizeValue           DECIMAL(15,2) DEFAULT 35000000,
    secondPrize               TEXT DEFAULT 'iPad Pro 12.9"',
    secondPrizeValue          DECIMAL(15,2) DEFAULT 25000000,
    thirdPrize                TEXT DEFAULT 'AirPods Pro 2',
    thirdPrizeValue           DECIMAL(15,2) DEFAULT 7000000,
    splitPrizeIfTie           BOOLEAN DEFAULT TRUE,
    maxWinnersForSplit        INTEGER DEFAULT 5,
    cashAlternativeEnabled    BOOLEAN DEFAULT TRUE,
    cashAlternativeValue      DECIMAL(15,2) DEFAULT 30000000,
    maxPredictionsPerUser     INTEGER DEFAULT 1,
    allowChangePrediction     BOOLEAN DEFAULT TRUE,
    changeDeadline            DATE,
    requireReason             BOOLEAN DEFAULT FALSE,
    showOthersPredictions     BOOLEAN DEFAULT FALSE,
    showPredictionStats       BOOLEAN DEFAULT TRUE,
    showOdds                  BOOLEAN DEFAULT TRUE,
    notifyOnOpen              BOOLEAN DEFAULT TRUE,
    notifyBeforeLock          BOOLEAN DEFAULT TRUE,
    notifyHoursBeforeLock     INTEGER DEFAULT 24,
    notifyOnResult            BOOLEAN DEFAULT TRUE
);

-- ────────────────────────────────────────────────────────────
-- Indexes for Performance
-- ────────────────────────────────────────────────────────────

CREATE INDEX idx_match_tournament ON cnma_prediction_Match(tournament_ID);
CREATE INDEX idx_match_teams ON cnma_prediction_Match(homeTeam_ID, awayTeam_ID);
CREATE INDEX idx_match_kickoff ON cnma_prediction_Match(kickoff);
CREATE INDEX idx_match_status ON cnma_prediction_Match(status);

CREATE INDEX idx_prediction_player ON cnma_prediction_Prediction(player_ID);
CREATE INDEX idx_prediction_match ON cnma_prediction_Prediction(match_ID);
CREATE INDEX idx_prediction_status ON cnma_prediction_Prediction(status);

CREATE INDEX idx_scorebet_player ON cnma_prediction_ScoreBet(player_ID);
CREATE INDEX idx_scorebet_match ON cnma_prediction_ScoreBet(match_ID);
CREATE INDEX idx_scorebet_status ON cnma_prediction_ScoreBet(status);

CREATE INDEX idx_championpick_player ON cnma_prediction_ChampionPick(player_ID);
CREATE INDEX idx_championpick_team ON cnma_prediction_ChampionPick(team_ID);

CREATE INDEX idx_player_email ON cnma_prediction_Player(email);
CREATE INDEX idx_player_points ON cnma_prediction_Player(totalPoints DESC);
CREATE INDEX idx_player_rank ON cnma_prediction_Player(rank);

-- ────────────────────────────────────────────────────────────
-- Sample Configuration Data Insert (Optional)
-- ────────────────────────────────────────────────────────────

INSERT INTO cnma_prediction_ScorePredictionConfig (ID) VALUES ('config-score-prediction-' || hex(randomblob(8)));
INSERT INTO cnma_prediction_MatchOutcomeConfig (ID) VALUES ('config-match-outcome-' || hex(randomblob(8)));
INSERT INTO cnma_prediction_ChampionPredictionConfig (ID) VALUES ('config-champion-prediction-' || hex(randomblob(8)));