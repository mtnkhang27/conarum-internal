/**
 * Player-facing API service layer.
 * Fetches from PlayerService (/api/player) OData endpoints
 * and transforms data into shapes expected by UI components.
 */

import { mapExternalAssetUrls } from "@/utils/externalAssetProxy";

const BASE = "api/player";

async function json<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Request failed: ${res.status}`);
    }
    const data = await res.json();
    return mapExternalAssetUrls((data.value ?? data) as T);
}

async function post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || `Request failed: ${res.status}`);
    return mapExternalAssetUrls(data as T);
}

// ─── Raw OData types from PlayerService ──────────────────────

export interface ODataTeam {
    ID: string;
    name: string;
    shortName: string | null;
    tla: string | null;
    crest: string | null;
    flagCode: string;
    confederation: string | null;
    fifaRanking: number | null;
}

export interface ODataTournament {
    ID: string;
    name: string;
    format: string;
    status: string;
    startDate: string;
    endDate: string;
    season: string | null;
    championBettingStatus: 'open' | 'locked' | null;
}

export interface ODataMatch {
    ID: string;
    homeTeam_ID: string | null;
    awayTeam_ID: string | null;
    tournament_ID: string;
    kickoff: string;
    venue: string | null;
    stage: string;
    status: "upcoming" | "live" | "finished";
    homeScore: number | null;
    awayScore: number | null;
    matchday: number | null;
    leg?: number | null;
    bracketSlot_ID?: string | null;
    bettingLocked?: boolean;
    isHotMatch?: boolean;
    homeTeam?: ODataTeam;
    awayTeam?: ODataTeam;
    tournament?: ODataTournament;
    scoreBetConfig?: { enabled?: boolean; maxBets?: number }[];
    outcomePoints?: number; // Points earned for correct outcome prediction (home/draw/away)
}

export interface ODataBracketSlot {
    ID: string;
    tournament_ID: string;
    stage: string;
    position: number;
    label: string | null;
    homeTeam_ID: string | null;
    awayTeam_ID: string | null;
    leg1_ID: string | null;
    leg2_ID?: string | null;
    winner_ID: string | null;
    nextSlot_ID?: string | null;
    nextSlotSide?: "home" | "away" | null;
    homeTeam?: ODataTeam;
    awayTeam?: ODataTeam;
    tournament?: ODataTournament;
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
    tournament_ID: string | null;
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
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
    payout: number;
    submittedAt: string | null;
    match?: ODataMatch;
}

export interface ODataSlotPrediction {
    ID: string;
    player_ID: string;
    slot_ID: string;
    tournament_ID: string;
    pick: string;
    status: string;
    submittedAt: string | null;
    slot?: ODataBracketSlot;
}

export interface ODataSlotScoreBet {
    ID: string;
    player_ID: string;
    slot_ID: string;
    tournament_ID: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
    payout: number;
    submittedAt: string | null;
    slot?: ODataBracketSlot;
}

export interface ODataChampionPick {
    ID: string;
    player_ID: string;
    team_ID: string;
    submittedAt: string | null;
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
    TournamentInfo,
    MatchResultItem,
    UpcomingMatchItem,
    TournamentLeaderboardItem,
    StandingItem,
    RecentPredictionItem,
    UserProfile,
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

    if (diff < 0) return "Started";
    if (isToday) return `Today / ${time}`;
    if (isTomorrow) return `Tomorrow / ${time}`;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} / ${time}`;
}

/** Returns true when the kickoff time is in the past. */
function isKickoffPast(iso?: string | null): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

const KNOCKOUT_STAGES = new Set([
    "roundOf32",
    "roundOf16",
    "quarterFinal",
    "semiFinal",
    "thirdPlace",
    "final",
    "playoff",
]);

const STAGE_ORDER: Record<string, number> = {
    group: 0,
    regular: 0,
    roundOf32: 1,
    roundOf16: 2,
    quarterFinal: 3,
    semiFinal: 4,
    thirdPlace: 5,
    final: 6,
    playoff: 7,
    relegation: 8,
};

const STAGE_LABEL: Record<string, string> = {
    group: "Group Stage",
    regular: "Regular Season",
    roundOf32: "Round of 32",
    roundOf16: "Round of 16",
    quarterFinal: "Quarter Final",
    semiFinal: "Semi Final",
    thirdPlace: "Third Place",
    final: "Final",
    playoff: "Playoff",
    relegation: "Relegation",
};

function getStageRank(stage?: string | null): number {
    if (!stage) return 999;
    return STAGE_ORDER[stage] ?? 999;
}

function getKickoffRank(kickoff?: string | null): number {
    if (!kickoff) return Number.MAX_SAFE_INTEGER;
    const ts = Date.parse(kickoff);
    return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
}

function formatStageLabel(stage?: string | null, leg?: number | null): string | undefined {
    if (!stage) return undefined;
    const base = STAGE_LABEL[stage] ?? stage;
    if (leg && leg > 0) return `${base} - Leg ${leg}`;
    return base;
}

function mapPickToSelectedOption(pick: string | undefined): string {
    if (!pick) return "";
    if (pick === "home" || pick === "away" || pick === "draw") return pick;
    return "";
}

interface SlotFeeders {
    home?: ODataBracketSlot;
    away?: ODataBracketSlot;
}

function resolveUnresolvedTeamName(
    slot: ODataBracketSlot,
    side: "home" | "away",
    feederSlot?: ODataBracketSlot
): string {
    const slotTeam = side === "home" ? slot.homeTeam : slot.awayTeam;
    if (slotTeam?.name) return slotTeam.name;

    if (feederSlot?.label) {
        return `Winner ${feederSlot.label}`;
    }

    if (slot.label) {
        return `Winner ${slot.label}`;
    }

    return "TBD";
}

function toUnresolvedSlotMatch(
    slot: ODataBracketSlot,
    slotPickMap: Map<string, string>,
    slotScoreMap: Map<string, { home: number; away: number }[]>,
    linkedMatch?: ODataMatch,
    feeders?: SlotFeeders
): Match {
    const homeName = resolveUnresolvedTeamName(slot, "home", feeders?.home);
    const awayName = resolveUnresolvedTeamName(slot, "away", feeders?.away);
    const rawPick = slotPickMap.get(slot.ID);
    const linkedCfgs = linkedMatch?.scoreBetConfig ?? [];
    const enabledCfg = linkedCfgs.find((cfg) => cfg?.enabled);
    const scoreBettingEnabled = linkedMatch
        ? !!enabledCfg
        : false;
    const maxBets = enabledCfg?.maxBets ?? 3;
    const outcomePoints = linkedMatch?.outcomePoints ?? 1;
    const timeLabel = linkedMatch?.kickoff
        ? formatKickoff(linkedMatch.kickoff)
        : "TBD";

    return {
        id: slot.ID,
        timeLabel,
        home: {
            name: homeName,
            flag: slot.homeTeam?.flagCode || "",
            crest: slot.homeTeam?.crest ?? undefined,
        },
        away: {
            name: awayName,
            flag: slot.awayTeam?.flagCode || "",
            crest: slot.awayTeam?.crest ?? undefined,
        },
        options: [homeName, "Draw", awayName],
        selectedOption: mapPickToSelectedOption(rawPick),
        existingScores: slotScoreMap.get(slot.ID) || [],
        scoreBettingEnabled,
        maxBets,
        outcomePoints,
        bettingLocked: linkedMatch?.bettingLocked ?? false,
        stage: formatStageLabel(slot.stage),
        betTarget: "slot",
        slotId: slot.ID,
        // Propagate kickoff from linked match so downstream date filters can
        // detect slots whose concrete match has already kicked off.
        kickoffIso: linkedMatch?.kickoff ?? undefined,
    };
}

function toMatch(m: ODataMatch): Match {
    const home = m.homeTeam || { name: m.homeTeam_ID || "TBD", flagCode: "" } as any;
    const away = m.awayTeam || { name: m.awayTeam_ID || "TBD", flagCode: "" } as any;
    return {
        id: m.ID,
        timeLabel: formatKickoff(m.kickoff),
        home: { name: home.name, flag: home.flagCode, crest: home.crest },
        away: { name: away.name, flag: away.flagCode, crest: away.crest },
        options: [home.name, "Draw", away.name],
        selectedOption: "",
        scoreBettingEnabled: false, // will be set based on MatchScoreBetConfig existence
        outcomePoints: m.outcomePoints ?? 0,
        kickoffIso: m.kickoff,
        stage: formatStageLabel(m.stage, m.leg),
        isHotMatch: m.isHotMatch ?? false,
        bettingLocked: m.bettingLocked ?? false,
    };
}

function toUpcomingMatch(m: ODataMatch): UpcomingMatch {
    const home = m.homeTeam || { name: m.homeTeam_ID || "TBD", flagCode: "" } as any;
    const away = m.awayTeam || { name: m.awayTeam_ID || "TBD", flagCode: "" } as any;
    const diff = new Date(m.kickoff).getTime() - Date.now();
    return {
        id: m.ID,
        home: { name: home.name, flag: home.flagCode, crest: home.crest },
        away: { name: away.name, flag: away.flagCode, crest: away.crest },
        kickoff: formatKickoff(m.kickoff),
        stage: m.stage,
        pick: "",
        isSoon: diff < 2 * 60 * 60 * 1000, // < 2 hours
    };
}

function toLiveMatch(m: ODataMatch, rawPick?: string): LiveMatch {
    const homeName = m.homeTeam?.name || m.homeTeam_ID || "TBD";
    const awayName = m.awayTeam?.name || m.awayTeam_ID || "TBD";
    return {
        id: m.ID,
        match: `${homeName} vs ${awayName}`,
        minute: "LIVE",
        score: `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`,
        home: {
            name: homeName,
            flag: m.homeTeam?.flagCode || "",
            crest: m.homeTeam?.crest ?? undefined,
        },
        away: {
            name: awayName,
            flag: m.awayTeam?.flagCode || "",
            crest: m.awayTeam?.crest ?? undefined,
        },
        pick: mapPickToSelectedOption(rawPick),
    };
}

function toExactScoreMatch(m: ODataMatch): ExactScoreMatch {
    const home = m.homeTeam || { name: m.homeTeam_ID || "TBD", flagCode: "" } as any;
    const away = m.awayTeam || { name: m.awayTeam_ID || "TBD", flagCode: "" } as any;
    return {
        id: m.ID,
        timeLabel: formatKickoff(m.kickoff),
        home: { name: home.name, flag: home.flagCode, crest: home.crest },
        away: { name: away.name, flag: away.flagCode, crest: away.crest },
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

type ODataUserProfile = {
    avatarUrl?: string | null;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    roles?: string[] | null;
    isAdmin?: boolean | null;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    timezone?: string | null;
    favoriteTeamId?: string | null;
    favoriteTeam?: string | null;
    bio?: string | null;
};

function toUserProfile(raw: ODataUserProfile): UserProfile {
    return {
        avatarUrl: raw.avatarUrl ?? "",
        displayName: raw.displayName ?? "",
        firstName: raw.firstName ?? "",
        lastName: raw.lastName ?? "",
        email: raw.email ?? "",
        roles: Array.isArray(raw.roles) ? raw.roles.filter((r): r is string => typeof r === "string") : [],
        isAdmin: raw.isAdmin === true,
        phone: raw.phone ?? "",
        country: raw.country ?? "",
        city: raw.city ?? "",
        timezone: raw.timezone ?? "",
        favoriteTeamId: raw.favoriteTeamId ?? null,
        favoriteTeam: raw.favoriteTeam ?? "",
        bio: raw.bio ?? "",
    };
}

type UserProfileCachePayload = {
    profile: UserProfile;
    expiresAt: number;
};

const PROFILE_CACHE_KEY = "conarum.playerProfile";
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
let profileCache: UserProfileCachePayload | null = null;
let profileInFlight: Promise<UserProfile> | null = null;

const hasValidProfileCache = (cache: UserProfileCachePayload | null): cache is UserProfileCachePayload => {
    return !!cache && cache.expiresAt > Date.now();
};

const readProfileCache = (): UserProfileCachePayload | null => {
    if (hasValidProfileCache(profileCache)) return profileCache;
    if (typeof window === "undefined") return null;

    try {
        const raw = window.sessionStorage.getItem(PROFILE_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as UserProfileCachePayload;
        if (!hasValidProfileCache(parsed)) {
            window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
            return null;
        }
        profileCache = parsed;
        return parsed;
    } catch {
        return null;
    }
};

const writeProfileCache = (profile: UserProfile): UserProfile => {
    const payload: UserProfileCachePayload = {
        profile,
        expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
    };
    profileCache = payload;
    if (typeof window !== "undefined") {
        try {
            window.sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
        } catch {
            // Best-effort cache only.
        }
    }
    return profile;
};

const clearProfileCache = (): void => {
    profileCache = null;
    if (typeof window !== "undefined") {
        try {
            window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
        } catch {
            // Ignore cache cleanup errors.
        }
    }
};

const getCachedProfile = (): UserProfile | null => {
    return readProfileCache()?.profile ?? null;
};

const fetchProfile = async (forceRefresh: boolean): Promise<UserProfile> => {
    const cached = getCachedProfile();
    if (!forceRefresh && cached) return cached;

    if (profileInFlight) return profileInFlight;

    profileInFlight = json<ODataUserProfile>(`${BASE}/getMyProfile()`)
        .then((profile) => writeProfileCache(toUserProfile(profile)))
        .catch((err) => {
            if (forceRefresh) clearProfileCache();
            throw err;
        })
        .finally(() => {
            profileInFlight = null;
        });

    return profileInFlight;
};

// ─── Public API ──────────────────────────────────────────────

export const playerTournamentsApi = {
    /** Get all tournaments. */
    async getAll(): Promise<TournamentInfo[]> {
        const tournaments = await json<ODataTournament[]>(
            `${BASE}/Tournaments?$orderby=startDate desc`
        );
        return tournaments.map((t) => ({
            ID: t.ID,
            name: t.name,
            format: t.format as TournamentInfo["format"],
            status: t.status as TournamentInfo["status"],
            startDate: t.startDate,
            endDate: t.endDate,
            season: t.season ?? undefined,
            championBettingStatus: t.championBettingStatus ?? undefined,
        }));
    },

    /** Get active/upcoming tournaments. */
    async getActive(): Promise<TournamentInfo[]> {
        const tournaments = await json<ODataTournament[]>(
            `${BASE}/Tournaments?$filter=status eq 'active' or status eq 'upcoming'&$orderby=startDate desc`
        );
        return tournaments.map((t) => ({
            ID: t.ID,
            name: t.name,
            format: t.format as TournamentInfo["format"],
            status: t.status as TournamentInfo["status"],
            startDate: t.startDate,
            endDate: t.endDate,
            season: t.season ?? undefined,
            championBettingStatus: t.championBettingStatus ?? undefined,
        }));
    },
};

// ─── Shared player data (fetched once, passed to multiple functions) ─────

export interface SharedPlayerData {
    predictions: ODataPrediction[];
    scoreBets: ODataScoreBet[];
    slotPredictions: ODataSlotPrediction[];
    slotScoreBets: ODataSlotScoreBet[];
}

// In-flight dedup cache: concurrent callers with the same key share a single fetch
const _sharedCache = new Map<string, { promise: Promise<SharedPlayerData>; ts: number }>();
const SHARED_TTL = 5_000; // 5 seconds

async function fetchSharedPlayerData(tournamentId?: string): Promise<SharedPlayerData> {
    const cacheKey = tournamentId ?? "__all__";
    const now = Date.now();
    const cached = _sharedCache.get(cacheKey);
    if (cached && now - cached.ts < SHARED_TTL) {
        return cached.promise;
    }

    const tournamentScopedFilter = tournamentId
        ? `?$filter=${encodeURIComponent(`tournament_ID eq '${tournamentId}'`)}`
        : "";

    const promise = Promise.all([
        json<ODataPrediction[]>(`${BASE}/MyPredictions`).catch(() => [] as ODataPrediction[]),
        json<ODataScoreBet[]>(`${BASE}/MyScoreBets`).catch(() => [] as ODataScoreBet[]),
        json<ODataSlotPrediction[]>(
            `${BASE}/MySlotPredictions${tournamentScopedFilter}`
        ).catch(() => [] as ODataSlotPrediction[]),
        json<ODataSlotScoreBet[]>(
            `${BASE}/MySlotScoreBets${tournamentScopedFilter}`
        ).catch(() => [] as ODataSlotScoreBet[]),
    ]).then(([predictions, scoreBets, slotPredictions, slotScoreBets]) => {
        return { predictions, scoreBets, slotPredictions, slotScoreBets };
    });

    _sharedCache.set(cacheKey, { promise, ts: now });
    return promise;
}

export const playerMatchesApi = {
    /** Available (upcoming) matches for prediction cards, optionally filtered by tournament. */
    async getAvailable(tournamentId?: string, shared?: SharedPlayerData): Promise<Match[]> {
        let filter = "status eq 'upcoming'";
        if (tournamentId) filter += ` and tournament_ID eq '${tournamentId}'`;

        let slotFilter = "winner_ID eq null";
        if (tournamentId) slotFilter += ` and tournament_ID eq '${tournamentId}'`;

        const sharedData = shared ?? await fetchSharedPlayerData(tournamentId);
        const { predictions, scoreBets, slotPredictions, slotScoreBets } = sharedData;

        const [matches, slots] = await Promise.all([
            json<ODataMatch[]>(
                `${BASE}/Matches?$filter=${encodeURIComponent(filter)}&$expand=homeTeam,awayTeam,scoreBetConfig&$orderby=kickoff asc`
            ),
            json<ODataBracketSlot[]>(
                `${BASE}/BracketSlots?$filter=${encodeURIComponent(slotFilter)}&$expand=homeTeam,awayTeam&$orderby=stage asc,position asc`
            ).catch(() => [] as ODataBracketSlot[]),
        ]);

        const pickMap = new Map<string, string>();
        for (const p of predictions) pickMap.set(p.match_ID, p.pick);

        const scoreMap = new Map<string, { home: number; away: number }[]>();
        for (const sb of scoreBets) {
            if (!scoreMap.has(sb.match_ID)) scoreMap.set(sb.match_ID, []);
            scoreMap.get(sb.match_ID)!.push({ home: sb.predictedHomeScore, away: sb.predictedAwayScore });
        }

        const slotPickMap = new Map<string, string>();
        for (const sp of slotPredictions) slotPickMap.set(sp.slot_ID, sp.pick);

        const slotScoreMap = new Map<string, { home: number; away: number }[]>();
        for (const sb of slotScoreBets) {
            if (!slotScoreMap.has(sb.slot_ID)) slotScoreMap.set(sb.slot_ID, []);
            slotScoreMap.get(sb.slot_ID)!.push({ home: sb.predictedHomeScore, away: sb.predictedAwayScore });
        }

        const slotFeeders = new Map<string, SlotFeeders>();
        for (const source of slots) {
            if (!source.nextSlot_ID) continue;
            const existing = slotFeeders.get(source.nextSlot_ID) ?? {};
            if (source.nextSlotSide === "home") existing.home = source;
            if (source.nextSlotSide === "away") existing.away = source;
            slotFeeders.set(source.nextSlot_ID, existing);
        }

        // Once a slot has a concrete match flow, saved picks/scores may already
        // exist on match-level entities. Mirror them back to slot cards.
        const unresolvedPickMap = new Map(slotPickMap);
        const unresolvedScoreMap = new Map(slotScoreMap);
        for (const slot of slots) {
            if (!slot.leg1_ID) continue;

            if (!unresolvedPickMap.has(slot.ID)) {
                const linkedPick = pickMap.get(slot.leg1_ID);
                if (linkedPick) unresolvedPickMap.set(slot.ID, linkedPick);
            }

            const existingSlotScores = unresolvedScoreMap.get(slot.ID) ?? [];
            if (existingSlotScores.length === 0) {
                const linkedScores = scoreMap.get(slot.leg1_ID) ?? [];
                if (linkedScores.length > 0) unresolvedScoreMap.set(slot.ID, linkedScores);
            }
        }

        const matchById = new Map(matches.map((m) => [m.ID, m]));

        const realMatchItems = matches
            // Filter out matches whose kickoff has already passed
            .filter((m) => !isKickoffPast(m.kickoff))
            // Filter out matches that already have a final result
            .filter((m) => m.homeScore === null || m.awayScore === null)
            .map((m) => {
                const match = toMatch(m);
                match.betTarget = "match";
                match.slotId = m.bracketSlot_ID ?? undefined;

                const scoreBetConfigs = m.scoreBetConfig;
                if (scoreBetConfigs && Array.isArray(scoreBetConfigs) && scoreBetConfigs.length > 0) {
                    const enabledCfg = scoreBetConfigs.find((cfg: any) => cfg.enabled);
                    match.scoreBettingEnabled = !!enabledCfg;
                    if (enabledCfg) {
                        match.maxBets = enabledCfg.maxBets ?? 3;
                    }
                }

                const rawPick = pickMap.get(m.ID);
                const slotRawPick = !rawPick && match.slotId ? slotPickMap.get(match.slotId) : undefined;
                const effectivePick = rawPick || slotRawPick;
                if (effectivePick) {
                    match.selectedOption = mapPickToSelectedOption(effectivePick);
                }

                const matchScores = scoreMap.get(m.ID) || [];
                const slotScores = match.slotId ? slotScoreMap.get(match.slotId) || [] : [];
                match.existingScores = matchScores.length > 0 ? matchScores : slotScores;
                return {
                    match,
                    stageRank: getStageRank(m.stage),
                    kickoffRank: getKickoffRank(m.kickoff),
                    position: m.matchday ?? Number.MAX_SAFE_INTEGER,
                };
            });

        // Build a set of finished match IDs so we can exclude slots whose matches already ended
        const finishedMatchIds = new Set(
            matches.filter((m) => isKickoffPast(m.kickoff) || (m.homeScore !== null && m.awayScore !== null)).map((m) => m.ID)
        );

        const unresolvedSlots = slots
            .filter((slot) => {
                if (!KNOCKOUT_STAGES.has(slot.stage)) return false;
                if (slot.winner_ID) return false;
                // Slot already has a concrete match that is in the real matches list
                if ((slot.leg1_ID && matchById.has(slot.leg1_ID)) || (slot.leg2_ID && matchById.has(slot.leg2_ID))) return false;
                // Slot has a linked match that already started / finished → skip
                if (slot.leg1_ID && finishedMatchIds.has(slot.leg1_ID)) return false;
                if (slot.leg2_ID && finishedMatchIds.has(slot.leg2_ID)) return false;
                // Even if the linked match wasn't in the initial OData result
                // (e.g. status not yet updated), check the kickoff time directly.
                if (slot.leg1_ID && isKickoffPast(slot.leg1_kickoff)) return false;
                if (slot.leg2_ID && isKickoffPast(slot.leg2_kickoff)) return false;
                return true;
            })
            .sort((a, b) => {
                const sa = STAGE_ORDER[a.stage] ?? 999;
                const sb = STAGE_ORDER[b.stage] ?? 999;
                if (sa !== sb) return sa - sb;
                return (a.position ?? 0) - (b.position ?? 0);
            });

        const unresolvedSlotItems = unresolvedSlots.map((slot) => {
            const linkedMatch = slot.leg1_ID ? matchById.get(slot.leg1_ID) : undefined;
            return {
                match: toUnresolvedSlotMatch(
                    slot,
                    unresolvedPickMap,
                    unresolvedScoreMap,
                    linkedMatch,
                    slotFeeders.get(slot.ID)
                ),
                stageRank: getStageRank(slot.stage),
                kickoffRank: getKickoffRank(linkedMatch?.kickoff),
                position: slot.position ?? Number.MAX_SAFE_INTEGER,
            };
        });

        const allSorted = [...realMatchItems, ...unresolvedSlotItems]
            .sort((a, b) => {
                if (a.stageRank !== b.stageRank) return a.stageRank - b.stageRank;
                if (a.kickoffRank !== b.kickoffRank) return a.kickoffRank - b.kickoffRank;
                if (a.position !== b.position) return a.position - b.position;
                return a.match.home.name.localeCompare(b.match.home.name);
            })
            .map((item) => item.match);

        // ── Smart date discovery: scan from today forward to find
        //    the nearest consecutive days that have matches, ensuring
        //    the user always sees matches.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const MAX_LOOK_AHEAD_DAYS = 90;

        // Collect distinct kickoff days from today onwards
        const kickoffDaysSet = new Set<number>();
        for (const m of allSorted) {
            if (!m.kickoffIso) continue;
            const d = new Date(m.kickoffIso);
            if (Number.isNaN(d.getTime())) continue;
            d.setHours(0, 0, 0, 0);
            if (d.getTime() >= today.getTime()) {
                kickoffDaysSet.add(d.getTime());
            }
        }

        if (kickoffDaysSet.size === 0) {
            // No future matches with dates → return everything (bracket slots, etc.)
            return allSorted;
        }

        // Sort the days and find the first consecutive group
        const sortedDays = Array.from(kickoffDaysSet).sort((a, b) => a - b);
        const includedDays = new Set<number>();
        let foundFirst = false;
        let lastIncluded = 0;

        for (const dayTs of sortedDays) {
            const daysFromToday = Math.floor((dayTs - today.getTime()) / (24 * 60 * 60 * 1000));
            if (daysFromToday > MAX_LOOK_AHEAD_DAYS) break;

            if (!foundFirst) {
                includedDays.add(dayTs);
                foundFirst = true;
                lastIncluded = dayTs;
                continue;
            }

            // Include consecutive days (gap ≤ 1 day)
            const gapDays = Math.floor((dayTs - lastIncluded) / (24 * 60 * 60 * 1000));
            if (gapDays <= 1) {
                includedDays.add(dayTs);
                lastIncluded = dayTs;
            } else {
                break;
            }
        }

        // Filter: include matches on discovered days + items without kickoff
        return allSorted.filter((m) => {
            if (!m.kickoffIso) return true;
            const d = new Date(m.kickoffIso);
            if (Number.isNaN(d.getTime())) return true;
            d.setHours(0, 0, 0, 0);
            return includedDays.has(d.getTime());
        });
    },

    /** Completed (finished) matches — paged via OData $skip/$top/$count. */
    async getCompletedPaged(
        tournamentId?: string,
        page = 1,
        pageSize = 10,
        shared?: SharedPlayerData,
    ): Promise<{ items: Match[]; totalCount: number }> {
        let filter = "status eq 'finished'";
        if (tournamentId) filter += ` and tournament_ID eq '${tournamentId}'`;
        const skip = (page - 1) * pageSize;

        const sharedData = shared ?? await fetchSharedPlayerData(tournamentId);

        const res = await fetch(
            `${BASE}/Matches?$filter=${encodeURIComponent(filter)}&$expand=homeTeam,awayTeam&$orderby=kickoff desc&$skip=${skip}&$top=${pageSize}&$count=true`
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        const rawMatches: ODataMatch[] = mapExternalAssetUrls(data.value ?? []);
        const totalCount: number = data["@odata.count"] ?? data["$count"] ?? rawMatches.length;

        const pickMap = new Map<string, string>();
        for (const p of sharedData.predictions) pickMap.set(p.match_ID, p.pick);

        const items = rawMatches.map((m) => {
            const match = toMatch(m);
            match.timeLabel = "Locked";
            match.kickoffIso = m.kickoff;
            match.stage = m.stage;
            if (m.homeScore !== null && m.awayScore !== null) {
                match.finalScore = { home: m.homeScore, away: m.awayScore };
            }
            const rawPick = pickMap.get(m.ID);
            if (rawPick === "home") match.selectedOption = "home";
            else if (rawPick === "away") match.selectedOption = "away";
            else if (rawPick === "draw") match.selectedOption = "draw";
            return match;
        });

        return { items, totalCount };
    },

    /** Completed (finished) matches, optionally filtered by tournament. Uses shared data if provided. */
    async getCompleted(tournamentId?: string, shared?: SharedPlayerData): Promise<Match[]> {
        let filter = "status eq 'finished'";
        if (tournamentId) filter += ` and tournament_ID eq '${tournamentId}'`;

        const sharedData = shared ?? await fetchSharedPlayerData(tournamentId);

        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=${encodeURIComponent(filter)}&$expand=homeTeam,awayTeam&$orderby=kickoff desc`
        );

        const pickMap = new Map<string, string>();
        for (const p of sharedData.predictions) pickMap.set(p.match_ID, p.pick);

        return matches.map((m) => {
            const match = toMatch(m);
            match.timeLabel = "Locked";
            match.kickoffIso = m.kickoff;
            match.stage = m.stage;
            if (m.homeScore !== null && m.awayScore !== null) {
                match.finalScore = { home: m.homeScore, away: m.awayScore };
            }
            const rawPick = pickMap.get(m.ID);
            if (rawPick === "home") match.selectedOption = "home";
            else if (rawPick === "away") match.selectedOption = "away";
            else if (rawPick === "draw") match.selectedOption = "draw";
            return match;
        });
    },

    /** Live matches. Uses shared data if provided. */
    async getLive(shared?: SharedPlayerData): Promise<LiveMatch[]> {
        const sharedData = shared ?? await fetchSharedPlayerData();

        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=status eq 'live'&$expand=homeTeam,awayTeam`
        );

        const pickMap = new Map<string, string>();
        for (const p of sharedData.predictions) pickMap.set(p.match_ID, p.pick);

        const slotPickMap = new Map<string, string>();
        for (const sp of sharedData.slotPredictions) slotPickMap.set(sp.slot_ID, sp.pick);

        return matches.map((m) => {
            const rawPick = pickMap.get(m.ID);
            const slotRawPick = !rawPick && m.bracketSlot_ID
                ? slotPickMap.get(m.bracketSlot_ID)
                : undefined;
            return toLiveMatch(m, rawPick || slotRawPick);
        });
    },

    /** Upcoming kickoff list for the sidebar table, optionally filtered by tournament. */
    async getUpcoming(tournamentId?: string): Promise<UpcomingMatch[]> {
        let filter = "status eq 'upcoming' and homeTeam_ID ne null and awayTeam_ID ne null";
        if (tournamentId) filter += ` and tournament_ID eq '${tournamentId}'`;

        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=${encodeURIComponent(filter)}&$expand=homeTeam,awayTeam&$orderby=kickoff asc&$top=10`
        );
        return matches.map(toUpcomingMatch);
    },

    /** Matches available for exact score betting. */
    async getExactScoreMatches(): Promise<ExactScoreMatch[]> {
        const matches = await json<ODataMatch[]>(
            `${BASE}/Matches?$filter=${encodeURIComponent("status eq 'upcoming' and homeTeam_ID ne null and awayTeam_ID ne null")}&$expand=homeTeam,awayTeam&$orderby=kickoff asc`
        );
        return matches.map(toExactScoreMatch);
    },

    /**
     * Load all match data in one call, fetching shared player data once.
     * Replaces calling getAvailable + getUpcoming + getLive separately.
     */
    async loadAllMatchData(tournamentId?: string): Promise<{
        available: Match[];
        upcoming: UpcomingMatch[];
        live: LiveMatch[];
    }> {
        const filterTid = tournamentId || undefined;

        // Fetch shared player-prediction data ONCE
        const shared = await fetchSharedPlayerData(filterTid);

        // Now call all match functions in parallel, passing shared data
        const [available, upcoming, live] = await Promise.all([
            this.getAvailable(filterTid, shared),
            this.getUpcoming(filterTid),
            this.getLive(shared),
        ]);

        return { available, upcoming, live };
    },
};

export const playerLeaderboardApi = {
    /** Global leaderboard. */
    async getAll(): Promise<LeaderboardEntry[]> {
        const entries = await json<ODataLeaderboardEntry[]>(
            `${BASE}/Leaderboard?$orderby=totalPoints desc`
        );
        return entries.map(toLeaderboardEntry);
    },

    /** Tournament-specific prediction leaderboard (UC2). */
    async getByTournament(tournamentId: string): Promise<TournamentLeaderboardItem[]> {
        return json<TournamentLeaderboardItem[]>(
            `${BASE}/getPredictionLeaderboard(tournamentId='${tournamentId}')`
        );
    },
};

export const playerTeamsApi = {
    /** Teams for champion picker. */
    async getAll(): Promise<ChampionTeam[]> {
        const teams = await json<ODataTeam[]>(
            `${BASE}/Teams?$orderby=fifaRanking asc`
        );
        return teams.map((t) => ({
            name: t.name,
            flag: t.flagCode,
            crest: t.crest ?? undefined,
            confederation: t.confederation || "",
            selected: false,
            ID: t.ID,
        }));
    },

    /** Teams participating in a specific tournament (non-eliminated), for champion picker. */
    async getByTournament(tournamentId: string): Promise<ChampionTeam[]> {
        const entries = await json<{ team?: ODataTeam; isEliminated?: boolean }[]>(
            `${BASE}/TournamentTeams?$filter=tournament_ID eq '${tournamentId}' and isEliminated eq false&$expand=team&$orderby=team/fifaRanking asc`
        );
        return entries
            .filter((e) => e.team)
            .map((e) => ({
                name: e.team!.name,
                flag: e.team!.flagCode,
                crest: e.team!.crest ?? undefined,
                confederation: e.team!.confederation || "",
                selected: false,
                ID: e.team!.ID,
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
                pick: `${sb.predictedHomeScore} - ${sb.predictedAwayScore}`,
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
    async getChampionPick(tournamentId?: string): Promise<string | null> {
        let url = `${BASE}/MyChampionPick?$expand=team`;
        if (tournamentId) url += `&$filter=tournament_ID eq '${tournamentId}'`;
        const picks = await json<ODataChampionPick[]>(url);
        return picks.length > 0 ? picks[0].team?.name || null : null;
    },
};

export const playerProfileApi = {
    getCachedProfile(): UserProfile | null {
        return getCachedProfile();
    },

    clearCachedProfile(): void {
        clearProfileCache();
    },

    async getMyProfile(): Promise<UserProfile> {
        return fetchProfile(false);
    },

    async refreshMyProfile(): Promise<UserProfile> {
        return fetchProfile(true);
    },

    async updateMyProfile(profile: UserProfile): Promise<UserProfile> {
        const saved = await post<ODataUserProfile>(`${BASE}/updateMyProfile`, {
            avatarUrl: profile.avatarUrl,
            displayName: profile.displayName,
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
            country: profile.country,
            city: profile.city,
            timezone: profile.timezone,
            favoriteTeamId: profile.favoriteTeamId || null,
            favoriteTeam: profile.favoriteTeam,
            bio: profile.bio,
        });
        return writeProfileCache(toUserProfile(saved));
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

    /** Combined: submit winner pick + score bets for a match. */
    async submitMatchPrediction(matchId: string, pick: string, scores: { homeScore: number; awayScore: number }[]) {
        return post<{ success: boolean; message: string }>(
            `${BASE}/submitMatchPrediction`,
            { matchId, pick, scores }
        );
    },

    /** Combined: submit winner pick + score bets for an unresolved bracket slot. */
    async submitSlotPrediction(slotId: string, pick: string, scores: { homeScore: number; awayScore: number }[]) {
        return post<{ success: boolean; message: string }>(
            `${BASE}/submitSlotPrediction`,
            { slotId, pick, scores }
        );
    },

    /** Cancel/clear match prediction and associated score bets. */
    async cancelMatchPrediction(matchId: string) {
        return post<{ success: boolean; message: string }>(
            `${BASE}/cancelMatchPrediction`,
            { matchId }
        );
    },

    /** Cancel/clear unresolved slot prediction and score bets. */
    async cancelSlotPrediction(slotId: string) {
        return post<{ success: boolean; message: string }>(
            `${BASE}/cancelSlotPrediction`,
            { slotId }
        );
    },

    /** Pick tournament champion (UC3). */
    async pickChampion(teamId: string, tournamentId: string) {
        return post<{ success: boolean; message: string }>(
            `${BASE}/pickChampion`,
            { teamId, tournamentId }
        );
    },
};

/** Tournament-specific query functions. */
export const playerTournamentQueryApi = {
    /** Get latest results for a tournament. */
    async getLatestResults(tournamentId: string): Promise<MatchResultItem[]> {
        return json<MatchResultItem[]>(
            `${BASE}/getLatestResults(tournamentId='${tournamentId}')`
        );
    },

    /** Get upcoming matches for a tournament. */
    async getUpcomingMatches(tournamentId: string): Promise<UpcomingMatchItem[]> {
        return json<UpcomingMatchItem[]>(
            `${BASE}/getUpcomingMatches(tournamentId='${tournamentId}')`
        );
    },

    /** Get league standings for a tournament. */
    async getStandings(tournamentId: string): Promise<StandingItem[]> {
        return json<StandingItem[]>(
            `${BASE}/getStandings(tournamentId='${tournamentId}')`
        );
    },

    /** Get the current user's recent predictions. */
    async getMyRecentPredictions(limit: number = 20): Promise<RecentPredictionItem[]> {
        return json<RecentPredictionItem[]>(
            `${BASE}/getMyRecentPredictions(limit=${limit})`
        );
    },

    /** Get the tournament bracket (knockout tree). */
    async getTournamentBracket(tournamentId: string) {
        return json<any[]>(
            `${BASE}/getTournamentBracket(tournamentId='${tournamentId}')`
        );
    },

    /** Get champion pick counts by team for a tournament. */
    async getChampionPickCounts(tournamentId: string): Promise<{ teamId: string; teamName: string; teamCrest: string; count: number }[]> {
        return json<{ teamId: string; teamName: string; teamCrest: string; count: number }[]>(
            `${BASE}/getChampionPickCounts(tournamentId='${tournamentId}')`
        );
    },
};
