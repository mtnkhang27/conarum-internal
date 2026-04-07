import type {
  ActionResult,
  AdminBracketSlot,
  AdminChampionPickView,
  AdminMatch,
  AdminMatchListItem,
  AdminPredictionView,
  AdminScoreBetView,
  AdminTeam,
  AdminTournament,
  AdminTournamentTeam,
  AdminTournamentStatsView,
  AdminTournamentTeamView,
  MatchResultResponse,
  MatchScoreBetConfig,
  SandboxUserProvisionInput,
  SandboxUserProvisionResult,
} from '@/types/admin';
import axiosInstance from '@/services/core/axiosInstance';
import { mapExternalAssetUrls } from '@/utils/externalAssetProxy';

const ADMIN_BASE = '/api/admin';

function escapeODataString(value: string) {
  return value.replace(/'/g, "''");
}

async function odata<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const rawBody = init?.body;
    const payload =
      typeof rawBody === 'string'
        ? JSON.parse(rawBody)
        : rawBody;

    const response = await axiosInstance.request<T>({
      url: `${ADMIN_BASE}${path}`,
      method: init?.method || 'GET',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      },
    });

    return mapExternalAssetUrls(response.data) as T;
  } catch (error) {
    const maybeAxiosError = error as {
      response?: {
        status?: number;
        data?: {
          error?: { message?: string };
          message?: string;
        };
      };
      message?: string;
    };

    const errorMessage =
      maybeAxiosError.response?.data?.error?.message ||
      maybeAxiosError.response?.data?.message ||
      maybeAxiosError.message ||
      `Request failed: ${maybeAxiosError.response?.status || 'unknown'}`;

    throw new Error(errorMessage);
  }
}

function odataList<T>(path: string) {
  return odata<{ value: T[] }>(path).then((result) => result.value ?? []);
}

export const matchesApi = {
  list: (options?: { tournamentId?: string; status?: AdminMatchListItem['status'] }) => {
    const filters = [
      options?.tournamentId ? `tournament_ID eq '${escapeODataString(options.tournamentId)}'` : null,
      options?.status ? `status eq '${escapeODataString(options.status)}'` : null,
    ].filter(Boolean);

    const query = filters.length
      ? `?$filter=${encodeURIComponent(filters.join(' and '))}&$orderby=kickoff asc`
      : '?$orderby=kickoff asc';

    return odataList<AdminMatchListItem>(`/AdminMatchListView${query}`);
  },
  get: (id: string) =>
    odata<AdminMatch>(`/Matches('${id}')?$expand=homeTeam,awayTeam,tournament,scoreBetConfig`),
  create: (data: Partial<AdminMatch>) =>
    odata<AdminMatch>('/Matches', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AdminMatch>) =>
    odata<void>(`/Matches('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    odata<void>(`/Matches('${id}')`, {
      method: 'DELETE',
    }),
  enterResult: (matchId: string, homeScore: number, awayScore: number) =>
    odata<MatchResultResponse>('/enterMatchResult', {
      method: 'POST',
      body: JSON.stringify({ matchId, homeScore, awayScore }),
    }),
  correctResult: (matchId: string, homeScore: number, awayScore: number) =>
    odata<MatchResultResponse>('/correctMatchResult', {
      method: 'POST',
      body: JSON.stringify({ matchId, homeScore, awayScore }),
    }),
  lockBetting: (matchId: string, locked: boolean) =>
    odata<ActionResult>('/lockMatchBetting', {
      method: 'POST',
      body: JSON.stringify({ matchId, locked }),
    }),
};

export const matchScoreBetConfigApi = {
  list: () => odataList<MatchScoreBetConfig>('/MatchScoreBetConfig'),
  getByMatch: (matchId: string) =>
    odataList<MatchScoreBetConfig>(
      `/MatchScoreBetConfig?$filter=match_ID eq '${escapeODataString(matchId)}'`,
    ).then((items) => items[0] ?? null),
  create: (data: Partial<MatchScoreBetConfig>) =>
    odata<MatchScoreBetConfig>('/MatchScoreBetConfig', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<MatchScoreBetConfig>) =>
    odata<void>(`/MatchScoreBetConfig('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    odata<void>(`/MatchScoreBetConfig('${id}')`, {
      method: 'DELETE',
    }),
};

export const predictionsApi = {
  listByMatch: (matchId: string) =>
    odataList<AdminPredictionView>(
      `/AdminMatchPredictionsView?$filter=match_ID eq '${escapeODataString(matchId)}'&$orderby=submittedAt desc`,
    ),
};

export const scoreBetsApi = {
  listByMatch: (matchId: string) =>
    odataList<AdminScoreBetView>(
      `/AdminMatchScoreBetsView?$filter=match_ID eq '${escapeODataString(matchId)}'&$orderby=submittedAt desc`,
    ),
};

export const teamsApi = {
  list: () => odataList<AdminTeam>('/Teams?$orderby=name asc'),
};

export const tournamentsApi = {
  list: () => odataList<AdminTournament>('/Tournaments?$orderby=startDate desc'),
  create: (data: Partial<AdminTournament>) =>
    odata<AdminTournament>('/Tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<AdminTournament>) =>
    odata<void>(`/Tournaments('${id}')`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    odata<void>(`/Tournaments('${id}')`, {
      method: 'DELETE',
    }),
};

export const tournamentActionsApi = {
  lockBetting: (tournamentId: string, locked: boolean) =>
    odata<ActionResult>('/lockTournamentBetting', {
      method: 'POST',
      body: JSON.stringify({ tournamentId, locked }),
    }),
  lockChampionPredictions: (tournamentId: string) =>
    odata<ActionResult>('/lockChampionPredictions', {
      method: 'POST',
      body: JSON.stringify({ tournamentId }),
    }),
  resolveChampionPicks: (tournamentId: string, championTeamId: string) =>
    odata<ActionResult>('/resolveChampionPicks', {
      method: 'POST',
      body: JSON.stringify({ tournamentId, championTeamId }),
    }),
  syncMatchResults: (tournamentId: string) =>
    odata<ActionResult>('/syncMatchResults', {
      method: 'POST',
      body: JSON.stringify({ tournamentId }),
    }),
};

export const adminMaintenanceApi = {
  clearAllDataExceptPlayers: () =>
    odata<ActionResult>('/clearAllDataExceptPlayers', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
};

export const championPicksApi = {
  listByTournament: (tournamentId: string) =>
    odataList<AdminChampionPickView>(
      `/AdminChampionPicksView?$filter=tournament_ID eq '${escapeODataString(tournamentId)}'&$orderby=submittedAt desc`,
    ),
};

export const playerTournamentStatsApi = {
  listByTournament: (tournamentId: string) =>
    odataList<AdminTournamentStatsView>(
      `/AdminTournamentStatsView?$filter=tournament_ID eq '${escapeODataString(tournamentId)}'&$orderby=totalPoints desc`,
    ),
};

export const tournamentTeamsApi = {
  listByTournament: (tournamentId: string) =>
    odataList<AdminTournamentTeamView>(
      `/AdminTournamentTeamsView?$filter=tournament_ID eq '${escapeODataString(tournamentId)}'`,
    ),
  list: (tournamentId?: string, teamId?: string) => {
    const filters = [
      tournamentId ? `tournament_ID eq '${escapeODataString(tournamentId)}'` : null,
      teamId ? `team_ID eq '${escapeODataString(teamId)}'` : null,
    ].filter(Boolean);

    const query = filters.length ? `?$filter=${encodeURIComponent(filters.join(' and '))}` : '';

    return odataList<AdminTournamentTeam>(`/TournamentTeams${query}`);
  },
  create: (data: Partial<AdminTournamentTeam>) =>
    odata<AdminTournamentTeam>('/TournamentTeams', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  async ensureMembership(tournamentId: string, teamId: string) {
    const existing = await this.list(tournamentId, teamId);

    if (existing.length > 0) {
      return existing[0];
    }

    return this.create({
      tournament_ID: tournamentId,
      team_ID: teamId,
    });
  },
};

export const bracketSlotsApi = {
  get: (id: string) => odata<AdminBracketSlot>(`/BracketSlots('${id}')`),
};

export const sandboxUsersApi = {
  provision: (users: SandboxUserProvisionInput[]) =>
    odata<{ value: SandboxUserProvisionResult[] } | SandboxUserProvisionResult[]>('/provisionSandboxUsers', {
      method: 'POST',
      body: JSON.stringify({ users }),
    }).then((result) => {
      if (Array.isArray(result)) return result;
      return result.value ?? [];
    }),
};
