import type {
    AdminMatch,
    AdminTeam,
    AdminTeamMember,
    AdminTournament,
    AdminTournamentTeam,
    AdminPlayer,
    AdminPlayerTournamentStats,
    MatchScoreBetConfig,
    ActionResult,
    MatchResultResponse,
    SyncMatchResult,
    CompetitionItem,
    ImportTournamentResult,
    AdminPrediction,
    AdminScoreBet,
    AdminChampionPick,
    AdminBracketSlot,
} from "@/types/admin";
import { mapExternalAssetUrls } from "@/utils/externalAssetProxy";

// ── Helpers ────────────────────────────────────────────────

const ADMIN_BASE = "api/admin";

async function odata<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${ADMIN_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...init?.headers,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Request failed: ${res.status}`);
    }
    const data = await res.json();
    return mapExternalAssetUrls(data) as T;
}

function odataList<T>(path: string) {
    return odata<{ value: T[] }>(path).then((r) => r.value);
}

// ── Matches ────────────────────────────────────────────────

export const matchesApi = {
    list: () =>
        odataList<AdminMatch>(
            "/Matches?$expand=homeTeam,awayTeam,tournament&$orderby=kickoff asc"
        ),
    get: (id: string) =>
        odata<AdminMatch>(
            `/Matches('${id}')?$expand=homeTeam,awayTeam,tournament,scoreBetConfig`
        ),
    create: (data: Partial<AdminMatch>) =>
        odata<AdminMatch>("/Matches", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<AdminMatch>) =>
        odata<void>(`/Matches('${id}')`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        odata<void>(`/Matches('${id}')`, { method: "DELETE" }),
    enterResult: (matchId: string, homeScore: number, awayScore: number) =>
        odata<MatchResultResponse>("/enterMatchResult", {
            method: "POST",
            body: JSON.stringify({ matchId, homeScore, awayScore }),
        }),
    correctResult: (matchId: string, homeScore: number, awayScore: number) =>
        odata<MatchResultResponse>("/correctMatchResult", {
            method: "POST",
            body: JSON.stringify({ matchId, homeScore, awayScore }),
        }),
    setPenaltyWinner: (slotId: string, winnerId: string, homePen: number, awayPen: number) =>
        odata<ActionResult>("/setPenaltyWinner", {
            method: "POST",
            body: JSON.stringify({ slotId, winnerId, homePen, awayPen }),
        }),
    lockBetting: (matchId: string, locked: boolean) =>
        odata<ActionResult>("/lockMatchBetting", {
            method: "POST",
            body: JSON.stringify({ matchId, locked }),
        }),
};

// ── Bracket Slots (admin fetch) ──────────────────────────────────────

export const bracketSlotsApi = {
    list: (tournamentId?: string) => {
        const query = tournamentId
            ? `?$filter=${encodeURIComponent(`tournament_ID eq '${tournamentId}'`)}&$orderby=stage asc,position asc`
            : "?$orderby=tournament_ID asc,stage asc,position asc";
        return odataList<AdminBracketSlot>(`/BracketSlots${query}`);
    },
    get: (id: string) =>
        odata<AdminBracketSlot>(`/BracketSlots('${id}')`),
};

// ── Match Score Bet Config ─────────────────────────────────

export const matchScoreBetConfigApi = {
    getByMatch: (matchId: string) =>
        odataList<MatchScoreBetConfig>(
            `/MatchScoreBetConfig?$filter=match_ID eq '${matchId}'`
        ).then((v) => v[0] ?? null),
    create: (data: Partial<MatchScoreBetConfig>) =>
        odata<MatchScoreBetConfig>("/MatchScoreBetConfig", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<MatchScoreBetConfig>) =>
        odata<void>(`/MatchScoreBetConfig('${id}')`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        odata<void>(`/MatchScoreBetConfig('${id}')`, { method: "DELETE" }),
};

// ── Teams ──────────────────────────────────────────────────

export const teamsApi = {
    list: () => odataList<AdminTeam>("/Teams?$orderby=name asc"),
    get: (id: string) =>
        odata<AdminTeam>(
            `/Teams('${id}')?$expand=members,tournaments($expand=tournament)`
        ),
    create: (data: Partial<AdminTeam>) =>
        odata<AdminTeam>("/Teams", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<AdminTeam>) =>
        odata<void>(`/Teams('${id}')`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        odata<void>(`/Teams('${id}')`, { method: "DELETE" }),
};

// ── Team Members ───────────────────────────────────────────

export const teamMembersApi = {
    list: (teamId: string) =>
        odataList<AdminTeamMember>(
            `/TeamMembers?$filter=team_ID eq '${teamId}'&$orderby=role asc,jerseyNumber asc`
        ),
    create: (data: Partial<AdminTeamMember>) =>
        odata<AdminTeamMember>("/TeamMembers", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<AdminTeamMember>) =>
        odata<void>(`/TeamMembers('${id}')`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        odata<void>(`/TeamMembers('${id}')`, { method: "DELETE" }),
};

// ── Tournament Teams ───────────────────────────────────────

export const tournamentTeamsApi = {
    listByTournament: (tournamentId: string) =>
        odataList<AdminTournamentTeam>(
            `/TournamentTeams?$filter=tournament_ID eq '${tournamentId}'&$expand=team`
        ),
};

// ── Tournaments ────────────────────────────────────────────

export const tournamentsApi = {
    list: () => odataList<AdminTournament>("/Tournaments?$orderby=startDate desc"),
    create: (data: Partial<AdminTournament>) =>
        odata<AdminTournament>("/Tournaments", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    update: (id: string, data: Partial<AdminTournament>) =>
        odata<void>(`/Tournaments('${id}')`, {
            method: "PATCH",
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        odata<void>(`/Tournaments('${id}')`, { method: "DELETE" }),
};

// ── Players ────────────────────────────────────────────────

export const playersApi = {
    list: () =>
        odataList<AdminPlayer>("/Players?$orderby=totalPoints desc"),
    delete: (id: string) =>
        odata<void>(`/Players('${id}')`, { method: "DELETE" }),
    recalculateLeaderboard: (tournamentId?: string) =>
        odata<ActionResult>("/recalculateLeaderboard", {
            method: "POST",
            body: JSON.stringify({ tournamentId: tournamentId ?? null }),
        }),
};

// ── Tournament Actions ─────────────────────────────────────

export const tournamentActionsApi = {
    lockChampionPredictions: (tournamentId: string) =>
        odata<ActionResult>("/lockChampionPredictions", {
            method: "POST",
            body: JSON.stringify({ tournamentId }),
        }),
    resolveChampionPicks: (tournamentId: string, championTeamId: string) =>
        odata<ActionResult>("/resolveChampionPicks", {
            method: "POST",
            body: JSON.stringify({ tournamentId, championTeamId }),
        }), lockBetting: (tournamentId: string, locked: boolean) =>
            odata<ActionResult>("/lockTournamentBetting", {
                method: "POST",
                body: JSON.stringify({ tournamentId, locked }),
            }),
    syncMatchResults: (tournamentId: string, apiKey?: string) =>
        odata<SyncMatchResult>("/syncMatchResults", {
            method: "POST",
            body: JSON.stringify({ tournamentId, apiKey: apiKey || "" }),
        }),
};

// ── Competition Import ────────────────────────────────────

export const competitionImportApi = {
    getAvailableCompetitions: (apiKey?: string) =>
        odata<{ value: CompetitionItem[] }>(
            `/getAvailableCompetitions(apiKey='${encodeURIComponent(apiKey || '')}')`
        ).then((r) => r.value ?? (r as any)),
    importTournament: (externalCode: string, apiKey?: string) =>
        odata<ImportTournamentResult>("/importTournament", {
            method: "POST",
            body: JSON.stringify({ externalCode, apiKey: apiKey || "" }),
        }),
};

// ── Predictions (Admin read-only) ──────────────────────────

export const predictionsApi = {
    listByMatch: (matchId: string) =>
        odataList<AdminPrediction>(
            `/AllPredictions?$filter=match_ID eq '${matchId}'&$expand=player&$orderby=submittedAt desc`
        ),
};

// ── Score Bets (Admin read-only) ───────────────────────────

export const scoreBetsApi = {
    listByMatch: (matchId: string) =>
        odataList<AdminScoreBet>(
            `/AllScoreBets?$filter=match_ID eq '${matchId}'&$expand=player&$orderby=submittedAt desc`
        ),
};

// ── Champion Picks (Admin read-only) ───────────────────────

export const championPicksApi = {
    listByTournament: (tournamentId: string) =>
        odataList<AdminChampionPick>(
            `/AllChampionPicks?$filter=tournament_ID eq '${tournamentId}'&$expand=player,team&$orderby=submittedAt desc`
        ),
};

// ── Player Tournament Stats (Admin read-only) ────────────────

export const playerTournamentStatsApi = {
    listByTournament: (tournamentId: string) =>
        odataList<AdminPlayerTournamentStats>(
            `/PlayerTournamentStats?$filter=tournament_ID eq '${tournamentId}'&$expand=player&$orderby=totalPoints desc`
        ),
};
