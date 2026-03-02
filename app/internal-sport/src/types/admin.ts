// === Admin Entity Types (matching CDS schema) ===

export interface AdminTeam {
    ID: string;
    name: string;
    flagCode: string;
    confederation: string | null;
    fifaRanking: number | null;
}

export interface AdminTournament {
    ID: string;
    name: string;
    startDate: string;
    endDate: string;
    status: "upcoming" | "active" | "completed" | "cancelled";
    format: "knockout" | "league" | "groupKnockout" | "cup";
    description: string | null;
    season: string | null;
}

export interface AdminTournamentTeam {
    ID: string;
    tournament_ID: string;
    team_ID: string;
    groupName: string | null;
    isEliminated: boolean;
    team?: AdminTeam;
    tournament?: AdminTournament;
}

export interface AdminMatch {
    ID: string;
    tournament_ID: string;
    homeTeam_ID: string;
    awayTeam_ID: string;
    homeTeam?: AdminTeam;
    awayTeam?: AdminTeam;
    tournament?: AdminTournament;
    kickoff: string;
    venue: string | null;
    stage: "group" | "roundOf16" | "quarterFinal" | "semiFinal" | "thirdPlace" | "final" | "regular" | "playoff" | "relegation";
    status: "upcoming" | "live" | "finished" | "cancelled";
    matchNumber: number | null;
    matchday: number | null;
    allowScorePrediction: boolean;
    outcomeEnabled: boolean;
    outcomePoints: number;
    homeScore: number | null;
    awayScore: number | null;
    outcome: "home" | "draw" | "away" | null;
    scoreBetConfig?: MatchScoreBetConfig[];
}

export interface AdminPlayer {
    ID: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    country_code: string | null;
    favoriteTeam_ID: string | null;
    totalPoints: number;
    totalCorrect: number;
    totalPredictions: number;
    currentStreak: number;
    bestStreak: number;
    rank: number | null;
}

// === Per-Match Config Types ===

export interface MatchScoreBetConfig {
    ID: string;
    match_ID: string;
    enabled: boolean;
    maxBets: number;
    basePrice: number;
    baseReward: number;
    allowDuplicates: boolean;
    duplicateMultiplier: number;
    maxDuplicates: number;
    bonusMultiplier: number;
    platformFee: number;
    lockBeforeMinutes: number;
    minBetAmount: number;
    maxBetAmount: number;
    autoLockOnKickoff: boolean;
}

// === Per-Tournament Config Types ===

export interface TournamentPrizeConfig {
    ID: string;
    tournament_ID: string;
    firstPlacePrize: string;
    firstPlaceValue: number;
    secondPlacePrize: string;
    secondPlaceValue: number;
    thirdPlacePrize: string;
    thirdPlaceValue: number;
    consolationPrizes: number;
    consolationValue: number;
    showLiveRanking: boolean;
    leaderboardUpdateInterval: number;
}

export interface TournamentChampionConfig {
    ID: string;
    tournament_ID: string;
    enabled: boolean;
    bettingStatus: "open" | "locked" | "closed";
    openDate: string | null;
    lockDate: string | null;
    closeDate: string | null;
    autoLockOnTournamentStart: boolean;
    grandPrize: string;
    grandPrizeValue: number;
    secondPrize: string;
    secondPrizeValue: number;
    thirdPrize: string;
    thirdPrizeValue: number;
    splitPrizeIfTie: boolean;
    maxWinnersForSplit: number;
    cashAlternativeEnabled: boolean;
    cashAlternativeValue: number;
    maxPredictionsPerUser: number;
    allowChangePrediction: boolean;
    changeDeadline: string | null;
    requireReason: boolean;
    showOthersPredictions: boolean;
    showPredictionStats: boolean;
    showOdds: boolean;
    notifyOnOpen: boolean;
    notifyBeforeLock: boolean;
    notifyHoursBeforeLock: number;
    notifyOnResult: boolean;
}

// === Legacy Global Config Types (deprecated) ===

export interface ScorePredictionConfig {
    ID: string;
    enabled: boolean;
    maxBetsPerMatch: number;
    basePrice: number;
    baseReward: number;
    allowDuplicateBets: boolean;
    duplicateMultiplier: number;
    maxDuplicates: number;
    bonusMultiplier: number;
    platformFee: number;
    lockBeforeMatch: number;
    minBetAmount: number;
    maxBetAmount: number;
    payoutDelay: number;
    autoLockOnKickoff: boolean;
}

export interface MatchOutcomeConfig {
    ID: string;
    enabled: boolean;
    pointsForCorrect: number;
    firstPlacePrize: string;
    firstPlaceValue: number;
    secondPlacePrize: string;
    secondPlaceValue: number;
    thirdPlacePrize: string;
    thirdPlaceValue: number;
    consolationPrizes: number;
    consolationValue: number;
    autoCalculateAfterMatch: boolean;
    calculateDelay: number;
    showLiveRanking: boolean;
    leaderboardUpdateInterval: number;
}

export interface ChampionPredictionConfig {
    ID: string;
    enabled: boolean;
    bettingStatus: "open" | "locked" | "closed";
    openDate: string | null;
    lockDate: string | null;
    closeDate: string | null;
    autoLockOnTournamentStart: boolean;
    grandPrize: string;
    grandPrizeValue: number;
    secondPrize: string;
    secondPrizeValue: number;
    thirdPrize: string;
    thirdPrizeValue: number;
    splitPrizeIfTie: boolean;
    maxWinnersForSplit: number;
    cashAlternativeEnabled: boolean;
    cashAlternativeValue: number;
    maxPredictionsPerUser: number;
    allowChangePrediction: boolean;
    changeDeadline: string | null;
    requireReason: boolean;
    showOthersPredictions: boolean;
    showPredictionStats: boolean;
    showOdds: boolean;
    notifyOnOpen: boolean;
    notifyBeforeLock: boolean;
    notifyHoursBeforeLock: number;
    notifyOnResult: boolean;
}

// === Action Response Types ===

export interface ActionResult {
    success: boolean;
    message: string;
}

export interface MatchResultResponse extends ActionResult {
    predictionsScored: number;
    scoreBetsScored: number;
}
