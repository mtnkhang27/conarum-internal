export interface TournamentSelectionItem {
  ID: string;
  name: string;
  status?: string | null;
  isDefault?: boolean | null;
  externalCode?: string | null;
}

function getTournamentNameTokens(name: string) {
  return new Set(
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean),
  );
}

function isChampionsLeagueName(item: TournamentSelectionItem) {
  const tokens = getTournamentNameTokens(item.name);
  const hasChampionsLeagueTokens =
    tokens.has('champions') && (tokens.has('league') || tokens.has('leauge'));

  return hasChampionsLeagueTokens || tokens.has('c1') || tokens.has('ucl');
}

function isPreferredChampionsLeague(item: TournamentSelectionItem) {
  const tokens = getTournamentNameTokens(item.name);
  const externalCode = (item.externalCode || '').trim().toLowerCase();

  return (
    externalCode === 'cl' ||
    tokens.has('c1') ||
    tokens.has('ucl') ||
    (tokens.has('uefa') && isChampionsLeagueName(item))
  );
}

export function getLandingTournament(tournaments: TournamentSelectionItem[]) {
  return (
    tournaments.find((item) => isPreferredChampionsLeague(item) && item.status === 'active') ||
    tournaments.find(isPreferredChampionsLeague) ||
    tournaments.find((item) => isChampionsLeagueName(item) && item.status === 'active') ||
    tournaments.find(isChampionsLeagueName) ||
    tournaments.find((item) => item.isDefault) ||
    tournaments.find((item) => item.status === 'active') ||
    tournaments[0]
  );
}

export function getLandingTournamentId(tournaments: TournamentSelectionItem[]) {
  return getLandingTournament(tournaments)?.ID || '';
}
