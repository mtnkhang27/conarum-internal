export interface TournamentSelectionItem {
  ID: string;
  name: string;
  status?: string | null;
  isDefault?: boolean | null;
  externalCode?: string | null;
}

export function getLandingTournament(tournaments: TournamentSelectionItem[]) {
  return tournaments[0];
}

export function getLandingTournamentId(tournaments: TournamentSelectionItem[]) {
  return getLandingTournament(tournaments)?.ID || '';
}
