/**
 * Player-facing API service layer.
 * Fetches from PlayerService (/api/player) OData endpoints
 * and transforms data into shapes expected by UI components.
 */

const BASE = "/api/player";

async function json<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Request failed: ${res.status}`);
    }
    const data = await res.json();
    return data.value ?? data;
}

async function post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Request failed: ${res.status}`);
    return data as T;
}

// ─── Raw OData types from PlayerService ──────────────────────

export interface ODataTeam {
    ID: string;
    name: string;
    flagCode: string;
    confederation: string | null;
    fifaRanking: number | null;
    groupName: string | null;
    isEliminated: boolean;
}

export interface ODataMatch {
    ID: string;
    homeTeam_ID: string;
    awayTeam_ID: string;
    tournament_ID: string;
    kickoff: string;
    venue: string | null;
    stage: string;
    status: "upcoming" | "live" | "finished";
    homeScore: number | null;
    awayScore: number | null;
    weight: number;
    homeTeam?: ODataTeam;
    awayTeam?: ODataTeam;
}

export interface ODataLeaderboardEntry {
    ID: string;
    displayName: string;
    avatarUrl: string | null;
    country: string | null;
    totalPoints: number;
    totalCorrect: number;
    totalPredictions: number;
    currentStreak: number;
    bestStreak: number;
    rank: number | null;
}

export interface ODataPrediction {
    ID: string;
    player_ID: string;
    match_ID: string;
    pick: string;
    isCorrect: boolean | null;
    pointsEarned: number;
    submittedAt: string | null;
    match?: ODataMatch;
}

export interface ODataScoreBet {
    ID: string;
    player_ID: string;
    match_ID: string;
    homeScore: number;
    awayScore: number;
    pointsEarned: number;
    isExact: boolean | null;
    submittedAt: string | null;
    match?: ODataMatch;
}

export interface ODataChampionPick {
    ID: string;
    player_ID: string;
    team_ID: string;
    pickedAt: string | null;
    team?: ODataTeam;
}

// ─── UI-shape types (matching existing components) ───────────

import type {
    Match,
    UpcomingMatch,
    LiveMatch,
    ExactScoreMatch,
    ChampionTeam,
    LeaderboardEntry,
    PredictionHistoryItem,
    PredictionSummary,
} from "@/types";

// ─── Transform helpers ──────────────────────────────────────

function formatKickoff(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (diff < 0) return "Locked";
    if (isToday) return `Today / ${time}`;
    if (isTomorrow) return `Tomorrow / ${time}`;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} / ${time}`;
}

function toMatch(m: ODataMatch): Match {
    const home = m.homeTeam || { name: m.homeTeam_ID, flagCode: "" } as any;
    const away = m.awayTeam || { name: m.awayTeam_ID, flagCode: "" } as any;
    return {
        id: m.ID,
        weight: m.weight,
        timeLabel: formatKickoff(m.kickoff),
        home: { name: home.name, flag: home.flagCode },
        away: { name: away.name, flag: away.flagCode },
        options: [home.name, "Draw", away.name],
        selectedOption: "",
    };
}

function toUpcomingMatch(m: ODataMatch): UpcomingMatch {
    const home = m.homeTeam || { name: m.homeTeam_ID, flagCode: "" } as any;
    const away = m.awayTeam || { name: m.awayTeam_ID, flagCode: "" } as any;
    const diff = new Date(m.kickoff).getTime() - Date.now();
    return {
        id: m.ID,
        home: { name: home.name, flag: home.flagCode },
        away: { name: away.name, flag: away.flagCode },
        kickoff: formatKickoff(m.kickoff),
        stage: m.stage,
        weight: m.weight,
        pick: "",
        isSoon: diff < 2 * 60 * 60 * 1000, // < 2 hours
    };
}

function toLiveMatch(m: ODataMatch): LiveMatch {
    const home = (m.homeTeam?.name || m.homeTeam_ID);
    const away = (m.awayTeam?.name || m.awayTeam_ID);
    return {
        match: `${home} vs ${away}`,
        minute: "LIVE",
        weight: m.weight,
        score: `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`,
    };
}

function toExactScoreMatch(m: ODataMatch): ExactScoreMatch {
    const home = m.homeTeam || { name: m.homeTeam_ID, flagCode: "" } as any;
    const away = m.awayTeam || { name: m.awayTeam_ID, flagCode: "" } as any;
    return {
        id: m.ID,
        weight: m.weight,
        timeLabel: formatKickoff(m.kickoff),
        home: { name: home.name, flag: home.flagCode },
        away: { name: away.name, flag: away.flagCode },
        defaultScore: { home: 0, away: 0 },
    };
}

function toLeaderboardEntry(p: ODataLeaderboardEntry, idx: number): LeaderboardEntry {
    const total = Number(p.totalPredictions) || 0;
    const correct = Number(p.totalCorrect) || 0;
    return {
        rank: p.rank ?? idx + 1,
        name: p.displayName,
        flag: (p.country || "").toLowerCase().slice(0, 2),
        correctPicks: correct,
        totalPicks: total,
        accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
        points: Number(p.totalPoints) || 0,
        streak: Number(p.currentStreak) || 0,
    };
}

// ─── Public API ──────────────────────────────────────────────

export const playerMatchesApi = {
    /** Available (upcoming) matches for prediction cards, with user's existing picks. */
    async getAvailable(): Promise<Match[]> {
        const [matches, predictions] = await Promise.all([
            json<ODataMatch[]>(
                `${BASE}/Matches?$filter=status eq 'upcoming'&$expand=homeTeam,awayTeam&$orderby=kickoff asc`
            ),
            json<ODataPrediction[]>(`${BASE}/MyPredictions`).catch(() => [] as ODataPrediction[]),
        ]);

        // Build map: matchId → pick value (home/draw/away)
        const pickMap = new Map<string, string>();
        for (const p of predictions) pickMap.set(p.match_ID, p.pick);

        return matches.map((m) => {
            const match = toMatch(m);
            const rawPick = pickMap.get(m.ID);
            if (rawPick) {
                // Map API pick (home/draw/away) → display name
                if (rawPick === "home") match.selectedOption = match.home.name;
                else if (rawPick === "away") match.selectedOption = match.away.name;
                else match.selectedOption = "Draw";
            }
            return match;
        });
    },

    /** Completed (finished) matches. */
    async getCompleted(): Promise<Match[]> {
        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=status eq 'finished'&$expand=homeTeam,awayTeam&$orderby=kickoff desc`
        );
        return matches.map((m) => ({
            ...toMatch(m),
            timeLabel: "Locked",
            selectedOption: "", // No pick info at this level — will be enriched by predictions
        }));
    },

    /** Live matches. */
    async getLive(): Promise<LiveMatch[]> {
        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=status eq 'live'&$expand=homeTeam,awayTeam`
        );
        return matches.map(toLiveMatch);
    },

    /** Upcoming kickoff list for the sidebar table. */
    async getUpcoming(): Promise<UpcomingMatch[]> {
        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=status eq 'upcoming'&$expand=homeTeam,awayTeam&$orderby=kickoff asc&$top=10`
        );
        return matches.map(toUpcomingMatch);
    },

    /** Matches available for exact score betting. */
    async getExactScoreMatches(): Promise<ExactScoreMatch[]> {
        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=status eq 'upcoming'&$expand=homeTeam,awayTeam&$orderby=kickoff asc`
        );
        return matches.map(toExactScoreMatch);
    },
};

export const playerLeaderboardApi = {
    async getAll(): Promise<LeaderboardEntry[]> {
        const entries = await json<ODataLeaderboardEntry[]>(
            `${BASE}/Leaderboard?$orderby=totalPoints desc`
        );
        return entries.map(toLeaderboardEntry);
    },
};

export const playerTeamsApi = {
    /** Teams for champion picker. */
    async getAll(): Promise<ChampionTeam[]> {
        const teams = await json<ODataTeam[]>(
            `${BASE}/Teams?$filter=isEliminated eq false&$orderby=fifaRanking asc`
        );
        return teams.map((t) => ({
            name: t.name,
            flag: t.flagCode,
            confederation: t.confederation || "",
            selected: false,
        }));
    },

    /** Get team flag code lookup map. */
    async getFlagMap(): Promise<Record<string, string>> {
        const teams = await json<ODataTeam[]>(`${BASE}/Teams`);
        const map: Record<string, string> = {};
        for (const t of teams) map[t.name] = t.flagCode;
        return map;
    },
};

export const playerPredictionsApi = {
    /** Get current user's predictions. */
    async getMy(): Promise<{ summary: PredictionSummary; history: PredictionHistoryItem[] }> {
        const [predictions, scoreBets] = await Promise.all([
            json<ODataPrediction[]>(`${BASE}/MyPredictions?$expand=match($expand=homeTeam,awayTeam)`),
            json<ODataScoreBet[]>(`${BASE}/MyScoreBets?$expand=match($expand=homeTeam,awayTeam)`),
        ]);

        const history: PredictionHistoryItem[] = [];

        for (const p of predictions) {
            const m = p.match;
            const home = m?.homeTeam?.name || "";
            const away = m?.awayTeam?.name || "";
            history.push({
                id: p.ID,
                match: `${home} vs ${away}`,
                kickoff: m ? formatKickoff(m.kickoff) : "",
                predictionType: "Match Winner",
                pick: p.pick,
                weight: m?.weight || 1,
                submissionStatus: p.submittedAt ? "submitted" : "draft",
            });
        }

        for (const sb of scoreBets) {
            const m = sb.match;
            const home = m?.homeTeam?.name || "";
            const away = m?.awayTeam?.name || "";
            history.push({
                id: sb.ID,
                match: `${home} vs ${away}`,
                kickoff: m ? formatKickoff(m.kickoff) : "",
                predictionType: "Exact Score",
                pick: `${sb.homeScore} - ${sb.awayScore}`,
                weight: m?.weight || 1,
                submissionStatus: sb.submittedAt ? "submitted" : "draft",
            });
        }

        const submitted = history.filter((h) => h.submissionStatus === "submitted").length;
        const winnerPicks = predictions.length;
        const exactScorePicks = scoreBets.length;
        const draftPicks = history.filter((h) => h.submissionStatus === "draft").length;

        return {
            summary: { totalSubmitted: submitted, winnerPicks, exactScorePicks, draftPicks },
            history,
        };
    },

    /** Get current user's champion pick. */
    async getChampionPick(): Promise<string | null> {
        const picks = await json<ODataChampionPick[]>(`${BASE}/MyChampionPick?$expand=team`);
        return picks.length > 0 ? picks[0].team?.name || null : null;
    },
};

export const playerActionsApi = {
    /** Submit match outcome predictions (UC2). */
    async submitPredictions(predictions: { matchId: string; pick: string }[]) {
        return post<{ success: boolean; message: string; count: number }>(
            `${BASE}/submitPredictions`,
            { predictions }
        );
    },

    /** Place an exact score bet (UC1). */
    async submitScoreBet(matchId: string, homeScore: number, awayScore: number) {
        return post<{ success: boolean; message: string }>(
            `${BASE}/submitScoreBet`,
            { matchId, homeScore, awayScore }
        );
    },

    /** Pick tournament champion (UC3). */
    async pickChampion(teamId: string) {
        return post<{ success: boolean; message: string }>(
            `${BASE}/pickChampion`,
            { teamId }
        );
    },
};
