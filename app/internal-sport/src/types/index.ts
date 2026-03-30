// === Tournament Types ===
export interface TournamentInfo {
    ID: string;
    name: string;
    format: 'knockout' | 'league' | 'groupKnockout' | 'cup';
    status: 'upcoming' | 'active' | 'completed' | 'cancelled';
    startDate: string;
    endDate: string;
    season?: string;
    championBettingStatus?: 'open' | 'locked';
    isDefault?: boolean;
}

// === Match Types ===
export interface Team {
    name: string;
    flag: string; // ISO country code e.g. "ar", "fr"
    crest?: string; // Team badge/logo URL
}

export interface Match {
    id: string;
    /** Where this bet should be persisted. */
    betTarget?: "match" | "slot";
    /** Bracket slot ID when the item is tied to a knockout slot. */
    slotId?: string;
    timeLabel: string;
    home: Team;
    away: Team;
    options: string[];
    selectedOption: string;
    existingScores?: { home: number; away: number }[];
    /** Whether this match has score betting enabled (MatchScoreBetConfig exists and is enabled) */
    scoreBettingEnabled: boolean;
    /** Max score bets per player (from admin MatchScoreBetConfig, default 3) */
    maxBets?: number;
    /** Final result score (only present for completed matches) */
    finalScore?: { home: number; away: number };
    /** Match kickoff ISO string (for completed table display and filtering) */
    kickoffIso?: string;
    /** Match stage label */
    stage?: string;
    outcomePoints?: number; // Points earned for correct outcome prediction (home/draw/away)
    /** Featured match flag managed by admin */
    isHotMatch?: boolean;
    /** Whether betting is locked for this match */
    bettingLocked?: boolean;
}

export interface UpcomingMatch {
    id: string;
    home: Team;
    away: Team;
    kickoff: string;
    stage: string;
    pick: string;
    isSoon: boolean;
}

export interface LiveMatch {
    id?: string;
    match: string;
    minute: string;
    score: string;
    home?: Team;
    away?: Team;
    pick?: string;
}

// === Exact Score Types ===
export interface ExactScoreMatch {
    id: string;
    timeLabel: string;
    home: Team;
    away: Team;
    defaultScore: { home: number; away: number };
}

export interface ExactScoreHistoryItem {
    id: string;
    match: string;
    predictedScore: string;
    finalScore: string;
    points: number;
    status: "exact" | "close" | "miss";
}

// === Prediction Types ===
export interface SlipItem {
    match: string;
    pick: string;
}

export interface ChampionTeam {
    ID: string;
    name: string;
    flag: string;
    crest?: string;
    confederation: string;
    selected: boolean;
}

export interface PredictionSummary {
    totalSubmitted: number;
    winnerPicks: number;
    exactScorePicks: number;
    draftPicks: number;
}

export interface PredictionHistoryItem {
    id: string;
    match: string;
    kickoff: string;
    predictionType: string;
    pick: string;
    submissionStatus: "submitted" | "draft";
}

// === Leaderboard Types ===
export interface LeaderboardEntry {
    rank: number;
    name: string;
    flag: string;
    correctPicks: number;
    totalPicks: number;
    accuracy: number;
    points: number;
    streak: number;
    isYou?: boolean;
}

// === Match Result Types (from API functions) ===
export interface MatchResultItem {
    matchId: string;
    homeTeam: string;
    homeFlag: string;
    homeCrest: string;
    awayTeam: string;
    awayFlag: string;
    awayCrest: string;
    homeScore: number;
    awayScore: number;
    outcome: string;
    kickoff: string;
    stage: string;
    matchday: number | null;
}

export interface UpcomingMatchItem {
    matchId: string;
    homeTeam: string;
    homeFlag: string;
    homeCrest: string;
    awayTeam: string;
    awayFlag: string;
    awayCrest: string;
    kickoff: string;
    stage: string;
    matchday: number | null;
    venue: string;
}

export interface TournamentLeaderboardItem {
    rank: number;
    playerId: string;
    displayName: string;
    avatarUrl: string;
    email?: string;
    favoriteTeam?: string;
    bio?: string;
    country?: string;
    totalPoints: number;
    totalCorrect: number;
    totalPredictions: number;
    isMe?: boolean;
}

export interface StandingItem {
    teamId: string;
    teamName: string;
    teamFlag: string;
    teamCrest: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
}

// === Account Types ===
export interface UserProfile {
    avatarUrl: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    isAdmin: boolean;
    phone: string;
    country: string;
    city: string;
    timezone: string;
    favoriteTeamId?: string | null;
    favoriteTeam: string;
    bio: string;
}

// === Recent Prediction Types ===
export interface ScoreBetDetail {
    betId: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
}

export interface RecentPredictionItem {
    predictionId: string;
    matchId: string;
    homeTeam: string;
    homeFlag: string;
    homeCrest: string;
    awayTeam: string;
    awayFlag: string;
    awayCrest: string;
    tournamentName: string;
    pick: string;
    status: string;
    isCorrect: boolean | null;
    pointsEarned: number;
    submittedAt: string;
    kickoff: string;
    homeScore: number | null;
    awayScore: number | null;
    scoreBets: ScoreBetDetail[];
}

export type AccountPredictionScope = "match" | "slot";

export type AccountPredictionTypeFilter = "all" | "winner" | "scoreBet" | "slot";

export type AccountPredictionStatusFilter = "all" | "pending" | "resolved";

export interface AccountWinnerPick {
    id: string;
    scope: AccountPredictionScope;
    pick: string;
    status: string;
    isCorrect: boolean | null;
    pointsEarned: number;
    submittedAt: string | null;
}

export interface AccountScoreBetPick {
    id: string;
    scope: AccountPredictionScope;
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
    submittedAt: string | null;
}

export interface AccountPredictionFeedItem {
    id: string;
    scope: AccountPredictionScope;
    subjectId: string;
    tournamentId: string;
    tournamentName: string;
    stage: string;
    label: string;
    kickoff: string | null;
    latestSubmittedAt: string | null;
    homeTeam: string;
    homeFlag: string;
    homeCrest: string;
    awayTeam: string;
    awayFlag: string;
    awayCrest: string;
    homeScore: number | null;
    awayScore: number | null;
    winnerPick: AccountWinnerPick | null;
    scoreBets: AccountScoreBetPick[];
}

export interface AccountPredictionFeedSummary {
    trackedItems: number;
    winnerPicks: number;
    scoreBets: number;
    pendingItems: number;
    resolvedItems: number;
}
