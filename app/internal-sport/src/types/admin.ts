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
    // UC2: single outcome prize description
    outcomePrize: string;
    // UC3: champion prediction config
    championBettingStatus: "open" | "locked" | "closed";
    championLockDate: string | null;
    championPrizePool: string;
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

// === Per-Match Score Bet Config (UC1) ===

export interface MatchScoreBetConfig {
    ID: string;
    match_ID: string;
    enabled: boolean;
    maxBets: number;
    prize: number;
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
