import {
    playerPredictionsApi,
    playerProfileApi,
    playerTeamsApi,
    playerTournamentsApi,
} from "@/services/playerApi";
import { composeDisplayName, toCountryCode } from "@/utils/accountProfile";
import type {
    AccountPredictionFeedItem,
    AccountPredictionFeedSummary,
    AccountScoreBetPick,
    AccountWinnerPick,
    TournamentInfo,
    UserProfile,
} from "@/types";

const ACCOUNT_STAGE_LABELS: Record<string, string> = {
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

function getStageLabel(stage?: string | null) {
    if (!stage) return "Match";
    return ACCOUNT_STAGE_LABELS[stage] ?? stage;
}

function formatMatchLabel(
    stage?: string | null,
    leg?: number | null,
    matchday?: number | null,
) {
    const base = getStageLabel(stage);

    if ((stage === "group" || stage === "regular") && matchday) {
        return `${base} - Matchday ${matchday}`;
    }

    if (leg && leg > 0) {
        return `${base} - Leg ${leg}`;
    }

    return base;
}

function getTournamentName(
    tournamentId: string | null | undefined,
    explicitName: string | null | undefined,
    fallbackNames: Map<string, string>,
) {
    if (explicitName?.trim()) return explicitName.trim();
    if (tournamentId && fallbackNames.has(tournamentId)) {
        return fallbackNames.get(tournamentId)!;
    }
    return "Unknown Tournament";
}

function getLatestSubmittedAt(...values: Array<string | null | undefined>) {
    return values.reduce<string | null>((latest, candidate) => {
        if (!candidate) return latest;
        if (!latest) return candidate;

        const latestTs = Date.parse(latest);
        const candidateTs = Date.parse(candidate);

        if (!Number.isFinite(candidateTs)) return latest;
        if (!Number.isFinite(latestTs) || candidateTs > latestTs) {
            return candidate;
        }

        return latest;
    }, null);
}

function compareFeedItems(
    left: AccountPredictionFeedItem,
    right: AccountPredictionFeedItem,
) {
    const leftTs = Date.parse(left.latestSubmittedAt ?? left.kickoff ?? "");
    const rightTs = Date.parse(right.latestSubmittedAt ?? right.kickoff ?? "");

    if (Number.isFinite(leftTs) && Number.isFinite(rightTs) && leftTs !== rightTs) {
        return rightTs - leftTs;
    }

    if (left.tournamentName !== right.tournamentName) {
        return left.tournamentName.localeCompare(right.tournamentName);
    }

    return left.label.localeCompare(right.label);
}

function compareScoreBetPicks(
    left: AccountScoreBetPick,
    right: AccountScoreBetPick,
) {
    const leftTs = Date.parse(left.submittedAt ?? "");
    const rightTs = Date.parse(right.submittedAt ?? "");

    if (Number.isFinite(leftTs) && Number.isFinite(rightTs) && leftTs !== rightTs) {
        return rightTs - leftTs;
    }

    return left.id.localeCompare(right.id);
}

function createMatchWinnerPick(prediction: {
    ID: string;
    pick: string;
    isCorrect: boolean | null;
    pointsEarned: number;
    submittedAt: string | null;
}): AccountWinnerPick {
    return {
        id: prediction.ID,
        scope: "match",
        pick: prediction.pick,
        status: prediction.submittedAt ? "submitted" : "draft",
        isCorrect: prediction.isCorrect ?? null,
        pointsEarned: Number(prediction.pointsEarned ?? 0),
        submittedAt: prediction.submittedAt ?? null,
    };
}

function createSlotWinnerPick(prediction: {
    ID: string;
    pick: string;
    status: string;
    submittedAt: string | null;
}): AccountWinnerPick {
    return {
        id: prediction.ID,
        scope: "slot",
        pick: prediction.pick,
        status: prediction.status,
        isCorrect: null,
        pointsEarned: 0,
        submittedAt: prediction.submittedAt ?? null,
    };
}

function createMatchScoreBetPick(bet: {
    ID: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
    submittedAt: string | null;
}): AccountScoreBetPick {
    return {
        id: bet.ID,
        scope: "match",
        predictedHomeScore: bet.predictedHomeScore,
        predictedAwayScore: bet.predictedAwayScore,
        status: bet.status,
        isCorrect: bet.isCorrect ?? null,
        submittedAt: bet.submittedAt ?? null,
    };
}

function createSlotScoreBetPick(bet: {
    ID: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    status: string;
    isCorrect: boolean | null;
    submittedAt: string | null;
}): AccountScoreBetPick {
    return {
        id: bet.ID,
        scope: "slot",
        predictedHomeScore: bet.predictedHomeScore,
        predictedAwayScore: bet.predictedAwayScore,
        status: bet.status,
        isCorrect: bet.isCorrect ?? null,
        submittedAt: bet.submittedAt ?? null,
    };
}

export async function getMyPredictionCount(): Promise<number> {
    const { predictions, scoreBets, slotPredictions, slotScoreBets } =
        await playerPredictionsApi.getMyDetailedData();
    const keys = new Set<string>();

    for (const prediction of predictions) {
        keys.add(`match:${prediction.match_ID}`);
    }
    for (const bet of scoreBets) {
        keys.add(`match:${bet.match_ID}`);
    }
    for (const prediction of slotPredictions) {
        keys.add(`slot:${prediction.slot_ID}`);
    }
    for (const bet of slotScoreBets) {
        keys.add(`slot:${bet.slot_ID}`);
    }

    return keys.size;
}

export async function loadMyProfileBundle(): Promise<{
    profile: UserProfile;
    favoriteTeamOptions: string[];
}> {
    const [loaded, teams] = await Promise.all([
        playerProfileApi.getMyProfile(),
        playerTeamsApi.getAll().catch(() => []),
    ]);

    const profile: UserProfile = {
        ...loaded,
        country: toCountryCode(loaded.country || ""),
        displayName: composeDisplayName(
            loaded.firstName || "",
            loaded.lastName || "",
            loaded.displayName || "",
        ),
    };

    const favoriteTeamOptions = [
        ...new Set(teams.map((team) => team.name).filter(Boolean)),
    ].sort((left, right) => left.localeCompare(right));

    return { profile, favoriteTeamOptions };
}

export async function saveMyProfile(draft: UserProfile): Promise<UserProfile> {
    const payload: UserProfile = {
        ...draft,
        country: toCountryCode(draft.country || ""),
        displayName: composeDisplayName(
            draft.firstName,
            draft.lastName,
            draft.displayName,
        ),
    };

    const saved = await playerProfileApi.updateMyProfile(payload);

    return {
        ...saved,
        country: toCountryCode(saved.country || ""),
        displayName: composeDisplayName(
            saved.firstName || "",
            saved.lastName || "",
            saved.displayName || "",
        ),
    };
}

export async function loadMyPredictionFeed(): Promise<{
    items: AccountPredictionFeedItem[];
    tournaments: TournamentInfo[];
    summary: AccountPredictionFeedSummary;
}> {
    const [{ predictions, scoreBets, slotPredictions, slotScoreBets }, tournaments] =
        await Promise.all([
            playerPredictionsApi.getMyDetailedData(),
            playerTournamentsApi.getAll().catch(() => [] as TournamentInfo[]),
        ]);

    const tournamentNames = new Map(
        tournaments.map((tournament) => [tournament.ID, tournament.name]),
    );
    const itemMap = new Map<string, AccountPredictionFeedItem>();

    for (const prediction of predictions) {
        const match = prediction.match;
        if (!match) continue;

        const key = `match:${prediction.match_ID}`;
        const existing = itemMap.get(key);
        const tournamentId = match.tournament_ID ?? prediction.tournament_ID ?? "";

        itemMap.set(key, {
            id: key,
            scope: "match",
            subjectId: prediction.match_ID,
            tournamentId,
            tournamentName: getTournamentName(
                tournamentId,
                match.tournament?.name,
                tournamentNames,
            ),
            stage: match.stage ?? "",
            label: formatMatchLabel(
                match.stage,
                match.leg ?? null,
                match.matchday ?? null,
            ),
            kickoff: match.kickoff ?? null,
            latestSubmittedAt: getLatestSubmittedAt(
                existing?.latestSubmittedAt,
                prediction.submittedAt,
            ),
            homeTeam: match.homeTeam?.name ?? existing?.homeTeam ?? "",
            homeFlag: match.homeTeam?.flagCode ?? existing?.homeFlag ?? "",
            homeCrest: match.homeTeam?.crest ?? existing?.homeCrest ?? "",
            awayTeam: match.awayTeam?.name ?? existing?.awayTeam ?? "",
            awayFlag: match.awayTeam?.flagCode ?? existing?.awayFlag ?? "",
            awayCrest: match.awayTeam?.crest ?? existing?.awayCrest ?? "",
            homeScore: match.homeScore ?? existing?.homeScore ?? null,
            awayScore: match.awayScore ?? existing?.awayScore ?? null,
            winnerPick: createMatchWinnerPick(prediction),
            scoreBets: existing?.scoreBets ?? [],
        });
    }

    for (const bet of scoreBets) {
        const match = bet.match;
        if (!match) continue;

        const key = `match:${bet.match_ID}`;
        const existing = itemMap.get(key);
        const tournamentId = match.tournament_ID ?? existing?.tournamentId ?? "";

        itemMap.set(key, {
            id: key,
            scope: "match",
            subjectId: bet.match_ID,
            tournamentId,
            tournamentName: getTournamentName(
                tournamentId,
                match.tournament?.name ?? existing?.tournamentName,
                tournamentNames,
            ),
            stage: match.stage ?? existing?.stage ?? "",
            label:
                existing?.label ??
                formatMatchLabel(match.stage, match.leg ?? null, match.matchday ?? null),
            kickoff: match.kickoff ?? existing?.kickoff ?? null,
            latestSubmittedAt: getLatestSubmittedAt(
                existing?.latestSubmittedAt,
                bet.submittedAt,
            ),
            homeTeam: match.homeTeam?.name ?? existing?.homeTeam ?? "",
            homeFlag: match.homeTeam?.flagCode ?? existing?.homeFlag ?? "",
            homeCrest: match.homeTeam?.crest ?? existing?.homeCrest ?? "",
            awayTeam: match.awayTeam?.name ?? existing?.awayTeam ?? "",
            awayFlag: match.awayTeam?.flagCode ?? existing?.awayFlag ?? "",
            awayCrest: match.awayTeam?.crest ?? existing?.awayCrest ?? "",
            homeScore: match.homeScore ?? existing?.homeScore ?? null,
            awayScore: match.awayScore ?? existing?.awayScore ?? null,
            winnerPick: existing?.winnerPick ?? null,
            scoreBets: [...(existing?.scoreBets ?? []), createMatchScoreBetPick(bet)].sort(
                compareScoreBetPicks,
            ),
        });
    }

    for (const prediction of slotPredictions) {
        const slot = prediction.slot;
        const key = `slot:${prediction.slot_ID}`;
        const existing = itemMap.get(key);
        const tournamentId =
            prediction.tournament_ID ?? slot?.tournament_ID ?? existing?.tournamentId ?? "";

        itemMap.set(key, {
            id: key,
            scope: "slot",
            subjectId: prediction.slot_ID,
            tournamentId,
            tournamentName: getTournamentName(
                tournamentId,
                slot?.tournament?.name ?? existing?.tournamentName,
                tournamentNames,
            ),
            stage: slot?.stage ?? existing?.stage ?? "",
            label:
                slot?.label?.trim() ||
                existing?.label ||
                formatMatchLabel(slot?.stage ?? "", null, null),
            kickoff: existing?.kickoff ?? null,
            latestSubmittedAt: getLatestSubmittedAt(
                existing?.latestSubmittedAt,
                prediction.submittedAt,
            ),
            homeTeam: slot?.homeTeam?.name ?? existing?.homeTeam ?? "",
            homeFlag: slot?.homeTeam?.flagCode ?? existing?.homeFlag ?? "",
            homeCrest: slot?.homeTeam?.crest ?? existing?.homeCrest ?? "",
            awayTeam: slot?.awayTeam?.name ?? existing?.awayTeam ?? "",
            awayFlag: slot?.awayTeam?.flagCode ?? existing?.awayFlag ?? "",
            awayCrest: slot?.awayTeam?.crest ?? existing?.awayCrest ?? "",
            homeScore: existing?.homeScore ?? null,
            awayScore: existing?.awayScore ?? null,
            winnerPick: createSlotWinnerPick(prediction),
            scoreBets: existing?.scoreBets ?? [],
        });
    }

    for (const bet of slotScoreBets) {
        const slot = bet.slot;
        const key = `slot:${bet.slot_ID}`;
        const existing = itemMap.get(key);
        const tournamentId =
            bet.tournament_ID ?? slot?.tournament_ID ?? existing?.tournamentId ?? "";

        itemMap.set(key, {
            id: key,
            scope: "slot",
            subjectId: bet.slot_ID,
            tournamentId,
            tournamentName: getTournamentName(
                tournamentId,
                slot?.tournament?.name ?? existing?.tournamentName,
                tournamentNames,
            ),
            stage: slot?.stage ?? existing?.stage ?? "",
            label:
                slot?.label?.trim() ||
                existing?.label ||
                formatMatchLabel(slot?.stage ?? "", null, null),
            kickoff: existing?.kickoff ?? null,
            latestSubmittedAt: getLatestSubmittedAt(
                existing?.latestSubmittedAt,
                bet.submittedAt,
            ),
            homeTeam: slot?.homeTeam?.name ?? existing?.homeTeam ?? "",
            homeFlag: slot?.homeTeam?.flagCode ?? existing?.homeFlag ?? "",
            homeCrest: slot?.homeTeam?.crest ?? existing?.homeCrest ?? "",
            awayTeam: slot?.awayTeam?.name ?? existing?.awayTeam ?? "",
            awayFlag: slot?.awayTeam?.flagCode ?? existing?.awayFlag ?? "",
            awayCrest: slot?.awayTeam?.crest ?? existing?.awayCrest ?? "",
            homeScore: existing?.homeScore ?? null,
            awayScore: existing?.awayScore ?? null,
            winnerPick: existing?.winnerPick ?? null,
            scoreBets: [...(existing?.scoreBets ?? []), createSlotScoreBetPick(bet)].sort(
                compareScoreBetPicks,
            ),
        });
    }

    const items = Array.from(itemMap.values()).sort(compareFeedItems);
    const pendingItems = items.filter((item) => {
        const winnerPending = !!item.winnerPick && item.winnerPick.isCorrect == null;
        const scorePending = item.scoreBets.some((bet) => bet.isCorrect == null);
        return winnerPending || scorePending;
    }).length;
    const resolvedItems = items.filter((item) => {
        const winnerResolved = !!item.winnerPick && item.winnerPick.isCorrect != null;
        const scoreResolved = item.scoreBets.some((bet) => bet.isCorrect != null);
        return winnerResolved || scoreResolved;
    }).length;

    return {
        items,
        tournaments,
        summary: {
            trackedItems: items.length,
            winnerPicks: items.filter((item) => !!item.winnerPick).length,
            scoreBets: items.reduce(
                (total, item) => total + item.scoreBets.length,
                0,
            ),
            pendingItems,
            resolvedItems,
        },
    };
}
