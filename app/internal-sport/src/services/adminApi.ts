import type {
    AdminMatch,
    AdminTeam,
    AdminTournament,
    AdminPlayer,
    MatchScoreBetConfig,
    ActionResult,
    MatchResultResponse,
} from "@/types/admin";

// ── Helpers ────────────────────────────────────────────────

const ADMIN_BASE = "/api/admin";

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
    return res.json();
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
};
