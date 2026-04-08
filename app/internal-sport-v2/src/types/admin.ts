export interface AdminTeam {
  ID: string;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  flagCode: string;
  confederation: string | null;
  fifaRanking: number | null;
}

export interface AdminTournament {
  ID: string;
  createdAt?: string | null;
  modifiedAt?: string | null;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  format: 'knockout' | 'league' | 'groupKnockout' | 'cup';
  description: string | null;
  season: string | null;
  outcomePrize: string;
  championBettingStatus: 'open' | 'locked';
  championLockDate: string | null;
  championPrizePool: string;
  externalCode: string | null;
  bettingLocked: boolean;
  isDefault: boolean;
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

export interface AdminTournamentTeam {
  ID: string;
  tournament_ID: string;
  team_ID: string;
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
  stage:
    | 'group'
    | 'roundOf32'
    | 'roundOf16'
    | 'quarterFinal'
    | 'semiFinal'
    | 'thirdPlace'
    | 'final'
    | 'regular'
    | 'playoff'
    | 'relegation';
  status: 'upcoming' | 'live' | 'finished' | 'cancelled';
  matchNumber: number | null;
  matchday: number | null;
  outcomePoints: number;
  homeScore: number | null;
  awayScore: number | null;
  outcome: 'home' | 'draw' | 'away' | null;
  externalId: number | null;
  bettingLocked: boolean;
  isHotMatch: boolean;
  bracketSlot_ID: string | null;
  leg: number | null;
  scoreBetConfig?: MatchScoreBetConfig | null;
}

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
  stage: AdminMatch['stage'];
  status: AdminMatch['status'];
  matchNumber: number | null;
  matchday: number | null;
  outcomePoints: number;
  homeScore: number | null;
  awayScore: number | null;
  outcome: 'home' | 'draw' | 'away' | null;
  externalId: number | null;
  bettingLocked: boolean;
  isHotMatch: boolean;
  bracketSlot_ID: string | null;
  leg: number | null;
  scoreBettingEnabled: boolean;
  scoreBetMaxBets: number | null;
  scoreBetPrize: number;
}

export interface MatchScoreBetConfig {
  ID: string;
  match_ID: string;
  enabled: boolean;
  maxBets: number;
  prize: number;
}

export interface AdminPredictionView {
  ID: string;
  player_ID: string;
  match_ID: string;
  tournament_ID: string | null;
  pick: 'home' | 'draw' | 'away';
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
  isProcessed: boolean;
  submittedAt: string | null;
  playerName: string | null;
  playerAvatar: string | null;
  playerEmail: string | null;
}

export interface AdminScoreBetProcessingView {
  ID: string;
  player_ID: string;
  match_ID: string;
  tournament_ID: string;
  tournamentName: string | null;
  predictedHomeScore: number;
  predictedAwayScore: number;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  kickoff: string | null;
  stage: AdminMatch['stage'] | null;
  homeTeamName: string | null;
  homeTeamFlag: string | null;
  homeTeamCrest: string | null;
  awayTeamName: string | null;
  awayTeamFlag: string | null;
  awayTeamCrest: string | null;
  status: string;
  isCorrect: boolean | null;
  isProcessed: boolean;
  submittedAt: string | null;
  playerName: string | null;
  playerAvatar: string | null;
  playerEmail: string | null;
  prizeAmount: number;
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

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface MatchResultResponse extends ActionResult {
  predictionsScored: number;
  scoreBetsScored: number;
}

export interface ScoreBetProcessingResult extends ActionResult {
  processedCount: number;
}

export type SandboxWorkzoneRole = 'User' | 'Admin';
export type SandboxAppRole = 'PredictionUser' | 'PredictionAdmin';

export interface SandboxUserProvisionInput {
  email: string;
  userName?: string;
  givenName?: string;
  familyName?: string;
  displayName?: string;
  workzoneRole?: SandboxWorkzoneRole;
  workzoneRoles?: SandboxWorkzoneRole[];
  appRole?: SandboxAppRole;
  appRoles?: SandboxAppRole[];
  password?: string;
  identityOrigin?: string;
  userType?: string;
}

export interface SandboxUserProvisionResult {
  email: string;
  success: boolean;
  status: string;
  message: string;
  idpUserId: string | null;
  assignedGroups: string[];
  assignedAppRoles: string[];
  passwordApplied: boolean;
  passwordSource: string | null;
}
