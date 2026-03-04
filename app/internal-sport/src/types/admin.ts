// === Admin Entity Types (matching CDS schema) ===

export interface AdminTeam {
    ID: string;
    name: string;
    shortName: string | null;
    tla: string | null;
    crest: string | null;
    flagCode: string;
    confederation: string | null;
    fifaRanking: number | null;
    members?: AdminTeamMember[];
    tournaments?: AdminTournamentTeam[];
}

export interface AdminTeamMember {
    ID: string;
    team_ID: string;
    name: string;
    role: "headCoach" | "assistantCoach" | "goalkeepingCoach" | "fitnessCoach" | "player" | "captain";
    jerseyNumber: number | null;
    position: string | null;
    isCaptain: boolean;
    isActive: boolean;
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
    championBettingStatus: "open" | "locked";
    championLockDate: string | null;
    championPrizePool: string;
    // External sync
    externalCode: string | null;  // football-data.org code e.g. 'CL'
    // Betting lock
    bettingLocked: boolean;
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
    // External sync
    externalId: number | null; // football-data.org match ID
    // Betting lock
    bettingLocked: boolean;
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

export interface SyncMatchResult extends ActionResult {
    synced: number;
    scored: number;
}

// === Prediction & Bet Types (Admin read-only views) ===

export interface AdminPrediction {
    ID: string;
    player_ID: string;
    match_ID: string;
    tournament_ID: string | null;
    pick: "home" | "draw" | "away";
    isCorrect: boolean | null;
    pointsEarned: number;
    status: string;
    submittedAt: string | null;
    player?: AdminPlayer;
}

export interface AdminScoreBet {
    ID: string;
    player_ID: string;
    match_ID: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
    payout: number;
    submittedAt: string | null;
    player?: AdminPlayer;
}

export interface AdminChampionPick {
    ID: string;
    player_ID: string;
    team_ID: string;
    tournament_ID: string;
    pickedAt: string | null;
    player?: AdminPlayer;
    team?: AdminTeam;
}
