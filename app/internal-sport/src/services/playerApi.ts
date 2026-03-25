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

async function odataCollection<T>(
  url: string,
): Promise<{ items: T[]; totalCount: number }> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Request failed: ${res.status}`);
  }

  const data = await res.json();
  const items = mapExternalAssetUrls((data.value ?? []) as T[]);
  const totalCount = data["@odata.count"] ?? data["$count"] ?? items.length;

  return { items, totalCount: Number(totalCount) || 0 };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data?.error?.message || `Request failed: ${res.status}`);
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
  championBettingStatus: "open" | "locked" | null;
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

/** Response shape from CompletedMatchesView CDS view. */
export interface CompletedMatchViewRow {
  ID: string;
  tournament_ID: string;
  kickoff: string;
  stage: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam_ID: string | null;
  homeTeamName: string | null;
  homeTeamFlag: string | null;
  homeTeamCrest: string | null;
  awayTeam_ID: string | null;
  awayTeamName: string | null;
  awayTeamFlag: string | null;
  awayTeamCrest: string | null;
  myPick: string | null;
}

/** Response shape from AvailableMatchesView CDS view. */
export interface AvailableMatchViewRow {
  ID: string;
  tournament_ID: string;
  kickoff: string;
  stage: string | null;
  status: string;
  bettingLocked: boolean;
  isHotMatch: boolean;
  outcomePoints: number;
  matchday: number | null;
  bracketSlot_ID: string | null;
  homeTeam_ID: string | null;
  homeTeamName: string | null;
  homeTeamFlag: string | null;
  homeTeamCrest: string | null;
  awayTeam_ID: string | null;
  awayTeamName: string | null;
  awayTeamFlag: string | null;
  awayTeamCrest: string | null;
  myPick: string | null;
  myScores?: { homeScore: number; awayScore: number }[];
  scoreBettingEnabled: boolean;
  maxBets: number;
}

export interface AvailableMatchesQueryOptions {
  tournamentId?: string;
  page?: number;
  pageSize?: number;
  hotOnly?: boolean;
  kickoffStartIso?: string;
  kickoffEndIso?: string;
}

type TournamentBracketViewRow = Record<string, unknown> & {
  ID?: string | null;
  slotId?: string | null;
};

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
  // UpcomingMatch, // DEPRECATED: only used by getUpcoming()
  LiveMatch,
  // ExactScoreMatch, // DEPRECATED: only used by getExactScoreMatches()
  ChampionTeam,
  // LeaderboardEntry, // DEPRECATED: only used by playerLeaderboardApi.getAll()
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

// ── DEPRECATED: Helper constants/functions only used by getAvailable() ──
// Kept for reference if unresolved bracket slot support is re-enabled.
// const KNOCKOUT_STAGES = new Set([...]);
// const STAGE_ORDER: Record<string, number> = {...};
// function getStageRank(stage?: string | null): number {...}
// function getKickoffRank(kickoff?: string | null): number {...}

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

function formatStageLabel(
  stage?: string | null,
  leg?: number | null,
): string | undefined {
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

function toAvailableMatch(row: AvailableMatchViewRow): Match {
  const homeName = row.homeTeamName ?? "";
  const awayName = row.awayTeamName ?? "";

  return {
    id: row.ID,
    timeLabel: formatKickoff(row.kickoff),
    home: {
      name: homeName,
      flag: row.homeTeamFlag ?? "",
      crest: row.homeTeamCrest ?? undefined,
    },
    away: {
      name: awayName,
      flag: row.awayTeamFlag ?? "",
      crest: row.awayTeamCrest ?? undefined,
    },
    options: [homeName, "Draw", awayName],
    selectedOption: mapPickToSelectedOption(row.myPick ?? undefined),
    existingScores:
      row.myScores?.map((score) => ({
        home: score.homeScore,
        away: score.awayScore,
      })) ?? [],
    scoreBettingEnabled: row.scoreBettingEnabled ?? false,
    maxBets: row.maxBets ?? 3,
    kickoffIso: row.kickoff,
    stage: formatStageLabel(row.stage),
    outcomePoints: row.outcomePoints ?? 0,
    isHotMatch: row.isHotMatch ?? false,
    bettingLocked: row.bettingLocked ?? false,
    betTarget: "match" as const,
    slotId: row.bracketSlot_ID ?? undefined,
  };
}

function buildAvailableMatchesFilter(
  options: AvailableMatchesQueryOptions,
): string {
  const clauses: string[] = ["bettingLocked eq false"];

  if (options.tournamentId) {
    clauses.push(`tournament_ID eq '${options.tournamentId}'`);
  }

  if (options.hotOnly) {
    clauses.push("isHotMatch eq true");
  }

  const nowIso = new Date().toISOString();
  clauses.push(`(kickoff eq null or kickoff ge ${nowIso})`);

  if (options.kickoffStartIso) {
    clauses.push(`kickoff ge ${options.kickoffStartIso}`);
  }

  if (options.kickoffEndIso) {
    clauses.push(`kickoff lt ${options.kickoffEndIso}`);
  }

  return clauses.join(" and ");
}

// ── DEPRECATED: Slot resolution + toMatch helpers ──────────────────
// Only used by getAvailable(). Kept for reference.
// interface SlotFeeders { ... }
// function resolveUnresolvedTeamName(...) { ... }
// function toUnresolvedSlotMatch(...) { ... }
// function toMatch(m: ODataMatch): Match { ... }

// ── DEPRECATED: toUpcomingMatch ────────────────────────────────────
// Only used by getUpcoming(). Kept for reference.
// function toUpcomingMatch(m: ODataMatch): UpcomingMatch { ... }

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

// ── DEPRECATED: toExactScoreMatch ──────────────────────────────────
// Only used by getExactScoreMatches(). Kept for reference.
// function toExactScoreMatch(m: ODataMatch): ExactScoreMatch { ... }

// ── DEPRECATED: toLeaderboardEntry ────────────────────────────────
// Only used by playerLeaderboardApi.getAll(). Kept for reference.
// function toLeaderboardEntry(p: ODataLeaderboardEntry, idx: number): LeaderboardEntry { ... }

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
    roles: Array.isArray(raw.roles)
      ? raw.roles.filter((r): r is string => typeof r === "string")
      : [],
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

const hasValidProfileCache = (
  cache: UserProfileCachePayload | null,
): cache is UserProfileCachePayload => {
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
      `${BASE}/Tournaments?$orderby=startDate desc`,
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
      `${BASE}/Tournaments?$filter=status eq 'active' or status eq 'upcoming'&$orderby=startDate desc`,
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

/**
 * Fetch predictions + score bets ONLY for specific match IDs (targeted, not full-table).
 * Also fetches slot predictions/score bets scoped to tournament.
 */
async function fetchPlayerDataForMatches(
  matchIds: string[],
  slotIds: string[],
  tournamentId?: string,
): Promise<SharedPlayerData> {
  const matchFilter =
    matchIds.length > 0
      ? `?$filter=${encodeURIComponent(matchIds.map((id) => `match_ID eq '${id}'`).join(" or "))}`
      : "";
  const tournamentScopedFilter = tournamentId
    ? `?$filter=${encodeURIComponent(`tournament_ID eq '${tournamentId}'`)}`
    : "";

  const [predictions, scoreBets, slotPredictions, slotScoreBets] =
    await Promise.all([
      matchFilter
        ? json<ODataPrediction[]>(`${BASE}/MyPredictions${matchFilter}`).catch(
            () => [] as ODataPrediction[],
          )
        : Promise.resolve([] as ODataPrediction[]),
      matchFilter
        ? json<ODataScoreBet[]>(`${BASE}/MyScoreBets${matchFilter}`).catch(
            () => [] as ODataScoreBet[],
          )
        : Promise.resolve([] as ODataScoreBet[]),
      slotIds.length > 0 || tournamentScopedFilter
        ? json<ODataSlotPrediction[]>(
            `${BASE}/MySlotPredictions${tournamentScopedFilter}`,
          ).catch(() => [] as ODataSlotPrediction[])
        : Promise.resolve([] as ODataSlotPrediction[]),
      slotIds.length > 0 || tournamentScopedFilter
        ? json<ODataSlotScoreBet[]>(
            `${BASE}/MySlotScoreBets${tournamentScopedFilter}`,
          ).catch(() => [] as ODataSlotScoreBet[])
        : Promise.resolve([] as ODataSlotScoreBet[]),
    ]);

  return { predictions, scoreBets, slotPredictions, slotScoreBets };
}

export const playerMatchesApi = {
  // ── DEPRECATED: getAvailable() ─────────────────────────────
  // Replaced first by getAvailableFromView(), then by getAvailablePaged()
  // for server-side filtering + pagination. Kept for reference.
  // async getAvailable(tournamentId?: string): Promise<Match[]> { ... }

  /** Completed (finished) matches — paged via OData $skip/$top/$count.
   *  Uses CompletedMatchesView (server-side join of Match + Prediction + Teams). */
  async getCompletedPaged(
    tournamentId?: string,
    page = 1,
    pageSize = 10,
  ): Promise<{ items: Match[]; totalCount: number }> {
    let filter = "";
    if (tournamentId) filter = `tournament_ID eq '${tournamentId}'`;
    const skip = (page - 1) * pageSize;

    const filterParam = filter ? `$filter=${encodeURIComponent(filter)}&` : "";
    const res = await fetch(
      `${BASE}/CompletedMatchesView?${filterParam}$orderby=kickoff desc&$skip=${skip}&$top=${pageSize}&$count=true`,
    );
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    const rows: CompletedMatchViewRow[] = mapExternalAssetUrls(
      data.value ?? [],
    );
    const totalCount: number =
      data["@odata.count"] ?? data["$count"] ?? rows.length;

    const items: Match[] = rows.map((r) => ({
      id: r.ID,
      home: {
        name: r.homeTeamName ?? "",
        flag: r.homeTeamFlag ?? "",
        crest: r.homeTeamCrest ?? undefined,
      },
      away: {
        name: r.awayTeamName ?? "",
        flag: r.awayTeamFlag ?? "",
        crest: r.awayTeamCrest ?? undefined,
      },
      options: [],
      scoreBettingEnabled: false,
      timeLabel: "Locked",
      kickoffIso: r.kickoff,
      stage: r.stage ?? undefined,
      finalScore:
        r.homeScore !== null && r.awayScore !== null
          ? { home: r.homeScore, away: r.awayScore }
          : undefined,
      selectedOption: r.myPick ?? "",
    }));

    return { items, totalCount };
  },

  // ── DEPRECATED: getCompleted() ─────────────────────────────
  // Use getCompletedPaged() instead. Kept for reference.
  // async getCompleted(tournamentId?: string): Promise<Match[]> { ... }

  /** Live matches — fetches targeted predictions only for live match IDs. */
  async getLive(tournamentId?: string): Promise<LiveMatch[]> {
    const filterClauses = ["status eq 'live'"];
    if (tournamentId) {
      filterClauses.push(`tournament_ID eq '${tournamentId}'`);
    }

    const filter = encodeURIComponent(filterClauses.join(" and "));
    const matches = await json<ODataMatch[]>(
      `${BASE}/Matches?$filter=${filter}&$expand=homeTeam,awayTeam`,
    );

    if (matches.length === 0) return [];

    const matchIds = matches.map((m) => m.ID);
    const slotIds = matches
      .filter((m) => m.bracketSlot_ID)
      .map((m) => m.bracketSlot_ID!)
      .filter(Boolean);
    const sharedData = await fetchPlayerDataForMatches(
      matchIds,
      slotIds,
      tournamentId,
    );

    const pickMap = new Map<string, string>();
    for (const p of sharedData.predictions) pickMap.set(p.match_ID, p.pick);

    const slotPickMap = new Map<string, string>();
    for (const sp of sharedData.slotPredictions)
      slotPickMap.set(sp.slot_ID, sp.pick);

    return matches.map((m) => {
      const rawPick = pickMap.get(m.ID);
      const slotRawPick =
        !rawPick && m.bracketSlot_ID
          ? slotPickMap.get(m.bracketSlot_ID)
          : undefined;
      return toLiveMatch(m, rawPick || slotRawPick);
    });
  },

  // ── DEPRECATED: getUpcoming() ─────────────────────────────
  // UpcomingKickoffTable is commented out. Kept for reference.
  // async getUpcoming(tournamentId?: string): Promise<UpcomingMatch[]> { ... }

  // ── DEPRECATED: getExactScoreMatches() ───────────────────
  // No callers found. Kept for reference.
  // async getExactScoreMatches(): Promise<ExactScoreMatch[]> { ... }

  /**
   * Fetch available matches from the server-side AvailableMatchesView.
   * Single HTTP request replaces the old 6-12 request getAvailable() flow.
   * Pre-joins team data, score bet config, and user predictions server-side.
   */
  async getAvailablePaged(
    options: AvailableMatchesQueryOptions = {},
  ): Promise<{ items: Match[]; totalCount: number }> {
    const safePage = Math.max(1, options.page ?? 1);
    const safePageSize = Math.max(1, options.pageSize ?? 10);
    const skip = (safePage - 1) * safePageSize;
    const filter = buildAvailableMatchesFilter(options);
    const filterParam = filter ? `$filter=${encodeURIComponent(filter)}&` : "";

    const { items, totalCount } = await odataCollection<AvailableMatchViewRow>(
      `${BASE}/AvailableMatchesView?${filterParam}$orderby=kickoff asc&$skip=${skip}&$top=${safePageSize}&$count=true`,
    );

    return {
      items: items.map(toAvailableMatch),
      totalCount,
    };
  },

  /**
   * DEPRECATED: returns the full available-match snapshot.
   * Prefer getAvailablePaged() for server-side pagination and filtering.
   */
  async getAvailableFromView(tournamentId?: string): Promise<Match[]> {
    let filter = "";
    if (tournamentId) filter = `tournament_ID eq '${tournamentId}'`;

    const filterParam = filter ? `$filter=${encodeURIComponent(filter)}&` : "";
    const res = await fetch(
      `${BASE}/AvailableMatchesView?${filterParam}$orderby=kickoff asc`,
    );
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    const rows: AvailableMatchViewRow[] = mapExternalAssetUrls(
      data.value ?? [],
    );

    return rows.filter((row) => !isKickoffPast(row.kickoff)).map(toAvailableMatch);
  },

  /**
   * DEPRECATED: previous SportPage bootstrap helper.
   * SportPage now fetches available matches via MatchPredictionTable.getAvailablePaged()
   * and live matches separately.
   */
  async loadAllMatchData(tournamentId?: string): Promise<{
    available: Match[];
    live: LiveMatch[];
  }> {
    const filterTid = tournamentId || undefined;

    const [available, live] = await Promise.all([
      this.getAvailableFromView(filterTid),
      this.getLive(),
    ]);

    return { available, live };
  },
};

export const playerLeaderboardApi = {
  // ── DEPRECATED: getAll() ─────────────────────────────────
  // No callers found. Use getByTournament() for tournament-scoped leaderboard.
  // async getAll(): Promise<LeaderboardEntry[]> { ... }

  /** Tournament-specific prediction leaderboard (UC2). */
  async getByTournament(
    tournamentId: string,
  ): Promise<TournamentLeaderboardItem[]> {
    const filter = encodeURIComponent(`tournament_ID eq '${tournamentId}'`);
    return json<TournamentLeaderboardItem[]>(
      `${BASE}/PredictionLeaderboard?$filter=${filter}&$orderby=totalPoints desc,displayName asc`,
    );
  },
};

export const playerTeamsApi = {
  /** Teams for champion picker. */
  async getAll(): Promise<ChampionTeam[]> {
    const teams = await json<ODataTeam[]>(
      `${BASE}/Teams?$orderby=fifaRanking asc`,
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
      `${BASE}/TournamentTeams?$filter=tournament_ID eq '${tournamentId}' and isEliminated eq false&$expand=team&$orderby=team/fifaRanking asc`,
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
  async getMy(): Promise<{
    summary: PredictionSummary;
    history: PredictionHistoryItem[];
  }> {
    const [predictions, scoreBets] = await Promise.all([
      json<ODataPrediction[]>(
        `${BASE}/MyPredictions?$expand=match($expand=homeTeam,awayTeam)`,
      ),
      json<ODataScoreBet[]>(
        `${BASE}/MyScoreBets?$expand=match($expand=homeTeam,awayTeam)`,
      ),
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

    const submitted = history.filter(
      (h) => h.submissionStatus === "submitted",
    ).length;
    const winnerPicks = predictions.length;
    const exactScorePicks = scoreBets.length;
    const draftPicks = history.filter(
      (h) => h.submissionStatus === "draft",
    ).length;

    return {
      summary: {
        totalSubmitted: submitted,
        winnerPicks,
        exactScorePicks,
        draftPicks,
      },
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
      { predictions },
    );
  },

  /** Place an exact score bet (UC1). */
  async submitScoreBet(matchId: string, homeScore: number, awayScore: number) {
    return post<{ success: boolean; message: string }>(
      `${BASE}/submitScoreBet`,
      { matchId, homeScore, awayScore },
    );
  },

  /** Combined: submit winner pick + score bets for a match. */
  async submitMatchPrediction(
    matchId: string,
    pick: string,
    scores: { homeScore: number; awayScore: number }[],
  ) {
    return post<{ success: boolean; message: string }>(
      `${BASE}/submitMatchPrediction`,
      { matchId, pick, scores },
    );
  },

  /** Combined: submit winner pick + score bets for an unresolved bracket slot. */
  async submitSlotPrediction(
    slotId: string,
    pick: string,
    scores: { homeScore: number; awayScore: number }[],
  ) {
    return post<{ success: boolean; message: string }>(
      `${BASE}/submitSlotPrediction`,
      { slotId, pick, scores },
    );
  },

  /** Cancel/clear match prediction and associated score bets. */
  async cancelMatchPrediction(matchId: string) {
    return post<{ success: boolean; message: string }>(
      `${BASE}/cancelMatchPrediction`,
      { matchId },
    );
  },

  /** Cancel/clear unresolved slot prediction and score bets. */
  async cancelSlotPrediction(slotId: string) {
    return post<{ success: boolean; message: string }>(
      `${BASE}/cancelSlotPrediction`,
      { slotId },
    );
  },

  /** Pick tournament champion (UC3). */
  async pickChampion(teamId: string, tournamentId: string) {
    return post<{ success: boolean; message: string }>(`${BASE}/pickChampion`, {
      teamId,
      tournamentId,
    });
  },
};

/** Tournament-specific query functions. */
export const playerTournamentQueryApi = {
  /** Get latest results for a tournament. */
  async getLatestResults(tournamentId: string): Promise<MatchResultItem[]> {
    return json<MatchResultItem[]>(
      `${BASE}/getLatestResults(tournamentId='${tournamentId}')`,
    );
  },

  /** Get upcoming matches for a tournament. */
  async getUpcomingMatches(tournamentId: string): Promise<UpcomingMatchItem[]> {
    return json<UpcomingMatchItem[]>(
      `${BASE}/getUpcomingMatches(tournamentId='${tournamentId}')`,
    );
  },

  /** Get league standings for a tournament. */
  async getStandings(tournamentId: string): Promise<StandingItem[]> {
    return json<StandingItem[]>(
      `${BASE}/getStandings(tournamentId='${tournamentId}')`,
    );
  },

  /** Get the current user's recent predictions via paged OData view. */
  async getMyRecentPredictionsPaged(
    tournamentId?: string,
    page = 1,
    pageSize = 10,
  ): Promise<{ items: RecentPredictionItem[]; totalCount: number }> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const skip = (safePage - 1) * safePageSize;
    const filter = tournamentId
      ? `$filter=${encodeURIComponent(`tournament_ID eq '${tournamentId}'`)}&`
      : "";

    return odataCollection<RecentPredictionItem>(
      `${BASE}/RecentPredictionsView?${filter}$orderby=submittedAt desc&$skip=${skip}&$top=${safePageSize}&$count=true`,
    );
  },

  /** Get the tournament bracket (knockout tree). */
  async getTournamentBracket(tournamentId: string) {
    const filter = encodeURIComponent(`tournament_ID eq '${tournamentId}'`);
    const rows = await json<TournamentBracketViewRow[]>(
      `${BASE}/TournamentBracketView?$filter=${filter}&$orderby=stage asc,position asc`,
    );
    // CDS view key is `ID`; remap to `slotId` for the frontend BracketSlot interface.
    return rows.map((row) => ({ ...row, slotId: row.ID ?? row.slotId ?? null }));
  },

  /** Get champion pick counts by team for a tournament. */
  async getChampionPickCounts(
    tournamentId: string,
  ): Promise<
    { teamId: string; teamName: string; teamCrest: string; count: number }[]
  > {
    return json<
      { teamId: string; teamName: string; teamCrest: string; count: number }[]
    >(`${BASE}/getChampionPickCounts(tournamentId='${tournamentId}')`);
  },
};
