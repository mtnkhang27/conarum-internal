// === Match Types ===
export interface Team {
    name: string;
    flag: string; // ISO country code e.g. "ar", "fr"
}

export interface Match {
    id: string;
    weight: number;
    timeLabel: string;
    home: Team;
    away: Team;
    options: string[];
    selectedOption: string;
}

export interface UpcomingMatch {
    id: string;
    home: Team;
    away: Team;
    kickoff: string;
    stage: string;
    weight: number;
    pick: string;
    isSoon: boolean;
}

export interface LiveMatch {
    match: string;
    minute: string;
    weight: number;
    score: string;
}

// === Exact Score Types ===
export interface ExactScoreMatch {
    id: string;
    weight: number;
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
    weight: number;
    points: number;
    status: "exact" | "close" | "miss";
}

// === Prediction Types ===
export interface SlipItem {
    match: string;
    pick: string;
    weight: number;
}

export interface ChampionTeam {
    name: string;
    flag: string;
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
    weight: number;
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

// === Account Types ===
export interface UserProfile {
    avatarUrl: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    city: string;
    timezone: string;
    favoriteTeam: string;
    bio: string;
}
