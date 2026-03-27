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
    // Default tournament
    isDefault: boolean;
}

export interface AdminTournamentTeam {
    ID: string;
    tournament_ID: string;
    team_ID: string;
    groupName: string | null;
    isEliminated: boolean;
    finalPosition: number | null;
    team?: AdminTeam;
    tournament?: AdminTournament;
}

export interface AdminMatch {
    ID: string;
    createdAt?: string | null;
    modifiedAt?: string | null;
    tournament_ID: string;
    homeTeam_ID: string | null;
    awayTeam_ID: string | null;
    homeTeam?: AdminTeam;
    awayTeam?: AdminTeam;
    tournament?: AdminTournament;
    kickoff: string;
    venue: string | null;
    stage: "group" | "roundOf32" | "roundOf16" | "quarterFinal" | "semiFinal" | "thirdPlace" | "final" | "regular" | "playoff" | "relegation";
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
    // Featured match
    isHotMatch: boolean;
    // Bracket
    bracketSlot_ID: string | null;
    leg: number | null;
}

export interface AdminBracketSlot {
    ID: string;
    tournament_ID: string;
    stage: string;
    position: number;
    label: string;
    homeTeam_ID: string | null;
    awayTeam_ID: string | null;
    leg1_ID: string | null;
    leg2_ID: string | null;
    homeAgg: number;
    awayAgg: number;
    homePen: number | null;
    awayPen: number | null;
    winner_ID: string | null;
    nextSlot_ID: string | null;
    nextSlotSide: string | null;
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

export interface CompetitionItem {
    externalId: number;
    code: string;
    name: string;
    type: string;
    emblem: string | null;
    plan: string | null;
    seasonStart: string | null;
    seasonEnd: string | null;
    alreadyImported: boolean;
    importedTournamentId: string | null;
}

export interface ImportTournamentResult extends ActionResult {
    tournamentId: string;
    teamsImported: number;
    matchesImported: number;
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
    isPaidOut: boolean;
    submittedAt: string | null;
    player?: AdminPlayer;
}

export interface AdminChampionPick {
    ID: string;
    player_ID: string;
    team_ID: string;
    tournament_ID: string;
    submittedAt: string | null;
    isCorrect: boolean | null;
    player?: AdminPlayer;
    team?: AdminTeam;
}

export interface AdminPlayerTournamentStats {
    ID: string;
    player_ID: string;
    tournament_ID: string;
    totalPoints: number;
    totalCorrect: number;
    totalPredictions: number;
    currentStreak: number;
    bestStreak: number;
    rank: number | null;
    player?: AdminPlayer;
}

// === Payout Management Types ===

export interface PayoutItem {
    sourceKey: string;
    awardId: string | null;
    awardType: "scoreBet" | "championPick" | "leaderboard";
    awardTypeLabel: string;
    awardStatus: "pending" | "awarded" | "reverted";
    isAwarded: boolean;
    tournamentId: string;
    playerId: string;
    playerDisplayName: string;
    playerEmail: string;
    playerAvatarUrl: string;
    matchId: string | null;
    homeTeam: string;
    awayTeam: string;
    kickoff: string | null;
    scoreBetId: string | null;
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
    actualHomeScore: number | null;
    actualAwayScore: number | null;
    championPickId: string | null;
    championTeamId: string | null;
    championTeamName: string;
    leaderboardStatId: string | null;
    leaderboardRank: number | null;
    leaderboardPoints: number;
    rewardAmount: number;
    rewardDescription: string;
    evidenceNote: string;
    evidenceUrl: string;
    awardedAt: string | null;
    awardedByName: string;
    awardedByEmail: string;
    revertedAt: string | null;
    revertedByName: string;
    revertedByEmail: string;
    revertReason: string;
    submittedAt: string | null;
}

export interface PayoutAwardInput {
    sourceKey: string;
    awardType: "scoreBet" | "championPick" | "leaderboard";
    tournamentId: string;
    playerId: string;
    matchId?: string | null;
    scoreBetId?: string | null;
    championPickId?: string | null;
    leaderboardStatId?: string | null;
    rewardAmount?: number;
    rewardDescription?: string;
    evidenceNote?: string;
    evidenceUrl?: string;
}

// === CDS View Types (pre-joined, flat structure) ===

export interface AdminMatchListItem {
    ID: string;
    createdAt: string | null;
    modifiedAt: string | null;
    tournament_ID: string;
    tournamentName: string | null;
    homeTeam_ID: string | null;
    homeTeamName: string | null;
    homeTeamFlag: string | null;
    homeTeamCrest: string | null;
    homeTeamShort: string | null;
    awayTeam_ID: string | null;
    awayTeamName: string | null;
    awayTeamFlag: string | null;
    awayTeamCrest: string | null;
    awayTeamShort: string | null;
    kickoff: string;
    venue: string | null;
    stage: AdminMatch["stage"];
    status: AdminMatch["status"];
    matchNumber: number | null;
    matchday: number | null;
    outcomePoints: number;
    homeScore: number | null;
    awayScore: number | null;
    outcome: "home" | "draw" | "away" | null;
    externalId: number | null;
    bettingLocked: boolean;
    isHotMatch: boolean;
    bracketSlot_ID: string | null;
    leg: number | null;
}

export interface AdminPredictionView {
    ID: string;
    player_ID: string;
    match_ID: string;
    tournament_ID: string | null;
    pick: "home" | "draw" | "away";
    isCorrect: boolean | null;
    pointsEarned: number;
    status: string;
    submittedAt: string | null;
    playerName: string | null;
    playerAvatar: string | null;
    playerEmail: string | null;
}

export interface AdminScoreBetView {
    ID: string;
    player_ID: string;
    match_ID: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
    payout: number;
    isPaidOut: boolean;
    submittedAt: string | null;
    playerName: string | null;
    playerAvatar: string | null;
    playerEmail: string | null;
}

export interface AdminChampionPickView {
    ID: string;
    player_ID: string;
    team_ID: string;
    tournament_ID: string;
    submittedAt: string | null;
    isCorrect: boolean | null;
    playerName: string | null;
    playerAvatar: string | null;
    playerEmail: string | null;
    teamName: string | null;
    teamCrest: string | null;
    teamFlag: string | null;
}

export interface AdminTournamentStatsView {
    ID: string;
    player_ID: string;
    tournament_ID: string;
    totalPoints: number;
    totalCorrect: number;
    totalPredictions: number;
    currentStreak: number;
    bestStreak: number;
    rank: number | null;
    playerName: string | null;
    playerAvatar: string | null;
    playerEmail: string | null;
}

export interface AdminTournamentTeamView {
    ID: string;
    tournament_ID: string;
    team_ID: string;
    groupName: string | null;
    isEliminated: boolean;
    finalPosition: number | null;
    teamName: string | null;
    teamCrest: string | null;
    teamFlag: string | null;
    teamShort: string | null;
    confederation: string | null;
    fifaRanking: number | null;
}

